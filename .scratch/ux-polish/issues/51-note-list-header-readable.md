# 51: The note list header keeps its title readable

**What to build:** In a narrow note list the header title truncates to "Tod..." while "Daily note" and "New here" keep their full text labels, and the count uses `file-explorer-muted-fg` on `bg-tab-bar` (about 1.33:1, invisible). In `src/lib/features/rail-shell/RailNoteList.svelte` (about lines 416-484): give the title `min-w-16 flex-1`, collapse "Daily note" and "New here" to icon buttons with tooltips below a width breakpoint (or always), and draw the count with a tab-text token that passes 4.5:1.

**Blocked by:** 50

**Status:** needs-triage

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing first: a component test at a narrow width asserts the title text is not truncated below 4 characters and the two actions are icon buttons with accessible names
- [ ] The count color pair is added to the theme readability pairs (or asserted in a test) at 4.5:1 in both built-in themes

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 3 Shell layout row 4; `work/layout.md`.
- Size: S.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.
