/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption } from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    auto: {
        type: OptionType.BOOLEAN,
        description: "Start every message you send with a star, like game dialogue.",
        default: false
    }
});

const star = (text: string) => text.split("\n").map(line => line.trim() ? `* ${line}` : line).join("\n");

export default definePlugin({
    name: "DeltaText",
    description: "Write messages as Deltarune dialogue with /star and /dialogue, or star every message.",
    authors: [Devs.Narehatechi],
    settings,
    onBeforeMessageSend(_channelId, msg) {
        if (!settings.store.auto) return;
        const text = msg.content.trimStart();
        if (!text || /^[*>/`:]/.test(text) || /^https?:\/\//.test(text)) return;
        msg.content = star(msg.content);
    },
    commands: [
        {
            name: "star",
            description: "Send your text as game dialogue.",
            inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
            options: [{ name: "text", description: "What to say.", type: ApplicationCommandOptionType.STRING, required: true }],
            execute: args => ({ content: star(findOption(args, "text", "")) })
        },
        {
            name: "dialogue",
            description: "Send a line of dialogue spoken by someone.",
            inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
            options: [
                { name: "speaker", description: "Who is talking.", type: ApplicationCommandOptionType.STRING, required: true },
                { name: "text", description: "What they say.", type: ApplicationCommandOptionType.STRING, required: true }
            ],
            execute: args => ({ content: `**${findOption(args, "speaker", "").toUpperCase()}**\n${star(findOption(args, "text", ""))}` })
        }
    ]
});
