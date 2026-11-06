# 126: A failure after the disk op still reports a completed rename as done and re-keys the index

**Migrated from:** `.scratch/file-io-audit/issues/35-path-change-post-disk-failure.md` (audit 2026-11-05). Priority: corner case (bucket 4-corner). The delete leg is fixed (f618f44ce). The rename leg's only live trigger is VaultIndex lock poisoning.

**Audit check at `5f8003d67`:** partially_fixed (corner, low). Delete leg fixed by f618f44ce (Issue 09, 2026-11-03, after c4bfee07). On to===null, applyPathChange (src/lib/core/filesystem/path-change.service.ts:171-235) has no awaited step after diskOp: setFileTree(removeNodeByPath) is synchronous (:172), the consumer fan-out is in try/catch (:176-182), and forgetNote is fire-and-forget (:233-235). The old post-delete refreshTree is gone. Rename leg narrowed: refreshTree (:201) now runs only when the moved node was not in the tree (movedNode null, :198-202). In the normal case the tree is patched in place with moveTreeNode (:199). The only remaining unguarded await before rename_note (:209) is updateLinksAfterRename (:190), whose get_backlinks_v2 call (link-updater.service.ts:46) fails only on a poisoned VaultIndex lock (src-tauri/src/commands/vault.rs:486-488), which needs an earlier panic. A missing try/finally is still a latent fragility, but its trigger is not reachable in daily use.

**Stale in the text below:** The cited mechanism no longer holds. scan_vault failing after a rename or delete is unreachable in the normal path because refreshTree is no longer called (f618f44ce). The delete repro (remove_note_from_index expected after only scan_vault) is obsolete. The rename leg's only live trigger is VaultIndex lock poisoning. Line refs (:127-170, :149, :153, :158-162, :168-170) map to :145-236, :190, :201, :209, :233-235. The calendar amplification at event-calendar.service.ts:729-731 and :1044-1049 is reachable only through those same improbable throws. Candidate for wontfix or a small defensive try/finally, not a P2.

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Blocked by:** none
Priority: P2
Severity: stale-state
Source: file I/O audit, deep-dive group(s) h04-calendar-a (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Details

- Verdict: CONFIRMED_BY_TEST (deep dive priority P2, severity stale-state)
- Claims covered: calendar-5, rename-move-delete-6

**How a user hits it.** Needs get_backlinks_v2 or scan_vault to fail right after a successful disk op. scan_vault fails whenever a non-hidden subfolder cannot be read (scan_dir propagates with ? at vault.rs:147), or a folder vanishes mid-scan; VaultIndex lock poisoning needs a prior panic under the write lock. Uncommon, not user-timed.

**Recoverable from.** Note bytes are not lost: a rename keeps the file under the new name; a delete leaves the note in the Trash (trash manifest updated). Recovery needs the Trash panel and a manual retry. Unsaved calendar dialog field edits in a failed rename are not written (retry targets the old path, gets missing).

**Root cause.** src/lib/core/filesystem/path-change.service.ts:127-170 (no try/finally after diskOp; updateLinksAfterRename at :149 and refreshTree at :153 unguarded, so rename_note at :158-162 and the forgetNote sweep at :168-170 are skipped). Calendar amplification: src/lib/features/event-calendar/event-calendar.service.ts:727-731 (renameAndWrite maps any throw to 'may already exist' and skips remap and field write) and :1043-1049 (deleteNow rolls back the overlay after the note is already in the Trash).

**Evidence.** path-change.service.ts:149 and :153 are outside any try; fs.service.ts:96-98 loadDirectoryTree rethrows; fs.service.ts:216-219 renameItem and :186-188 deleteItem rethrow; link-updater.service.ts:27 get_backlinks_v2 is outside allSettled. vault.rs:91-160 scan_dir propagates per-subfolder read errors via ? at :147. vault.rs:431-438 lock poisoning returns Err. Repro src/tests/repro/h04-calendar-a/calendar-5-post-disk-failure.test.ts: both tests FAIL. Rename: 'expected vi.fn() to be called with arguments: [ rename_note, { from: /vault/Standup.md, to: /vault/Daily.md } ]' (disk did move to Daily.md; calls were get_backlinks_v2 and scan_vault only). Delete: 'expected vi.fn() to be called with arguments: [ remove_note_from_index, { path: /vault/Standup.md } ]' (only scan_vault called; trashStore holds the note).

**Repro test.** `.scratch/file-io-audit/repro/src/tests/repro/h04-calendar-a/calendar-5-post-disk-failure.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
FAIL (both tests) as described in evidence: rename_note not called; remove_note_from_index not called.
```

**Fix sketch.** After diskOp, run the post-op steps in try/finally (or allSettled) so rename_note and the forgetNote sweep always run, and make refreshTree / updateLinksAfterRename failures log-and-continue instead of rejecting the change after the disk op succeeded. In renameAndWrite and deleteNow, only map an error to 'may already exist' / 'Could not move to Trash' when the disk op itself failed (check exists on from/to).

## Acceptance criteria

Written by audit 2026-11-05 from the text above and its audit header; the original Issue had none.

- [ ] Failing test first, in src/tests/lib/core/filesystem/fs.service.test.ts (describe 'path-change consumers' or 'renameItem'): the disk rename succeeds, the get_backlinks_v2 invoke (link-updater.service.ts:46) rejects, then await renameItem('/vault/Standup.md', 'Daily.md') (use the real call shape of the neighbouring tests). Assert renameItem resolves, invoke was called with 'rename_note' { from: '/vault/Standup.md', to: '/vault/Daily.md' }, and the file tree holds the node under its new path. It fails today because the rejection at path-change.service.ts:190 skips rename_note (:209) and the cleanup after it.
- [ ] Same setup, assert the forgetNote sweep and the other steps after rename_note (path-change.service.ts:209-235) still run when updateLinksAfterRename rejects, and that the failure is logged with error('FS', ...) rather than swallowed silently.
- [ ] Failing test first, same file: the moved node is not in the tree (movedNode null) and loadDirectoryTree rejects at the refreshTree call (path-change.service.ts:201). Assert rename_note is still invoked and the change is not reported as failed after the disk rename succeeded.
- [ ] A failure of the disk op itself still rejects and still skips the index steps (existing renameItem and moveItem failure tests pass without edits).
- [ ] renameAndWrite (event-calendar.service.ts:715-735) keeps its catch. Once applyPathChange no longer rejects after a successful diskOp, renameItem rejects only for a taken name or a failed disk rename, which is what the 'may already exist' message covers. One case in src/tests/lib/features/event-calendar/event-calendar.service.test.ts runs the real renameItem (vi.importActual) with get_backlinks_v2 rejecting and checks that writeEvent resolves to the new path with the stores remapped and the fields written.
- [ ] The delete leg is out of scope (fixed in f618f44ce); no change to applyPathChange when to is null beyond what the criteria above need.
- [ ] Frontend gate: pnpm check + pnpm vitest run pass.

## Comments

- 2026-11-06: migrated from `.scratch/file-io-audit/issues/35-path-change-post-disk-failure.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
