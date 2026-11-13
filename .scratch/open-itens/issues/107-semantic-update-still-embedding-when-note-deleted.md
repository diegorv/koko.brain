# 107: A semantic update still embedding when its note is deleted leaves no chunks for the trashed note

**Origin:** `audit-2026-11-05` Issue 125, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**Migrated from:** `.scratch/archived/file-io-audit/issues/54-semantic-update-after-delete.md` (audit 2026-11-05). Priority: corner case (bucket 4-corner). Narrow: a delete seconds after typing, with the embedder loaded.

**Audit check at `5f8003d67`:** still_present (corner, low). update_semantic_file (src-tauri/src/commands/semantic.rs:1305-1475) never checks that file_path still exists before its insert transaction (:1414-1460) and the empty-chunks branch (:1314-1323). remove_semantic_file (:1282-1299) is a separate transaction with no ordering against an in-flight embed. The save observer fires update_semantic_file without awaiting (src/lib/features/search/search.service.ts:326), and a delete saves dirty tabs under the path first (src/lib/core/filesystem/path-change.service.ts:55-60), so a slow embed can commit after the remove. Result: stale chunks for a trashed note until the next semantic build cleans orphans. No test exists.

**Stale in the text below:** Line refs are current within a few lines; the trigger (delete a note seconds after typing in it, with the embedder loaded) is narrow.

**Status:** ready-for-agent

**Blocked by:** none
Priority: P3
Severity: stale-state
Source: Issue 05 review (.scratch/archived/file-io-audit/work/05/review.md, finding 1), traced only, not reproduced

## Details

Since Issue 05, `applyPathChange` saves every dirty tab under the path before a delete. Each save fires the search after-save observer (src/lib/features/search/search.service.ts:325), which starts a fire-and-forget `update_semantic_file` (src-tauri/src/commands/semantic.rs:1211-1328). That command runs ONNX inference on a `spawn_blocking` thread, shares no lock with `remove_semantic_file`, and inserts its chunk rows without checking that the file still exists. When embedding outlasts `moveToTrash` + `refreshTree` (an embedder lazy reload alone can), `forgetNote`'s `remove_semantic_file` runs first and the late insert leaves chunks for the trashed note. Semantic search then returns a hit that cannot be opened until the next `build_semantic_index` runs `cleanup_orphaned_chunks`. The calendar delete (event-calendar.service.ts `deleteNow`, which saves first) already had the same window.

Not data loss; recoverable on the next full semantic build.

**Fix sketch.** Have `update_semantic_file` skip the insert (inside the write transaction) when the file no longer exists on disk, or have the delete leg wait for or cancel a pending semantic update for the same path.

- [ ] A test where `update_semantic_file` finishes after `remove_semantic_file` for a deleted note leaves no chunk rows and no `mtime:` key for that note

## Comments

- 2026-11-06: migrated from `.scratch/archived/file-io-audit/issues/54-semantic-update-after-delete.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
