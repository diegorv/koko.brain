# 09: App-initiated create, rename, move and restore update the tree without a whole-vault scan

**Status:** resolved

Priority: P2 (268-464 ms wait before every new note opens; 188-281 ms of it on the main thread)

**What to build:** `refreshTree` always reloads the vault root (`src/lib/core/filesystem/fs.service.ts:105-110`). It is awaited after every app-initiated change: `note-creator.service.ts:120`, `fs.service.ts:138,157,280`, `path-change.service.ts:185`, `trash.service.ts:157`, `templates.service.ts:122`, `deep-link.service.ts:235`. Creating the weekly note at 17:54:53 waited 464 ms on `loadDirectoryTree` (the note opened 524 ms after the request).

Replace it with a targeted update: insert the created or moved node directly, the way delete already uses `removeNodeByPath` (`path-change.service.ts:163`), or rescan only the affected parent. A direct insert needs a TS port of the Rust `natural_cmp` (`src-tauri/src/commands/vault.rs:1453`) and `applyFolderOrder`. Rebase the patch on the current `fsStore.fileTree` after any await: the watcher handler patches a pre-await snapshot (`fs.watcher.ts:157`), and more in-flight patches (this Issue plus the async scans of Issue 06) can drop an earlier patch, so a just-created note would vanish until the next event. Fix that race in the watcher too.

**Blocked by:** 03, 06

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run` + `pnpm build` (Rust and frontend: the sort-parity fixture is asserted on both sides)

**Source:** src/lib/core/filesystem/fs.service.ts:105-157,280, src/lib/core/note-creator/note-creator.service.ts:104-120, src/lib/core/filesystem/path-change.service.ts:163-185, src/lib/core/trash/trash.service.ts:157, src/lib/plugins/templates/templates.service.ts:122, src/lib/features/deep-link/deep-link.service.ts:235, src/lib/core/filesystem/fs.watcher.ts:155-185, src/lib/core/filesystem/fs.logic.ts:336-355,442-467

- [x] Failing first: creating a note through `openOrCreateNote` inserts it in sorted position with no `scan_vault` invoke
- [x] Sort parity: one shared fixture (digits, case, unicode, dotfiles) with its expected order, asserted by a Rust test against `natural_cmp` (`vault.rs:1457`) and by a TS test against the port
- [x] Failing first: a watcher patch and an app patch in flight together both survive
- [x] Rename, move, restore and template creation each covered at their call site
- [x] `applyPathChange` ordering (CLAUDE.md indexing rule 6) unchanged; its tests stay green

## Notes

- `path-change.service.ts:185` also serves delete, which already removes the node with `removeNodeByPath` at `:163`; the delete path needs no rescan at all.
- Issue 06 adds the post-await rebase in the watcher; reuse it here.

- Do not reorder in memory on `_order` changes: `applyFolderOrder` keeps the current relative order for nodes without `_order` (`fs.logic.ts:442-467`), so removing an `_order` would leave a stale position (B fix 6, rejected by the verifier).
- Research: `.scratch/ui-responsiveness/research/B-deep-dive.md` (fix 3), `B-verify.md` (fix review, missed risks 3-5).

## Comments

- 2026-11-03, branch `issue/09-targeted-tree-update-for-app-changes`: app-initiated create, rename, move, restore and template creation patch the file tree in place (sorted insert via a TS port of Rust `natural_cmp`, shared parity fixture) instead of a whole-vault `scan_vault`. Review fixes: hidden (dot-prefixed) paths are not inserted; an add during an in-flight `loadDirectoryTree` starts a superseding load. Tests: pnpm check 0 errors; full frontend suite exit=0 (448 files, 10282 passed, 1 skipped, 1 todo), build OK; cargo test exit=0 (1249 passed). Reviews: round 1 APPROVED (2 findings, fixed), round 2 APPROVED (no findings).
