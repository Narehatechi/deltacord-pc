import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption } from "@api/Commands";
import { addContextMenuPatch, removeContextMenuPatch, type NavContextMenuPatchCallback } from "@api/ContextMenu";
import * as DataStore from "@api/DataStore";
import definePlugin from "@utils/types";
import { Menu, SelectedChannelStore, showToast, Toasts } from "@webpack/common";
const LAYER_KEY = "narecord-layers";
const RELIC_KEY = "narecord-relics";
const LAYERS = [
    { n:1, name:"1st Layer", place:"Edge of the Abyss", curse:"Dizziness." },
    { n:2, name:"2nd Layer", place:"Forest of Temptation", curse:"Nausea." },
    { n:3, name:"3rd Layer", place:"Great Fault", curse:"Vertigo." },
    { n:4, name:"4th Layer", place:"Goblets of Giants", curse:"Pain." },
    { n:5, name:"5th Layer", place:"Sea of Corpses", curse:"Sensory loss." },
    { n:6, name:"6th Layer", place:"Capital of the Unreturned", curse:"Humanity goes." },
    { n:7, name:"7th Layer", place:"Final Maelstrom", curse:"Certain death." }
];
let cache: Record<string, number> = {};
async function load() { cache = (await DataStore.get(LAYER_KEY)) ?? {}; }
function hashLayer(id: string) {
    let n = 0; for (let i = 0; i < id.length; i++) n = (n + id.charCodeAt(i)*(i+1)) % 7;
    return LAYERS[n]!;
}
function layerOf(id: string) { return (cache[id] >= 1 && cache[id] <= 7) ? LAYERS[cache[id]-1]! : hashLayer(id); }
const channelMenu: NavContextMenuPatchCallback = (children, props: any) => {
    const channel = props?.channel;
    if (!channel?.id) return;
    children.push(
        <Menu.MenuItem id="narecord-layer" label="Abyss layer">
            {LAYERS.map(L => (
                <Menu.MenuItem id={"narecord-layer-"+L.n} label={L.name+" — "+L.place} action={async () => {
                    cache = { ...cache, [channel.id]: L.n };
                    await DataStore.set(LAYER_KEY, cache);
                    showToast("This channel is "+L.name+" now.", Toasts.Type.SUCCESS);
                }} />
            ))}
        </Menu.MenuItem>
    );
};
export default definePlugin({
    name: "Abyss",
    description: "Layers, relics, channel context menu.",
    authors: [{ name: "Narecord", id: 0n }],
    dependencies: ["CommandsAPI"],
    commands: [
        { name: "layer", description: "What layer is this channel?", inputType: ApplicationCommandInputType.BUILT_IN, execute: () => {
            const id = SelectedChannelStore.getChannelId();
            if (!id) return { content: "Nnaa. No channel." };
            const L = layerOf(id);
            return { content: "Nnaa~ "+L.name+" — "+L.place+". "+L.curse };
        }},
        { name: "stew", description: "Netherworld stew", inputType: ApplicationCommandInputType.BUILT_IN, execute: () => ({ content: "**Netherworld Stew**\nDon't worry about how it looks.\n• yellow-shining grass\n• a hammerbeak egg\n• a demonfish" }) },
        { name: "relic", description: "add / list / drop", inputType: ApplicationCommandInputType.BUILT_IN,
          options: [
            { name: "action", description: "add, list, or drop", type: ApplicationCommandOptionType.STRING, required: true,
              choices: [
                { name:"add", displayName:"add", value:"add", label:"add" },
                { name:"list", displayName:"list", value:"list", label:"list" },
                { name:"drop", displayName:"drop", value:"drop", label:"drop" }
              ]},
            { name: "name", description: "Relic name", type: ApplicationCommandOptionType.STRING, required: false }
          ],
          execute: async opts => {
            const action = findOption(opts, "action") as string;
            const name = ((findOption(opts, "name") as string) || "").trim();
            const bag = (await DataStore.get(RELIC_KEY)) ?? [];
            if (action === "list") return { content: bag.length ? "**Relic bag**\n"+bag.map((r,i)=> (i+1)+". "+r.name).join("\n") : "Nnaa. Bag's empty." };
            if (action === "add") { if (!name) return { content: "Nnaa. Name the relic." }; bag.push({ name }); await DataStore.set(RELIC_KEY, bag); return { content: "Stashed **"+name+"**." }; }
            if (action === "drop") { const next = bag.filter(r => r.name.toLowerCase() !== name.toLowerCase()); if (next.length === bag.length) return { content: "Nnaa. Not in the bag." }; await DataStore.set(RELIC_KEY, next); return { content: "Dropped **"+name+"**." }; }
            return { content: "add, list, or drop." };
          }
        }
    ],
    async start() { await load(); addContextMenuPatch("channel-context", channelMenu); },
    stop() { removeContextMenuPatch("channel-context", channelMenu); }
});