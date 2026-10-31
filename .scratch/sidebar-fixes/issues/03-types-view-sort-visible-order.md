# 03: A Types view lists notes in the order its Sort control shows

**What to build:** in Types mode, changing a view's Sort (the popover in the note list header) changes the order of the visible list. Today the sort only decides which notes survive a `limit`, and the list is then re-sorted by the view's `_sort` frontmatter, so the control looks like it does nothing.

**Blocked by:** none

**Status:** ready-for-agent

**Source:** left sidebar UX discovery on branch `docs/ux-sidebar-discovery` (`.scratch/ux-sidebar/discovery-2026-10-31.md`, detail in `work/0N-*.md`; read it with `git show docs/ux-sidebar-discovery:<path>`). Re-verify each claim against current `main` before changing code. Findings: `work/03-types-mode.md` F7.

- [ ] Picking a sort in the view Sort popover reorders the visible list immediately and after reopening the view
- [ ] A view with no Sort set keeps its current order (`_sort`, default as today)
- [ ] One source of truth for view order: the Sort popover and `_sort` cannot disagree after this change (state which one wins in the commit)
- [ ] Logic test first: a view with a sort different from its `_sort` returns notes in the sort's order
