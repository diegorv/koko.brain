# 23: File History is lost on rename, move, auto-move and suffixed restore

**Status:** wontfix

**Blocked by:** none
Priority: P2
Severity: stale-state
Source: file I/O audit, deep-dive group(s) o05-settings-history (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Details

- Verdict: CONFIRMED_BY_TEST (deep dive priority P2, severity stale-state)
- Claims covered: recovery-8

**How a user hits it.** Any rename or move (common), auto-move when enabled (off by default), or a Trash restore to an occupied path. The renamed note shows an empty history. The old rows are unreachable from the UI and age out after retention+30 days. A new note created at an old path inherits the old note's versions. Note bytes are not affected.

**Recoverable from.** Rows stay in .kokobrain/kokobrain.db until retention purges them; reachable only with sqlite by hand. Not from the UI.

**Root cause.** src/lib/core/filesystem/path-change.service.ts:117-171 (no history leg); keys built at src/lib/features/file-history/file-history.service.ts:27,115

**Evidence.** getRelativePath (file-history.logic.ts:109-118) builds the key; applyPathChange calls diskOp, consumers, updateLinksAfterRename, refreshTree, rename_note and forgetNote, none of which touch snapshots. In src-tauri/src only db/history_repo.rs and db/schema.rs reference the snapshots table (rename_note does not). trash.service.ts:115 restores to a suffixed path when the original is occupied. help/documentation/22-auto-move.md:177,188 tells users to recover moved files with File History.

**Repro test.** `.scratch/file-io-audit/repro/o05-settings-history/file-history-rename.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
AssertionError: expected [] to deeply equal [ 1 ] (fileHistoryStore.snapshots ids for the renamed note)
```

**Fix sketch.** Add a Rust rename_history(from, to) (prefix-aware for folders: UPDATE snapshots SET file_path = ...), called from applyPathChange next to rename_note. Optionally tombstone the rows of deleted paths so a re-created path does not inherit them.

## Comments

- 2026-11-06: migrated to `.scratch/audit-2026-11-05/issues/23-file-history-follows-note-through-rename-move.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
