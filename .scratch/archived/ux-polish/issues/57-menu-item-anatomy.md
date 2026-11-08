# 57: Menu items share one anatomy

**What to build:** Menu items drift: 11 to 13 icons add `mr-2` on top of `gap-2` (EditorTabs, MarkdownEditor, KanbanCard, KanbanLane menus), CollectionView uses `text-xs` labels, labels mix Title Case and sentence case, NoteActionBar puts a separator between every More item, and MarkdownEditor hard-codes a shortcut string. Apply the review anatomy: items `h-8 px-2 gap-2 text-row rounded-sm`, icons `size-4` with no margin, sentence case, separators only between groups of 2 or more, shortcuts from `formatShortcut`.

**Blocked by:** none

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] A grep-style test fails on `mr-2` inside menu item content outside `components/ui`
- [x] Shortcut hints in menus come from `formatShortcut` (test on the editor menu)
- [x] Labels are sentence case (copy check in the commit)

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 2 "Overlay anatomy" and section 3 Overlays row 9; `work/overlays.md`.
- Size: M.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.

## Comments

- 2026-11-05, branch `issue/57-menu-item-anatomy`: menu items keep the shared row anatomy (no `mr-2` on icons, guarded by a grep-style test), `formatShortcut` moved to `utils/keybindings` and used for editor menu hints, sentence-case labels, no single-item groups (NoteActionBar More menu, kanban card limit sub-menu). Review round 1: APPROVED (findings fixed: follow-up Issue 77 filed, kanban sub-menu separator test added). Review round 2: APPROVED, no findings. Full suite at e0e9dccc3: vitest 507 files / 11922 tests passed, 1 skipped, 1 todo; pnpm build passed; pnpm check 0 errors.
