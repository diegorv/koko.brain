# 28: Watcher and folder renames leave FTS5, semantic and Rust indexes stale

**Status:** needs-triage

**Blocked by:** none
Priority: P2
Severity: stale-state
Source: file I/O audit, deep-dive group(s) h01-watcher-index, h02-watcher-bulk, h03-search-links (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Read error on an existing note is treated as a delete and the note is dropped from Rust index, FTS5 and semantic tables

- Verdict: CONFIRMED_BY_TEST (deep dive priority P2, severity stale-state)
- Claims covered: cross-cutting-11

**How a user hits it.** Needs an .md note that was valid UTF-8 and is later rewritten in a non-UTF-8 encoding (Latin-1/Windows-1252, UTF-16 with BOM) or made unreadable, and the change lands in an incremental watcher batch of 10 or fewer md files. Uncommon; not on a default action path.

**Recoverable from.** Yes. No note bytes are lost or written; the file stays on disk. Index returns on the next UTF-8 change to the note. Vault reopen also restores it, but with pre-change cached content (snapshot reconcile keeps cached entry when re-read fails).

**Root cause.** src/lib/app/lifecycle/watcher-handler.service.ts:105-109 maps every content:null to kind 'delete', fed by src-tauri/src/commands/files.rs:63-74 which returns content None for any read_to_string error (std doc: invalid UTF-8 returns an error).

**Evidence.** Repro src/tests/repro/h01-watcher-index/read-error-treated-as-delete.test.ts: first test FAILS with 'expected [ read_files_batch, ...(4) ] to not include remove_note_from_index'; control test (path really gone) passes. note-change.service.ts:197-221 delete branch has no disk write. TS ignores result.error. Existing watcher-handler tests (lines ~145, ~212) use content:null without error, so the read-error case is untested.

**Limits found while trying to refute.** Sub-cases refuted: symlinked notes are never indexed (utils/fs.rs walk_dir_with_metadata skips all symlinks), so the outside-vault branch cannot drop an indexed note; overlapping batches are prevented by serializeWithRerun (app-lifecycle.service.ts:481).

**Repro test.** `.scratch/file-io-audit/repro/src/tests/repro/h01-watcher-index/read-error-treated-as-delete.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
AssertionError: expected [ 'read_files_batch', …(4) ] to not include 'remove_note_from_index'  (1 failed, control passed)
```

**Fix sketch.** Only a NotFound error becomes a delete. Other errors (InvalidData, PermissionDenied) skip the note and log, leaving the index untouched. Needs the Rust side to return an error kind, not only a string. The control test already pins the not-found path.

## Self-save skip drops a real external write or delete to a just-saved note from the indexes for up to 15 s after the last save

- Verdict: CONFIRMED_BY_TEST (deep dive priority P2, severity stale-state)
- Claims covered: external-change-6

**How a user hits it.** Needs an external write or delete to the same note within 15 s of the app's own save of it, with the watcher batch containing only recent-save paths. Low. Window is per path and each save of that note extends it.

**Recoverable from.** Yes. Editor content is correct (clean tabs reload via reloadExternallyChangedTabs, not gated). Indexes heal when the note's tab becomes active (layout effect, 1 s, source 'edit': Rust + TS consumers but NOT FTS5/semantic), on vault reopen (reconcile), or on the next change to the note. No content loss from this path.

**Root cause.** src/lib/app/lifecycle/watcher-handler.service.ts:41-44 returns early when areAllRecentSaves(filePaths); window set by src/lib/core/editor/editor.hooks.ts:24, markRecentSave :37-44 (per-path timer reset), notifyAfterSave :67-68.

**Evidence.** Repro src/tests/repro/h01-watcher-index/self-save-hides-external-change.test.ts: 'external rewrite reaches Rust index' FAILS (read_files_batch never invoked, 0 calls); 'external delete is removed' FAILS (0 calls). app-lifecycle.service.ts:481-487 runs reloadExternallyChangedTabs before rebuildAllIndexes, ungated. Claim's 'TTL reset at :24' is a minor misattribution (:24 is the constant; reset is in markRecentSave).

**Limits found while trying to refute.** Partial: the claim's 'until N is touched again' omits the active-tab heal (+layout.svelte:137-157 -> index-updater.service.ts:24-44), which refreshes Rust and TS consumers but not FTS5/semantic. A batch with any non-recent path is processed normally, so the skip only applies when all paths are recent.

**Repro test.** `.scratch/file-io-audit/repro/src/tests/repro/h01-watcher-index/self-save-hides-external-change.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
AssertionError: expected "vi.fn()" to be called with arguments: [ 'read_files_batch', ...] Number of calls: 0 (external rewrite); same for remove_note_from_index on external delete (2 failed)
```

**Fix sketch.** Distinguish the app's own write from an external one before skipping (e.g. compare the on-disk content with the content the app last saved, or the mtime recorded at save), instead of skipping by path alone. Alternatively always process paths whose disk content differs from the saved signature (index-dedupe already holds it).

## Bulk external change (>10 .md files) never refreshes FTS5 or semantic rows; directory-only batches skip indexes

- Verdict: CONFIRMED_BY_TEST (deep dive priority P2, severity stale-state)
- Claims covered: external-change-7

**How a user hits it.** Any git pull or sync that changes or deletes more than 10 .md files in one burst. Common. Search shows stale snippets and deleted notes until the next vault open.

**Recoverable from.** Not data loss. Reopening the vault runs the mtime reconcile in build_search_index (src-tauri/src/search/fts_logic.rs plan_reconcile), which clears the stale FTS5 rows.

**Root cause.** src/lib/app/lifecycle/watcher-handler.service.ts:66-75 (full-rebuild branch calls rebuildIndex, buildPropertyIndex, buildFrontmatterIconIndex, notifyContentInvalidated only); :41-44 (directory-only early return); src/lib/core/filesystem/note-change.service.ts:240-255 (FTS5 and semantic legs reached only from applyNoteChange, which only the incremental branch calls at :53-64).

**Evidence.** watcher-handler.service.ts:53 gates the incremental branch on mdPaths.length <= 10. Full branch :66-75 has no update_search_index_file or update_semantic_file call. backlinks.service.ts:112-117 rebuildIndex -> scan_vault_v2_cached (src-tauri/src/commands/vault.rs:1198-1330) touches only the VaultIndex and cache. buildSearchIndex single caller app-lifecycle.service.ts:421. Repro src/tests/repro/h02-watcher-bulk/fts-bulk-update.test.ts: 12 .md paths produced 0 update_search_index_file calls (expected 12). The VaultIndex part of the claim is refuted for the >10 branch because scan_vault_v2_cached reconciles it. The folder-rename part (children stale after a directory-only batch) is PLAUSIBLE: the early return is confirmed, but whether FSEvents reports the children of a renamed directory is an OS behavior not verified.

**Repro test.** `.scratch/file-io-audit/repro/src/tests/repro/h02-watcher-bulk/fts-bulk-update.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
FAIL: AssertionError: expected [] to have a length of 12 but got +0
```

## Failed tree refresh skips listener fan-out (no tab reload, no index update for that burst); start failure leaves vault unwatched silently

- Verdict: CONFIRMED_BY_TEST (deep dive priority P2, severity stale-state)
- Claims covered: external-change-3

**How a user hits it.** Needs an unreadable subfolder (persistent) or a directory removed during the scan (millisecond window). Transient failures self-heal on the next burst, but the failed burst's paths are never delivered to listeners, so clean tabs for those files stay stale until the user types and the stale buffer overwrites the external version (editor.service.ts saveFileByPath). Recoverable only via git or sync history.

**Recoverable from.** Only via git or sync-client history.

**Root cause.** src/lib/core/filesystem/fs.watcher.ts:137, :149, :175 (await refreshTree() with no try/catch, so notifyListeners at :139, :151, :177, :185 is skipped) and :199 (void handleChangedPaths, so the rejection is unhandled). Trigger: src-tauri/src/commands/vault.rs:96 (fs::read_dir(dir)?) and :139 (scan_dir(&file_path)?) fail the whole scan on an unreadable subfolder.

**Evidence.** fs.service.ts:96-98 rethrows; refreshTree (fs.service.ts:105-110) does not catch. vault.rs:96 and :139 propagate read_dir errors with ?, while per-entry symlink_metadata errors are skipped (:114-117). fs.logic.ts:310 returns [vaultPath] for root-level changes, so the incremental branch runs scan_vault on the root, and its catch (fs.watcher.ts:172-176) calls refreshTree again, which rejects. Variant (same id, not a separate bug): fs.watcher.ts:194-209 catches start_vault_watcher failures and only logs them; app-lifecycle.service.ts:499-501 .catch is dead because startWatching never rejects. Vault then runs unwatched with no UI signal. Low reachability, trace only.

**Repro test.** `.scratch/file-io-audit/repro/src/tests/repro/h02-watcher-bulk/refresh-failure-fanout.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
FAIL: AssertionError: expected "vi.fn()" to be called with arguments: [ [ '/vault/root.md' ] ] Number of calls: 0; plus Unhandled Rejection: Failed to read directory: permission denied
```

## Folder rename or move drops the moved notes from FTS5 and semantic search until restart, vault open, or per-note save

- Verdict: CONFIRMED_BY_TEST (deep dive priority P2, severity stale-state)
- Claims covered: rename-move-delete-3

**How a user hits it.** Any folder drag, rename or move in the explorer with default settings. Common. The watcher does not recover it: notify reports a directory move as the directory path only, and watcher-handler.service.ts:33-44 drops dotless directory paths, so rebuildAllIndexes returns early.

**Recoverable from.** Yes, no content loss. Restart, save each note, or reopen the vault restores the FTS and semantic rows.

**Root cause.** src/lib/core/filesystem/path-change.service.ts:153-170 (applyPathChange): the old child paths are forgotten (forgetNote, which removes FTS and semantic rows via note-change.service.ts:205-220), but nothing re-adds the children under their new paths. rename_note (src-tauri/src/commands/vault.rs:1001-1035) re-keys only the VaultIndex. buildSearchIndex runs only at app-lifecycle.service.ts:421.

**Evidence.** Repro src/tests/repro/h03-search-links/folder-rename-search-index.test.ts: remove_from_search_index for Projects/a.md is sent, but update_search_index_file is never sent for Archive/Projects/a.md or b.md (received []). Full-rebuild watcher branch (watcher-handler.service.ts:66-75) calls rebuildIndex, buildPropertyIndex and buildFrontmatterIconIndex, none of which touch FTS. notify 8.2.1 src/fsevent.rs (fetched from github.com/notify-rs/notify main/notify/src/fsevent.rs): directory renames yield RenameMode::Any for the directory path only, and the rename_dir test expects no child events. Other rows: the watcher incremental branch covers only <=10 .md files.

**Repro test.** `.scratch/file-io-audit/repro/src/tests/repro/h03-search-links/folder-rename-search-index.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
AssertionError: expected [] to deeply equal ArrayContaining { 'Archive/Projects/a.md', 'Archive/Projects/b.md' }
```

**Fix sketch.** After applyPathChange's rename, enumerate the moved child .md files under the new path (the same walk childPaths uses) and call applyNoteChange upsert with source restore-like policy that always fires the FTS/semantic leg, reading content via read_files_batch. Or trigger a per-folder reconcile of the moved subtree.
