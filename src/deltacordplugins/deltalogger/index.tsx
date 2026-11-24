/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType } from "@api/Commands";
import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { HeaderBarButton } from "@api/HeaderBar";
import { showNotification } from "@api/Notifications";
import { Devs } from "@utils/constants";
import definePlugin, { IconProps } from "@utils/types";
import { Channel, Guild, User } from "@vencord/discord-types";
import { IconUtils, Menu, MessageStore, NavigationRouter, UserStore } from "@webpack/common";

import { openLog } from "./LogModal";
import { settings } from "./settings";
import { addEntry, channelLabel, forget, fromRaw, fromStore, isGhostPing, load, RawMessage, recall, remember, shouldLog, Snapshot, unload } from "./store";
import style from "./style.css?managed";

function LoggerIcon({ height = 20, width = 20, className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" height={height} width={width} className={className} fill="currentColor">
            <path d="M5 3h11l3 3v15H5zM7 8v2h10V8zm0 4v2h10v-2zm0 4v2h7v-2z" />
        </svg>
    );
}

function notify(title: string, s: Snapshot, body: string) {
    const user = UserStore.getUser(s.authorId);
    showNotification({
        title,
        body: body || "(no text)",
        icon: user ? IconUtils.getUserAvatarURL(user, false, 64) : undefined,
        onClick: () => NavigationRouter.transitionTo(`/channels/${s.guildId ?? "@me"}/${s.channelId}`)
    });
}

function onDelete(id: string, channelId: string, bulk: boolean) {
    const stored = MessageStore.getMessage(channelId, id);
    const s = recall(id) ?? (stored ? fromStore(stored) : undefined);
    forget(id);
    if (!s || !shouldLog(s)) return;

    const ghostPing = settings.store.ghostPings && isGhostPing(s);
    if (!ghostPing && !(bulk ? settings.store.logBulkDeletes : settings.store.logDeletes)) return;
    addEntry("deleted", s, { ghostPing });

    const { notifyDeletes } = settings.store;
    if (ghostPing) notify(`Ghost ping from ${s.authorName}`, s, `${channelLabel(s.channelId)}: ${s.content}`);
    else if (!bulk && (notifyDeletes === "everywhere" || (notifyDeletes === "dms" && !s.guildId)))
        notify(`${s.authorName} deleted a message`, s, s.content);
}

function onUpdate(m: RawMessage) {
    const old = recall(m.id);
    if (!old) {
        const fresh = fromRaw(m);
        if (fresh) remember(fresh);
        return;
    }
    const now = fromRaw(m, old);
    if (!now) return;
    remember(now);
    if (m.content === undefined || m.content === old.content || !settings.store.logEdits || !shouldLog(now)) return;
    addEntry("edited", now, { before: old.content });
    if (settings.store.notifyEdits && !now.guildId) notify(`${now.authorName} edited a message`, now, `${old.content}\n→ ${now.content}`);
}

const userMenu: NavContextMenuPatchCallback = (children, { user }: { user?: User; }) => {
    if (!user) return;
    const ignored = settings.store.ignoreUsers.split(/[\s,]+/).includes(user.id);
    children.push(
        <Menu.MenuGroup>
            <Menu.MenuItem
                id="vc-deltalogger-user"
                label="Show in Deltalogger"
                action={() => openLog({ label: user.globalName || user.username, userId: user.id })}
            />
            <Menu.MenuItem
                id="vc-deltalogger-ignore"
                label={ignored ? "Stop ignoring in Deltalogger" : "Ignore in Deltalogger"}
                action={() => {
                    const list = settings.store.ignoreUsers.split(/[\s,]+/).filter(id => id && id !== user.id);
                    if (!ignored) list.push(user.id);
                    settings.store.ignoreUsers = list.join(", ");
                }}
            />
        </Menu.MenuGroup>
    );
};

const channelMenu: NavContextMenuPatchCallback = (children, { channel }: { channel?: Channel; }) => {
    if (!channel) return;
    children.push(
        <Menu.MenuItem
            id="vc-deltalogger-channel"
            label="Show in Deltalogger"
            action={() => openLog({ label: channelLabel(channel.id), channelId: channel.id })}
        />
    );
};

const guildMenu: NavContextMenuPatchCallback = (children, { guild }: { guild?: Guild; }) => {
    if (!guild) return;
    children.push(
        <Menu.MenuItem
            id="vc-deltalogger-guild"
            label="Show in Deltalogger"
            action={() => openLog({ label: guild.name, guildId: guild.id })}
        />
    );
};

export default definePlugin({
    name: "Deltalogger",
    description: "Keeps deleted messages, every edit and ghost pings, even after a restart, with a searchable log, filters, ignore lists and notifications.",
    authors: [Devs.Narehatechi],
    settings,
    managedStyle: style,

    flux: {
        MESSAGE_CREATE({ message, optimistic }: { message: RawMessage; optimistic?: boolean; }) {
            if (optimistic) return;
            const s = fromRaw(message);
            if (s) remember(s);
        },
        LOAD_MESSAGES_SUCCESS({ messages }: { messages: RawMessage[]; }) {
            for (const m of messages) {
                const s = fromRaw(m);
                if (s) remember(s);
            }
        },
        MESSAGE_UPDATE({ message }: { message: RawMessage; }) {
            onUpdate(message);
        },
        MESSAGE_DELETE({ id, channelId, mlDeleted }: { id: string; channelId: string; mlDeleted?: boolean; }) {
            if (!mlDeleted) onDelete(id, channelId, false);
        },
        MESSAGE_DELETE_BULK({ ids, channelId }: { ids: string[]; channelId: string; }) {
            for (const id of ids) onDelete(id, channelId, true);
        }
    },

    contextMenus: {
        "user-context": userMenu,
        "channel-context": channelMenu,
        "thread-context": channelMenu,
        "guild-context": guildMenu
    },

    headerBarButton: {
        icon: LoggerIcon,
        render: () => <HeaderBarButton icon={LoggerIcon} tooltip="Deltalogger" onClick={() => openLog()} />
    },

    toolboxActions: {
        "Open Deltalogger": () => openLog()
    },

    commands: [{
        name: "deltalogger",
        description: "Open the Deltalogger log.",
        inputType: ApplicationCommandInputType.BUILT_IN,
        execute: () => openLog()
    }],

    start: load,
    stop: unload
});
