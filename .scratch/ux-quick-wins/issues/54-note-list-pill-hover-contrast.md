# 54: Note list property pill keeps contrast on hover

**Origin:** review of Issue 52 (`.scratch/ux-quick-wins/work/52/review.md`, finding 3).

**What to build:** a clickable property pill in `src/lib/features/note-list/NoteRow.svelte` (`bg-primary/10 ... text-primary hover:bg-primary/20`) reads at about 3.5:1 when the pill is hovered on a row that is itself hovered (`hover:bg-primary/10`): KokoBrain Default 3.51, Lavender Haze 3.69, by the reviewer's `contrastRatio` probe over `fileExplorerBg`. Issue 52's theme test pins only the pill at rest on the resting sidebar. Pick a hover treatment that keeps the pill text at 4.5:1 or more, or fold this into shell-sidebars-ux 04, 10 or 11, which take the selected-row chips.

**Size:** S.

**Blocked by:** none

**Status:** needs-triage

**Gate:** pnpm check + pnpm vitest run.

- [ ] A test over `BUILTIN_THEMES` pins the hovered pill on a hovered row at 4.5:1 or more.
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Comments

- 2026-11-19, filed from Issue 52's review; not triaged.
