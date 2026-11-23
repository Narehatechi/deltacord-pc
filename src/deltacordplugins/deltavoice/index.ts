/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    voice: {
        type: OptionType.SELECT,
        description: "The sound of your text voice.",
        options: [
            { label: "Classic", value: "square", default: true },
            { label: "Soft", value: "triangle" },
            { label: "Gruff", value: "sawtooth" },
            { label: "Gentle", value: "sine" }
        ]
    },
    pitch: {
        type: OptionType.SLIDER,
        description: "How high the voice is, in hertz.",
        markers: [150, 300, 450, 600, 750, 900],
        default: 450,
        stickToMarkers: false
    },
    volume: {
        type: OptionType.SLIDER,
        description: "How loud the voice is.",
        markers: [0, 25, 50, 75, 100],
        default: 35
    },
    every: {
        type: OptionType.SLIDER,
        description: "Play a blip every this many letters.",
        markers: [1, 2, 3],
        default: 2
    }
});

let audio: AudioContext | undefined;
let letters = 0;

function blip() {
    audio ??= new AudioContext();
    const { voice, pitch, volume } = settings.store;
    const now = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = voice as OscillatorType;
    osc.frequency.value = pitch * (0.96 + Math.random() * 0.08);
    gain.gain.setValueAtTime(volume / 100 * 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    osc.connect(gain).connect(audio.destination);
    osc.start(now);
    osc.stop(now + 0.07);
}

function onKeyDown(e: KeyboardEvent) {
    if (e.key.length !== 1 || e.key === " " || e.ctrlKey || e.metaKey || e.altKey) return;
    if (!(e.target instanceof HTMLElement) || !e.target.closest('[role="textbox"]')) return;
    if (letters++ % settings.store.every === 0) blip();
}

export default definePlugin({
    name: "Deltavoice",
    description: "Plays a Deltarune style text voice as you type.",
    authors: [Devs.Narehatechi],
    settings,
    start() {
        document.addEventListener("keydown", onKeyDown, true);
    },
    stop() {
        document.removeEventListener("keydown", onKeyDown, true);
        audio?.close();
        audio = undefined;
    }
});
