#!/usr/bin/env python3
"""Rename "Equicord" to "Deltacord" in text the user sees. Run after every sync with upstream Equicord:

    python3 scripts/rebrand.py

Only whole-word "Equicord" inside text is changed. Code names (EquicordDevs, isEquicord, plugin ids such as
EquicordToolbox), links, imports and lowercase ids (equicord_main) are left alone, as are the places that
really mean the Equicord project: its donor, contributor and translator badges, its support helper, other
users' platform indicators, badge services, an external overlay's client id, which plugins came from Equicord, the Narecord plugins
and the credits on the About page.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SKIP_FILES = {
    "src/main/about.html",
    "src/plugins/_core/supportHelper.tsx",
    "src/plugins/platformIndicators/index.tsx",
    "src/plugins/_api/badges/index.tsx",
    "src/plugins/_api/badges/BadgeDirectoryDetail.tsx",
    "src/equicordplugins/showBadgesInChat/settings.tsx",
    "src/equicordplugins/globalBadges/index.tsx",
    "src/equicordplugins/globalBadges/utils.ts",
    "src/plugins/xsOverlay/index.tsx",
    "src/components/settings/tabs/plugins/PluginCard.tsx",
}
SKIP_DIRS = ("src/userplugins/",)
SKIP_LINE = re.compile(r"import |require\(|github\.com|equicord\.org|Donor|Contributor|Translator|donat|contribut|perks|badge|SearchStatus\.EQUICORD", re.I)
WORD = re.compile(r"(?<![A-Za-z0-9_$./-])Equicord(?![A-Za-z0-9_$])")
STRING_OR_TEXT = re.compile(r"\"[^\"\n]*\"|'[^'\n]*'|`[^`\n]*`|>[^<>{}\n]*<|^\s*[^<>{}=;:()\n]*[A-Za-z][^<>{}=;:()\n]*$")


def rebrand_line(line: str) -> str:
    if "Equicord" not in line or SKIP_LINE.search(line):
        return line
    return STRING_OR_TEXT.sub(lambda m: WORD.sub("Deltacord", m.group(0)), line)


def main() -> int:
    changed = 0
    for path in sorted((ROOT / "src").rglob("*")):
        rel = path.relative_to(ROOT).as_posix()
        if path.suffix not in {".ts", ".tsx", ".html"} or rel in SKIP_FILES or rel.startswith(SKIP_DIRS) or rel.endswith(".d.ts"):
            continue
        text = path.read_text(encoding="utf-8")
        new = "\n".join(rebrand_line(line) for line in text.split("\n"))
        if new != text:
            path.write_text(new, encoding="utf-8")
            changed += 1
            print("rebranded", rel)
    print(f"{changed} files changed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
