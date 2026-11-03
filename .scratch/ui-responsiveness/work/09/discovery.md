# Issue 09 discovery

No `spec.md` in the feature folder; plan from the Issue and `research/B-verify.md` (fix 3, risks 3-5).

## Files and plan

1. Sort port, `fs.logic.ts`: `naturalCompare` (port of `natural_cmp`, `vault.rs:1549`, compared by code point, not UTF-16 unit), `compareTreeNodes` (dirs first, `sort_nodes` `vault.rs:1524`), `orderLevel` (the one-level body of `applyFolderOrder`, `fs.logic.ts:402-467`; `applyFolderOrder` keeps its behavior by calling it), `insertTreeNode` (walk from the root, create missing ancestor dirs, skip when the path is already there, re-sort the level by name then `orderLevel`: the same result a fresh scan + `applyFolderOrder` gives for that level), `moveTreeNode` (remove `from`, rewrite the snapshot's paths, re-sort its subtree, insert at `to`; a `to` already in the tree wins).
   Parity: `src/tests/fixtures/natural-sort-parity.fixture.json` (digits, case, unicode, dotfiles, expected order). Rust test `src-tauri/tests/vault_natural_sort_parity_test.rs` against `natural_cmp` (made `pub`), TS test in `fs.logic.test.ts`. Prior art: `frontmatter-parity.fixture.json` + `vault_frontmatter_parity_test.rs`.
2. Service, `fs.service.ts`: `addToTree(path, isDirectory)` (sync insert on the current `fsStore.fileTree`, timestamps = now) and `addScannedToTree(path, isDirectory)` (a dir gets `scan_vault(path)` children, inserted after the await on the then-current tree). `createFile` / `createFolder` / `duplicateItem` use them instead of `refreshTree`.
3. Call sites: `note-creator.service.ts:120` -> `addToTree`; `path-change.service.ts:185` -> delete: nothing (already removed at :163); rename/move: `moveTreeNode` with the node snapshotted before `diskOp`, applied to the tree read at that point (after the link-rewrite await), same step in the ordering; no snapshot -> `refreshTree` fallback. `trash.service.ts:157` -> `addScannedToTree`; `templates.service.ts:122` -> `addToTree` per created path; `deep-link.service.ts:235` `refreshTreeInBackground` -> `addToTree(path)` for the written note (also `deep-link-actions.ts:219`).
4. Watcher: the post-await rebase from Issue 06 (`fs.watcher.ts:246-249`) already patches the current tree. Test: a watcher scan in flight for `/vault/a`, an app create in `/vault/b` lands meanwhile, both survive.

## Prior-art tests

- `fs.watcher.test.ts` `setupWatcher()`/`emit`; `fs.service.test.ts` (real `fsStore`, `invoke` mocked).
- `note-creator.service.test.ts`, `trash.service.test.ts`, `templates.service.test.ts`, `deep-link.service.test.ts`, `path-change` tests in `fs.service.test.ts`.

## Risks and defaults

- Inserted nodes get `modifiedAt`/`createdAt` = now (no `stat` capability). Rename/move keep the old node's times. A restored file shows "now" until the next full load (the watcher echo is skipped as modify-only).
- A same-subtree watcher scan that read the disk before the create and lands after it still drops the node; the create's own watcher echo rescans and restores it. A full load in flight across an insert, likewise.
- `_order` re-keying after a rename is left to `publishContentOrder` (it already full-loads on a content-order change).
- `duplicateItem` (`fs.service.ts:299`) is in the Issue's line list (old :280), so it moves too.
