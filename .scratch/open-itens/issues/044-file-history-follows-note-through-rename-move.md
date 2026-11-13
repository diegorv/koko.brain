# 044: File History follows a note through rename, move, auto-move and suffixed restore

**Origin:** `audit-2026-11-05` Issue 23, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**Migrated from:** `.scratch/archived/file-io-audit/issues/23-file-history-keyed-by-path.md` (audit 2026-11-05). Priority: daily use and UI correctness (bucket 2-ux). Still present, medium. Renames are common and leave the history panel empty. Note bytes are untouched, so this is wrong data on screen rather than lost content.

**Audit check at `5f8003d67`:** still_present (content, medium). Snapshot keys are vault-relative paths built at src/lib/features/file-history/file-history.service.ts:27 and :115. src/lib/core/filesystem/path-change.service.ts has no history leg (rg 'history' finds only tree-snapshot comments at :132-136). rg for rename_history, rename_snapshots or 'UPDATE snapshots' finds nothing in src-tauri/src or src/lib. So after any rename or move the note shows an empty File History and its old rows age out; a new note at the old path inherits them. Note bytes are not affected. Renames and moves are daily operations for this owner.

**Stale in the text below:** The path-change.service.ts:117-171 range in the Issue was not re-verified line by line; the conclusion (no history leg) holds at HEAD.

**Status:** ready-for-agent

**Blocked by:** none
Priority: P2
Severity: stale-state
Source: file I/O audit, deep-dive group(s) o05-settings-history (raw reports in .scratch/archived/file-io-audit/deep/raw/), verified at c4bfee07

## Details

- Verdict: CONFIRMED_BY_TEST (deep dive priority P2, severity stale-state)
- Claims covered: recovery-8

**How a user hits it.** Any rename or move (common), auto-move when enabled (off by default), or a Trash restore to an occupied path. The renamed note shows an empty history. The old rows are unreachable from the UI and age out after retention+30 days. A new note created at an old path inherits the old note's versions. Note bytes are not affected.

**Recoverable from.** Rows stay in .kokobrain/kokobrain.db until retention purges them; reachable only with sqlite by hand. Not from the UI.

**Root cause.** src/lib/core/filesystem/path-change.service.ts:117-171 (no history leg); keys built at src/lib/features/file-history/file-history.service.ts:27,115

**Evidence.** getRelativePath (file-history.logic.ts:109-118) builds the key; applyPathChange calls diskOp, consumers, updateLinksAfterRename, refreshTree, rename_note and forgetNote, none of which touch snapshots. In src-tauri/src only db/history_repo.rs and db/schema.rs reference the snapshots table (rename_note does not). trash.service.ts:115 restores to a suffixed path when the original is occupied. help/documentation/22-auto-move.md:177,188 tells users to recover moved files with File History.

**Repro test.** `.scratch/archived/file-io-audit/repro/o05-settings-history/file-history-rename.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
AssertionError: expected [] to deeply equal [ 1 ] (fileHistoryStore.snapshots ids for the renamed note)
```

**Fix sketch.** Add a Rust rename_history(from, to) (prefix-aware for folders: UPDATE snapshots SET file_path = ...), called from applyPathChange next to rename_note. Optionally tombstone the rows of deleted paths so a re-created path does not inherit them.

## Acceptance criteria

Written by audit 2026-11-05 from the text above and its audit header; the original Issue had none.

- [ ] Failing test first, in src-tauri/tests/history_test.rs (same setup and TEST_LOCK pattern as the save_snapshot cases): save two snapshots for 'notes/old.md' with save_snapshot, call the new rename_history('notes/old.md', 'notes/new.md'), then get_file_history('notes/new.md') returns both snapshots and get_file_history('notes/old.md') is empty. It fails today (the command does not exist, so the file does not compile against it).
- [ ] Folder rename is prefix-aware: rows for 'a/x.md' and 'a/sub/y.md' move to 'b/x.md' and 'b/sub/y.md' on rename_history('a', 'b'), while rows for 'ab/z.md' (a sibling sharing the prefix text) are untouched.
- [ ] Snapshot contents survive the move: get_snapshot_content for an id from before the rename still returns the saved bytes, and a second snapshot saved at the new path de-duplicates against the moved rows as it would have at the old path.
- [ ] The command is registered with the Tauri handler and the frontend contract (src/lib/contracts/commands.ts), and src/tests/lib/contracts/ipc.test.ts and src-tauri/tests/ipc_contracts_test.rs stay green.
- [ ] Wiring test, in src/tests/lib/core/filesystem/fs.service.test.ts: applyPathChange (through renameItem and moveItem) invokes rename_history with the vault-relative from and to keys, once for a folder change, awaited together with rename_in_search_index and before the per-path forgetNote sweep. The call is skipped when either path is outside the vault. A rename_history failure is logged and does not abort the rename, the way a rename_note failure does.
- [ ] Auto-move reaches the same leg: a move performed by auto-move re-keys the history rows (it uses the same applyPathChange path; one test or an asserted call path in the existing auto-move or fs.service tests).
- [ ] A Trash restore to a suffixed path (restoreItem, trash.service.ts:110, which does not go through applyPathChange) re-keys only the trashed note's own rows: snapshots at item.originalPath with created_at <= item.trashedAt move to the restore path, and rows saved later by the note that now occupies the original path stay there. Rust test in src-tauri/tests/history_test.rs for the time-bounded re-key (rows before and after the cutoff), and a case in src/tests/lib/core/trash/trash.service.test.ts that restores to a suffixed path and invokes the re-key with the vault-relative keys and trashedAt. A restore to the free original path needs no re-key.
- [ ] After a rename the old path has no rows, so a new note created at the old path starts with an empty history (asserted in the Rust test above).
- [ ] Gate, both: cargo test --manifest-path src-tauri/Cargo.toml + pnpm check + pnpm vitest run.

**Second opinion (audit 2026-11-05, round 2):** upheld (ux, medium). Confirmed. Snapshots are keyed by vault-relative path (file-history.service.ts:27, :115). path-change.service.ts has no history leg; its only 'snapshot' hits are tree-snapshot comments at :132-148. In src-tauri/src and src/lib, rg finds no UPDATE of snapshots.file_path and no rename_history; history_repo.rs only SELECTs and DELETEs by file_path. After a rename the panel is empty, and a new note at the old path inherits the old rows. The note's bytes are untouched, so this is wrong data on screen. Corrections to apply while implementing: The header verdict says 'content, medium'. It is ux, as the Issue's own bucket says.

## Comments

- 2026-11-06: migrated from `.scratch/archived/file-io-audit/issues/23-file-history-keyed-by-path.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
