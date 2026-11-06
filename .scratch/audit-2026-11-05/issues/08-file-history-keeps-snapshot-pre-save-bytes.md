# 08: File History keeps a snapshot of the pre-save bytes, and retention never deletes a note's last snapshot

**Migrated from:** `.scratch/file-io-audit/issues/13-file-history-no-baseline.md` (audit 2026-11-05). Priority: content safety (bucket 1-content). Content/medium. This is the safety net for the bugs above: today an imported or long-unsaved note has no history, so a mistaken overwrite cannot be recovered. It does not lose text by itself, so it is last among the content items.

**Audit check at `5f8003d67`:** still_present (content, medium). Snapshots store only post-save content: registerFileHistoryHook src/lib/features/file-history/file-history.service.ts:190-196 forwards the after-save content to saveSnapshotForFile :111-124, which calls save_snapshot with it (src-tauri/src/commands/history.rs:61-67). No pre-write snapshot exists in writeTab (src/lib/core/editor/editor.service.ts:187-205). Deep-link overwrite calls saveOpenNoteBeforeWrite (src/lib/features/deep-link/deep-link.service.ts:247-250, :265-267), which writes only a dirty tab, then writeTextFile :310 and notifyAfterSave(new content) :312; the comment at :264 claims the replaced text gets a snapshot, which is true only for a dirty tab. Retention src-tauri/src/db/history_repo.rs:82-89 deletes every row older than the cutoff, the file's latest included. For an owner moving an existing vault in, every note starts with an empty history, so a select-all overwrite that autosaves leaves only in-session undo.

**Stale in the text below:** Line refs drifted: deep-link pre-write save at deep-link.service.ts:247-250 and :265-267 (Issue :246-250, :266-269), overwrite write at :310 and snapshot at :312 (Issue :314/:317), prepend/append at :270-303, closed-note frontmatter rewrite at frontmatter-write.service.ts:153 (Issue :149/:157), daily append at deep-link-actions.ts:71 (Issue :55-66); vault.rs write_atomic for task toggle is at :779 (Issue :683). The deep-link.service.ts:264 comment now asserts the overwrite snapshot behavior, which is misleading for a clean or closed note. Criteria for the original sections were added on 2026-11-06.

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Scope (owner, 2026-11-06):** the retention change, the deep-link overwrite snapshot and an editor baseline taken once per path per session (on the first in-app save of a note with an empty history, never on every save). The prepend, append, daily and closed-note frontmatter writers moved to Issue 154. Land the editor part after Issue 13, which edits the same save path.

**Owner decision (2026-11-06):** change the documented retention: retention never deletes a note's newest snapshot. Update help/documentation/15-file-history.md:48-57 and the Rust retention test with it.

**Blocked by:** 13
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

These criteria cover only the editor-data-safety amendment (2026-11-02). The criteria for the original sections were added on 2026-11-06, below.

- [ ] A closed, externally authored note with an empty File History receives `kokobrain://new?name=X&overwrite=true&content=x`; afterwards File History holds the original text as well as 'x'
- [ ] The same holds when the note is open in a clean tab
- Moved to Issue 154 on 2026-11-06: The deep-link prepend/append, the daily append/prepend and the closed-note frontmatter rewrite snapshot the pre-write bytes of a note with an empty history

- [ ] Failing test first: move .scratch/file-io-audit/repro/o05-settings-history/file-history-baseline.test.ts to src/tests/lib/features/file-history/file-history-baseline.test.ts (fix its fixture import). Only Tauri APIs are mocked; it asserts that the bytes a save overwrites stay recoverable through File History. It fails today.
- [ ] A note whose File History is empty gets a snapshot of its pre-save disk bytes before its first in-app save of the session overwrites them, taken once per path per session and never on every autosave, so the version before the first edit can be restored.
- [ ] Retention never deletes a note's newest snapshot (owner decision above): a Rust test next to the current retention test in src-tauri/src/db/history_repo.rs keeps one snapshot of a note whose snapshots are all past retention, and help/documentation/15-file-history.md:48-57 says so. The existing test at history_repo.rs:194-205, which asserts that every old snapshot is deleted, changes to the new contract, and the commit message says so.
- [ ] Gate, both: cargo test --manifest-path src-tauri/Cargo.toml + pnpm check + pnpm vitest run.

## Audit evidence (editor-data-safety, 2026-11-02)

- Finding G5 (.scratch/editor-data-safety/audit-2026-11-02.md; cross-reference in .scratch/editor-data-safety/xref-file-io-audit.md). No repro test was written for G5 under /Users/diegorv/Dev/pet-projects/koko/brain/.scratch/editor-data-safety/repro/; the first criterion above is the red test to write.
- Verified at the current main: deep-link.service.ts:266-269 calls saveOpenNoteBeforeWrite for prepend/append/overwrite; :246-250 delegates to saveFileByPath; editor.service.ts:161-163 returns true with no write for no tab or a clean tab; deep-link.service.ts:309-324 overwrite writes at :314 and snapshots the new content at :317; file-history.service.ts:190-198 forwards the post-save content to save_snapshot.

**Second opinion (audit 2026-11-05, round 2):** upheld (content, low). The missing baseline is real. saveSnapshotForFile is called only from the after-save observer (file-history.service.ts:190-196) with the bytes just written, and nothing snapshots a note on open or before a write (rg finds no other caller). The deep-link overwrite path (deep-link.service.ts:262-266 -> saveFileByPath does nothing for a clean or closed note; writeTextFile :310; notifyAfterSave(new content) :313) leaves no copy of the replaced text, and the comment at :262 claims otherwise. Likelihood is low: the trigger is a user mistake that is not undone in the session, or a deep link with overwrite=true. Corrections to apply while implementing: The title's retention half ('retention never deletes a note's last snapshot') is documented, intended behavior: help/documentation/15-file-history.md:48-57 says 'Old: All snapshots are permanently deleted', and src-tauri/src/db/history_repo.rs:194-205 tests that. Changing it needs an owner decision, so drop it from the title or record that decision. The status should not be ready-for-agent while the text says 'Triage must add criteria for the original sections above before this Issue runs': the main pre-save-baseline section still has no criteria (the moved repro .scratch/file-io-audit/repro/o05-settings-history/file-history-baseline.test.ts should be its red test). Line numbers: saveOpenNoteBeforeWrite is at :242-246 (not :247-250), the misleading comment at :262 (not :264), the call at :263-265, notifyAfterSave at :313 (not :312).

## Comments

- 2026-11-06: migrated from `.scratch/file-io-audit/issues/13-file-history-no-baseline.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
- 2026-11-06: owner decision recorded from the 2026-11-06 survey; status ready-for-agent.
- 2026-11-06: narrowed by the owner after the challenge review; the remaining writers moved to Issue 154.
- 2026-11-06: Blocked by 13 added after the order review (`raw/first-wave-order-review.json`): the two edit the same code.
