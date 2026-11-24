/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { Message } from "@vencord/discord-types";
import { ChannelStore, GuildMemberStore, GuildStore, SnowflakeUtils, UserStore } from "@webpack/common";

import { settings } from "./settings";

export interface RawMessage {
    id: string;
    channel_id: string;
    guild_id?: string;
    content?: string;
    author?: { id: string; username: string; global_name?: string | null; bot?: boolean; };
    attachments?: { filename: string; url: string; }[];
    mentions?: { id: string; }[];
    mention_everyone?: boolean;
    mention_roles?: string[];
}

export interface Snapshot {
    id: string;
    channelId: string;
    guildId?: string;
    authorId: string;
    authorName: string;
    bot: boolean;
    content: string;
    attachments: { name: string; url: string; }[];
    mentionsMe: boolean;
}

export type EntryKind = "deleted" | "edited";

export interface Entry {
    key: string;
    kind: EntryKind;
    at: number;
    ghostPing: boolean;
    channelName: string;
    guildName: string;
    message: Snapshot;
    /** For edits: the text before the edit. */
    before?: string;
}

const KEY = "Deltalogger_log";
const cache = new Map<string, Snapshot>();
let log: Entry[] = [];
let saveTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

const ids = (list: string) => new Set(list.split(/[\s,]+/).filter(Boolean));

function mentionsMe(guildId: string | undefined, userIds: string[], everyone: boolean, roles: string[]) {
    const me = UserStore.getCurrentUser();
    if (everyone || userIds.includes(me.id)) return true;
    if (!guildId || !roles.length) return false;
    const myRoles = GuildMemberStore.getMember(guildId, me.id)?.roles ?? [];
    return roles.some(r => myRoles.includes(r));
}

export function fromRaw(m: RawMessage, previous?: Snapshot): Snapshot | undefined {
    if (!m.author && !previous) return;
    const guildId = m.guild_id ?? previous?.guildId ?? ChannelStore.getChannel(m.channel_id)?.guild_id ?? undefined;
    return {
        id: m.id,
        channelId: m.channel_id,
        guildId,
        authorId: m.author?.id ?? previous?.authorId ?? "",
        authorName: m.author ? m.author.global_name || m.author.username : previous?.authorName ?? "Someone",
        bot: m.author?.bot ?? previous?.bot ?? false,
        content: m.content ?? previous?.content ?? "",
        attachments: m.attachments?.map(a => ({ name: a.filename, url: a.url })) ?? previous?.attachments ?? [],
        mentionsMe: m.mentions
            ? mentionsMe(guildId, m.mentions.map(u => u.id), !!m.mention_everyone, m.mention_roles ?? [])
            : previous?.mentionsMe ?? false
    };
}

export function fromStore(m: Message): Snapshot {
    const guildId = ChannelStore.getChannel(m.channel_id)?.guild_id ?? undefined;
    return {
        id: m.id,
        channelId: m.channel_id,
        guildId,
        authorId: m.author.id,
        authorName: m.author.globalName || m.author.username,
        bot: !!m.author.bot,
        content: m.content,
        attachments: m.attachments.map(a => ({ name: a.filename, url: a.url })),
        mentionsMe: mentionsMe(guildId, m.mentions ?? [], m.mentionEveryone, m.mentionRoles ?? [])
    };
}

export function remember(snapshot: Snapshot) {
    cache.delete(snapshot.id);
    cache.set(snapshot.id, snapshot);
    const limit = settings.store.cacheSize;
    while (cache.size > limit) cache.delete(cache.keys().next().value as string);
}

export const recall = (id: string) => cache.get(id);
export const forget = (id: string) => cache.delete(id);

export function shouldLog(s: Snapshot) {
    const { scope, ignoreBots, ignoreSelf, ignoreUsers, ignoreChannels, ignoreGuilds } = settings.store;
    if (scope === "dms" && s.guildId) return false;
    if (scope === "servers" && !s.guildId) return false;
    if (ignoreBots && s.bot) return false;
    if (ignoreSelf && s.authorId === UserStore.getCurrentUser().id) return false;
    if (ids(ignoreUsers).has(s.authorId) || ids(ignoreChannels).has(s.channelId)) return false;
    return !(s.guildId && ids(ignoreGuilds).has(s.guildId));
}

export const isGhostPing = (s: Snapshot) =>
    s.mentionsMe && Date.now() - SnowflakeUtils.extractTimestamp(s.id) <= settings.store.ghostPingMinutes * 60_000;

export function channelLabel(channelId: string) {
    const channel = ChannelStore.getChannel(channelId);
    if (!channel) return "unknown channel";
    if (channel.name) return `#${channel.name}`;
    const other = UserStore.getUser(channel.recipients?.[0] ?? "");
    return other ? `DM with ${other.globalName || other.username}` : "a DM";
}

export function addEntry(kind: EntryKind, message: Snapshot, extra: { before?: string; ghostPing?: boolean; } = {}) {
    log.unshift({
        key: `${kind}-${message.id}-${Date.now()}`,
        kind,
        at: Date.now(),
        ghostPing: !!extra.ghostPing,
        channelName: channelLabel(message.channelId),
        guildName: message.guildId ? GuildStore.getGuild(message.guildId)?.name ?? "a server" : "Direct Messages",
        message,
        before: extra.before
    });
    prune();
    changed();
}

function prune() {
    const oldest = Date.now() - settings.store.keepDays * 86_400_000;
    log = log.filter(e => e.at >= oldest).slice(0, settings.store.maxEntries);
}

function changed() {
    listeners.forEach(fn => fn());
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 1500);
}

export async function save() {
    clearTimeout(saveTimer);
    saveTimer = undefined;
    await DataStore.set(KEY, log);
}

export async function load() {
    log = await DataStore.get<Entry[]>(KEY) ?? [];
    prune();
    listeners.forEach(fn => fn());
}

export function unload() {
    if (saveTimer) void save();
    cache.clear();
}

export const getLog = () => log;

export function removeEntry(key: string) {
    log = log.filter(e => e.key !== key);
    changed();
}

export function clearLog() {
    log = [];
    changed();
}

export function subscribe(fn: () => void) {
    listeners.add(fn);
    return () => void listeners.delete(fn);
}
