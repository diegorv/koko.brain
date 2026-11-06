# 13: No snapshot of the pre-save bytes, and retention deletes a note's last snapshot

**Status:** wontfix

**Blocked by:** none
Priority: P1
Severity: data-loss
Source: file I/O audit, deep-dive group(s) o05-settings-history (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Details

- Verdict: CONFIRMED_BY_TEST (deep dive priority P1, severity data-loss)
- Claims covered: recovery-5

**How a user hits it.** Very common precondition: any note not saved in-app for retention+30 days (37 by default), or imported and never saved in Kokobrain, has an empty history. The trigger is a user mistake (select all + paste/type over it, autosave after 2 s) that is not undone in the session. Non-editor writers never snapshot: link rewrite on rename, type rename, task toggle, external edits.

**Recoverable from.** In-session CodeMirror undo only (how much survives tab switches in the shared view was not verified); otherwise Time Machine or git. Nothing in-app.

**Root cause.** src/lib/features/file-history/file-history.service.ts:111-124,190-196 (snapshots only the NEW content after a save); src-tauri/src/db/history_repo.rs:82-89 (age-only delete, no keep-latest-per-file)

**Evidence.** save_snapshot (history.rs:57-78) stores the content it is given; the after-save observer passes the post-save content. delete_old_snapshots deletes created_at < cutoff for every file, its latest row included. Cleanup runs at every open (app-lifecycle.service.ts:273-277). Bypassing writers checked: link-updater.service.ts:39, type-definitions.service.ts:218, vault.rs:683 (write_atomic) never call notifyAfterSave. Corrected: frontmatter-write.service.ts:157 and the deep-link writers DO call it. That call does not make them handled: notifyAfterSave passes the NEW bytes, so these writers also leave no snapshot of the version they replace (see the deep-link overwrite section below). The retention tiers are documented in help 15-file-history.md:46-57; the missing baseline is not.

**Limits found while trying to refute.** The 'retention deletes the last snapshot' part is documented, intended behavior. The undocumented gap is the missing pre-save baseline.

**Repro test.** `.scratch/file-io-audit/repro/o05-settings-history/file-history-baseline.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
AssertionError: expected [ 'oops, clipboard contents\n' ] to include '# Old note\n\nTwo months of careful w…'
```

**Fix sketch.** Before the write in saveFileByPath (or a before-save hook), snapshot tab.savedContent / the on-disk bytes when they differ from the file's latest snapshot hash or no snapshot exists. Make retention always keep the newest row per file. Have the non-editor writers snapshot the pre-write bytes.

## Deep-link overwrite replaces a clean or closed note with no snapshot of the old version

**How a user hits it.** `kokobrain://new?vault=v&name=Projects/Plan&overwrite=true&content=x` (a Shortcut, Raycast snippet or web page) while Plan is closed, or open with no unsaved typing, and Plan has no snapshot yet (imported, synced or edited outside the app, or older than the retention window). The whole note is replaced with no prompt and no Trash copy. File History then lists only 'x'.

**Root cause.** The pre-write save (`saveOpenNoteBeforeWrite`, src/lib/features/deep-link/deep-link.service.ts:246-250) only writes a DIRTY open tab: `saveFileByPath` returns true without writing or snapshotting for a clean tab or a closed note (src/lib/core/editor/editor.service.ts:161-163). The overwrite branch (deep-link.service.ts:309-324) then calls `writeTextFile` directly (:314) and its only snapshot is the post-write one through `notifyAfterSave(fullPath, content)` (:317), which the File History hook stores as given (file-history.service.ts:190-198 -> saveSnapshotForFile :111-124). The saveFileByPath fix above does not reach this writer.

**Fix sketch.** Before the write in the overwrite branch, when the target exists, read its disk bytes and snapshot them with `saveSnapshotForFile` (save_snapshot already skips a duplicate of the latest row). Do the same for the other app-initiated writers that bypass saveFileByPath and snapshot only the new bytes: the deep-link prepend and append branches (deep-link.service.ts:272-307), the daily append/prepend (src/lib/app/deep-link-actions.ts:55-66) and the closed-note frontmatter rewrite (src/lib/core/frontmatter/frontmatter-write.service.ts:149, snapshot at :157). Overwrite is the destructive case; prepend and append keep the old text inside the new bytes.

These criteria cover only the editor-data-safety amendment (2026-11-02). Triage must add criteria for the original sections above before this Issue runs; each section's repro test is its red test.

- [ ] A closed, externally authored note with an empty File History receives `kokobrain://new?name=X&overwrite=true&content=x`; afterwards File History holds the original text as well as 'x'
- [ ] The same holds when the note is open in a clean tab
- [ ] The deep-link prepend/append, the daily append/prepend and the closed-note frontmatter rewrite snapshot the pre-write bytes of a note with an empty history

## Audit evidence (editor-data-safety, 2026-11-02)

- Finding G5 (.scratch/editor-data-safety/audit-2026-11-02.md; cross-reference in .scratch/editor-data-safety/xref-file-io-audit.md). No repro test was written for G5 under /Users/diegorv/Dev/pet-projects/koko/brain/.scratch/editor-data-safety/repro/; the first criterion above is the red test to write.
- Verified at the current main: deep-link.service.ts:266-269 calls saveOpenNoteBeforeWrite for prepend/append/overwrite; :246-250 delegates to saveFileByPath; editor.service.ts:161-163 returns true with no write for no tab or a clean tab; deep-link.service.ts:309-324 overwrite writes at :314 and snapshots the new content at :317; file-history.service.ts:190-198 forwards the post-save content to save_snapshot.

## Comments

- 2026-11-06: migrated to `.scratch/audit-2026-11-05/issues/08-file-history-keeps-snapshot-pre-save-bytes.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
