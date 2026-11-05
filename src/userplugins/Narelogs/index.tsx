/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption } from "@api/Commands";
import * as DataStore from "@api/DataStore";
import { isPluginEnabled } from "@api/PluginManager";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { showToast, Toasts } from "@webpack/common";

import "./style.css";

const STORE = "narecord-narelogs";
const CACHE_CAP = 600;
const EPHEMERAL = 64;

type Row = {
    id: string;
    kind: "deleted" | "edited" | "sent";
    content: string;
    prev?: string;
    author?: string;
    channelId?: string;
    guildId?: string | null;
    at: number;
};

const cache = new Map<string, { channelId: string; guildId: string | null; author: string; content: string; }>();
let journal: Row[] = [];

const mlOff = () => !isPluginEnabled("MessageLogger");

function hex(v: string, fallback: string) {
    const t = (v || "").trim();
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(t) ? t : fallback;
}

function sync() {
    const r = document.documentElement;
    const s = settings.store;
    r.classList.add("narelogs-root");
    r.classList.toggle("narelogs-strobe", s.motion && s.strobe);
    r.classList.toggle("narelogs-quake", s.motion && s.quake);
    r.classList.toggle("narelogs-boom", s.motion && s.boom);
    r.classList.toggle("narelogs-neon", s.motion && s.neon);
    r.classList.toggle("narelogs-ring", s.motion && s.ring);
    r.classList.toggle("narelogs-scan", s.motion && s.scan);
    r.classList.toggle("narelogs-glint", s.motion && s.glint);
    r.classList.toggle("narelogs-hide-box", !s.showBox);
    r.style.setProperty("--narelogs-gold", hex(s.gold, "#e4c04a"));
    r.style.setProperty("--narelogs-rose", hex(s.rose, "#8b3a44"));
    r.style.setProperty("--narelogs-cream", hex(s.cream, "#fff6e4"));
    r.style.setProperty("--narelogs-speed", String(s.speed || 1));
}

const settings = definePluginSettings({
    motion: { type: OptionType.BOOLEAN, description: "Master motion switch.", default: true, onChange: sync },
    quake: { type: OptionType.BOOLEAN, description: "Shake the deleted message.", default: true, onChange: sync },
    strobe: { type: OptionType.BOOLEAN, description: "Gold/rose flash on delete.", default: true, onChange: sync },
    boom: { type: OptionType.BOOLEAN, description: "Pop/scale on delete.", default: true, onChange: sync },
    neon: { type: OptionType.BOOLEAN, description: "Neon glow on text and label.", default: true, onChange: sync },
    ring: { type: OptionType.BOOLEAN, description: "Ring pulse on avatars.", default: true, onChange: sync },
    scan: { type: OptionType.BOOLEAN, description: "Scanline on the gone box.", default: true, onChange: sync },
    glint: { type: OptionType.BOOLEAN, description: "Glint sweep on the gone box.", default: true, onChange: sync },
    speed: {
        type: OptionType.SLIDER,
        description: "Animation speed (higher is faster).",
        default: 1,
        markers: [0.5, 1, 1.5, 2],
        stickToMarkers: true,
        onChange: sync
    },
    gold: { type: OptionType.STRING, description: "Gold hex.", default: "#e4c04a", onChange: sync },
    rose: { type: OptionType.STRING, description: "Rose hex.", default: "#8b3a44", onChange: sync },
    cream: { type: OptionType.STRING, description: "Cream hex.", default: "#fff6e4", onChange: sync },
    kicker: { type: OptionType.STRING, description: "Label on deleted messages.", default: "gone" },
    goneText: { type: OptionType.STRING, description: "Line under the label.", default: "Nnaa. This one was deleted." },
    showBox: { type: OptionType.BOOLEAN, description: "Show the gone box under deleted messages.", default: true, onChange: sync },
    toastDeletes: { type: OptionType.BOOLEAN, description: "Toast when a message is deleted.", default: false },
    ignoreBots: { type: OptionType.BOOLEAN, description: "Ignore bot messages in the journal.", default: true },
    persistSends: { type: OptionType.BOOLEAN, description: "Also keep sent messages in /narelogs.", default: false }
});

function seen(id: string, c: { channelId: string; guildId: string | null; author: string; content: string; }) {
    cache.set(id, c);
    if (cache.size > CACHE_CAP) cache.delete(cache.keys().next().value as string);
}

function remember(row: Row) {
    journal = [row, ...journal].slice(0, 100);
    void DataStore.set(STORE, journal);
}

function linkOf(r: Row) {
    if (!r.channelId) return "";
    return `https://discord.com/channels/${r.guildId ?? "@me"}/${r.channelId}/${r.id}`;
}

function goneBox() {
    const box = document.createElement("div");
    box.className = "narelogs-gone";
    const bar = document.createElement("span");
    bar.className = "narelogs-gone-bar";
    const kicker = document.createElement("span");
    kicker.className = "narelogs-gone-kicker";
    kicker.textContent = settings.store.kicker || "gone";
    const line = document.createElement("span");
    line.className = "narelogs-gone-text";
    line.textContent = settings.store.goneText || "Nnaa. This one was deleted.";
    box.append(bar, kicker, line);
    return box;
}

function markDeleted(el: Element) {
    el.classList.add("narelogs-deleted");
    if (!settings.store.showBox) return;
    if (el.querySelector(":scope > .narelogs-gone")) return;
    el.appendChild(goneBox());
}

function paint() {
    document.querySelectorAll('[id*="chat-messages"] .messagelogger-deleted').forEach(markDeleted);
}

let obs: MutationObserver | null = null;

function watch() {
    obs?.disconnect();
    obs = new MutationObserver(() => paint());
    obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    paint();
}

function handleDelete(msgCache: any, data: { ids: string[]; id: string; mlDeleted?: boolean; }, isBulk: boolean) {
    try {
        if (msgCache == null || (!isBulk && !msgCache.has(data.id))) return msgCache;
        const mutate = (id: string) => {
            const msg = msgCache.get(id);
            if (!msg) return;
            if (data.mlDeleted || (msg.flags & EPHEMERAL) === EPHEMERAL || (settings.store.ignoreBots && msg.author?.bot)) {
                msgCache = msgCache.remove(id);
            } else {
                msgCache = msgCache.update(id, m => m.set("deleted", true));
            }
        };
        if (isBulk) data.ids.forEach(mutate); else mutate(data.id);
    } catch { }
    return msgCache;
}

export default definePlugin({
    name: "Narelogs",
    description: "Independent abyss logger. Keeps deleted messages in place with den styling and journals content — no other plugins required.",
    authors: [Devs.Narehatechi],
    settings,
    dependencies: ["CommandsAPI", "MessageEventsAPI"],
    patches: [
        {
            find: '"MessageStore"',
            predicate: mlOff,
            replacement: [
                {
                    match: /(?<=MESSAGE_DELETE:function\((\i)\)\{)(?=let.{0,100}(\i\.\i)\.getOrCreate)/,
                    replace: `
                        let cache = $2.getOrCreate($1.channelId);
                        cache = $self.handleDelete(cache, $1, false);
                        $2.commit(cache);
                        return;
                    `
                },
                {
                    match: /(?<=MESSAGE_DELETE_BULK:function\((\i)\){)(?=let.{0,100}(\i\.\i)\.getOrCreate)/,
                    replace: `
                        let cache = $2.getOrCreate($1.channelId);
                        cache = $self.handleDelete(cache, $1, true);
                        $2.commit(cache);
                        return;
                    `
                },
                {
                    match: /(?<=getLastEditableMessage\(\i\)\{.{0,200}\.find\((\i)=>)/,
                    replace: "!$1.deleted &&"
                }
            ]
        },
        {
            find: "}addReaction(",
            predicate: mlOff,
            replacement: {
                match: /this\.customRenderedContent=(\i)\.customRenderedContent,/,
                replace: "this.customRenderedContent = $1.customRenderedContent,this.deleted = $1.deleted || false,"
            }
        },
        {
            find: ".PREMIUM_REFERRAL&&(",
            predicate: mlOff,
            replacement: {
                match: /(?<=null!=\i\.edited_timestamp\)return )\i\(\i,\{reactions:(\i)\.reactions.{0,50}\}\)/,
                replace: "Object.assign($&,{ deleted:$1.deleted })"
            }
        },
        {
            find: "Message must not be a thread starter message",
            predicate: mlOff,
            replacement: {
                match: /\)\("li",\{(.+?),className:/,
                replace: ')("li",{$1,className:(arguments[0].message.deleted ? "messagelogger-deleted " : "")+'
            }
        },
        {
            find: '"ReferencedMessageStore"',
            predicate: mlOff,
            replacement: [
                { match: /(?<=MESSAGE_DELETE:function\(\i\)\{)/, replace: "return;" },
                { match: /(?<=MESSAGE_DELETE_BULK:function\(\i\)\{)/, replace: "return;" }
            ]
        },
        {
            find: ".MESSAGE,commandTargetId:",
            predicate: mlOff,
            replacement: {
                match: /children:(\[""===.+?\])/,
                replace: "children:arguments[0].message.deleted?[]:$1"
            }
        }
    ],
    handleDelete,
    commands: [
        {
            name: "narelogs",
            description: "Dump recent deleted/edited log.",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [{ name: "count", description: "How many.", type: ApplicationCommandOptionType.INTEGER, required: false }],
            execute: opts => {
                const n = Math.max(1, Math.min(20, Number(findOption(opts, "count", 8)) || 8));
                if (!journal.length) return { content: "Nnaa. Journal's empty." };
                const lines = journal.slice(0, n).map((r, i) => {
                    const when = new Date(r.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                    const who = r.author ? `**${r.author}**` : "unknown";
                    const body = r.kind === "edited" && r.prev !== undefined
                        ? `${r.prev} → ${r.content}`
                        : r.content || "(no text)";
                    const link = linkOf(r);
                    return `${i + 1}. [${r.kind}] ${who} @ ${when}: ${body}` + (link ? `\n${link}` : "");
                });
                return { content: "**Narelogs**\n" + lines.join("\n") };
            }
        },
        {
            name: "narelogs-clear",
            description: "Wipe the journal.",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: async () => {
                journal = [];
                await DataStore.set(STORE, journal);
                return { content: "Nnaa. Journal's clean." };
            }
        }
    ],
    flux: {
        MESSAGE_CREATE({ message, channelId, guildId }: any) {
            if (!message?.id || (settings.store.ignoreBots && message.author?.bot)) return;
            seen(message.id, {
                channelId: channelId ?? message.channel_id,
                guildId: guildId ?? message.guild_id ?? null,
                author: message.author?.username ?? "unknown",
                content: message.content ?? ""
            });
        },
        MESSAGE_DELETE({ id, channelId, guildId }: any) {
            const m = cache.get(id);
            if (m) cache.delete(id);
            remember({
                id,
                kind: "deleted",
                content: m?.content ?? "(went down before I could read it)",
                author: m?.author,
                channelId: channelId ?? m?.channelId,
                guildId: guildId ?? m?.guildId ?? null,
                at: Date.now()
            });
            if (settings.store.toastDeletes) showToast("Nnaa. This one was deleted.", Toasts.Type.MESSAGE);
            requestAnimationFrame(paint);
        },
        MESSAGE_UPDATE({ message }: any) {
            if (!message?.id || (settings.store.ignoreBots && message.author?.bot)) return;
            const m = cache.get(message.id);
            if (m && message.content !== undefined && message.content !== m.content) {
                remember({
                    id: message.id,
                    kind: "edited",
                    content: message.content,
                    prev: m.content,
                    author: m.author,
                    channelId: m.channelId,
                    guildId: m.guildId,
                    at: Date.now()
                });
                m.content = message.content;
            } else if (!m) {
                seen(message.id, {
                    channelId: message.channel_id,
                    guildId: message.guild_id ?? null,
                    author: message.author?.username ?? "unknown",
                    content: message.content ?? ""
                });
            }
        }
    },
    onBeforeMessageSend(channelId, message) {
        if (!settings.store.persistSends || !message?.content) return;
        remember({ id: String(Date.now()), kind: "sent", content: message.content, channelId, at: Date.now() });
    },
    async start() {
        journal = (await DataStore.get(STORE)) ?? [];
        sync();
        watch();
    },
    stop() {
        obs?.disconnect();
        obs = null;
        const r = document.documentElement;
        r.classList.remove("narelogs-root", "narelogs-strobe", "narelogs-quake", "narelogs-boom", "narelogs-neon", "narelogs-ring", "narelogs-scan", "narelogs-glint", "narelogs-hide-box");
        r.style.removeProperty("--narelogs-gold");
        r.style.removeProperty("--narelogs-rose");
        r.style.removeProperty("--narelogs-cream");
        r.style.removeProperty("--narelogs-speed");
        document.querySelectorAll(".narelogs-gone").forEach(el => el.remove());
    }
});
