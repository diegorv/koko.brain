# 35: A failure after the disk op reports a completed rename or delete as failed and skips index re-key

**Status:** wontfix

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

## Comments

- 2026-11-06: migrated to `.scratch/open-itens/issues/080-failure-after-disk-op-still-reports-completed.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
