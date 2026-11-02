# 13 No snapshot of the pre-save bytes, and retention deletes a note's last snapshot

Status: needs-triage
Priority: P1
Severity: data-loss
Source: file I/O audit, deep-dive group(s) o05-settings-history (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Details

- Verdict: CONFIRMED_BY_TEST (deep dive priority P1, severity data-loss)
- Claims covered: recovery-5

**How a user hits it.** Very common precondition: any note not saved in-app for retention+30 days (37 by default), or imported and never saved in Kokobrain, has an empty history. The trigger is a user mistake (select all + paste/type over it, autosave after 2 s) that is not undone in the session. Non-editor writers never snapshot: link rewrite on rename, type rename, task toggle, external edits.

**Recoverable from.** In-session CodeMirror undo only (how much survives tab switches in the shared view was not verified); otherwise Time Machine or git. Nothing in-app.

**Root cause.** src/lib/features/file-history/file-history.service.ts:111-124,190-196 (snapshots only the NEW content after a save); src-tauri/src/db/history_repo.rs:82-89 (age-only delete, no keep-latest-per-file)

**Evidence.** save_snapshot (history.rs:57-78) stores the content it is given; the after-save observer passes the post-save content. delete_old_snapshots deletes created_at < cutoff for every file, its latest row included. Cleanup runs at every open (app-lifecycle.service.ts:273-277). Bypassing writers checked: link-updater.service.ts:39, type-definitions.service.ts:218, vault.rs:683 (write_atomic) never call notifyAfterSave. Corrected: frontmatter-write.service.ts:157 and the deep-link writers DO call it. The retention tiers are documented in help 15-file-history.md:46-57; the missing baseline is not.

**Limits found while trying to refute.** The 'retention deletes the last snapshot' part is documented, intended behavior. The undocumented gap is the missing pre-save baseline.

**Repro test.** `.scratch/file-io-audit/repro/o05-settings-history/file-history-baseline.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
AssertionError: expected [ 'oops, clipboard contents\n' ] to include '# Old note\n\nTwo months of careful w…'
```

**Fix sketch.** Before the write in saveFileByPath (or a before-save hook), snapshot tab.savedContent / the on-disk bytes when they differ from the file's latest snapshot hash or no snapshot exists. Make retention always keep the newest row per file. Have the non-editor writers snapshot the pre-write bytes.
