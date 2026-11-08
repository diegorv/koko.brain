# 232: Future: icon colors customizable in Settings > Appearance

**Origin:** `rail-styles` Issue 07, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/rail-styles/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** Settings > Appearance lets the owner change the color of each built-in rail item, replacing the fixed palette from Issue 01 per vault. Not built yet, and not part of the rail-styles delivery: the owner chose to keep the fixed palette for now and to write this down.

Starting points, to check when this is triaged:

- The palette and `railItemColor` are in `src/lib/features/rail-shell/rail-items.logic.ts`, so a saved map would be read there through a `parse*` function, like the other `layout.*` keys.
- Hex only for the same reason as the mod `color` key (Issue 05): the value reaches inline styles.
- The active title stays `text-file-explorer-fg` whatever the color, so a custom color cannot make a title unreadable, though it can still hide an icon. The contrast figures that chose this are in the commit message of `0a998c9b` on `scratch/testes`.

**Blocked by:** none

**Blocked by (origin):** closed blockers dropped: rail-styles 05.

**Status:** needs-triage

**Gate:** decided at triage.

## Notes

- Do not launch this with the run of 01, 02, 03 and 05. Relay-lite ignores triage labels, so its ledger row reads `todo`: always run this feature with explicit numbers, never `--all`.

## Comments
