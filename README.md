# Deltacord for PC

Deltacord is a Discord desktop client mod, built on [Equicord](https://github.com/Equicord/Equicord) (itself a fork of [Vencord](https://github.com/Vendicated/Vencord)). It is the PC counterpart of the Deltacord Android mod, and it plays the same startup animation while Discord loads: DEL, then TA, then CORD, glowing in on black.

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

## Building

You need Node.js and [pnpm](https://pnpm.io).

```sh
pnpm install --frozen-lockfile
pnpm build
```

Output goes to `dist/desktop`.

## Installing

For now Deltacord is injected with Equicord's installer. After building:

```sh
pnpm inject
```

To remove it again, run `pnpm uninject`. A Deltacord installer is planned, so this will change.

Every push to `main` builds Deltacord and publishes it to the `latest` release, which is also where the in-app updater looks for new versions.

## Credits and license

Deltacord is free software under the GNU General Public License v3.0 or later, the same as Equicord and Vencord. See `LICENSE`.

- [Equicord](https://github.com/Equicord/Equicord) and [Vencord](https://github.com/Vendicated/Vencord), and their contributors, wrote almost all of the code here.
- The startup font is Determination Mono Web by Abacadaba, included unmodified under CC BY-NC-ND (see `src/splash/DeterminationMono-LICENSE.txt`). Deltacord is free and non-commercial.
- Deltacord is not affiliated with Discord, Equicord or Vencord. Using client mods is against Discord's Terms of Service, so use it at your own risk.
