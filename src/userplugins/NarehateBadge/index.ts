import { addProfileBadge, BadgePosition, removeProfileBadge, type ProfileBadge } from "@api/Badges";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { showToast, Toasts, UserStore } from "@webpack/common";

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><radialGradient id="bg" cx="50%" cy="45%" r="60%"><stop offset="0%" stop-color="#3a3224"/><stop offset="100%" stop-color="#16130e"/></radialGradient><linearGradient id="earL" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fff8ea"/><stop offset="45%" stop-color="#f3e2c4"/><stop offset="100%" stop-color="#c4a06a"/></linearGradient><linearGradient id="earR" x1="1" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fff8ea"/><stop offset="45%" stop-color="#f3e2c4"/><stop offset="100%" stop-color="#b08958"/></linearGradient><radialGradient id="face" cx="50%" cy="38%" r="70%"><stop offset="0%" stop-color="#fff6e4"/><stop offset="55%" stop-color="#f0d7b0"/><stop offset="100%" stop-color="#c4a06a"/></radialGradient><linearGradient id="helm" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#8a9870"/><stop offset="55%" stop-color="#6c7a56"/><stop offset="100%" stop-color="#3f4a32"/></linearGradient><radialGradient id="eye" cx="32%" cy="30%" r="75%"><stop offset="0%" stop-color="#fff1a0"/><stop offset="35%" stop-color="#e4c04a"/><stop offset="100%" stop-color="#6a520c"/></radialGradient></defs><circle cx="64" cy="64" r="62" fill="url(#bg)"/><path d="M46 58 C28 8 48-8 58 36 c-2 8-5 14-7 18" fill="url(#earL)" stroke="#6a5230" stroke-width="2" stroke-linejoin="round"/><path d="M50 28 C44 10 48 2 54 8 C56 18 54 28 52 36" fill="#c98490" opacity=".82"/><path d="M82 58 C100 8 80-8 70 36 c2 8 5 14 7 18" fill="url(#earR)" stroke="#6a5230" stroke-width="2" stroke-linejoin="round"/><path d="M78 28 C84 10 80 2 74 8 C72 18 74 28 76 36" fill="#c98490" opacity=".82"/><path d="M38 54 C44 40 56 34 64 34 C72 34 84 40 90 54 C86 46 76 40 64 40 C52 40 42 46 38 54Z" fill="url(#helm)"/><ellipse cx="64" cy="78" rx="30" ry="26" fill="url(#face)" stroke="#6a5230" stroke-width="2"/><path d="M40 70 C36 62 40 54 46 56" fill="#f3e2c4"/><path d="M88 70 C92 62 88 54 82 56" fill="#e8c99a"/><path d="M34 76 C28 72 26 80 32 84 C30 78 32 76 34 76Z" fill="#f3e2c4"/><path d="M94 76 C100 72 102 80 96 84 C98 78 96 76 94 76Z" fill="#e8c99a"/><ellipse cx="52" cy="76" rx="7.4" ry="8.8" fill="url(#eye)"/><ellipse cx="76" cy="76" rx="7.4" ry="8.8" fill="url(#eye)"/><circle cx="52.6" cy="75.2" r="2.5" fill="#1a1408"/><circle cx="76.6" cy="75.2" r="2.5" fill="#1a1408"/><circle cx="51.3" cy="73.6" r="1.15" fill="#fff6e4"/><circle cx="75.3" cy="73.6" r="1.15" fill="#fff6e4"/><path d="M48 68 C50 66 54 66 56 68" fill="none" stroke="#5a4328" stroke-width="1.1" stroke-linecap="round" opacity=".55"/><path d="M72 68 C74 66 78 66 80 68" fill="none" stroke="#5a4328" stroke-width="1.1" stroke-linecap="round" opacity=".55"/><ellipse cx="64" cy="86.5" rx="2.4" ry="1.7" fill="#c98490"/><path d="M56 94 C60.5 98.5 67.5 98.5 72 94" fill="none" stroke="#6a5230" stroke-width="1.5" stroke-linecap="round"/><path d="M40 82 H34" stroke="#6a5230" stroke-width="1.1" stroke-linecap="round" opacity=".55"/><path d="M88 82 H94" stroke="#6a5230" stroke-width="1.1" stroke-linecap="round" opacity=".55"/><path d="M50 108 C56 114 72 114 78 108 C74 112 54 112 50 108Z" fill="#8b3a44" opacity=".55"/></svg>`;

const ICON = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(SVG);
const settings = definePluginSettings({
    everyone: { type: OptionType.BOOLEAN, description: "Show on everyone", default: false }
});
const badge: ProfileBadge = {
    id: "narehate",
    description: "Narehate — Nanachi of the 6th layer",
    iconSrc: ICON,
    position: BadgePosition.START,
    shouldShow: ({ userId }) => settings.store.everyone || userId === UserStore.getCurrentUser()?.id,
    onClick: () => showToast("Nnaa~ Oira Nanachi.", Toasts.Type.MESSAGE)
};
export default definePlugin({
    name: "NarehateBadge",
    description: "Detailed Nanachi-head Narehate badge.",
    authors: [{ name: "Narecord", id: 0n }],
    settings,
    dependencies: ["BadgeAPI"],
    start() { addProfileBadge(badge); },
    stop() { removeProfileBadge(badge); }
});