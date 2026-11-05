import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import "./style.css";
const settings = definePluginSettings({
    surfaces: { type: OptionType.BOOLEAN, description: "Dark bark surfaces", default: true, restartNeeded: true },
    creamText: { type: OptionType.BOOLEAN, description: "Cream text", default: true, restartNeeded: true },
    sageAccent: { type: OptionType.BOOLEAN, description: "Sage buttons", default: true, restartNeeded: true },
    chatBox: { type: OptionType.BOOLEAN, description: "Wooden chat box", default: true, restartNeeded: true }
});
function sync() {
    const r = document.documentElement;
    r.classList.toggle("nr-hideout-surfaces", settings.store.surfaces);
    r.classList.toggle("nr-hideout-text", settings.store.creamText);
    r.classList.toggle("nr-hideout-sage", settings.store.sageAccent);
    r.classList.toggle("nr-hideout-box", settings.store.chatBox);
}
export default definePlugin({
    name: "Hideout",
    description: "Nanachi hideout look.",
    authors: [{ name: "Narecord", id: 0n }],
    settings, start: sync,
    stop() { document.documentElement.classList.remove("nr-hideout-surfaces","nr-hideout-text","nr-hideout-sage","nr-hideout-box"); }
});