/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { Paragraph } from "@components/Paragraph";
import { classNameFactory } from "@utils/css";
import { copyWithToast } from "@utils/discord";
import { useForceUpdater } from "@utils/react";
import { saveFile } from "@utils/web";
import { Alerts, MaskedLink, Modal, NavigationRouter, openModal, TextInput, useEffect, useState } from "@webpack/common";

import { clearLog, Entry, getLog, removeEntry, subscribe } from "./store";

const cl = classNameFactory("vc-deltalogger-");
const PAGE = 100;

export interface Focus {
    label: string;
    userId?: string;
    channelId?: string;
    guildId?: string;
}

type Tab = "all" | "deleted" | "edited" | "ghost";
const TABS: { id: Tab; label: string; }[] = [
    { id: "all", label: "All" },
    { id: "deleted", label: "Deleted" },
    { id: "edited", label: "Edited" },
    { id: "ghost", label: "Ghost pings" }
];

function matches(e: Entry, tab: Tab, query: string, focus?: Focus) {
    if (tab === "ghost" ? !e.ghostPing : tab !== "all" && e.kind !== tab) return false;
    if (focus?.userId && e.message.authorId !== focus.userId) return false;
    if (focus?.channelId && e.message.channelId !== focus.channelId) return false;
    if (focus?.guildId && e.message.guildId !== focus.guildId) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return [e.message.content, e.before ?? "", e.message.authorName, e.channelName, e.guildName]
        .some(text => text.toLowerCase().includes(q));
}

function jump(e: Entry) {
    NavigationRouter.transitionTo(`/channels/${e.message.guildId ?? "@me"}/${e.message.channelId}/${e.message.id}`);
}

function EntryCard({ entry, onClose }: { entry: Entry; onClose(): void; }) {
    const { message } = entry;
    const label = entry.ghostPing ? "Ghost ping" : entry.kind === "edited" ? "Edited" : "Deleted";
    return (
        <div className={cl("entry", entry.ghostPing ? "ghost" : entry.kind)}>
            <div className={cl("head")}>
                <span className={cl("tag")}>{label}</span>
                <span className={cl("author")}>{message.authorName}</span>
                <span className={cl("where")}>{entry.channelName} · {entry.guildName}</span>
                <span className={cl("time")}>{new Date(entry.at).toLocaleString()}</span>
            </div>
            {entry.kind === "edited" && (
                <div className={cl("before")}>{entry.before || "(no text)"}</div>
            )}
            <div className={cl("content")}>{message.content || "(no text)"}</div>
            {message.attachments.map(a => (
                <MaskedLink key={a.url} href={a.url}>{a.name}</MaskedLink>
            ))}
            <div className={cl("actions")}>
                <Button size="small" variant="secondary" onClick={() => { jump(entry); onClose(); }}>Jump</Button>
                <Button size="small" variant="secondary" onClick={() => copyWithToast(entry.before ? `${entry.before}\n→ ${message.content}` : message.content)}>Copy</Button>
                <Button size="small" variant="dangerSecondary" onClick={() => removeEntry(entry.key)}>Remove</Button>
            </div>
        </div>
    );
}

function LogView({ focus: initialFocus, onClose }: { focus?: Focus; onClose(): void; }) {
    const update = useForceUpdater();
    useEffect(() => subscribe(update), []);
    const [tab, setTab] = useState<Tab>("all");
    const [query, setQuery] = useState("");
    const [focus, setFocus] = useState(initialFocus);
    const [shown, setShown] = useState(PAGE);

    const log = getLog();
    const results = log.filter(e => matches(e, tab, query, focus));
    const counts = {
        deleted: log.filter(e => e.kind === "deleted").length,
        edited: log.filter(e => e.kind === "edited").length,
        ghost: log.filter(e => e.ghostPing).length
    };

    return (
        <div className={cl("view")}>
            <Paragraph>
                {counts.deleted} deleted · {counts.edited} edited · {counts.ghost} ghost pings, kept on this computer.
            </Paragraph>
            <div className={cl("toolbar")}>
                <TextInput value={query} onChange={(v: string) => { setQuery(v); setShown(PAGE); }} placeholder="Search text, people, channels or servers" />
                <div className={cl("tabs")}>
                    {TABS.map(t => (
                        <Button key={t.id} size="small" variant={t.id === tab ? "primary" : "secondary"} onClick={() => { setTab(t.id); setShown(PAGE); }}>
                            {t.label}
                        </Button>
                    ))}
                    {focus && (
                        <Button size="small" variant="secondary" onClick={() => setFocus(undefined)}>
                            Only {focus.label} ✕
                        </Button>
                    )}
                </div>
            </div>
            {results.length === 0
                ? <Paragraph className={cl("empty")}>* Nothing here yet. Deleted and edited messages will show up as they happen.</Paragraph>
                : (
                    <div className={cl("list")}>
                        {results.slice(0, shown).map(e => <EntryCard key={e.key} entry={e} onClose={onClose} />)}
                        {results.length > shown && (
                            <Button variant="secondary" onClick={() => setShown(shown + PAGE)}>
                                Show {Math.min(PAGE, results.length - shown)} more
                            </Button>
                        )}
                    </div>
                )}
        </div>
    );
}

const SafeLogView = ErrorBoundary.wrap(LogView, { noop: true });

function exportLog() {
    const file = new File([JSON.stringify(getLog(), null, 4)], `deltalogger-${new Date().toISOString().slice(0, 10)}.json`, { type: "application/json" });
    saveFile(file);
}

function confirmClear() {
    Alerts.show({
        title: "Clear the whole log?",
        body: "Every saved deleted and edited message will be gone for good.",
        confirmText: "Clear",
        cancelText: "Cancel",
        onConfirm: clearLog
    });
}

export function openLog(focus?: Focus) {
    openModal(props => (
        <Modal
            {...props}
            size="xl"
            title="Deltalogger"
            subtitle="Deleted messages, edits and ghost pings."
            actions={[
                { text: "Export", variant: "secondary", onClick: exportLog },
                { text: "Clear log", variant: "critical-primary", onClick: confirmClear }
            ]}
        >
            <SafeLogView focus={focus} onClose={props.onClose} />
        </Modal>
    ));
}
