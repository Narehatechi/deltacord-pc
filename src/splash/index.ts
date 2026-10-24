/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import fontBase64 from "file://./DeterminationMono.ttf?base64";

const PARTS = ["DEL", "TA", "CORD"];
const WORD = PARTS.join("");
const PART_START = [250, 900, 1550];
const PART_FADE = 520;
const PULSE_START = 2100;
const PULSE_LENGTH = 600;
const CREDIT = "by Narehatechi";
const CREDIT_START = 2150;
const CREDIT_SPIN = 750;
const PLAY_MS = 3200;
const MAX_WAIT_MS = PLAY_MS + 25_000;
const FADE_OUT_MS = 450;
const FONT = '"Determination Mono"';

let canvas: HTMLCanvasElement | undefined;
let ctx: CanvasRenderingContext2D | null = null;
let startedAt = 0;
let lastCheck = 0;
let shown = 0;
let target = 0.03;
let status = "Starting…";
let finishing = false;
let isReady: (() => boolean) | undefined;

const smooth = (x: number) => {
    const c = Math.min(1, Math.max(0, x));
    return c * c * (3 - 2 * c);
};
const fade = (t: number, from: number, length: number) => smooth((t - from) / length);

export function splashProgress(progress: number, text: string) {
    target = Math.max(target, progress);
    status = text;
}

export function splashReadyWhen(check: () => boolean) {
    isReady = check;
}

function finish() {
    if (finishing || !canvas) return;
    finishing = true;
    canvas.style.transition = `opacity ${FADE_OUT_MS}ms ease`;
    canvas.style.opacity = "0";
    setTimeout(() => {
        canvas?.remove();
        canvas = undefined;
    }, FADE_OUT_MS);
}

function frame(now: number) {
    if (!canvas || !ctx) return;
    requestAnimationFrame(frame);

    const g = ctx;

    const t = Math.max(0, now - startedAt);

    if (!finishing && t >= PLAY_MS) {
        if (t >= MAX_WAIT_MS) finish();
        else if (now - lastCheck > 200) {
            lastCheck = now;
            if (isReady?.()) {
                splashProgress(1, "Ready!");
                finish();
            }
        }
    }

    const dpr = devicePixelRatio || 1;
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
    }

    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.shadowBlur = 0;
    g.fillStyle = "#000";
    g.fillRect(0, 0, w, h);

    const along = Math.max(w, h);
    const across = Math.min(w, h);

    g.save();
    if (h > w) {
        g.translate(w / 2, h / 2);
        g.rotate(Math.PI / 2);
        g.translate(-along / 2, -across / 2);
    }

    g.font = `100px ${FONT}`;
    const size = Math.min(100 * (along * 0.80) / g.measureText(WORD).width, across * 0.42);
    g.font = `${size}px ${FONT}`;
    g.textBaseline = "middle";
    const wordWidth = g.measureText(WORD).width;
    const x0 = (along - wordWidth) / 2;
    const y = across / 2;

    const pulse = t >= PULSE_START && t < PULSE_START + PULSE_LENGTH
        ? Math.sin((t - PULSE_START) / PULSE_LENGTH * Math.PI)
        : 0;
    const breath = t >= PULSE_START + PULSE_LENGTH
        ? (Math.sin((t - PULSE_START - PULSE_LENGTH) / 900) + 1) / 2 * 0.35
        : 0;

    let x = x0;
    PARTS.forEach((part, i) => {
        const appear = fade(t, PART_START[i], PART_FADE);
        if (appear > 0) {
            const settle = 1 - fade(t, PART_START[i] + PART_FADE / 2, PART_FADE * 2);
            const glow = 0.55 + 0.45 * settle + pulse * 0.6 + breath;
            g.fillStyle = "#fff";
            g.shadowColor = "#fff";
            g.globalAlpha = Math.min(1, 90 / 255 * appear * glow);
            g.shadowBlur = size * 0.38 + dpr * 6;
            g.fillText(part, x, y);
            g.globalAlpha = Math.min(1, 170 / 255 * appear * glow);
            g.shadowBlur = size * 0.12 + dpr * 2;
            g.fillText(part, x, y);
            g.globalAlpha = appear;
            g.shadowBlur = 0;
            g.fillText(part, x, y);
            g.globalAlpha = 1;
        }
        x += g.measureText(part).width;
    });

    shown += (target - shown) * 0.08;
    if (target >= 1 && shown > 0.995) shown = 1;

    const barAppear = fade(t, PART_START[0], PART_FADE);
    if (barAppear > 0) {
        const barHeight = size * 0.11;
        const top = y + size * 0.5 + size * 0.22 - size * 0.35;
        const stroke = Math.max(dpr * 2, barHeight * 0.16);
        const inset = stroke * 1.8;

        g.fillStyle = "#fff";
        g.strokeStyle = "#fff";
        g.shadowColor = "#fff";
        g.globalAlpha = barAppear * 0.9;
        g.lineWidth = stroke;
        g.shadowBlur = stroke * 3;
        g.strokeRect(x0, top, wordWidth, barHeight);
        g.globalAlpha = barAppear;
        g.shadowBlur = barHeight * 0.6;
        g.fillRect(x0 + inset, top + inset, (wordWidth - inset * 2) * Math.min(1, shown), barHeight - inset * 2);

        g.shadowBlur = 0;
        g.globalAlpha = barAppear * 0.8;
        g.font = `${size * 0.15}px ${FONT}`;
        g.textBaseline = "alphabetic";
        g.fillText(`${status}  ·  ${VERSION}`, x0, top + barHeight + size * 0.15 * 1.35);
    }
    g.restore();

    if (t >= CREDIT_START) {
        const spin = Math.min(1, (t - CREDIT_START) / CREDIT_SPIN);
        const p = spin - 1;
        const since = t - CREDIT_START;
        const eased = 1 + 2.70158 * p * p * p + 1.70158 * p * p;
        const scale = Math.max(0, eased) * (1 + 0.045 * Math.sin(since / 170) * spin);
        const angle = -720 * (1 - eased) + 4 * Math.sin(since / 320) * spin;

        if (scale > 0.01) {
            const fontSize = Math.min(w, h) * 0.075;
            g.save();
            g.translate(w / 2, h * 0.955);
            g.rotate(angle * Math.PI / 180);
            g.scale(scale, scale);
            g.font = `${fontSize}px ${FONT}`;
            g.textAlign = "center";
            g.textBaseline = "middle";
            g.fillStyle = "#fff";
            g.shadowColor = "#fff";
            g.shadowBlur = fontSize * 0.35;
            g.globalAlpha = spin;
            g.fillText(CREDIT, 0, 0);
            g.restore();
        }
    }
}

async function mount() {
    const el = document.createElement("canvas");
    el.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:2147483647;background:#000;cursor:default";
    document.documentElement.append(el);
    canvas = el;
    ctx = el.getContext("2d");

    const face = new FontFace(FONT.slice(1, -1), Uint8Array.from(atob(fontBase64), c => c.charCodeAt(0)).buffer);
    document.fonts.add(face);
    await face.load().catch(err => console.error("[Deltacord] Couldn't load the startup animation font", err));

    startedAt = performance.now();
    requestAnimationFrame(frame);
}

if (IS_DISCORD_DESKTOP && !IS_REPORTER && VencordNative.settings.get().startupAnimation !== false) {
    if (document.documentElement) mount();
    else document.addEventListener("readystatechange", mount, { once: true });
}
