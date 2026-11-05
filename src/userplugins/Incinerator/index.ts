import definePlugin from "@utils/types";
import "./style.css";
let lock = false;
function fire() {
    if (lock) return;
    const box = document.querySelector("[class*=\"channelTextArea\"]") as HTMLElement;
    if (!box) return;
    lock = true;
    setTimeout(() => { lock = false; }, 900);
    const r = box.getBoundingClientRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(r.width * dpr));
    canvas.height = Math.max(1, Math.floor(r.height * dpr));
    Object.assign(canvas.style, {
        position: "fixed", left: r.left + "px", top: r.top + "px",
        width: r.width + "px", height: r.height + "px",
        pointerEvents: "none", zIndex: "100000",
        borderRadius: getComputedStyle(box).borderRadius || "12px"
    } as CSSStyleDeclaration);
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    if (!ctx) { canvas.remove(); return; }
    ctx.scale(dpr, dpr);
    const w = r.width, h = r.height, mid = h / 2;
    const sparks = Array.from({ length: 36 }, () => ({
        x: 16, y: mid + (Math.random() - .5) * h * .5,
        v: 1.8 + Math.random() * 3.2, s: 1 + Math.random() * 2.4, life: 1
    }));
    box.style.transition = "transform .12s";
    box.style.transform = "translateX(2px)";
    setTimeout(() => { box.style.transform = "translateX(-2px)"; }, 50);
    setTimeout(() => { box.style.transform = ""; }, 120);
    const t0 = performance.now();
    const tick = (now: number) => {
        const t = now - t0;
        ctx.clearRect(0, 0, w, h);
        ctx.globalCompositeOperation = "lighter";
        if (t < 200) {
            const p = t / 200;
            const g = ctx.createRadialGradient(24, mid, 0, 24, mid, 20 + p * 50);
            g.addColorStop(0, "rgba(255,255,255," + (p) + ")");
            g.addColorStop(.35, "rgba(140,220,255," + (.8 * p) + ")");
            g.addColorStop(1, "rgba(20,90,255,0)");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, 120, h);
            ctx.strokeStyle = "rgba(180,230,255," + p + ")";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(24, mid, 8 + p * 14, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            const p = Math.min(1, (t - 200) / 380);
            const ease = 1 - Math.pow(1 - p, 3);
            const head = 28 + ease * (w - 44);
            const wash = ctx.createLinearGradient(0, 0, head, 0);
            wash.addColorStop(0, "rgba(30,110,255,0)");
            wash.addColorStop(.7, "rgba(80,190,255,.35)");
            wash.addColorStop(1, "rgba(255,255,255,.2)");
            ctx.fillStyle = wash;
            ctx.fillRect(0, 0, head, h);
            ctx.fillStyle = "rgba(100,200,255,.6)";
            ctx.fillRect(16, mid - 13, head - 20, 26);
            ctx.fillStyle = "#fff";
            ctx.fillRect(16, mid - 2, head - 24, 4);
            const ball = ctx.createRadialGradient(head, mid, 0, head, mid, 22);
            ball.addColorStop(0, "#fff");
            ball.addColorStop(.3, "rgba(180,235,255,1)");
            ball.addColorStop(1, "rgba(30,100,255,0)");
            ctx.fillStyle = ball;
            ctx.beginPath(); ctx.arc(head, mid, 22, 0, Math.PI * 2); ctx.fill();
            for (const s of sparks) {
                s.x += s.v * 18; s.life -= .016;
                if (s.x < head && s.life > 0) {
                    ctx.fillStyle = "rgba(230,250,255," + s.life + ")";
                    ctx.fillRect(s.x, s.y, s.s, s.s);
                }
            }
        }
        if (t > 620) canvas.style.opacity = String(Math.max(0, 1 - (t - 620) / 180));
        if (t < 820) requestAnimationFrame(tick); else canvas.remove();
    };
    requestAnimationFrame(tick);
}
export default definePlugin({
    name: "Incinerator",
    description: "Charged incinerator rail across the message bar.",
    authors: [{ name: "Narecord", id: 0n }],
    dependencies: ["MessageEventsAPI"],
    onBeforeMessageSend() { fire(); }
});