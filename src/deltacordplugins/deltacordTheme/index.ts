/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import fontBase64 from "file://../../splash/DeterminationMono.ttf?base64";

const PALETTES = {
    darkWorld: { accent: "#ff8c1a", accentHover: "#ffa64d", danger: "#ff3b3b" },
    crimson: { accent: "#e0243a", accentHover: "#ff4d5e", danger: "#ff3b3b" },
} as const;

const settings = definePluginSettings({
    palette: {
        type: OptionType.SELECT,
        description: "The colors Discord uses.",
        options: [
            { label: "Dark World (black, white and orange)", value: "darkWorld", default: true },
            { label: "Crimson (black, white and red)", value: "crimson" },
            { label: "Discord's own colors", value: "off" }
        ],
        onChange: apply
    },
    font: {
        type: OptionType.BOOLEAN,
        description: "Use the Determination Mono font everywhere.",
        default: true,
        onChange: apply
    }
});

const FONT_CSS = `
@font-face { font-family: "Determination Mono"; src: url(data:font/ttf;base64,${fontBase64}) format("truetype"); }
:root, .theme-dark, .theme-light, .theme-darker, .theme-midnight, .visual-refresh {
    --font-primary: "Determination Mono", "gg sans", sans-serif;
    --font-display: "Determination Mono", "gg sans", sans-serif;
    --font-headline: "Determination Mono", "gg sans", sans-serif;
    --font-code: "Determination Mono", monospace;
}
body { font-family: var(--font-primary); }`;

function paletteCss({ accent, accentHover, danger }: { accent: string; accentHover: string; danger: string; }) {
    return `
:root:root, .theme-dark.theme-dark, .theme-light.theme-light, .theme-darker.theme-darker, .theme-midnight.theme-midnight, .visual-refresh.visual-refresh {
    --background-base-lowest: #000000;
    --background-base-lower: #050505;
    --background-base-lower-alt: #050505;
    --background-base-low: #0a0a0a;
    --background-surface-high: #101010;
    --background-surface-higher: #151515;
    --background-surface-highest: #1a1a1a;
    --background-primary: #000000;
    --background-secondary: #050505;
    --background-secondary-alt: #0a0a0a;
    --background-tertiary: #000000;
    --background-floating: #0a0a0a;
    --modal-background: #000000;
    --chat-background: #000000;
    --channeltextarea-background: #0a0a0a;
    --background-modifier-hover: rgba(255, 255, 255, 0.06);
    --background-modifier-active: rgba(255, 255, 255, 0.1);
    --background-modifier-selected: rgba(255, 255, 255, 0.12);
    --background-modifier-accent: rgba(255, 255, 255, 0.25);
    --background-mod-subtle: rgba(255, 255, 255, 0.06);
    --background-mod-normal: rgba(255, 255, 255, 0.1);
    --background-mod-strong: rgba(255, 255, 255, 0.16);
    --background-mod-muted: rgba(255, 255, 255, 0.04);
    --border-subtle: rgba(255, 255, 255, 0.35);
    --border-normal: rgba(255, 255, 255, 0.55);
    --border-strong: #ffffff;
    --text-default: #ffffff;
    --text-normal: #ffffff;
    --text-strong: #ffffff;
    --text-subtle: #c8c8c8;
    --text-muted: #a0a0a0;
    --header-primary: #ffffff;
    --header-secondary: #c8c8c8;
    --text-link: ${accent};
    --text-brand: ${accent};
    --text-danger: ${danger};
    --text-feedback-critical: ${danger};
    --interactive-normal: #c8c8c8;
    --interactive-hover: #ffffff;
    --interactive-active: #ffffff;
    --interactive-muted: #5a5a5a;
    --interactive-icon-default: #c8c8c8;
    --interactive-icon-hover: #ffffff;
    --interactive-icon-active: #ffffff;
    --brand-500: ${accent};
    --brand-560: ${accentHover};
    --brand-experiment: ${accent};
    --brand-experiment-560: ${accentHover};
    --button-filled-brand-background: ${accent};
    --button-filled-brand-background-hover: ${accentHover};
    --scrollbar-auto-thumb: ${accent};
    --scrollbar-thin-thumb: ${accent};
}`;
}

let style: HTMLStyleElement | undefined;

function apply() {
    if (!style) return;
    const { palette, font } = settings.store;
    style.textContent = (font ? FONT_CSS : "") + (palette in PALETTES ? paletteCss(PALETTES[palette as keyof typeof PALETTES]) : "");
}

export default definePlugin({
    name: "DeltacordTheme",
    description: "Deltacord's default look: black, white and orange, in the Determination Mono font.",
    authors: [Devs.Narehatechi],
    enabledByDefault: true,
    settings,
    start() {
        style = document.createElement("style");
        style.id = "deltacord-theme";
        document.head.append(style);
        apply();
    },
    stop() {
        style?.remove();
        style = undefined;
    }
});
