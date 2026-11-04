# 03: A Types view lists notes in the order its Sort control shows

**What to build:** in Types mode, changing a view's Sort (the popover in the note list header) changes the order of the visible list. Today the sort only decides which notes survive a `limit`, and the list is then re-sorted by the view's `_sort` frontmatter, so the control looks like it does nothing.

**Blocked by:** none

**Status:** resolved

**Source:** left sidebar UX discovery on branch `docs/ux-sidebar-discovery` (`.scratch/ux-sidebar/discovery-2026-10-31.md`, detail in `work/0N-*.md`; read it with `git show docs/ux-sidebar-discovery:<path>`). Re-verify each claim against current `main` before changing code. Findings: `work/03-types-mode.md` F7.

- [x] Picking a sort in the view Sort popover reorders the visible list immediately and after reopening the view
- [x] A view with no Sort set keeps its current order (`_sort`, default as today)
- [x] One source of truth for view order: the Sort popover and `_sort` cannot disagree after this change (state which one wins in the commit)
- [x] Logic test first: a view with a sort different from its `_sort` returns notes in the sort's order

## Comments

- 2026-10-31, branch `issue/03-types-view-sort-visible-order`: a view's `sort:` (the Sort popover) now decides the visible order; `_sort` applies only to a view with no sort (`resolveViewListSort`, `getNotesForViewPaths` keeps the query order on `null`). Added logic and component tests, including removing the last sort. Full suite: 346 files, 8407 tests passed, `pnpm build` ok; `pnpm check` 0 errors. Review round 1: APPROVED (1 minor fixed with a test, 2 nits left as noted).
