# h02-watcher-bulk deep dive

Worktree: /Users/diegorv/Dev/pet-projects/koko/brain/.claude/worktrees/file-io-repro

Ids: external-change-7, external-change-4, external-change-3. Three distinct bugs, none refuted.

## Bug A: bulk external change never refreshes FTS5 or semantic rows (covers external-change-7)

Verdict: CONFIRMED_BY_TEST for the FTS5 leg. Priority P2 (stale-state, no content loss).

Trace:
- `src/lib/app/lifecycle/watcher-handler.service.ts:30-44`: directory-only batches return early (`filePaths.length === 0`). Confirmed.
- `:53`: the incremental branch needs `mdPaths.length > 0 && <= INCREMENTAL_THRESHOLD (10)`. Only that branch calls `applyNoteChange` with `vaultPath`, which reaches `update_search_index_file` and `update_semantic_file` (`src/lib/core/filesystem/note-change.service.ts:240-255`).
- `:66-75` (full branch): calls `rebuildIndex()`, `buildPropertyIndex()`, `buildFrontmatterIconIndex()`, `notifyContentInvalidated()`. No FTS5 or semantic call. Confirmed.
- `rebuildIndex` (`src/lib/features/backlinks/backlinks.service.ts:112-117`) runs `scan_vault_v2_cached`. `src-tauri/src/commands/vault.rs:1198-1330` only touches the VaultIndex and the cache file; no FTS5 or semantic writes. Confirmed.
- `buildSearchIndex` has one caller, `app-lifecycle.service.ts:421`. Its Rust side (`build_search_index`, `src-tauri/src/commands/search_index.rs:39`) reconciles by mtime (`fts_logic.rs` `plan_reconcile`), so the stale FTS5 rows clear on the next vault open. This matches the claim's "until the next vault open".
- Search result open path: `editor.service.ts:145-146` shows the "Failed to open file." toast, so the claimed symptom is plausible.

Test: `src/tests/repro/h02-watcher-bulk/fts-bulk-update.test.ts` issues `rebuildAllIndexes` with 12 `.md` paths and asserts 12 `update_search_index_file` calls.
Result: FAIL, `expected [] to have a length of 12 but got +0`.

Refuted parts of the claim:
- The VaultIndex part is refuted for the >10-note branch: `scan_vault_v2_cached` reconciles the VaultIndex by walking disk, so deleted notes and moved notes are removed there. Only the FTS5 and semantic legs stay stale.
- The folder-rename part (directory-only batch leaves VaultIndex and FTS5 children stale) is PLAUSIBLE, not confirmed. The code path is confirmed (early return at :41-44). Whether FSEvents reports the children of a renamed directory is an OS behavior I could not verify from the repo. If it does not, the children stay stale in VaultIndex and FTS5 until the next full rebuild or reopen.

Reachability: any git pull or sync that changes or deletes more than 10 `.md` files. Common. Consequence is stale search and a "Failed to open file." toast, not byte loss.

## Bug B: FSEvents rescan forwarded as a bare directory, so clean tabs under it are never reloaded (covers external-change-4)

Verdict: CONFIRMED_BY_TRACE. Priority P1, severity data-loss through overwrite.

Trace:
- `src-tauri/src/vault/watcher.rs` (`start_watcher_inner`): every `event.paths` entry is sent to the bridge, regardless of `event.kind` or flag. Rescan events pass through. Confirmed.
- notify source. The lock file pins notify 8.2.1 (`src-tauri/Cargo.lock:3159-3160`), not 8.2.0 as the claim says. I fetched the fsevent.rs source for 8.2.1 through docs.rs (`https://docs.rs/crate/notify/8.2.1/source/src/fsevent.rs`). The raw GitHub and GitHub blob URLs returned 404. The fetch shows `MUST_SCAN_SUBDIRS` maps to `EventKind::Other` with `Flag::Rescan`. `UserDropped` and `KernelDropped` only add an info string. The event carries only the single directory FSEvents reported, with no descendant paths.
- `fs.watcher.ts:198-199`: `void handleChangedPaths(payload.paths)`. `:149`/`:137`: a directory such as `/vault/Projects` makes `resolveRescanParents` (`fs.logic.ts:298-313`) return `[vaultPath]`, so the tree does update (full vault scan). Confirmed.
- `fs.watcher.ts:73-82`/`:151-152`: the listener fan-out then passes `['/vault/Projects']` to `app-lifecycle.service.ts:494-495`, which pushes it into `pendingWatcherPaths`.
- `app-lifecycle.service.ts:486`: `reloadExternallyChangedTabs(paths)`. `editor.service.ts:375-381` matches tabs by exact `t.path === filePath`, so a directory matches no tab. The only other focus listener (`tauri-listeners.service.ts:309`) handles the daily note only. Confirmed: no tab is reloaded.
- `app-lifecycle.service.ts:487`: `rebuildAllIndexes(['/vault/Projects'])`. `watcher-handler.service.ts:33-36` keeps only names containing `.`, so the filtered list is empty, and `:41-44` returns early. VaultIndex, FTS5 and semantic rows are not touched for the notes that changed in the dropped window. Confirmed.
- `editor.service.ts:168` (`saveFileByPath`) writes `tab.content` unconditionally, with no mtime or conflict check. A clean stale tab becomes dirty on the next keystroke, and the 2 s `debouncedSave` autosave (`editor.service.ts`, `saveDirtyTabs`) overwrites the external version. Confirmed.

Refuted or narrowed parts:
- The tree does update, as the claim says.
- Whether FSEvents emits MustScanSubDirs under a large checkout is an OS runtime fact I did not verify. It is documented FSEvents behavior for dropped events, so the trigger is PLAUSIBLE on the OS side and CONFIRMED on the code side.

Recoverable: the overwritten external version is recoverable only via git history or sync-client version history. Not via the app's undo, because the stale buffer is what gets written.

## Bug C: a failed tree refresh drops the burst's listener fan-out (covers external-change-3)

Verdict: CONFIRMED_BY_TEST for the fan-out drop, trigger CONFIRMED_BY_TRACE. Priority P2.

Trace:
- `fs.watcher.ts:137`, `:149`, `:175`: `await refreshTree()` with no try/catch. `notifyListeners` is at `:139`, `:151`, `:177`, `:185`, so it is skipped when refreshTree throws.
- `fs.watcher.ts:199`: `void handleChangedPaths(...)` makes the rejection unhandled. Confirmed.
- `fs.service.ts:96-98`: `loadDirectoryTree` rethrows; `refreshTree` at `:105-110` does not catch.
- `src-tauri/src/commands/vault.rs:96` (`fs::read_dir(dir).map_err(...)?`) and `:139` (`scan_dir(&file_path, ...)?`): an unreadable subfolder fails the whole `scan_vault`. Per-entry `symlink_metadata` errors are skipped (`:114-117`), but read_dir errors are not. Confirmed.
- `fs.logic.ts:310`: a root-level note change returns `[vaultPath]`, so the incremental branch runs `scan_vault` on the root, and its catch at `:172-176` calls `refreshTree()` again, which rejects.

Test: `src/tests/repro/h02-watcher-bulk/refresh-failure-fanout.test.ts` makes `scan_vault` and `refreshTree` reject, emits `/vault/root.md`, and asserts the change listener is called.
Result: FAIL, `expected "vi.fn()" to be called with arguments: [ [ '/vault/root.md' ] ]`, `Number of calls: 0`, plus an "Unhandled Rejection: Failed to read directory: permission denied".

Variant (same id, not a separate bug): the claim says a `start_vault_watcher` failure leaves the vault unwatched. Trace confirms it. `fs.watcher.ts:194-209` catches and only logs. `app-lifecycle.service.ts:499-501` `.catch` cannot fire because `startWatching` never rejects. The vault then runs unwatched with no UI signal. Reachability is low (macOS FSEvents watch start rarely fails for an existing vault). Trace only, not tested.

Reachability: needs an unreadable subfolder (persistent) or a directory removed during the scan (millisecond window). Transient failures self-heal on the next burst, but the failed burst's paths are never delivered to listeners, so clean tabs for those files stay stale until the user types. Then the stale buffer overwrites the external version (`editor.service.ts:168`). Recoverable only via git or sync history.

## Files created

- /Users/diegorv/Dev/pet-projects/koko/brain/.claude/worktrees/file-io-repro/src/tests/repro/h02-watcher-bulk/fts-bulk-update.test.ts (FAIL, expected)
- /Users/diegorv/Dev/pet-projects/koko/brain/.claude/worktrees/file-io-repro/src/tests/repro/h02-watcher-bulk/refresh-failure-fanout.test.ts (FAIL, expected)

## Not checked

- Rust `scan_vault` failure was traced, not executed. No cargo was run, as instructed.
- FSEvents child-event behavior on directory rename and MustScanSubDirs emission under load are OS facts not verified at runtime.
- The overwrite chain in B and C was traced through code, not reproduced in an end-to-end editor test.
