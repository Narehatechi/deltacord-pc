/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    logDeletes: {
        type: OptionType.BOOLEAN,
        description: "Keep messages that get deleted.",
        default: true
    },
    logEdits: {
        type: OptionType.BOOLEAN,
        description: "Keep the old text of messages that get edited.",
        default: true
    },
    logBulkDeletes: {
        type: OptionType.BOOLEAN,
        description: "Keep messages removed in bulk, for example by moderators or bots.",
        default: true
    },
    scope: {
        type: OptionType.SELECT,
        description: "Where to log messages.",
        options: [
            { label: "Everywhere", value: "everywhere", default: true },
            { label: "Only DMs and group DMs", value: "dms" },
            { label: "Only servers", value: "servers" }
        ]
    },
    ignoreBots: {
        type: OptionType.BOOLEAN,
        description: "Don't log messages from bots.",
        default: true
    },
    ignoreSelf: {
        type: OptionType.BOOLEAN,
        description: "Don't log your own messages.",
        default: false
    },
    ignoreUsers: {
        type: OptionType.STRING,
        description: "User IDs to ignore, separated by commas. You can also right click someone and pick Ignore in Deltalogger.",
        default: ""
    },
    ignoreChannels: {
        type: OptionType.STRING,
        description: "Channel IDs to ignore, separated by commas.",
        default: ""
    },
    ignoreGuilds: {
        type: OptionType.STRING,
        description: "Server IDs to ignore, separated by commas.",
        default: ""
    },
    ghostPings: {
        type: OptionType.BOOLEAN,
        description: "Tell me when someone pings me and then deletes the message.",
        default: true
    },
    ghostPingMinutes: {
        type: OptionType.SLIDER,
        description: "Count it as a ghost ping if the message is deleted within this many minutes.",
        markers: [1, 5, 10, 30, 60],
        default: 10
    },
    notifyDeletes: {
        type: OptionType.SELECT,
        description: "Get a notification when a message is deleted.",
        options: [
            { label: "Never", value: "never", default: true },
            { label: "In DMs", value: "dms" },
            { label: "Everywhere", value: "everywhere" }
        ]
    },
    notifyEdits: {
        type: OptionType.BOOLEAN,
        description: "Get a notification when a message in a DM is edited.",
        default: false
    },
    maxEntries: {
        type: OptionType.SLIDER,
        description: "How many log entries to keep. The oldest go first.",
        markers: [500, 1000, 2500, 5000, 10000],
        default: 2500
    },
    keepDays: {
        type: OptionType.SLIDER,
        description: "How many days to keep log entries.",
        markers: [1, 7, 30, 90, 365],
        default: 30
    },
    cacheSize: {
        type: OptionType.SLIDER,
        description: "How many recent messages to remember, so deleted ones can be recovered. Higher uses more memory.",
        markers: [1000, 5000, 10000, 20000],
        default: 5000
    }
});
