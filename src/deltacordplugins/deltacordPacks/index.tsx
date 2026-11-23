/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings, SettingsStore } from "@api/Settings";
import { Button } from "@components/Button";
import { Paragraph } from "@components/Paragraph";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import { relaunch } from "@utils/native";
import definePlugin from "@utils/types";
import { chooseFile, saveFile } from "@utils/web";
import { Alerts, showToast, Toasts } from "@webpack/common";

const logger = new Logger("DeltacordPacks");

interface Pack {
    format: "deltacord-pack";
    version: 1;
    createdAt: number;
    plugins: Record<string, Record<string, unknown>>;
    quickCss: string;
    themeLinks: string[];
    enabledThemeLinks: string[];
}

function isPack(value: unknown): value is Pack {
    if (typeof value !== "object" || value === null) return false;
    const p = value as Partial<Pack>;
    return p.format === "deltacord-pack" && typeof p.plugins === "object" && p.plugins !== null
        && typeof p.quickCss === "string" && Array.isArray(p.themeLinks) && Array.isArray(p.enabledThemeLinks);
}

async function exportPack() {
    const { plugins, themeLinks, enabledThemeLinks } = SettingsStore.plain;
    const pack: Pack = {
        format: "deltacord-pack",
        version: 1,
        createdAt: Date.now(),
        plugins,
        quickCss: await VencordNative.quickCss.get(),
        themeLinks,
        enabledThemeLinks
    };
    saveFile(new File([JSON.stringify(pack, null, 4)], "my-deltacord.deltapack", { type: "application/json" }));
}

async function importPack() {
    const file = await chooseFile(".deltapack,application/json");
    if (!file) return;

    let pack: unknown;
    try {
        pack = JSON.parse(await file.text());
    } catch (err) {
        logger.error("Couldn't read the pack", err);
    }
    if (!isPack(pack)) {
        showToast("That file isn't a Deltacord pack.", Toasts.Type.FAILURE);
        return;
    }

    const known = Object.keys(pack.plugins).filter(name => name in Settings.plugins);
    Alerts.show({
        title: "Apply this Deltacord pack?",
        body: `It sets up ${known.length} plugins, your QuickCSS and ${pack.themeLinks.length} theme links. Discord restarts afterwards.`,
        confirmText: "Apply",
        cancelText: "Cancel",
        async onConfirm() {
            for (const name of known) Settings.plugins[name] = { ...Settings.plugins[name], ...pack.plugins[name] };
            Settings.themeLinks = pack.themeLinks;
            Settings.enabledThemeLinks = pack.enabledThemeLinks;
            await VencordNative.quickCss.set(pack.quickCss);
            relaunch();
        }
    });
}

function About() {
    return (
        <>
            <Paragraph>
                A Deltacord pack is one file with your plugins and their settings, your QuickCSS and your theme links, ready to share or keep as a backup. Your account and cloud details are never included.
            </Paragraph>
            <div className={Margins.top8} style={{ display: "flex", gap: 8 }}>
                <Button onClick={exportPack}>Export pack</Button>
                <Button variant="secondary" onClick={importPack}>Import pack</Button>
            </div>
        </>
    );
}

export default definePlugin({
    name: "DeltacordPacks",
    description: "Save your whole setup as one shareable .deltapack file, or load someone else's.",
    authors: [Devs.Narehatechi],
    settingsAboutComponent: About,
    toolboxActions: {
        "Export Deltacord pack": exportPack,
        "Import Deltacord pack": importPack
    }
});
