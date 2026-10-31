# 06: The file tree sorts names naturally

**What to build:** the file tree orders names the way people read numbers: "Note 2" before "Note 10", "Day 9" before "Day 10". Folders still come first; `.kokobrain/folder-order.json` and other manual order overrides still win.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Source:** left sidebar UX discovery on branch `docs/ux-sidebar-discovery` (`.scratch/ux-sidebar/discovery-2026-10-31.md`, detail in `work/0N-*.md`; read it with `git show docs/ux-sidebar-discovery:<path>`). Re-verify each claim against current `main` before changing code. Findings: `work/02-files-mode.md` F15 (the Rust scan sorts by lowercase name; the report also notes a startup re-sort flicker, so check whether the TypeScript side sorts too and make both agree).

- [ ] Rust test first: "Note 10", "Note 2", "note 1" sort as "note 1", "Note 2", "Note 10"
- [ ] Case-insensitive as today; folders before files as today
- [ ] Manual folder-order overrides still apply
- [ ] No visible re-sort when the tree first loads
