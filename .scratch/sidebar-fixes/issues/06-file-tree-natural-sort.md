# 06: The file tree sorts names naturally

**What to build:** the file tree orders names the way people read numbers: "Note 2" before "Note 10", "Day 9" before "Day 10". Folders still come first; `.kokobrain/folder-order.json` and other manual order overrides still win.

**Blocked by:** none

**Status:** resolved

**Source:** left sidebar UX discovery on branch `docs/ux-sidebar-discovery` (`.scratch/ux-sidebar/discovery-2026-10-31.md`, detail in `work/0N-*.md`; read it with `git show docs/ux-sidebar-discovery:<path>`). Re-verify each claim against current `main` before changing code. Findings: `work/02-files-mode.md` F15 (the Rust scan sorts by lowercase name; the report also notes a startup re-sort flicker, so check whether the TypeScript side sorts too and make both agree).

- [x] Rust test first: "Note 10", "Note 2", "note 1" sort as "note 1", "Note 2", "Note 10"
- [x] Case-insensitive as today; folders before files as today
- [x] Manual folder-order overrides still apply
- [x] No visible re-sort when the tree first loads

## Comments

- 2026-10-31, branch `issue/06-file-tree-natural-sort`: `sort_nodes` in `src-tauri/src/commands/vault.rs` now orders names with `natural_cmp` (digit runs by value, case-insensitive, folders still first); no TS code sorts the tree by name and `applyFolderOrder` keeps the scan order for nodes without an override, so TS and Rust agree. The E2E `scan_vault` mock sorts naturally too. Review round 1: APPROVED (one major, one minor, one nit; the minor E2E mock sort fixed, the `_order` startup reorder in `app-lifecycle.service.ts` step 4b left for a possible follow-up Issue, the help page wording left to Issue 08). Tests: `pnpm check` 0 errors; full suite 346 files, 8424 passed, 1 todo; `pnpm build` ok; `cargo test` 1129 passed, 0 failed.
