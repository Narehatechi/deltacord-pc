import definePlugin from "@utils/types";
import "./style.css";
function pop(e: any) {
    const msg = e?.message;
    if (!msg?.id || !msg.channel_id) return;
    requestAnimationFrame(() => {
        const el = document.getElementById("chat-messages-" + msg.channel_id + "-" + msg.id);
        if (!el) return;
        el.classList.remove("nr-pop");
        void el.offsetWidth;
        el.classList.add("nr-pop");
        setTimeout(() => el.classList.remove("nr-pop"), 400);
    });
}
export default definePlugin({
    name: "NareMotion",
    description: "Pops new messages, wiggles hovers, pulses the chat box. Separate from Incinerator.",
    authors: [{ name: "Narecord", id: 0n }],
    flux: { MESSAGE_CREATE: pop }
});