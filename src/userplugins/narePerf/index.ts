/*
 * SPDX-License-Identifier: GPL-3.0
 * Narecord, a Nanachi-themed Equicord/Vencord fork
 * Copyright (c) 2026 Narehatechi and Narecord contributors
 *
 * narePerf — first-party den userplugin.
 *
 * This repo is the Narelotl installer. Stock installs download Equicord's
 * desktop.asar, which cannot load a new plugin until Equicord is rebuilt with
 * this folder in src/userplugins. Narelotl still ships the source, enables
 * narePerf in settings.json, and injects the same default-ON CSS via QuickCSS
 * so fluff-kill works immediately.
 *
 * Enable: Narecord Settings → Plugins → narePerf (Narecord Plugin card).
 * Source-build: copy this folder to Equicord's src/userplugins/narePerf and
 * run `pnpm build`, then restart Discord.
 */

import { isPluginEnabled } from "@api/PluginManager";
import { definePluginSettings, Settings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import { isObject } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { findAll } from "@webpack";
import { FluxDispatcher } from "@webpack/common";

const log = new Logger("narePerf");
const STYLE_ID = "nr-nareperf-style";
const ROOT_CLASS = "nr-perf-plugin";
const PRESENCE_WINDOW_MS = 45_000;

interface SpringModule {
    Globals: { assign(options: { skipAnimation: boolean; }): void; };
    Springs: object;
}

let springs: SpringModule[] = [];
let started = false;
let savedWindowsMaterial: string | undefined;
let savedMacosVibrancy: string | undefined;
let savedMaterials = false;

let videoObserver: IntersectionObserver | null = null;
let domObserver: MutationObserver | null = null;
const pausedByUs = new WeakSet<HTMLVideoElement>();
const watchedVideos = new WeakSet<HTMLVideoElement>();
const presenceSeen = new Map<string, number>();

const isSpringGlobals = (v: unknown): v is SpringModule["Globals"] =>
    isObject(v) && "assign" in v && typeof (v as { assign?: unknown; }).assign === "function";

const isSpringModule = (v: unknown): v is SpringModule => {
    if (!isObject(v)) return false;
    const m = v as Partial<SpringModule>;
    return isSpringGlobals(m.Globals) && isObject(m.Springs);
};

function loadSprings() {
    try {
        springs = findAll(isSpringModule);
    } catch (err) {
        log.warn("spring modules not found", err);
        springs = [];
    }
}

function applySpringSkip(skip: boolean) {
    for (const s of springs) {
        try {
            s.Globals.assign({ skipAnimation: skip });
        } catch (err) {
            log.warn("spring skip failed", err);
        }
    }
}

function applyVibrancy(kill: boolean) {
    try {
        if (!savedMaterials) {
            savedWindowsMaterial = Settings.windowsMaterial;
            savedMacosVibrancy = Settings.macosVibrancyStyle as string | undefined;
            savedMaterials = true;
        }
        if (kill) {
            Settings.windowsMaterial = "none";
            Settings.macosVibrancyStyle = undefined;
            return;
        }
        if (savedWindowsMaterial !== undefined)
            Settings.windowsMaterial = savedWindowsMaterial as typeof Settings.windowsMaterial;
        Settings.macosVibrancyStyle = savedMacosVibrancy as typeof Settings.macosVibrancyStyle;
    } catch (err) {
        log.warn("vibrancy setting skipped", err);
    }
}

function isCallVideo(el: Element) {
    return !!el.closest('[class*="tile"], [class*="callContainer"], [class*="voiceChannel"], [class*="videoBackground"], [id*="popout"]');
}

function watchVideo(v: HTMLVideoElement) {
    if (watchedVideos.has(v) || isCallVideo(v)) return;
    watchedVideos.add(v);
    videoObserver?.observe(v);
}

function scanVideos(root: ParentNode) {
    if (root instanceof HTMLVideoElement) watchVideo(root);
    root.querySelectorAll?.("video").forEach(watchVideo);
}

function startMediaWatch() {
    stopMediaWatch();
    videoObserver = new IntersectionObserver(entries => {
        for (const e of entries) {
            const v = e.target as HTMLVideoElement;
            if (e.isIntersecting) {
                if (pausedByUs.has(v)) {
                    pausedByUs.delete(v);
                    void v.play().catch(() => { });
                }
            } else if (!v.paused && !v.ended) {
                pausedByUs.add(v);
                v.pause();
            }
        }
    }, { threshold: 0.05 });
    domObserver = new MutationObserver(muts => {
        for (const m of muts) for (const n of m.addedNodes) {
            if (n.nodeType === 1) scanVideos(n as Element);
        }
    });
    scanVideos(document);
    domObserver.observe(document.body, { childList: true, subtree: true });
}

function stopMediaWatch() {
    domObserver?.disconnect();
    videoObserver?.disconnect();
    domObserver = null;
    videoObserver = null;
    document.querySelectorAll("video").forEach(v => {
        if (pausedByUs.has(v)) {
            pausedByUs.delete(v);
            void v.play().catch(() => { });
        }
    });
}

function fluxInterceptor(e: any) {
    try {
        if (e.type === "TYPING_START") return settings.store.dropTyping ? false : undefined;
        if (!settings.store.presenceThrottle) return;
        if (e.type !== "PRESENCE_UPDATE" && e.type !== "PRESENCE_UPDATES") return;
        const users: { id?: string }[] = e.updates ?? (e.user ? [e.user] : []);
        if (!users.length) return;
        const now = Date.now();
        const allRecent = users.every(u => {
            const last = presenceSeen.get(String(u.id));
            return last !== undefined && now - last < PRESENCE_WINDOW_MS;
        });
        if (allRecent) return false;
        if (presenceSeen.size > 5000) presenceSeen.clear();
        for (const u of users) presenceSeen.set(String(u.id), now);
    } catch { }
}

function featureClass(name: string, on: boolean) {
    document.documentElement.classList.toggle(name, on);
}

function syncRootClasses() {
    const root = document.documentElement;
    root.classList.add(ROOT_CLASS);
    featureClass("nr-perf-kill-blur", settings.store.killBlur);
    featureClass("nr-perf-kill-motion", settings.store.killAnimations);
    featureClass("nr-perf-kill-acrylic", settings.store.killAcrylic);
    featureClass("nr-perf-kill-decor", settings.store.killDecorations);
    featureClass("nr-perf-quiet-gifs", settings.store.quietGifs);
    featureClass("nr-perf-contain", settings.store.containLists);
    featureClass("nr-perf-kill-shadow", settings.store.killShadows);
    featureClass("nr-perf-kill-willchange", settings.store.killWillChange);
}

function pluginCss(): string {
    return `
/* narePerf — fluff first. Do not restyle message text. */
html.nr-perf-kill-blur [class*="backdrop"],
html.nr-perf-kill-blur [class*="layer"] [class*="focusLock"],
html.nr-perf-kill-blur [class*="modal"],
html.nr-perf-kill-blur [class*="popout"],
html.nr-perf-kill-blur [class*="menu"],
html.nr-perf-kill-blur [style*="backdrop-filter"] {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
}
html.nr-perf-kill-blur [class*="backdrop"] {
    background-color: rgb(0 0 0 / 48%) !important;
}

html.nr-perf-kill-motion,
html.nr-perf-kill-motion *:not([class*="messageContent"]):not([class*="markup"]),
html.nr-perf-kill-motion *:not([class*="messageContent"]):not([class*="markup"])::before,
html.nr-perf-kill-motion *:not([class*="messageContent"]):not([class*="markup"])::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
}

html.nr-perf-kill-acrylic [class*="acrylic"],
html.nr-perf-kill-acrylic [class*="Acrylic"] {
    background-color: var(--background-secondary, #2b2d31) !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
}

html.nr-perf-kill-decor [class*="avatarDecoration"],
html.nr-perf-kill-decor [class*="AvatarDecoration"],
html.nr-perf-kill-decor [class*="profileEffect"],
html.nr-perf-kill-decor [class*="ProfileEffect"],
html.nr-perf-kill-decor [class*="confetti"],
html.nr-perf-kill-decor [class*="Confetti"],
html.nr-perf-kill-decor [class*="giftAnimation"],
html.nr-perf-kill-decor [class*="GiftAnimation"],
html.nr-perf-kill-decor [class*="hoverParticle"],
html.nr-perf-kill-decor [class*="HoverParticle"] {
    display: none !important;
    animation: none !important;
    visibility: hidden !important;
}

html.nr-perf-quiet-gifs img[class*="emoji"][src*="gif"],
html.nr-perf-quiet-gifs [class*="lottieIcon"],
html.nr-perf-quiet-gifs [class*="sticker"][class*="lottie"] {
    animation: none !important;
}

/* layout containment — offscreen rows skip layout and paint entirely */
html.nr-perf-contain [class*="messageListItem"],
html.nr-perf-contain [class*="members"] li,
html.nr-perf-contain [class*="sidebar"] ul li,
html.nr-perf-contain [class*="privateChannels"] li,
html.nr-perf-contain [class*="searchResult"] {
    content-visibility: auto;
    contain-intrinsic-size: auto 56px;
}
html.nr-perf-contain [class*="messageListItem"] [class*="embedWrapper"],
html.nr-perf-contain [class*="messageListItem"] [class*="attachment-"],
html.nr-perf-contain [class*="messageListItem"] [class*="mediaAttachmentsContainer"] {
    content-visibility: auto;
    contain-intrinsic-size: auto 120px;
}

/* per-frame paint cost — shadows repaint under every scrolled pixel */
html.nr-perf-kill-shadow [class] {
    box-shadow: none !important;
}
html.nr-perf-kill-shadow [class*="sidebar"],
html.nr-perf-kill-shadow [class*="chat"],
html.nr-perf-kill-shadow [class*="members"],
html.nr-perf-kill-shadow [class*="container"] {
    text-shadow: none !important;
}

/* compositor layer diet — Discord over-promotes layers via will-change */
html.nr-perf-kill-willchange [class]:not([class*="anim"]):not([class*="Anim"]):not([class*="scroller"]):not([class*="video"]) {
    will-change: auto !important;
}
`.trim();
}

function injectCss() {
    let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!el) {
        el = document.createElement("style");
        el.id = STYLE_ID;
        document.documentElement.appendChild(el);
    }
    el.textContent = pluginCss();
    syncRootClasses();
}

function removeCss() {
    document.getElementById(STYLE_ID)?.remove();
    const root = document.documentElement;
    root.classList.remove(
        ROOT_CLASS,
        "nr-perf-kill-blur",
        "nr-perf-kill-motion",
        "nr-perf-kill-acrylic",
        "nr-perf-kill-decor",
        "nr-perf-quiet-gifs",
        "nr-perf-contain",
        "nr-perf-kill-shadow",
        "nr-perf-kill-willchange",
    );
}

function refreshLive() {
    if (!started) return;
    injectCss();
    if (settings.store.killAnimations) {
        if (springs.length === 0) loadSprings();
        applySpringSkip(settings.store.skipSprings);
    } else {
        applySpringSkip(false);
    }
    applyVibrancy(settings.store.killAcrylic);
    if (settings.store.pauseMedia) startMediaWatch(); else stopMediaWatch();
}

const settings = definePluginSettings({
    killBlur: {
        type: OptionType.BOOLEAN,
        description: "Kill backdrop-filter / heavy blur on layers and modals. Replaces blur with a solid dim so chat contrast stays readable.",
        default: true,
        onChange() { refreshLive(); }
    },
    killAnimations: {
        type: OptionType.BOOLEAN,
        description: "Disable UI animations and transitions (prefers-reduced-motion style). Message text spacing and contrast are left alone.",
        default: true,
        onChange() { refreshLive(); }
    },
    killAcrylic: {
        type: OptionType.BOOLEAN,
        description: "Strip window vibrancy / mica / acrylic (Equicord windowsMaterial + CSS). Discord-native acrylic only where Equicord exposes it.",
        default: true,
        onChange() { refreshLive(); }
    },
    killDecorations: {
        type: OptionType.BOOLEAN,
        description: "Hide nitro confetti, gift animations, hover particles, avatar decorations, and profile effects when those nodes exist.",
        default: true,
        onChange() { refreshLive(); }
    },
    containLists: {
        type: OptionType.BOOLEAN,
        description: "Let the browser skip offscreen rows in message, member, channel, DM, and search lists. Biggest scroll-FPS win.",
        default: true,
        onChange() { refreshLive(); }
    },
    killShadows: {
        type: OptionType.BOOLEAN,
        description: "Remove box-shadows and text-shadows on app chrome. Shadows repaint under every scrolled pixel.",
        default: true,
        onChange() { refreshLive(); }
    },
    killWillChange: {
        type: OptionType.BOOLEAN,
        description: "Trim compositor layer bloat from Discord's will-change usage. Lowers VRAM and composite work. Animated nodes and scrollers are kept.",
        default: true,
        onChange() { refreshLive(); }
    },
    pauseMedia: {
        type: OptionType.BOOLEAN,
        description: "Pause GIF and video embeds that are scrolled out of view. Voice and call video are never touched.",
        default: true,
        onChange() { refreshLive(); }
    },
    quietTyping: {
        type: OptionType.BOOLEAN,
        description: "Disable the CPU-heavy typing-dot animation. The typing indicator still appears. Uses Equicord's NoTypingAnimation patch if that plugin is on.",
        default: true,
        restartNeeded: true
    },
    quietGifs: {
        type: OptionType.BOOLEAN,
        description: "Lower GIF / sticker / emoji animation aggressiveness (canAnimate inverse of AlwaysAnimate, plus CSS). Hover is not required for chat readability.",
        default: true,
        restartNeeded: true,
        onChange() { refreshLive(); }
    },
    skipSprings: {
        type: OptionType.BOOLEAN,
        description: "Skip Discord spring physics (known Vencord/FastDiscord pattern). Does not throttle chat message list re-renders.",
        default: true,
        onChange() { refreshLive(); }
    },
    presenceThrottle: {
        type: OptionType.BOOLEAN,
        description: "Cap presence (online status) churn at one update per user per 45 seconds. Statuses can look briefly stale on very busy servers.",
        default: false
    },
    dropTyping: {
        type: OptionType.BOOLEAN,
        description: "Drop typing events entirely. Nobody's typing indicator appears, and no typing-related re-render happens.",
        default: false
    },
});

export default definePlugin({
    name: "narePerf",
    description: "Den field kit for lag: strips fluff, contains offscreen layout, pauses hidden media, and can throttle presence churn. Chat text stays readable.",
    authors: [Devs.Narehatechi],
    tags: ["Utility", "Appearance"],
    searchTerms: ["performance", "blur", "animation", "acrylic", "vibrancy", "fps", "lag"],
    enabledByDefault: true,
    settings,

    patches: [
        {
            find: "dotCycle",
            predicate: () => settings.store.quietTyping && !isPluginEnabled("NoTypingAnimation"),
            replacement: {
                match: /focused:(\i)/g,
                replace: (_, focused) => `_focused:${focused}=false`
            }
        },
        {
            find: "canAnimate:",
            all: true,
            noWarn: true,
            predicate: () => settings.store.quietGifs,
            replacement: {
                match: /canAnimate:.+?([,}].*?\))/g,
                replace: (m, rest) => {
                    const destructuringMatch = rest.match(/}=.+/);
                    if (destructuringMatch == null) return `canAnimate:!1${rest}`;
                    return m;
                }
            }
        }
    ],

    start() {
        started = true;
        injectCss();
        FluxDispatcher.addInterceptor(fluxInterceptor);
        if (settings.store.killAnimations && settings.store.skipSprings) {
            loadSprings();
            applySpringSkip(true);
        }
        if (settings.store.killAcrylic) applyVibrancy(true);
        if (settings.store.pauseMedia) startMediaWatch();
        log.info("narePerf started (fluff-kill, containment, hidden-media pause)");
    },

    stop() {
        started = false;
        applySpringSkip(false);
        springs = [];
        applyVibrancy(false);
        stopMediaWatch();
        const list = FluxDispatcher._interceptors ?? [];
        const idx = list.indexOf(fluxInterceptor);
        if (idx !== -1) list.splice(idx, 1);
        removeCss();
        log.info("narePerf stopped");
    }
});
