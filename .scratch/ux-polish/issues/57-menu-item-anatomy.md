# 57: Menu items share one anatomy

**What to build:** Menu items drift: 11 to 13 icons add `mr-2` on top of `gap-2` (EditorTabs, MarkdownEditor, KanbanCard, KanbanLane menus), CollectionView uses `text-xs` labels, labels mix Title Case and sentence case, NoteActionBar puts a separator between every More item, and MarkdownEditor hard-codes a shortcut string. Apply the review anatomy: items `h-8 px-2 gap-2 text-row rounded-sm`, icons `size-4` with no margin, sentence case, separators only between groups of 2 or more, shortcuts from `formatShortcut`.

**Blocked by:** None (can start immediately)

**Status:** needs-triage

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] A grep-style test fails on `mr-2` inside menu item content outside `components/ui`
- [ ] Shortcut hints in menus come from `formatShortcut` (test on the editor menu)
- [ ] Labels are sentence case (copy check in the commit)

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 2 "Overlay anatomy" and section 3 Overlays row 9; `work/overlays.md`.
- Size: M.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.
