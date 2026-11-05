/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption } from "@api/Commands";
import * as DataStore from "@api/DataStore";
import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { classNameFactory } from "@utils/css";
import { Margins } from "@utils/margins";
import { parseUrl } from "@utils/misc";
import { useForceUpdater } from "@utils/react";
import definePlugin, { IconComponent } from "@utils/types";
import { CommandArgument } from "@vencord/discord-types";
import { MaskedLink, Modal, openModal, showToast, TextArea, TextInput, Toasts, UserStore, useEffect, useState } from "@webpack/common";

import style from "./style.css?managed";

const STORE = "nareNotes-v1";
const cl = classNameFactory("vc-narenotes-");
const watchers = new Set<() => void>();

interface Find {
    id: string;
    title: string;
    finder: string;
    note?: string;
    image?: string;
    at: number;
}

let finds: Find[] = [];

function changed() {
    for (const fn of watchers) fn();
}

function isFind(value: unknown): value is Find {
    if (!value || typeof value !== "object") return false;
    if (!("id" in value) || !("title" in value) || !("finder" in value) || !("at" in value)) return false;
    return typeof value.id === "string"
        && typeof value.title === "string"
        && typeof value.finder === "string"
        && typeof value.at === "number";
}

async function persist() {
    await DataStore.set(STORE, finds);
    changed();
}

function pictureUrl(raw: string): string | undefined | false {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    const url = parseUrl(trimmed);
    if (!url || (url.protocol !== "https:" && url.protocol !== "http:")) return false;
    return trimmed;
}

async function stashFind(title: string, finder: string, note: string, image: string): Promise<string> {
    const titleText = title.trim();
    const finderText = finder.trim();
    if (!titleText) return "Nnaa. Name the find.";
    if (!finderText) return "Nnaa. Who found this one?";
    const imageValue = pictureUrl(image);
    if (imageValue === false) return "Nnaa. That picture URL isn't a link.";
    const noteText = note.trim();
    finds.unshift({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        title: titleText,
        finder: finderText,
        note: noteText || undefined,
        image: imageValue,
        at: Date.now()
    });
    await persist();
    return "Stashed **" + titleText + "**.";
}

async function dropFind(query: string): Promise<string> {
    const needle = query.trim().toLowerCase();
    if (!needle) return "Nnaa. Name the find to drop.";
    const index = finds.findIndex(f => f.id.toLowerCase() === needle || f.title.toLowerCase() === needle);
    if (index < 0) return "Nnaa. Not in the notebook.";
    const gone = finds[index];
    finds.splice(index, 1);
    await persist();
    return "Dropped **" + gone.title + "**.";
}

function listText() {
    if (!finds.length) return "Nnaa. Notebook's empty.";
    const body = finds.map((f, i) => {
        const bits = [
            (i + 1) + ". **" + f.title + "** — found by " + f.finder + " · <t:" + Math.floor(f.at / 1000) + ":R>"
        ];
        if (f.note) bits.push(f.note);
        if (f.image) bits.push(f.image);
        return bits.join("\n");
    }).join("\n\n");
    const text = "**Relic notebook**\n" + body;
    return text.length > 1900 ? text.slice(0, 1900) + " nnaa" : text;
}

function useNotebook() {
    const update = useForceUpdater();
    useEffect(() => {
        watchers.add(update);
        return () => { watchers.delete(update); };
    }, [update]);
    return finds;
}

function NotebookPanel() {
    const rows = useNotebook();
    const [title, setTitle] = useState("");
    const [finder, setFinder] = useState(UserStore.getCurrentUser().username);
    const [note, setNote] = useState("");
    const [image, setImage] = useState("");

    return (
        <div className={cl("panel")}>
            <Paragraph>Field notes for relics and finds. Local to this client.</Paragraph>
            <div className={cl("form")}>
                <Heading>Title</Heading>
                <TextInput value={title} onChange={setTitle} placeholder="Curse-repelling vessel" />
                <div className={cl("row")}>
                    <div>
                        <Heading>Who found it</Heading>
                        <TextInput value={finder} onChange={setFinder} placeholder="Nanachi" />
                    </div>
                    <div>
                        <Heading>Picture URL</Heading>
                        <TextInput value={image} onChange={setImage} placeholder="https://" />
                    </div>
                </div>
                <Heading>Note</Heading>
                <TextArea value={note} onChange={setNote} placeholder="Smells like the 4th layer. Handle gently." rows={3} />
                <Button
                    className={Margins.top8}
                    onClick={async () => {
                        const msg = await stashFind(title, finder, note, image);
                        if (msg.startsWith("Stashed")) {
                            setTitle("");
                            setNote("");
                            setImage("");
                            showToast(msg.replace(/\*\*/g, ""), Toasts.Type.SUCCESS);
                        } else {
                            showToast(msg, Toasts.Type.FAILURE);
                        }
                    }}
                >
                    Stash find
                </Button>
            </div>
            {!rows.length ? (
                <Paragraph className={cl("empty")}>Nnaa. Notebook's empty. Stash a find.</Paragraph>
            ) : (
                <div className={cl("list")}>
                    {rows.map(row => (
                        <div key={row.id} className={cl("card")}>
                            <div className={cl("body")}>
                                <div className={cl("title")}>{row.title}</div>
                                <div className={cl("meta")}>Found by {row.finder} · {new Date(row.at).toLocaleString()}</div>
                                {row.note && <div className={cl("note")}>{row.note}</div>}
                                {row.image && (
                                    <>
                                        <MaskedLink href={row.image}>{row.image}</MaskedLink>
                                        <img src={row.image} alt="" className={cl("pic")} />
                                    </>
                                )}
                            </div>
                            <Button
                                size="small"
                                variant="dangerSecondary"
                                onClick={async () => {
                                    showToast((await dropFind(row.id)).replace(/\*\*/g, ""), Toasts.Type.MESSAGE);
                                }}
                            >
                                Drop
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const Panel = ErrorBoundary.wrap(NotebookPanel, { noop: true });

function openNotebook() {
    openModal(props => (
        <Modal {...props} size="lg" title="Relic notebook" subtitle="Finds stay on this client. Nnaa~">
            <Panel />
        </Modal>
    ));
}

const NotebookIcon: IconComponent = ({ height = 20, width = 20, className }) => (
    <svg width={width} height={height} className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M7 2h9a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 2v16h9V4H7zm2 2h5v2H9V6zm0 4h5v2H9v-2zm0 4h3v2H9v-2z" />
    </svg>
);

const NotebookButton: ChatBarButtonFactory = ({ isAnyChat }) => {
    if (!isAnyChat) return null;
    return (
        <ChatBarButton tooltip="Relic notebook" onClick={openNotebook} buttonProps={{ "aria-haspopup": "dialog" }}>
            <NotebookIcon />
        </ChatBarButton>
    );
};

const actionChoices = [
    { name: "add", displayName: "add", value: "add", label: "add" },
    { name: "list", displayName: "list", value: "list", label: "list" },
    { name: "drop", displayName: "drop", value: "drop", label: "drop" }
];

export default definePlugin({
    name: "NareNotes",
    description: "Field notebook for relics and finds. Title, finder, note, picture. Stays on this client.",
    authors: [{ name: "Narecord", id: 0n }],
    searchTerms: ["notebook", "relic", "notes", "finds"],
    dependencies: ["ChatInputButtonAPI", "CommandsAPI"],
    managedStyle: style,
    settingsAboutComponent: () => <Panel />,
    toolboxActions: {
        "Open relic notebook": openNotebook
    },
    chatBarButton: {
        icon: NotebookIcon,
        render: NotebookButton
    },
    commands: [{
        name: "narenotes",
        description: "Stash, list, or drop relic finds.",
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [
            {
                name: "action",
                description: "add, list, or drop",
                type: ApplicationCommandOptionType.STRING,
                required: true,
                choices: actionChoices
            },
            { name: "title", description: "Relic or find title", type: ApplicationCommandOptionType.STRING, required: false },
            { name: "finder", description: "Who found it", type: ApplicationCommandOptionType.STRING, required: false },
            { name: "note", description: "Optional field note", type: ApplicationCommandOptionType.STRING, required: false },
            { name: "image", description: "Optional picture URL", type: ApplicationCommandOptionType.STRING, required: false }
        ],
        async execute(opts: CommandArgument[]) {
            const action = findOption(opts, "action", "");
            const title = findOption(opts, "title", "");
            const finder = findOption(opts, "finder", "");
            const note = findOption(opts, "note", "");
            const image = findOption(opts, "image", "");
            if (action === "list") return { content: listText() };
            if (action === "add") return { content: await stashFind(title, finder, note, image) };
            if (action === "drop") return { content: await dropFind(title) };
            return { content: "add, list, or drop." };
        }
    }],
    async start() {
        const raw = await DataStore.get(STORE);
        finds = Array.isArray(raw) ? raw.filter(isFind) : [];
    }
});
