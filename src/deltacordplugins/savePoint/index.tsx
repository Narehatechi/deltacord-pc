/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import * as DataStore from "@api/DataStore";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Message } from "@vencord/discord-types";
import { ChannelStore, Menu, showToast } from "@webpack/common";

const KEY = "SavePoint_saves";
const MAX_SAVES = 50;

interface Save {
    link: string;
    author: string;
    preview: string;
    savedAt: number;
}

const getSaves = async () => await DataStore.get<Save[]>(KEY) ?? [];

async function save(message: Message) {
    const guildId = ChannelStore.getChannel(message.channel_id)?.guild_id ?? "@me";
    const link = `https://discord.com/channels/${guildId}/${message.channel_id}/${message.id}`;
    const saves = (await getSaves()).filter(s => s.link !== link);
    saves.unshift({
        link,
        author: message.author.globalName ?? message.author.username,
        preview: message.content.replace(/\s+/g, " ").slice(0, 60) || "(no text)",
        savedAt: Date.now()
    });
    await DataStore.set(KEY, saves.slice(0, MAX_SAVES));
    showToast({ text: "The power of this message shines within you. Saved.", variant: "success" });
}

const messageMenu: NavContextMenuPatchCallback = (children, { message }: { message: Message; }) => {
    children.push(
        <Menu.MenuItem
            id="vc-savepoint-save"
            label="Save Point"
            action={() => save(message)}
        />
    );
};

const actions = ["list", "clear"].map(a => ({ name: a, displayName: a, value: a, label: a }));

export default definePlugin({
    name: "SavePoint",
    description: "Save messages from the message menu and come back to them with /savepoint.",
    authors: [Devs.Narehatechi],
    contextMenus: {
        "message": messageMenu
    },
    commands: [{
        name: "savepoint",
        description: "List or clear your saved messages.",
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [{
            name: "action",
            description: "What to do.",
            type: ApplicationCommandOptionType.STRING,
            choices: actions,
            required: false
        }],
        async execute(args, ctx) {
            if (findOption(args, "action", "list") === "clear") {
                await DataStore.del(KEY);
                sendBotMessage(ctx.channel.id, { content: "* Your save points are gone." });
                return;
            }
            const saves = await getSaves();
            const content = saves.length
                ? saves.map((s, i) => `**${i + 1}.** ${s.author}: ${s.preview} [Go](${s.link})`).join("\n")
                : "* No save points yet. Right click a message and pick Save Point.";
            sendBotMessage(ctx.channel.id, { content });
        }
    }]
});
