/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { UserStore } from "@webpack/common";

const FLAVOR = [
    "Looks like they could use a nap.",
    "Smells faintly of dark candy.",
    "Their determination is unclear.",
    "Seems to be thinking about pie.",
    "Is pretending not to read this.",
    "Has a suspicious amount of D$.",
    "Would rather be in the Dark World.",
    "Insists they are the main character."
];

function hash(text: string) {
    let h = 2166136261;
    for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return h >>> 0;
}

const actions = ["check", "spare", "fight", "hug"].map(a => ({ name: a, displayName: a, value: a, label: a }));

function act(action: string, id: string) {
    const user = UserStore.getUser(id);
    const name = (user?.globalName ?? user?.username ?? "???").toUpperCase();
    const h = hash(id);
    switch (action) {
        case "spare":
            return `* You spared <@${id}>!\n* ${name} feels a little calmer.`;
        case "fight":
            return `* You attacked <@${id}>!\n* It dealt ${1 + Math.floor(Math.random() * 99)} damage. ${name} looks unbothered.`;
        case "hug":
            return `* You hugged <@${id}>.\n* ${name}'s DEFENSE dropped to 0. Worth it.`;
        default:
            return `* ${name} - ATK ${5 + h % 26} DEF ${h % 11}\n* ${FLAVOR[h % FLAVOR.length]}`;
    }
}

export default definePlugin({
    name: "ActMenu",
    description: "Check, spare, fight or hug someone like a battle in Deltarune.",
    authors: [Devs.Narehatechi],
    commands: [{
        name: "act",
        description: "Do a battle action on someone.",
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
        options: [
            { name: "target", description: "Who to act on.", type: ApplicationCommandOptionType.USER, required: true },
            { name: "action", description: "What to do.", type: ApplicationCommandOptionType.STRING, choices: actions, required: false }
        ],
        execute: args => ({ content: act(findOption(args, "action", "check"), findOption(args, "target", "")) })
    }]
});
