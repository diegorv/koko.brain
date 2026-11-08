# 51: The note list header keeps its title readable

**What to build:** In a narrow note list the header title truncates to "Tod..." while "Daily note" and "New here" keep their full text labels, and the count uses `file-explorer-muted-fg` on `bg-tab-bar` (about 1.33:1, invisible). In `src/lib/features/rail-shell/RailNoteList.svelte` (about lines 416-484): give the title `min-w-16 flex-1`, collapse "Daily note" and "New here" to icon buttons with tooltips below a width breakpoint (or always), and draw the count with a tab-text token that passes 4.5:1.

**Blocked by:** 50

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] Failing first: a component test at a narrow width asserts the title text is not truncated below 4 characters and the two actions are icon buttons with accessible names
- [x] The count color pair is added to the theme readability pairs (or asserted in a test) at 4.5:1 in both built-in themes

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 3 Shell layout row 4; `work/layout.md`.
- Size: S.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.

## Comments

- 2026-11-05, branch `issue/51-note-list-header-readable`: the note list header title gets `min-w-16 flex-1`, "Daily note" and "New here" become icon buttons with accessible names and tooltips, and the count uses a tab-text token that passes 4.5:1 in both built-in themes. The fix round aligned the header action doc comments with the icon buttons. Tests: pnpm check 0 errors; RailNoteList.test.ts 67/67; full suite run 2 exit=0 (11871 passed, 1 skipped, 1 todo), pnpm build passed (run 1 had one unrelated timeout in event-calendar.model.test.ts, which passed 38/38 on its own). Reviews: round 1 APPROVED, round 2 APPROVED.
