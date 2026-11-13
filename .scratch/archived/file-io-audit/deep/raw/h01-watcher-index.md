# Deep dive h01-watcher-index (raw report)

Worktree: /Users/diegorv/Dev/pet-projects/koko/brain/.claude/worktrees/file-io-repro (branch HEAD, identical to main).
Repro tests (new, untracked): src/tests/repro/h01-watcher-index/
- read-error-treated-as-delete.test.ts (2 tests)
- self-save-hides-external-change.test.ts (2 tests)

Run: `./node_modules/.bin/vitest run src/tests/repro/h01-watcher-index/<file>` (no cargo, no build).

Result: 3 failed, 1 passed.
- read-error: "an existing note that fails to decode as UTF-8 stays in the Rust index..." FAILS: `expected [ 'read_files_batch', ...(4) ] to not include 'remove_note_from_index'`. Control ("a path that really is gone is still removed") passes.
- self-save: "an external rewrite of the note reaches the Rust index" FAILS: read_files_batch never invoked (0 calls). "an external delete ... is removed from the Rust index" FAILS: 0 calls.

Mocks: only `@tauri-apps/api/core` invoke (Tauri boundary). No store or .logic.ts mocked. Real vaultStore, real editor.hooks recent-save set, real note-change owner.

---

## Bug A: a read error on an existing note is treated as a delete

ids_covered: cross-cutting-11
verdict: CONFIRMED_BY_TEST
severity: stale-state
priority: P2
root_cause: src/lib/app/lifecycle/watcher-handler.service.ts:105-109 (`result.content !== null ? upsert : delete`), fed by src-tauri/src/commands/files.rs:63-74 (every `read_to_string` error is returned as `content: None`).

Trace:
1. files.rs:63 `fs::read_to_string(&canonical)`. Err -> `FileReadResult { content: None, error: Some(e) }` (files.rs:69-73). The Rust doc (std::fs::read_to_string, fetched from rust-lang/rust library/std/src/fs.rs on GitHub) says "If the contents of the file are not valid UTF-8, then an error will also be returned." So Latin-1 / UTF-16 / unreadable files yield `content: None`.
2. files.rs:40-45 and :54-59 also return `content: None` for canonicalize failure and for "outside vault". Those are not reachable for a note that is indexed (see refuted sub-cases).
3. watcher-handler.service.ts:95-109 loops over results and calls `applyNoteChange({kind:'delete', ...})` for every null. The TS side ignores `result.error` entirely.
4. note-change.service.ts:197-221 delete branch: `clearIndexedEntry`, `fanOut('remove')`, `remove_note_from_index`, `remove_from_search_index`, `remove_semantic_file`. No disk write anywhere on this path (checked: no remove_file/fs::remove in the commands it calls).
5. Recovery: the file stays on disk. Index comes back when the note is changed again to UTF-8 (watcher upsert), or on vault reopen. Reopen is NOT a clean heal: the snapshot (written only on full scans, vault.rs:1259/1370/1424) still holds the old entry, and scan_vault_v2_cached reconcile keeps the cached entry when the re-read fails ("re-read failed, keeping cached", vault.rs ~1300), so the note returns with its PRE-external-change content. This is stale content, not loss.

Existing tests: watcher-handler.service.test.ts (around lines 145 and 212) encode `content: null` as delete but never set an `error`, so the read-error case is untested. The claim's conclusion is accurate.

Impact: no note bytes are lost or written. Search, backlinks, tags and tasks drop the note until its next change. A rename of a linked note that runs in this window uses the Rust backlinks (link-updater.service.ts uses get_backlinks_v2), so links to the missing note are not rewritten (broken links), but no file content is removed.

Reachability: needs an .md note that was once valid UTF-8 and is later rewritten in a non-UTF-8 encoding by an external tool (Latin-1/Windows-1252, UTF-16 with BOM from some editors), or whose mode is changed to unreadable, and the change lands in an incremental batch (<=10 md files). Uncommon, not a default-path action.

Claim wording note: "until a later UTF-8 change" is incomplete. Vault reopen also restores the note, but with stale cached content.

Fix sketch: branch on the error. Only a not-found (canonicalize NotFound, or read NotFound) becomes a delete. Any other error (InvalidData, PermissionDenied) must skip the note and log, leaving the index untouched. The Rust side would need to return an error kind, not only a string. Control test already in place.

recoverable: yes, no content lost (disk intact).

---

## Bug B: the self-save skip drops a real external write or delete of a just-saved note

ids_covered: external-change-6
verdict: CONFIRMED_BY_TEST
severity: stale-state
priority: P2
root_cause: src/lib/app/lifecycle/watcher-handler.service.ts:41-44 (`areAllRecentSaves(filePaths)` -> return before any read), with the window set by src/lib/core/editor/editor.hooks.ts:24 (15 s), :37-44 (`markRecentSave` resets the timer per path), :67-68 (`notifyAfterSave` calls it on every save).

Trace:
1. Save of N: notifyAfterSave -> markRecentSave(N) (editor.hooks.ts:68). Timer refreshed per save, per path.
2. External change to N inside 15 s: watcher batch [N] -> rebuildAllIndexes -> filePaths=[N] -> areAllRecentSaves true -> return (watcher-handler:41-44). No read_files_batch, no update_note_in_index, no FTS, no semantic. Test "external rewrite" confirms 0 IPC calls.
3. External delete of N inside 15 s: same early return, so no remove_note_from_index. Rust index keeps N as a ghost; FTS and semantic keep it too.
4. The batch is only skipped when ALL file paths are recent. A batch that also contains a non-recent path is processed, and N's entry in it is then read normally (the claim's "batch is skipped" applies to the all-recent case).
5. Tab handling, runWatcherBatch (app-lifecycle.service.ts:481-487): reloadExternallyChangedTabs(paths) runs first and is NOT gated by the recent-save check. For a clean open tab of N it reads disk and calls syncExternalContentToEditor (editor.service.ts:375-404). So the editor content is correct; the indexes are not.
6. Partial heal, refined: if N's tab is ACTIVE, the content change fires the layout effect (src/routes/(app)/+layout.svelte:137-157, 1 s debounce) -> updateIndexesForFile (index-updater.service.ts:24-44) with source 'edit', no vaultPath. Rust VaultIndex and TS consumers get refreshed (dedupe misses because content changed). FTS5 and semantic do NOT (no vaultPath, note-change.service.ts:240-255). If N's tab is open but NOT active (the claim's scenario: save N, switch to M), the layout effect does not run for N; N's indexes heal only when the user activates N's tab (content effect fires then, plausible by trace, not run) or on vault reopen (reconcile re-reads changed mtimes). If N has no open tab, only reopen or a later change heals it.
7. Ghost on external delete: reloadExternallyChangedTabs' read rejects, it logs and continues (editor.service.ts:51-54). The ghost remains in Rust index, FTS and semantic until reopen (reconcile drops deleted entries) or the next change to N.

Not data loss: the skip and the reload only affect indexes and the clean-tab view. Editor-wins for dirty tabs (editor.service.ts:375-383 comment) is a separate policy and was not part of this claim.

Reachability: needs an external write or delete to the same note within 15 s after the app's own save of it, and the watcher batch containing only recent-save paths. Sync tools or a script touching the same file right after an autosave. Low. The window is per path and every save of N extends it.

Downstream: stale backlinks/outgoing links can make a later rename miss rewriting links (link-updater.service.ts uses get_backlinks_v2). Broken links, no content loss.

Claim line refs: 41-44 (ok), 24/37-44 (ok), 68 (ok), app-lifecycle:486 (ok), +layout:137-157 (ok), index-updater:24-40 (ok). Claim said the TTL is "reset at :24" - :24 is only the constant; the reset is in markRecentSave (:37-44). Minor.

recoverable: yes, editor content is correct; index heals on tab activation (partial), reopen, or next change.

---

## Refuted / not-a-bug sub-scenarios

- R1 (cross-cutting-11 sub-case, symlinks): "outside vault" rejection (files.rs:49-59) could drop an indexed note through a symlink. Refuted: utils/fs.rs walk_dir_with_metadata (around lines 236-300) does symlink_metadata and skips every symlink (`if metadata.file_type().is_symlink() { continue; }`), so symlinked notes are never in the Rust index and the outside-vault branch cannot remove an indexed note. Symlinked DIRECTORIES are not descended either. Canonical vault root (validate_vault_path) makes the prefix check work for symlinked vault roots.
- R2 (cross-cutting-11 sub-case, concurrency): two overlapping watcher batches could apply delete then upsert out of order. Refuted for the batch level: app-lifecycle.service.ts:481 wraps the batch in serializeWithRerun, so batches do not overlap. Within one batch, applyNoteChange for each result is awaited in sequence (watcher-handler:95-110).
- R3 (cross-cutting-11 sub-case, a missing file): a file deleted between watcher event and read gives canonicalize NotFound -> delete. That is correct behavior, not a bug.

## Out of scope, observed, not verified

- reloadExternallyChangedTabs (editor.service.ts:51-54) swallows failed reads (for example a non-UTF-8 rewrite). If the user then types in that stale clean tab, autosave overwrites the external version. This follows the documented editor-wins rule, but it is a data-loss candidate for the editor/save group, not h01. Not traced further.
- Rust watcher paths use the un-canonicalized vault path while index keys come from the canonical root (vault.rs collect uses the canonical root). Possible key mismatch when the vault path is itself a symlink. Not traced to a user-visible result. Not part of these claims.

## Not checked

- macOS FSEvents behavior for symlink targets (not needed; symlinks are skipped on the scan side).
- The exact serde output of `Option<String>::None` (assumed `null`, which the existing TS `!== null` check relies on).
- The non-active-tab heal (step 6) was traced, not run as a test.
- Risk the user must know: none of the three claims loses note bytes. Both bugs are index staleness. Bug A also leaves a stale-content copy in the snapshot until a full scan can re-read the file.
