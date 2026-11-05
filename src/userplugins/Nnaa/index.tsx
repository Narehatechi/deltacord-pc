import { addChatBarButton, ChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { addContextMenuPatch, removeContextMenuPatch, type NavContextMenuPatchCallback } from "@api/ContextMenu";
import { addMessagePopoverButton, removeMessagePopoverButton } from "@api/MessagePopover";
import { ApplicationCommandInputType } from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import { copyToClipboard } from "@utils/clipboard";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, ComponentDispatch, Menu, showToast, Toasts } from "@webpack/common";

const settings = definePluginSettings({
    enabled: { type: OptionType.BOOLEAN, description: "Rewrite outgoing messages", default: false },
    style: { type: OptionType.SELECT, description: "Voice", options: [
        { label: "Light tic", value: "light", default: true },
        { label: "Prefix", value: "prefix" },
        { label: "Full oira", value: "full" }
    ]}
});

function shouldSkip(c: string) {
    const t = c.trim();
    return !t || t.startsWith("/") || t.startsWith(".") || t.startsWith("\\") || /^https?:\/\/\S+$/i.test(t) || /```/.test(c);
}
export function toNanachi(content: string) {
    const raw = content.replace(/^nnaa:\s*/i, "").trim();
    if (/\bnnaa/i.test(raw)) return raw;
    if (settings.store.style === "prefix") return "Nnaa~ " + raw;
    if (settings.store.style === "full") return "Nnaa~ " + raw.replace(/\bI'm\b/g, "oira's").replace(/\bI\b/g, "oira");
    return /[.!?]$/.test(raw) ? raw.slice(0, -1) + "… nnaa~" : raw + " nnaa~";
}
function Ears() {
    return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 3c-1.2 2.8-2 6-2 8.8C6 16 7.4 19 9.2 21c.3.4 1 .3 1.2-.2.5-1.2.8-2.5 1-3.8h1.2c.2 1.3.5 2.6 1 3.8.2.5.9.6 1.2.2C16.6 19 18 16 18 11.8 18 9 17.2 5.8 16 3c-.3-.6-1.1-.6-1.4 0-.6 1.5-1 3.2-1.1 5h-2.9C10.4 6.2 10 4.5 9.4 3 9.1 2.4 8.3 2.4 8 3z"/></svg>;
}
const menu: NavContextMenuPatchCallback = (children, props: any) => {
    const message = props?.message;
    if (!message?.content) return;
    children.push(<Menu.MenuItem id="narecord-copy-nnaa" label="Copy as Nnaa" action={() => { copyToClipboard(toNanachi(message.content)); showToast("Copied nnaa~", Toasts.Type.SUCCESS); }} />);
};
export default definePlugin({
    name: "Nnaa",
    description: "Voice, chat-bar toggle, copy, /nnaa /oira /nanachi.",
    authors: [{ name: "Narecord", id: 0n }],
    settings,
    dependencies: ["ChatInputButtonAPI","MessageEventsAPI","MessagePopoverAPI","CommandsAPI"],
    commands: [
        { name: "nnaa", description: "Send Nnaa~", inputType: ApplicationCommandInputType.BUILT_IN, execute: () => ({ content: "Nnaa~" }) },
        { name: "oira", description: "Introduce yourself", inputType: ApplicationCommandInputType.BUILT_IN, execute: () => ({ content: "Nnaa~ Oira Nanachi." }) },
        { name: "nanachi", description: "A Nanachi line", inputType: ApplicationCommandInputType.BUILT_IN, execute: () => ({ content: "Don't look at me like that." }) }
    ],
    start() {
        addChatBarButton("narecord-nnaa-toggle", () => (
            <ChatBarButton tooltip={settings.store.enabled ? "Nnaa on" : "Nnaa off"} onClick={() => { settings.store.enabled = !settings.store.enabled; showToast(settings.store.enabled ? "Nnaa on" : "Nnaa off", Toasts.Type.MESSAGE); }}><Ears /></ChatBarButton>
        ), Ears);
        addChatBarButton("narecord-nnaa-stamp", () => (
            <ChatBarButton tooltip="Insert Nnaa~" onClick={() => ComponentDispatch.dispatchToLastSubscribed("INSERT_TEXT", { rawText: "Nnaa~ " })}><Ears /></ChatBarButton>
        ), Ears);
        addMessagePopoverButton("narecord-nnaa-copy", message => {
            if (!message.content) return null;
            const channel = ChannelStore.getChannel(message.channel_id);
            if (!channel) return null;
            return { label: "Copy as Nnaa", icon: Ears, message, channel, onClick: () => { copyToClipboard(toNanachi(message.content)); showToast("Copied nnaa~", Toasts.Type.SUCCESS); } };
        }, Ears);
        addContextMenuPatch("message", menu);
    },
    stop() {
        removeChatBarButton("narecord-nnaa-toggle");
        removeChatBarButton("narecord-nnaa-stamp");
        removeMessagePopoverButton("narecord-nnaa-copy");
        removeContextMenuPatch("message", menu);
    },
    onBeforeMessageSend(_id, message) {
        if (!message.content) return;
        const force = /^nnaa:/i.test(message.content.trim());
        if (!force && (!settings.store.enabled || shouldSkip(message.content))) return;
        message.content = toNanachi(message.content);
    }
});