# Deltacord for PC

Deltacord is a Discord desktop client mod, built on [Equicord](https://github.com/Equicord/Equicord) (itself a fork of [Vencord](https://github.com/Vendicated/Vencord)). It is the PC counterpart of the Deltacord Android mod, and it plays the same startup animation while Discord loads: DEL, then TA, then CORD, glowing in on black.

## Download

**[Download DeltacordInstaller.exe](https://github.com/Narehatechi/deltacord-pc/releases/download/latest/DeltacordInstaller.exe)** (Windows)

1. Double-click `DeltacordInstaller.exe`. If Windows says it protected your PC, click **More info**, then **Run anyway** (the installer isn't code-signed yet).
2. Press Enter. It closes Discord, installs Deltacord and opens Discord again.

That's it. Deltacord keeps itself up to date. To remove it, run the installer again, type `U` and press Enter.

It keeps all of Equicord's plugins and settings. Deltacord stores its own data in a `Deltacord` folder next to Discord's, so it won't touch an existing Equicord setup.

## Startup animation

- White Determination Mono on black. The three parts glow in one after the other, the whole word pulses, then breathes.
- "by Narehatechi" spins in near the bottom edge and wobbles.
- A progress bar under the word fills as Deltacord and Discord start, with the current step written underneath.
- It can't be skipped. It fades away once Discord has drawn its first screen (logged in, or the login screen), or after 28 seconds at most.
- Turn it off in Deltacord Settings with "Show the startup animation". The change applies after a restart.

The animation lives in `src/splash`. `splashProgress(progress, text)` moves the bar and `splashReadyWhen(check)` says when Discord is ready; both are called from `src/Vencord.ts`.

## Coming from Narecord

On first launch, if Deltacord has no settings yet and a `Narecord` folder sits next to Deltacord's data folder, it copies your settings (including which plugins are on), QuickCSS, themes and message logs over. Nothing in the Narecord folder is changed or deleted. Narecord's own plugins (Abyss, Hideout, Incinerator, NareMotion, NareNotes, NarehateBadge, Narelogs, Nnaa and narePerf) are built into Deltacord from `src/userplugins`.

## Deltacord plugins

Deltacord's own plugins live in `src/deltacordplugins`:

- **Deltavoice** plays a Deltarune style text voice as you type, with a choice of voice, pitch and volume.
- **DeltaText** adds `/star` and `/dialogue` to write messages as game dialogue, and can star every message you send.
- **SavePoint** adds "Save Point" to the message menu; `/savepoint` lists your saves with jump links.
- **ActMenu** adds `/act` to check, spare, fight or hug someone like a Deltarune battle.
- **TensionBar** puts a TP gauge in the chat bar that fills as your message nears the length limit.
- **DeltacordTheme** is on by default: Deltacord's look (black, white and orange, or red with Crimson) in the Determination Mono font. You can switch the palette, keep Discord's colors, or turn the font off in its settings.
- **Deltalogger** keeps deleted messages, every edit and ghost pings, even after a restart. Open it from the top bar, the toolbox, `/deltalogger` or by right clicking a person, channel or server. You can search, filter by kind, jump to where a message was, export the log, and choose what to log, who to ignore, how long to keep it and when to notify you.
- **DeltacordPacks** saves your plugins, their settings, QuickCSS and theme links as one `.deltapack` file to share or back up, and loads other people's.

## Syncing with Equicord

Deltacord follows upstream Equicord so it keeps working when Discord changes. After merging a new Equicord, run `python3 scripts/rebrand.py`: it renames Equicord to Deltacord in the text you see (settings, menus, messages, logs) and leaves code names, links, credits and Equicord's own badges alone.

## Building

You need Node.js and [pnpm](https://pnpm.io).

```sh
pnpm install --frozen-lockfile
pnpm build
```

Output goes to `dist/desktop`.

## Installing a local build

The installer in `installer/` (Go) downloads the latest release and patches Discord with Equicord's installer in dev-install mode, pointed at Deltacord's `desktop.asar`. To try a build of your own instead, run `pnpm inject` after building, and `pnpm uninject` to remove it.

Every push to `main` builds Deltacord and publishes it to the `latest` release, which is also where the in-app updater looks for new versions.

## Credits and license

Deltacord is free software under the GNU General Public License v3.0 or later, the same as Equicord and Vencord. See `LICENSE`.

- [Equicord](https://github.com/Equicord/Equicord) and [Vencord](https://github.com/Vendicated/Vencord), and their contributors, wrote almost all of the code here.
- The startup font is Determination Mono Web by Abacadaba, included unmodified under CC BY-NC-ND (see `src/splash/DeterminationMono-LICENSE.txt`). Deltacord is free and non-commercial.
- Deltacord is not affiliated with Discord, Equicord or Vencord. Using client mods is against Discord's Terms of Service, so use it at your own risk.
