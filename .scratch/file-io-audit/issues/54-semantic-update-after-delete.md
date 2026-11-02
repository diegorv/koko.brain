# 54: A semantic update still embedding when its note is deleted leaves chunks for the trashed note

**Status:** needs-triage

**Blocked by:** none
Priority: P3
Severity: stale-state
Source: Issue 05 review (.scratch/file-io-audit/work/05/review.md, finding 1), traced only, not reproduced

## Details

Since Issue 05, `applyPathChange` saves every dirty tab under the path before a delete. Each save fires the search after-save observer (src/lib/features/search/search.service.ts:325), which starts a fire-and-forget `update_semantic_file` (src-tauri/src/commands/semantic.rs:1211-1328). That command runs ONNX inference on a `spawn_blocking` thread, shares no lock with `remove_semantic_file`, and inserts its chunk rows without checking that the file still exists. When embedding outlasts `moveToTrash` + `refreshTree` (an embedder lazy reload alone can), `forgetNote`'s `remove_semantic_file` runs first and the late insert leaves chunks for the trashed note. Semantic search then returns a hit that cannot be opened until the next `build_semantic_index` runs `cleanup_orphaned_chunks`. The calendar delete (event-calendar.service.ts `deleteNow`, which saves first) already had the same window.

Not data loss; recoverable on the next full semantic build.

**Fix sketch.** Have `update_semantic_file` skip the insert (inside the write transaction) when the file no longer exists on disk, or have the delete leg wait for or cancel a pending semantic update for the same path.

- [ ] A test where `update_semantic_file` finishes after `remove_semantic_file` for a deleted note leaves no chunk rows and no `mtime:` key for that note
