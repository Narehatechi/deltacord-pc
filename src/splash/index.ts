/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import fontBase64 from "file://./DeterminationMono.ttf?base64";

/*
 * Deltacord's startup animation: one of fourteen styles (chosen in Deltacord settings, or random
 * each launch) draws DELTACORD in Determination Mono, in one of a few colour variants (a rare
 * golden one about one launch in fifty). It plays for PLAY_MS, then stays until Discord is ready.
 * The same styles as the Android app's startup animation.
 */

const FONT = '"Determination Mono"';
const PARTS = ["DEL", "TA", "CORD"];
const WORD = PARTS.join("");
const LINE = "* DELTACORD draws near.";
const SAVE_LINE = "* The DELTACORD fills you with DETERMINATION.";
const CHARS = [...WORD];
const RAIN_CHARS = "DELTACORD*+<>#%&@0123456789";
const SOULS = ["#ff1a2e", "#ff8a00", "#ffe14d", "#33dd55", "#33e0ff", "#3366ff", "#bb44ff"];
const PLAY_MS = 6500;
const MAX_WAIT_MS = PLAY_MS + 25_000;
const FADE_OUT_MS = 450;

export const STARTUP_STYLES = [
    ["upgraded", "Upgraded"], ["fountain", "Dark Fountain"], ["soul", "SOUL"], ["battle", "Battle encounter"],
    ["crt", "Old TV"], ["savepoint", "Save Point"], ["drop", "Letter Drop"], ["warp", "Warp"],
    ["door", "The Door"], ["neon", "Neon Sign"], ["dither", "Pixel Build"], ["orbit", "Seven SOULs"],
    ["rain", "Glyph Rain"], ["fireworks", "Fireworks"],
] as const;

interface Palette {
    name: string;
    glow: string;
    tint: string;
    sparks: string[];
    shine: string[];
    credit?: string;
    rare?: boolean;
}

interface Scene {
    impacts: number[][];
    sparkle: number;
    credit: number;
    cam(t: number): number;
    draw(t: number): void;
}

const PALETTES: Record<string, Palette> = {
    classic: { name: "Classic", glow: "#ffffff", tint: "255,255,255", sparks: ["#ffffff", "#ffff00", "#66ffff", "#ff77dd"], shine: ["#ffffff", "#ff5577", "#ffdd33", "#55ffaa", "#55ccff", "#cc77ff", "#ffffff"] },
    dark: { name: "Dark World", glow: "#b48cff", tint: "180,140,255", sparks: ["#ffffff", "#b48cff", "#66ffff", "#77aaff"], shine: ["#ffffff", "#d9c2ff", "#8a7dff", "#66ffff", "#8a7dff", "#d9c2ff", "#ffffff"] },
    determination: { name: "Determination", glow: "#ff4d5e", tint: "255,77,94", sparks: ["#ffffff", "#ffff00", "#ff4d5e", "#ffb000"], shine: ["#ffffff", "#ff4d5e", "#ff8a00", "#ffe14d", "#ff8a00", "#ff4d5e", "#ffffff"] },
    cyber: { name: "Cyber", glow: "#4dfcff", tint: "77,252,255", sparks: ["#ffffff", "#4dfcff", "#ff4de1", "#ffe14d"], shine: ["#ffffff", "#4dfcff", "#7a5cff", "#ff4de1", "#7a5cff", "#4dfcff", "#ffffff"] },
    gold: { name: "Golden", glow: "#ffcc33", tint: "255,204,51", sparks: ["#fff7cc", "#ffcc33", "#ffe999", "#ffffff"], shine: ["#ffffff", "#fff2b3", "#ffcc33", "#ffe999", "#ffcc33", "#fff2b3", "#ffffff"], credit: "* by Narehatechi *", rare: true },
};

let canvas: HTMLCanvasElement | undefined;
let g!: CanvasRenderingContext2D;
let startedAt = 0;
let lastCheck = 0;
let finishing = false;
let isReady: (() => boolean) | undefined;

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, p) => a + (b - a) * p;
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const fade = (t, from, len) => smooth((t - from) / len);
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
const easeIn = x => Math.pow(clamp(x), 3);
const easeInOut = x => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const backOut = x => { x = clamp(x); const c1 = 1.70158, c3 = c1 + 1, p = x - 1; return 1 + c3 * p * p * p + c1 * p * p; };
const bounceOut = x => {
    x = clamp(x); const n = 7.5625, d = 2.75;
    if (x < 1 / d) return n * x * x;
    if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
    if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
    return n * (x -= 2.625 / d) * x + 0.984375;
};
const fract = x => x - Math.floor(x);

let seed = 1;
let styleId = "upgraded";
let P: Palette = PALETTES.classic;
let L!: Layout;
let layoutKey = "";
let pts: number[][] | null = null;
let pstep = 3;
const rnd = (i, k = 0) => fract(Math.sin(i * 127.1 + k * 311.7 + seed * 0.731) * 43758.5453);

const pulse = (t, t0) => (t >= t0 && t < t0 + 600) ? Math.sin((t - t0) / 600 * Math.PI) * 0.6 : 0;
const breath = (t, t0) => t > t0 ? (Math.sin((t - t0) / 900) + 1) / 2 * 0.35 : 0;

type Layout = ReturnType<typeof makeLayout>;

function makeLayout(w: number, h: number, dpr: number) {
    const along = Math.max(w, h), across = Math.min(w, h);
    g.font = `100px ${FONT}`;
    const size = Math.min(100 * (along * 0.8) / g.measureText(WORD).width, across * 0.42);
    g.font = `${size}px ${FONT}`;
    const partW = PARTS.map(p => g.measureText(p).width);
    const wordWidth = g.measureText(WORD).width;
    const x0 = (along - wordWidth) / 2;
    const partX: number[] = []; let x = x0;
    for (const pw of partW) { partX.push(x); x += pw; }
    const charX = CHARS.map((_, i) => x0 + g.measureText(WORD.slice(0, i)).width);
    const charW = CHARS.map(ch => g.measureText(ch).width);
    return { charX, charW, w, h, dpr, along, across, size, wordWidth, x0, y: across / 2, cx: along / 2, partX, partW, cap: size * 0.56, rotated: h > w, font: `${size}px ${FONT}` };
}

/** Points that fill the DELTACORD letters, for styles where the word forms out of particles. */
function letterPoints() {
    if (pts) return pts;
    const c = document.createElement("canvas");
    c.width = Math.ceil(L.along); c.height = Math.ceil(L.across);
    const o = c.getContext("2d")!;
    o.font = L.font; o.textBaseline = "middle"; o.fillStyle = "#fff";
    o.fillText(WORD, L.x0, L.y);
    const { data } = o.getImageData(0, 0, c.width, c.height);
    let step = Math.max(2, Math.round(L.size / 16));
    let out: number[][];
    for (;;) {
        out = [];
        for (let yy = Math.floor(L.y - L.size * 0.7); yy < L.y + L.size * 0.7; yy += step)
            for (let xx = Math.floor(L.x0); xx < L.x0 + L.wordWidth; xx += step) {
                if (yy < 0 || yy >= c.height || xx < 0 || xx >= c.width) continue;
                if (data[(yy * c.width + xx) * 4 + 3] > 128) out.push([xx, yy]);
            }
        if (out.length <= 700) break;
        step++;
    }
    pstep = step; pts = out;
    return out;
}

function stageTransform() {
    if (L.rotated) { g.translate(L.w / 2, L.h / 2); g.rotate(Math.PI / 2); g.translate(-L.along / 2, -L.across / 2); }
}

function glowText(text, x, y, alpha, glow, color = "#fff", shadow = P.glow) {
    if (alpha <= 0) return;
    g.fillStyle = color; g.shadowColor = shadow;
    g.globalAlpha = clamp(90 / 255 * alpha * glow); g.shadowBlur = L.size * 0.38 + L.dpr * 6; g.fillText(text, x, y);
    g.globalAlpha = clamp(170 / 255 * alpha * glow); g.shadowBlur = L.size * 0.12 + L.dpr * 2; g.fillText(text, x, y);
    g.globalAlpha = clamp(alpha); g.shadowBlur = 0; g.fillText(text, x, y);
    g.globalAlpha = 1;
}

function wordAt(alpha, glow, scale = 1) {
    g.save();
    if (scale !== 1) { g.translate(L.cx, L.y); g.scale(scale, scale); g.translate(-L.cx, -L.y); }
    glowText(WORD, L.x0, L.y, alpha, glow);
    g.restore();
}

function burst(t, t0, cx, cy, n, k, spread, colors) {
    const p = (t - t0) / 700;
    if (p < 0 || p > 1) return;
    const e = easeOut(p);
    for (let i = 0; i < n; i++) {
        const a = rnd(i, k) * Math.PI * 2, d = (0.3 + rnd(i, k + 1) * 0.7) * spread * e;
        const s = L.size * (0.03 + rnd(i, k + 2) * 0.05) * (1 - p * 0.6);
        g.globalAlpha = 1 - p;
        g.fillStyle = g.shadowColor = colors[i % colors.length];
        g.shadowBlur = s * 2;
        g.fillRect(cx + Math.cos(a) * d - s / 2, cy + Math.sin(a) * d - s / 2, s, s);
    }
    g.globalAlpha = 1; g.shadowBlur = 0;
}

function ring(t, t0, cx, cy, maxR, len = 800, color = P.glow) {
    const p = (t - t0) / len;
    if (p < 0 || p > 1) return;
    g.strokeStyle = g.shadowColor = color;
    g.shadowBlur = L.size * 0.2;
    g.globalAlpha = (1 - p) * 0.9;
    g.lineWidth = L.size * 0.07 * (1 - p) + L.dpr;
    g.beginPath(); g.arc(cx, cy, easeOut(p) * maxR, 0, Math.PI * 2); g.stroke();
    g.globalAlpha = 1; g.shadowBlur = 0;
}

function motes(t, n, mul) {
    if (mul <= 0) return;
    g.fillStyle = P.glow;
    for (let i = 0; i < n; i++) {
        const sp = 0.04 + rnd(i, 40) * 0.08;
        const ph = fract(t / 1000 * sp + rnd(i, 41));
        const x = rnd(i, 42) * L.along + Math.sin(t / 1400 + i) * L.size * 0.15;
        const y = L.across * (1.05 - ph * 1.1);
        const s = L.dpr * (1 + rnd(i, 43) * 2.2);
        g.globalAlpha = Math.sin(ph * Math.PI) * (0.15 + rnd(i, 44) * 0.45) * mul;
        g.fillRect(x, y, s, s);
    }
    g.globalAlpha = 1;
}

// ---------- the Manager title's sparkle ----------
function sparkle(t, t0) {
    const since = (t - t0) / 1000;
    const intro = fade(t, t0, 400);
    const top = L.y - L.cap / 2, bottom = L.y + L.cap / 2, wordWidth = L.wordWidth, x0 = L.x0, size = L.size;
    g.save();
    const sweep = (since * 0.4) % 1.8 - 0.4;
    const band = wordWidth * 0.45, centre = x0 + sweep * wordWidth;
    const shine = g.createLinearGradient(centre - band, top - L.cap * 0.4, centre + band, bottom + L.cap * 0.4);
    shine.addColorStop(0, "rgba(255,255,255,0)");
    P.shine.forEach((c, i) => shine.addColorStop(0.18 + i * 0.64 / (P.shine.length - 1), c));
    shine.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = shine; g.shadowColor = P.glow; g.shadowBlur = size * 0.08 + L.dpr * 2;
    g.globalAlpha = 0.9 * intro;
    g.fillText(WORD, x0, L.y);

    const cycle = since % 2.5;
    if (since > 0.8 && cycle < 0.18) {
        const shake = L.dpr * 3 * Math.sin(cycle * 180), gap = size * 0.035;
        g.shadowBlur = 0; g.globalAlpha = 0.67;
        g.fillStyle = "#f00"; g.fillText(WORD, x0 - gap + shake, L.y);
        g.fillStyle = "#0ff"; g.fillText(WORD, x0 + gap - shake, L.y);
    }

    g.lineCap = "round";
    g.lineWidth = Math.max(L.dpr * 1.6, size * 0.025);
    for (let i = 0; i < 14; i++) {
        const fx = rnd(i, 80) * 1.1 - 0.05;
        const fy = rnd(i, 81) < 0.5 ? -0.35 - rnd(i, 82) * 0.45 : 1.1 + rnd(i, 82) * 0.45;
        const speed = 0.6 + rnd(i, 83) * 0.8;
        const wave = Math.sin(since * 2.4 * speed + rnd(i, 84) * 6.28);
        if (wave <= 0) continue;
        const sx = x0 + fx * wordWidth, sy = top + fy * L.cap, arm = size * 0.11 * wave * speed;
        g.strokeStyle = g.shadowColor = P.sparks[i % P.sparks.length];
        g.shadowBlur = arm * 0.9 + L.dpr;
        g.globalAlpha = wave * intro;
        g.beginPath(); g.moveTo(sx - arm, sy); g.lineTo(sx + arm, sy); g.moveTo(sx, sy - arm); g.lineTo(sx, sy + arm); g.stroke();
    }
    g.restore();
}

// ---------- the SOUL ----------
const HEART = [
    "..XX...XX..",
    ".XXXX.XXXX.",
    "XXXXXXXXXXX",
    "XXXXXXXXXXX",
    "XXXXXXXXXXX",
    ".XXXXXXXXX.",
    "..XXXXXXX..",
    "...XXXXX...",
    "....XXX....",
    ".....X.....",
];
const CRACK = [5, 5, 4, 6, 4, 6, 5, 4, 5, 5];
const HEART_CELLS: number[][] = [];
HEART.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === "X") HEART_CELLS.push([c, r]); }));

/** A pixel heart. [split] pushes the two halves apart; [crack] (0..1) opens the crack row by row. */
function drawHeart(cx, cy, hp, alpha, split = 0, crack = 0, color = "#ff1a2e") {
    if (alpha <= 0) return;
    g.fillStyle = g.shadowColor = color;
    g.shadowBlur = hp * 2.5; g.globalAlpha = alpha;
    const rows = Math.floor(crack * 10.99);
    for (const [c, r] of HEART_CELLS) {
        const k = CRACK[r];
        if (c === k && (r < rows || split > 0)) continue;
        const dx = split > 0 ? (c < k ? -split : split) : 0;
        g.fillRect(cx + (c - 5.5) * hp + dx, cy + (r - 5) * hp, hp + 0.6, hp + 0.6);
    }
    g.globalAlpha = 1; g.shadowBlur = 0;
}

/** A four-pointed save-point star, white in the middle. */
function drawStar(cx, cy, r, rot, color, alpha) {
    if (alpha <= 0 || r <= 0) return;
    const shape = rr => {
        g.beginPath();
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, q = i % 2 ? rr * 0.3 : rr; g.lineTo(Math.cos(a) * q, Math.sin(a) * q); }
        g.closePath();
    };
    g.save(); g.translate(cx, cy); g.rotate(rot); g.globalAlpha = clamp(alpha);
    g.fillStyle = g.shadowColor = color; g.shadowBlur = r * 0.9; shape(r); g.fill();
    g.fillStyle = "#fff"; g.shadowBlur = 0; shape(r * 0.45); g.fill();
    g.restore();
}

/** A firework: sparks fly out, fall a little and twinkle out. */
function firework(t, t0, cx, cy, n, k, R, colors) {
    const p = (t - t0) / 1100;
    if (p < 0 || p > 1) return;
    const e = easeOut(p);
    for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2 + rnd(i, k) * 0.25, v = R * (0.55 + rnd(i, k + 1) * 0.45);
        const x = cx + Math.cos(a) * v * e, y = cy + Math.sin(a) * v * e + p * p * R * 0.45;
        const s = L.dpr * (2 + rnd(i, k + 2) * 2.5) * (1 - p * 0.5);
        const twinkle = p > 0.55 && rnd(i, k + 3 + Math.floor(t / 50)) > 0.5 ? 0.25 : 1;
        g.globalAlpha = (1 - p) * twinkle;
        g.fillStyle = g.shadowColor = colors[i % colors.length];
        g.shadowBlur = s * 2;
        g.fillRect(x - s / 2, y - s / 2, s, s);
    }
    g.globalAlpha = 1; g.shadowBlur = 0;
}

function warpSpeed(t) {
    if (t < 2600) return 0.1 + 1.4 * smooth(t / 2600);
    if (t < 2800) return 1.5;
    return 0.1 + 1.4 * Math.exp(-(t - 2800) / 300);
}
function warpPhase(t) {
    const x = Math.min(t, 2600) / 2600;
    let ph = 0.1 * t / 1000 + 1.4 * 2.6 * (x * x * x - x * x * x * x / 2);
    if (t > 2600) ph += 1.4 * (Math.min(t, 2800) - 2600) / 1000;
    if (t > 2800) ph += 1.4 * 0.3 * (1 - Math.exp(-(t - 2800) / 300));
    return ph;
}

// ---------- the fourteen styles ----------
const SCENES: Record<string, Scene> = {
    upgraded: {
        impacts: [[760, 7], [1460, 7], [2160, 11]], sparkle: 2700, credit: 3000,
        cam: t => lerp(0.9, 1, easeOut(t / 2600)),
        draw(t) {
            motes(t, 70, fade(t, 0, 800));
            const starts = [500, 1200, 1900];
            PARTS.forEach((part, i) => {
                const s0 = starts[i], p = (t - s0) / 260;
                if (p < 0) return;
                const sc = lerp(1.8, 1, easeIn(p));
                const settle = 1 - fade(t, s0 + 260, 700);
                const glow = 0.55 + 0.9 * settle + pulse(t, 2500) + breath(t, 3100);
                const cx = L.partX[i] + L.partW[i] / 2;
                g.save(); g.translate(cx, L.y); g.scale(sc, sc); g.translate(-cx, -L.y);
                glowText(part, L.partX[i], L.y, clamp(p * 1.6), glow);
                g.restore();
                burst(t, s0 + 260, cx, L.y, 22, i * 10 + 100, L.size * 1.4, P.sparks);
            });
            ring(t, 2500, L.cx, L.y, L.along * 0.6);
        },
    },
    fountain: {
        impacts: [[4800, 6]], sparkle: 4900, credit: 4900,
        cam: t => lerp(1.06, 1, easeInOut(t / 5000)),
        draw(t) {
            const gy = L.across * 0.9, cx = L.cx;
            const crack = easeOut(t / 700) * (1 - fade(t, 4400, 600));
            if (crack > 0) {
                g.strokeStyle = g.shadowColor = P.glow;
                g.shadowBlur = L.size * 0.25; g.lineWidth = L.dpr * 2 + L.size * 0.03;
                g.globalAlpha = crack * (0.7 + 0.3 * Math.sin(t / 60));
                const half = L.along * 0.32 * crack;
                g.beginPath(); g.moveTo(cx - half, gy); g.lineTo(cx + half, gy); g.stroke();
                g.globalAlpha = 1; g.shadowBlur = 0;
            }
            const rise = easeOut((t - 600) / 700), sink = easeIn((t - 3600) / 900);
            if (rise > 0 && sink < 1) {
                const top = lerp(lerp(gy, -L.across * 0.1, rise), gy, sink);
                const cw = L.across * 0.13 * (1 + 0.08 * Math.sin(t / 90)) * (1 - sink * 0.5);
                const grad = g.createLinearGradient(0, gy, 0, top);
                grad.addColorStop(0, `rgba(${P.tint},0.95)`); grad.addColorStop(0.6, `rgba(${P.tint},0.35)`); grad.addColorStop(1, `rgba(${P.tint},0)`);
                g.fillStyle = grad; g.shadowColor = P.glow; g.shadowBlur = L.size * 0.5;
                g.fillRect(cx - cw / 2, top, cw, gy - top);
                const core = g.createLinearGradient(0, gy, 0, top);
                core.addColorStop(0, "rgba(255,255,255,0.9)"); core.addColorStop(1, "rgba(255,255,255,0)");
                g.fillStyle = core; g.fillRect(cx - cw * 0.18, top, cw * 0.36, gy - top);
                g.shadowBlur = 0;
                for (let j = 0; j < 90; j++) {
                    const sp = 0.5 + rnd(j, 50) * 0.9, ph = fract(t / 1000 * sp + rnd(j, 51));
                    const yy = lerp(gy, top, ph), xx = cx + (rnd(j, 52) - 0.5) * cw * (0.6 + ph * 2.2);
                    const s = L.dpr * (1.5 + rnd(j, 53) * 3);
                    g.globalAlpha = (1 - ph) * (1 - sink) * rise;
                    g.fillStyle = j % 3 ? "#fff" : P.sparks[j % P.sparks.length];
                    g.fillRect(xx - s / 2, yy - s / 2, s, s);
                }
                g.globalAlpha = 1;
            }
            const points = letterPoints(), ps = pstep * 0.95;
            const wordIn = fade(t, 4300, 500);
            if (wordIn < 1) {
                for (let i = 0; i < points.length; i++) {
                    const launch = 1500 + rnd(i, 60) * 1600, up = (t - (launch - 900)) / 900;
                    if (up < 0) continue;
                    const [tx, ty] = points[i];
                    const sx = cx + (rnd(i, 61) - 0.5) * L.across * 0.12;
                    const sprayY = lerp(L.across * 0.05, L.across * 0.35, rnd(i, 62));
                    const fx = (cx + (rnd(i, 63) - 0.5) * L.along * 0.5) * 0.3 + sx * 0.7;
                    let x, y;
                    if (up < 1) { const e = easeOut(up); x = lerp(sx, fx, e); y = lerp(gy, sprayY, e); }
                    else {
                        const h = easeInOut((t - launch) / 1300);
                        x = lerp(fx, tx, h);
                        y = lerp(sprayY, ty, h) + Math.sin(h * Math.PI) * L.size * 0.25 * (rnd(i, 64) - 0.5);
                    }
                    const arrived = clamp((t - launch) / 1300);
                    g.globalAlpha = (1 - wordIn) * (0.6 + 0.4 * arrived);
                    g.fillStyle = arrived >= 1 ? "#fff" : P.sparks[i % P.sparks.length];
                    g.fillRect(x - ps / 2, y - ps / 2, ps, ps);
                }
                g.globalAlpha = 1;
            }
            if (wordIn > 0) wordAt(wordIn, 0.6 + pulse(t, 4800) + breath(t, 5400) + (1 - fade(t, 4300, 800)) * 0.6);
            ring(t, 4800, L.cx, L.y, L.along * 0.6);
        },
    },
    soul: {
        impacts: [[880, 4], [1100, 3], [1700, 3], [2300, 4], [3400, 9], [5200, 5]], sparkle: 5300, credit: 5200,
        cam: t => 1 + beat(t) * 0.05,
        draw(t) {
            motes(t, 40, fade(t, 1000, 1000) * 0.7);
            const hp = L.size * 0.09, cx = L.cx;
            if (t < 3400) {
                const cy = lerp(-L.across * 0.2, L.y, bounceOut(t / 900));
                const b = 1 + beat(t) * 0.25;
                g.save(); g.translate(cx, cy); g.scale(b, b); g.translate(-cx, -cy);
                const shake = t > 2700 ? Math.sin(t * 0.9) * hp * 0.25 * fade(t, 2700, 300) : 0;
                const split = t >= 3100 ? easeOut((t - 3100) / 300) * hp * 1.2 : 0;
                drawHeart(cx + shake, cy, hp, 1, split, clamp((t - 2700) / 400));
                g.restore();
                for (const bt of [1100, 1700, 2300]) ring(t, bt, cx, cy, L.size * 1.3, 600, "#ff1a2e");
            }
            const points = letterPoints(), ps = pstep * 0.95;
            const wordIn = fade(t, 5000, 400);
            if (t >= 3400 && wordIn < 1) {
                for (let i = 0; i < points.length; i++) {
                    const cell = HEART_CELLS[Math.floor(rnd(i, 70) * HEART_CELLS.length)];
                    const side = cell[0] < CRACK[cell[1]] ? -1 : 1;
                    const sx = cx + (cell[0] - 5.5 + rnd(i, 71)) * hp + side * hp * 1.2;
                    const sy = L.y + (cell[1] - 5 + rnd(i, 72)) * hp;
                    const a = rnd(i, 73) * Math.PI * 2, d = (0.3 + rnd(i, 74) * 0.7) * L.size * 0.75;
                    const bp = easeOut((t - 3400) / 500);
                    const h = easeInOut((t - (3900 + rnd(i, 75) * 300)) / 1100);
                    const x = lerp(sx + Math.cos(a) * d * bp, points[i][0], h);
                    const y = lerp(sy + Math.sin(a) * d * bp, points[i][1], h);
                    g.globalAlpha = 1 - wordIn;
                    g.fillStyle = `rgb(255,${Math.round(lerp(26, 255, h))},${Math.round(lerp(46, 255, h))})`;
                    g.fillRect(x - ps / 2, y - ps / 2, ps, ps);
                }
                g.globalAlpha = 1;
            }
            if (wordIn > 0) wordAt(wordIn, 0.6 + pulse(t, 5200) + breath(t, 5800) + (1 - wordIn) * 0.5);
            ring(t, 5200, L.cx, L.y, L.along * 0.6);
        },
    },
    battle: {
        impacts: [[250, 3], [4490, 13]], sparkle: 4700, credit: 4800,
        cam: () => 1,
        draw(t) {
            const hp = L.size * 0.05, cx = L.cx, cy = L.y;
            if (t >= 250 && t < 1500) {
                const blink = t > 800 ? Math.floor((t - 800) / 110) % 2 === 0 : true;
                if (blink) drawHeart(cx, cy, hp, 1 - fade(t, 1350, 150));
                if (t < 800) {
                    const s = backOut((t - 250) / 200);
                    g.save(); g.translate(cx, cy - hp * 10); g.scale(s, s);
                    g.font = `${L.size * 0.5}px ${FONT}`; g.textAlign = "center";
                    g.fillStyle = "#fff"; g.shadowColor = P.glow; g.shadowBlur = L.size * 0.1;
                    g.fillText("!", 0, 0);
                    g.restore();
                }
            }
            const fs = L.size * 0.2;
            g.font = `${fs}px ${FONT}`;
            const bw = Math.max(g.measureText(LINE).width + fs * 2.4, L.wordWidth * 0.95), bh = L.size * 0.95;
            let wP = easeOut((t - 1400) / 250), hP = easeOut((t - 1650) / 250);
            if (t >= 3900) { hP = 1 - easeIn((t - 3900) / 180); wP = 1 - easeIn((t - 4080) / 150); }
            if (wP > 0 && t < 4240) {
                const lw = fs * 0.18, bwN = bw * wP, bhN = Math.max(lw, bh * hP);
                g.fillStyle = "#000"; g.fillRect(cx - bwN / 2, cy - bhN / 2, bwN, bhN);
                g.strokeStyle = "#fff"; g.lineWidth = lw; g.strokeRect(cx - bwN / 2, cy - bhN / 2, bwN, bhN);
                if (hP >= 1 && t < 3900) {
                    const chars = clamp(Math.floor((t - 1950) / 65), 0, LINE.length);
                    g.fillStyle = "#fff"; g.textAlign = "left";
                    g.fillText(LINE.slice(0, chars), cx - bw / 2 + fs * 1.2, cy - bh / 2 + fs * 1.5);
                }
            }
            g.font = L.font; g.textAlign = "left";
            if (t >= 4250) {
                const p = (t - 4250) / 240;
                wordAt(clamp(p * 3), 0.6 + (1 - fade(t, 4490, 700)) * 0.9 + breath(t, 5100), lerp(2.6, 1, easeIn(p)));
                burst(t, 4490, cx, cy, 40, 300, L.size * 2, P.sparks);
            }
            ring(t, 4490, cx, cy, L.along * 0.6);
        },
    },
    crt: {
        impacts: [[600, 4], [3000, 9]], sparkle: 3300, credit: 3500,
        cam: () => 1,
        draw(t) {
            const W = L.along, H = L.across;
            if (t < 600) {
                const p = easeOut((t - 150) / 450);
                if (p <= 0) return;
                const lw = W * p, lh = L.dpr * 3;
                g.fillStyle = "#fff"; g.shadowColor = P.glow; g.shadowBlur = L.size * 0.3;
                g.fillRect(L.cx - lw / 2, L.y - lh / 2, lw, lh);
                g.shadowBlur = 0;
                return;
            }
            const hh = H * easeOut((t - 600) / 350);
            g.save();
            g.beginPath(); g.rect(-W, L.y - hh / 2, W * 3, hh); g.clip();
            const noise = 1 - fade(t, 1500, 1500);
            if (noise > 0) {
                const s = Math.max(2, L.size * 0.035);
                for (let i = 0; i < 500; i++) {
                    const v = Math.random() > 0.5 ? 255 : 110;
                    g.fillStyle = `rgba(${v},${v},${v + (v < 255 ? 30 : 0)},${noise * (0.2 + Math.random() * 0.5)})`;
                    g.fillRect(Math.random() * W, Math.random() * H, s * (1 + Math.random() * 3), s);
                }
            }
            const appear = fade(t, 1400, 900);
            if (appear > 0) {
                const gap = L.size * 0.18 * (1 - fade(t, 1400, 1600));
                const jitter = (Math.random() - 0.5) * L.size * 0.06 * noise;
                g.globalCompositeOperation = "lighter";
                g.globalAlpha = appear * 0.9;
                g.fillStyle = "#ff0030"; g.fillText(WORD, L.x0 - gap + jitter, L.y);
                g.fillStyle = "#00e5ff"; g.fillText(WORD, L.x0 + gap - jitter, L.y);
                g.globalCompositeOperation = "source-over";
                g.globalAlpha = 1;
                if (t >= 3000) wordAt(fade(t, 3000, 150), 0.6 + (1 - fade(t, 3000, 700)) * 0.8 + breath(t, 3600));
            }
            g.fillStyle = "rgba(0,0,0,0.3)";
            const step = Math.max(3, L.dpr * 3);
            for (let yy = 0; yy < H; yy += step) g.fillRect(-W, yy, W * 3, step / 2);
            const by = fract(t / 2200) * H * 1.2 - H * 0.1;
            const band = g.createLinearGradient(0, by - H * 0.08, 0, by + H * 0.08);
            band.addColorStop(0, "rgba(255,255,255,0)"); band.addColorStop(0.5, "rgba(255,255,255,0.07)"); band.addColorStop(1, "rgba(255,255,255,0)");
            g.fillStyle = band; g.fillRect(-W, by - H * 0.08, W * 3, H * 0.16);
            g.restore();
        },
    },
    savepoint: {
        impacts: [[3700, 10]], sparkle: 4000, credit: 4200,
        cam: t => lerp(1.05, 1, easeInOut(t / 3700)),
        draw(t) {
            motes(t, 50, fade(t, 0, 1000) * 0.8);
            const flyP = easeIn((t - 3300) / 400);
            if (t < 3700) {
                const sy = lerp(L.y - L.size * 0.5, L.y, flyP);
                const r = L.size * 0.3 * Math.max(0, backOut((t - 200) / 600)) * (1 + 0.12 * Math.sin(t / 180)) * (1 + flyP * 1.5);
                drawStar(L.cx, sy, r, t / 900 + flyP * 6, "#ffe14d", clamp((t - 200) / 300));
            }
            const fs = L.size * 0.16;
            g.font = `${fs}px ${FONT}`;
            const bw = Math.max(g.measureText(SAVE_LINE).width + fs * 2.4, L.wordWidth * 0.95), bh = fs * 2.6;
            const by = L.y + L.size * 0.35;
            const boxIn = easeOut((t - 900) / 250) * (1 - easeIn((t - 3150) / 200));
            if (boxIn > 0) {
                g.globalAlpha = boxIn;
                g.fillStyle = "#000"; g.fillRect(L.cx - bw / 2, by, bw, bh);
                g.strokeStyle = "#fff"; g.lineWidth = fs * 0.18; g.strokeRect(L.cx - bw / 2, by, bw, bh);
                g.fillStyle = "#fff";
                g.fillText(SAVE_LINE.slice(0, clamp(Math.floor((t - 1150) / 42), 0, SAVE_LINE.length)), L.cx - bw / 2 + fs * 1.2, by + bh / 2);
                g.globalAlpha = 1;
            }
            g.font = L.font;
            if (t >= 3700) {
                wordAt(fade(t, 3700, 120), 0.6 + (1 - fade(t, 3700, 800)) + breath(t, 4300), lerp(1.25, 1, easeOut((t - 3700) / 400)));
                burst(t, 3700, L.cx, L.y, 36, 400, L.size * 1.8, ["#ffe14d", "#ffffff", "#fff3a0"]);
            }
            ring(t, 3700, L.cx, L.y, L.along * 0.6, 800, "#ffe14d");
        },
    },
    drop: {
        impacts: CHARS.map((_, i) => [700 + i * 190 + 240, 3]).concat([[3000, 7]]), sparkle: 3300, credit: 3500,
        cam: () => 1,
        draw(t) {
            motes(t, 50, 0.6);
            CHARS.forEach((ch, i) => {
                const t0 = 700 + i * 190;
                if (t < t0) return;
                const y = lerp(-L.size * 1.2, L.y, bounceOut((t - t0) / 650));
                const rot = (1 - easeOut((t - t0) / 500)) * (rnd(i, 90) - 0.5) * 1.6;
                const wave = t > 2500 && t < 3300 ? Math.sin((t - 2500) / 800 * Math.PI) * Math.sin((t - 2500) / 110 - i * 0.7) * L.size * 0.12 : 0;
                const cx = L.charX[i] + L.charW[i] / 2;
                g.save(); g.translate(cx, y + wave); g.rotate(rot); g.translate(-cx, -L.y);
                glowText(ch, L.charX[i], L.y, 1, 0.55 + (1 - fade(t, t0 + 240, 500)) * 0.8 + pulse(t, 3000) + breath(t, 3600));
                g.restore();
                burst(t, t0 + 240, cx, L.y + L.cap * 0.5, 8, i * 7 + 200, L.size * 0.5, P.sparks);
            });
            ring(t, 3000, L.cx, L.y, L.along * 0.6);
        },
    },
    warp: {
        impacts: [[2800, 12]], sparkle: 3200, credit: 3400,
        cam: () => 1,
        draw(t) {
            const ph = warpPhase(t), v = warpSpeed(t), maxR = Math.hypot(L.along, L.across) / 2;
            g.lineCap = "round";
            for (let i = 0; i < 180; i++) {
                const a = rnd(i, 20) * Math.PI * 2;
                const z = fract(rnd(i, 21) + ph * (0.6 + rnd(i, 22) * 0.8));
                const r = z * z * maxR + L.size * 0.15;
                const len = Math.min(r * 0.9, r * v * 0.5 + L.dpr * 2);
                g.strokeStyle = i % 5 === 0 ? P.sparks[i % P.sparks.length] : "#fff";
                g.globalAlpha = clamp(z * 1.5) * fade(t, 0, 400);
                g.lineWidth = L.dpr * (1 + z * 2.5);
                g.beginPath();
                g.moveTo(L.cx + Math.cos(a) * (r - len), L.y + Math.sin(a) * (r - len));
                g.lineTo(L.cx + Math.cos(a) * r, L.y + Math.sin(a) * r);
                g.stroke();
            }
            g.globalAlpha = 1;
            const core = fade(t, 1200, 1400) * (1 - fade(t, 2800, 300));
            if (core > 0) {
                const rg = g.createRadialGradient(L.cx, L.y, 0, L.cx, L.y, L.size * 1.4);
                rg.addColorStop(0, `rgba(255,255,255,${core})`); rg.addColorStop(0.3, `rgba(${P.tint},${core * 0.5})`); rg.addColorStop(1, `rgba(${P.tint},0)`);
                g.fillStyle = rg; g.fillRect(L.cx - L.size * 1.4, L.y - L.size * 1.4, L.size * 2.8, L.size * 2.8);
            }
            if (t >= 2400) {
                const p = (t - 2400) / 400;
                wordAt(clamp(p * 2), 0.6 + (1 - fade(t, 2800, 800)) + breath(t, 3500), p < 1 ? lerp(0.04, 1, easeIn(p)) : 1);
            }
            ring(t, 2800, L.cx, L.y, L.along * 0.6);
        },
    },
    door: {
        impacts: [[3100, 8]], sparkle: 3700, credit: 3900,
        cam: t => t < 3100 ? lerp(1, 1.15, easeIn((t - 1400) / 1700)) : lerp(1.15, 1, easeOut((t - 3100) / 600)),
        draw(t) {
            motes(t, 40, 0.6 * (1 - fade(t, 2600, 400)) + 0.6 * fade(t, 3300, 600));
            const dh = L.across * 0.62, dw = dh * 0.48, dx = L.cx - dw / 2, dy = L.y - dh / 2;
            if (t >= 3100) wordAt(fade(t, 3100, 500), 0.6 + (1 - fade(t, 3100, 900)) * 0.9 + breath(t, 3800));
            if (t < 3300) {
                const lit = easeInOut((t - 1500) / 900);
                if (lit > 0) {
                    const rays = fade(t, 1900, 900);
                    for (let i = 0; i < 14 && rays > 0; i++) {
                        const a = i / 14 * Math.PI * 2 + t / 3000, R = L.along * rays;
                        g.globalAlpha = rays * 0.22;
                        g.fillStyle = `rgb(${P.tint})`;
                        g.beginPath(); g.moveTo(L.cx, L.y);
                        g.lineTo(L.cx + Math.cos(a - 0.07) * R, L.y + Math.sin(a - 0.07) * R);
                        g.lineTo(L.cx + Math.cos(a + 0.07) * R, L.y + Math.sin(a + 0.07) * R);
                        g.closePath(); g.fill();
                    }
                    g.globalAlpha = lit;
                    g.fillStyle = "#fff"; g.shadowColor = P.glow; g.shadowBlur = L.size * 0.6 * lit;
                    g.fillRect(dx, dy, dw, dh);
                    g.shadowBlur = 0; g.globalAlpha = 1;
                }
                const drawn = clamp((t - 300) / 1000);
                g.strokeStyle = "#fff"; g.lineWidth = L.dpr * 2 + L.size * 0.02;
                g.shadowColor = P.glow; g.shadowBlur = L.size * 0.1;
                const perim = (dw + dh) * 2;
                g.setLineDash([perim * drawn, perim]);
                g.strokeRect(dx, dy, dw, dh);
                g.setLineDash([]);
                if (drawn >= 1) {
                    const pw = dw * Math.cos(lit * Math.PI / 2 * 0.92), bulge = dh * 0.07 * lit;
                    g.fillStyle = "#0b0a12";
                    g.beginPath(); g.moveTo(dx, dy); g.lineTo(dx + pw, dy - bulge); g.lineTo(dx + pw, dy + dh + bulge); g.lineTo(dx, dy + dh); g.closePath();
                    g.fill(); g.stroke();
                    g.fillStyle = "#fff";
                    g.beginPath(); g.arc(dx + pw * 0.82, L.y, L.size * 0.03 + L.dpr, 0, Math.PI * 2); g.fill();
                }
                g.shadowBlur = 0;
            }
            const flood = fade(t, 2700, 400) * (1 - fade(t, 3100, 700));
            if (flood > 0) { g.globalAlpha = flood; g.fillStyle = "#fff"; g.fillRect(-L.along, -L.across, L.along * 3, L.across * 3); g.globalAlpha = 1; }
        },
    },
    neon: {
        impacts: [[3000, 6]], sparkle: 3300, credit: 3500,
        cam: () => 1,
        draw(t) {
            const colours = [P.sparks[3], P.sparks[1], P.sparks[2]];
            CHARS.forEach((ch, i) => {
                const colour = colours[i < 3 ? 0 : i < 5 ? 1 : 2];
                const on = 500 + rnd(i, 30) * 2000;
                let lit = 0;
                if (t >= on + 350) lit = 1;
                else if (t >= on) lit = rnd(Math.floor(t / 45), i + 31) > 0.5 ? 1 : 0.15;
                if (t > 3600 && rnd(Math.floor(t / 70), i + 50) > 0.985) lit = 0.3;
                g.globalAlpha = 0.22; g.strokeStyle = colour; g.lineWidth = L.dpr * 1.2;
                g.strokeText(ch, L.charX[i], L.y);
                g.globalAlpha = 1;
                if (lit > 0) glowText(ch, L.charX[i], L.y, lit, 0.9 + pulse(t, 3000) + breath(t, 3600), lit >= 1 && t >= 3000 && t < 3150 ? "#fff" : colour, colour);
            });
            ring(t, 3000, L.cx, L.y, L.along * 0.6, 800, colours[0]);
        },
    },
    dither: {
        impacts: [[2800, 8]], sparkle: 3200, credit: 3400,
        cam: t => lerp(1.05, 1, easeOut(t / 2800)),
        draw(t) {
            motes(t, 40, 0.5);
            const points = letterPoints(), ps = pstep;
            const merge = fade(t, 2700, 250);
            if (merge < 1) {
                for (let i = 0; i < points.length; i++) {
                    const [x, y] = points[i];
                    const t0 = 400 + (x - L.x0) / L.wordWidth * 1700 + rnd(i, 40) * 400;
                    const p = (t - t0) / 250;
                    if (p < 0) continue;
                    const s = ps * 0.92 * (p < 1 ? Math.max(0, backOut(p)) : 1);
                    g.globalAlpha = 1 - merge;
                    g.fillStyle = p < 1 ? P.sparks[i % P.sparks.length] : "#fff";
                    g.fillRect(x - s / 2, y - s / 2, s, s);
                }
                const scan = (t - 600) / 1700;
                if (scan > 0 && scan < 1.15) {
                    const sx = L.x0 + scan * L.wordWidth;
                    g.fillStyle = g.shadowColor = P.glow; g.shadowBlur = L.size * 0.3; g.globalAlpha = 0.8 * (1 - merge);
                    g.fillRect(sx - L.dpr, L.y - L.size * 0.6, L.dpr * 2, L.size * 1.2);
                    g.shadowBlur = 0;
                }
                g.globalAlpha = 1;
            }
            if (merge > 0) wordAt(merge, 0.6 + (1 - fade(t, 2800, 800)) * 0.9 + breath(t, 3400));
            ring(t, 2800, L.cx, L.y, L.along * 0.6);
        },
    },
    orbit: {
        impacts: [[2700, 11]], sparkle: 3100, credit: 3300,
        cam: t => t < 2700 ? lerp(1, 1.1, easeIn(t / 2700)) : lerp(1.1, 1, easeOut((t - 2700) / 500)),
        draw(t) {
            motes(t, 50, 0.7);
            if (t < 2700) {
                const p = clamp(t / 2700), R = lerp(L.across * 0.4, 0, easeIn(p));
                const angle = q => 1.2 * q * 2.7 + 6 * 2.7 * q * q * q / 3;
                const hp = L.size * 0.035, appear = fade(t, 0, 500);
                SOULS.forEach((colour, k) => {
                    for (let j = 6; j >= 0; j--) {
                        const q = clamp(p - j * 0.012), Rq = lerp(L.across * 0.4, 0, easeIn(q));
                        const a = angle(q) + k * Math.PI * 2 / 7;
                        const x = L.cx + Math.cos(a) * Rq * 1.7, y = L.y + Math.sin(a) * Rq;
                        if (j === 0) drawHeart(x, y, hp, appear, 0, 0, colour);
                        else { g.globalAlpha = appear * (1 - j / 7) * 0.5; g.fillStyle = colour; g.fillRect(x - hp, y - hp, hp * 2, hp * 2); g.globalAlpha = 1; }
                    }
                });
            }
            if (t >= 2700) wordAt(fade(t, 2700, 100), 0.6 + (1 - fade(t, 2700, 900)) + breath(t, 3400), lerp(0.5, 1, backOut((t - 2700) / 500)));
            burst(t, 2700, L.cx, L.y, 42, 500, L.size * 2, SOULS);
            ring(t, 2700, L.cx, L.y, L.along * 0.6, 800, "#fff");
        },
    },
    rain: {
        impacts: [[2900, 7]], sparkle: 3300, credit: 3500,
        cam: () => 1,
        draw(t) {
            const fs = L.size * 0.2, cols = Math.floor(L.along / (fs * 0.75));
            const show = (1 - fade(t, 2900, 700)) * fade(t, 0, 400);
            if (show > 0) {
                g.font = `${fs}px ${FONT}`; g.textAlign = "center";
                for (let c = 0; c < cols; c++) {
                    const head = (fract(rnd(c, 11) + t / 1000 * (0.35 + rnd(c, 10) * 0.5)) * 1.6 - 0.3) * L.across;
                    for (let j = 0; j < 10; j++) {
                        const y = head - j * fs * 1.05;
                        if (y < -fs || y > L.across + fs) continue;
                        const ch = RAIN_CHARS[Math.floor(rnd(c * 31 + j, Math.floor(t / 120)) * RAIN_CHARS.length)];
                        g.globalAlpha = (j === 0 ? 1 : (1 - j / 10) * 0.6) * show;
                        g.fillStyle = j === 0 ? "#fff" : P.glow;
                        g.fillText(ch, (c + 0.5) * L.along / cols, y);
                    }
                }
                g.globalAlpha = 1;
                g.font = L.font; g.textAlign = "left";
            }
            CHARS.forEach((ch, i) => {
                const lock = 1100 + i * 190;
                if (t >= lock - 400 && t < lock) {
                    glowText(ch, L.charX[i], lerp(-L.size, L.y, easeIn((t - lock + 400) / 400)), 0.8, 0.7);
                }
                if (t >= lock) glowText(ch, L.charX[i], L.y, 1, 0.55 + (1 - fade(t, lock, 500)) * 1.2 + pulse(t, 2900) + breath(t, 3500));
                burst(t, lock, L.charX[i] + L.charW[i] / 2, L.y, 7, i * 5 + 600, L.size * 0.45, P.sparks);
            });
            ring(t, 2900, L.cx, L.y, L.along * 0.6);
        },
    },
    fireworks: {
        impacts: [[900, 6], [1600, 6], [2300, 7], [3000, 5]], sparkle: 3300, credit: 3500,
        cam: () => 1,
        draw(t) {
            motes(t, 30, 0.5);
            [900, 1600, 2300].forEach((tb, i) => {
                const cx = L.partX[i] + L.partW[i] / 2, launch = tb - 600;
                if (t >= launch && t < tb) {
                    const p = easeOut((t - launch) / 600);
                    const sx = cx + (rnd(i, 1) - 0.5) * L.size;
                    const x = lerp(sx, cx, p), y = lerp(L.across * 1.05, L.y, p);
                    for (let j = 0; j < 8; j++) {
                        g.globalAlpha = (1 - j / 8) * (0.5 + 0.5 * Math.random());
                        g.fillStyle = j ? P.sparks[(i + j) % P.sparks.length] : "#fff";
                        const s = L.dpr * (3 - j * 0.25);
                        g.fillRect(x - s / 2 + (Math.random() - 0.5) * L.dpr * 3, y + j * L.size * 0.08 - s / 2, s, s);
                    }
                    g.globalAlpha = 1;
                }
                firework(t, tb, cx, L.y, 46, i * 20 + 700, L.size * 1.5, P.sparks);
                ring(t, tb, cx, L.y, L.size * 1.3, 600, P.sparks[(i + 1) % P.sparks.length]);
                if (t >= tb) glowText(PARTS[i], L.partX[i], L.y, fade(t, tb, 150), 0.55 + (1 - fade(t, tb, 700)) * 1.2 + pulse(t, 3000) + breath(t, 3600));
            });
            for (let j = 0; j < 5; j++) {
                const fx = L.along * (0.1 + rnd(j, 95) * 0.8), fy = L.across * (0.12 + rnd(j, 96) * 0.25) * (j % 2 ? 1 : 3.2);
                firework(t, 3000 + j * 110, fx, fy, 34, j * 13 + 900, L.size * 0.9, P.sparks);
            }
        },
    },
};
function beat(t) {
    let b = 0;
    for (const bt of [1100, 1700, 2300]) { const p = (t - bt) / 260; if (p >= 0 && p <= 1) b += Math.sin(p * Math.PI); }
    return b;
}
const impactAmount = (t, impacts, len) => impacts.reduce((m, [ti, amp]) => {
    const p = (t - ti) / len;
    return p >= 0 && p <= 1 ? Math.max(m, amp * (1 - p) * (1 - p)) : m;
}, 0);

function credit(t, t0) {
    if (t < t0) return;
    const spin = Math.min(1, (t - t0) / 750), p = spin - 1, since = t - t0;
    const eased = 1 + 2.70158 * p * p * p + 1.70158 * p * p;
    const scale = Math.max(0, eased) * (1 + 0.045 * Math.sin(since / 170) * spin);
    const angle = -720 * (1 - eased) + 4 * Math.sin(since / 320) * spin;
    if (scale <= 0.01) return;
    const fontSize = Math.min(L.w, L.h) * 0.075;
    g.save();
    g.translate(L.w / 2, L.h * 0.955); g.rotate(angle * Math.PI / 180); g.scale(scale, scale);
    g.font = `${fontSize}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = P.rare ? P.glow : "#fff"; g.shadowColor = P.glow; g.shadowBlur = fontSize * 0.35; g.globalAlpha = spin;
    g.fillText(P.credit || "by Narehatechi", 0, 0);
    g.restore();
}

function render(t: number) {
    if (!canvas) return;
    const dpr = devicePixelRatio || 1;
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (!w || !h) return;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const key = `${w}x${h}`;
    if (key !== layoutKey) { layoutKey = key; L = makeLayout(w, h, dpr); pts = null; }
    const S = SCENES[styleId] ?? SCENES.upgraded;

    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1; g.shadowBlur = 0;
    g.fillStyle = "#000"; g.fillRect(0, 0, w, h);

    g.save();
    stageTransform();
    const sh = impactAmount(t, S.impacts, 350) * dpr;
    g.translate(Math.sin(t * 0.11) * sh, Math.cos(t * 0.137) * sh);
    const cam = S.cam(t);
    g.translate(L.cx, L.y); g.scale(cam, cam); g.translate(-L.cx, -L.y);
    g.font = L.font; g.textBaseline = "middle"; g.textAlign = "left";
    S.draw(t);
    g.font = L.font; g.textBaseline = "middle"; g.textAlign = "left";
    if (t >= S.sparkle) sparkle(t, S.sparkle);
    g.restore();

    credit(t, S.credit);

    const flash = impactAmount(t, S.impacts, 200) / 13 * 0.28;
    if (flash > 0) { g.fillStyle = `rgba(${P.tint},${flash})`; g.fillRect(0, 0, w, h); }
}

/** Kept for callers that report startup progress; the animation no longer shows a bar. */
export function splashProgress(_progress: number, _text: string) { }

export function splashReadyWhen(check: () => boolean) {
    isReady = check;
}

function finish() {
    if (finishing || !canvas) return;
    finishing = true;
    canvas.style.transition = `opacity ${FADE_OUT_MS}ms ease`;
    canvas.style.opacity = "0";
    setTimeout(() => {
        canvas?.remove();
        canvas = undefined;
    }, FADE_OUT_MS);
}

function frame(now: number) {
    if (!canvas) return;
    requestAnimationFrame(frame);

    const t = Math.max(0, now - startedAt);
    if (!finishing && t >= PLAY_MS) {
        if (t >= MAX_WAIT_MS) finish();
        else if (now - lastCheck > 200) {
            lastCheck = now;
            if (isReady?.()) finish();
        }
    }

    try {
        render(t);
    } catch (err) {
        // A drawing problem must never keep Discord hidden.
        console.error("[Deltacord] Startup animation failed", err);
        finish();
    }
}

/** The style chosen in settings (or a random one), in random colours. */
function pickRun() {
    const ids = STARTUP_STYLES.map(([id]) => id as string);
    const setting = VencordNative.settings.get().startupAnimationStyle;
    styleId = setting === "random"
        ? ids[Math.floor(Math.random() * ids.length)]
        : ids.includes(setting) ? setting : "upgraded";
    const common = ["classic", "dark", "determination", "cyber"];
    P = Math.random() < 1 / 50 ? PALETTES.gold : PALETTES[common[Math.floor(Math.random() * common.length)]];
    seed = Math.floor(Math.random() * 10000);
}

async function mount() {
    const el = document.createElement("canvas");
    el.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:2147483647;background:#000;cursor:default";
    document.documentElement.append(el);
    canvas = el;
    g = el.getContext("2d")!;
    pickRun();

    const face = new FontFace(FONT.slice(1, -1), Uint8Array.from(atob(fontBase64), c => c.charCodeAt(0)).buffer);
    document.fonts.add(face);
    await face.load().catch(err => console.error("[Deltacord] Couldn't load the startup animation font", err));

    startedAt = performance.now();
    requestAnimationFrame(frame);
}

if (IS_DISCORD_DESKTOP && !IS_REPORTER && VencordNative.settings.get().startupAnimation !== false) {
    if (document.documentElement) mount();
    else document.addEventListener("readystatechange", mount, { once: true });
}
