# 49: The note action bar drops duplicated controls and folds rare actions into More

**What to build:** The note action bar shows up to 10 equal-weight icon buttons, and two of them duplicate controls already on screen: Raw (`src/lib/features/note-action-bar/NoteActionBar.svelte`, about line 176) duplicates the floating `<>` toggle (`src/lib/app/EditorView.svelte`, about lines 131-142), and the sidebar toggle (about line 227) duplicates the tab-band toggle (`src/lib/app/AppShell.svelte`, about lines 187-193). For Markdown notes, remove the floating `<>` (keep it for kanban, canvas and view tabs, placed clear of the canvas minimap) and keep only the tab-band sidebar toggle. Move neighbourhood, width, table of contents, reveal and copy path into More by default (the fold logic in `note-action-bar.logic.ts`, `BAR_RESERVED_WIDTH` about line 97), and separate the remaining groups with a thin divider. The bar becomes `h-10` like the Properties header (it is `h-9` at about line 124).

**Blocked by:** none

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] Failing first: `note-action-bar.logic` tests pin the new default fold set and the reserved width
- [x] A component test asserts the floating raw toggle is absent for a Markdown tab and present for a kanban, canvas and view tab
- [x] Only one sidebar toggle is rendered for a Markdown note
- [x] The bar height matches the Properties header (both `h-10`)

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 1 item 8 and section 3 Shell layout; `work/layout.md`.
- Owner check: which actions stay visible is a taste call; the list above is the review's proposal.
- Size: M.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.

## Comments

- 2026-11-04, branch `issue/49-note-action-bar-trim`: Markdown tabs drop the floating raw toggle (kept for kanban, canvas, view tabs) and the duplicate sidebar toggle; neighbourhood, width, table of contents, reveal and copy path fold into More by default; groups split by thin dividers; bar is `h-10`. Fix round after review 1: help doc Note width row corrected, E2E run (45 passed). Tests: pnpm check exit 0; full suite exit 0 on second run (495 files, 11762 passed; first run had 3 load timeouts that pass alone), pnpm build passed. Reviews: round 1 APPROVED, round 2 APPROVED (one optional JSDoc nit, not applied).
