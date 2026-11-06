# 121: Minor write races are closed: autosave during rename, retry-chain stacking, create vs restore, superseded init, calendar rollback, the properties skip flag

**Migrated from:** `.scratch/file-io-audit/issues/41-minor-write-races.md` (audit 2026-11-05). Priority: corner case (bucket 4-corner). Partially fixed (same-path saves serialized in 3df680423). The rest are races in millisecond windows.

**Audit check at `5f8003d67`:** partially_fixed (corner, low). Fixed: same-path saves are now serialized by the per-path queue saveTails in src/lib/core/editor/editor.service.ts:158-179 (commit 3df680423). Still present: retry chains stack, :217-219 setTimeout(saveDirtyTabs, 5000) with no handle, not cleared by saveAllDirtyTabs :276-277 or resetEditor :461-462; autosave during rename, path-change.service.ts:162-171 updateTabAfterRenameOrMove only after await diskOp with timers armed; superseded init, app-lifecycle.service.ts:201-211 no initVersion check between configureSentry and startSettingsPersistence; properties no-op commit still arms the flag, src/lib/features/properties/properties.service.ts:97-100 with no newContent === content check.

**Stale in the text below:** The 'unserialized same-path saves' half of section 2 is fixed (saveTails); only the retry-chain stacking remains. Line refs moved: retry at editor.service.ts:217-219 (was :192); saveFileByPath :171-179; path-change diskOp/update :162-171 (was :127-132); app-lifecycle configureSentry :203, startSettingsPersistence :211 (was :202/:210); properties flag arm :100 (was :89), consumeSkipNextParse :37-40 (was :33-37).

**Status:** needs-triage

**Blocked by:** none
Priority: P3
Severity: stale-state
Source: file I/O audit, deep-dive group(s) h04-calendar-a, h05-calendar-b, o04-delete-rename, o06-trash-settings-io, o08-atomicity, o10-frontmatter-fidelity (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Autosave firing during the rename IPC round trip recreates the old path (duplicate note, stale new path)

- Verdict: CONFIRMED_BY_TEST (deep dive priority P3, severity stale-state)
- Claims covered: rename-move-delete-8, save-pipeline-12

**How a user hits it.** The 2 s body autosave has to fire during the few ms between the disk rename running (sync command on the main thread) and its response reaching JS. That means a manual rename or move, or an auto-move (opt-in with rules), landing exactly at the debounce deadline. Rare, millisecond timing.

**Recoverable from.** Yes. The newest text is in the recreated old.md (a visible duplicate) or still in the dirty tab. new.md may hold older bytes while the tab shows clean.

**Root cause.** src/lib/core/filesystem/path-change.service.ts:127-132 (tab path updated only after await diskOp, while debounced timers stay armed)

**Evidence.** fs.service.ts:201-212 renameItem and :228-240 moveItem (auto-move.service.ts:188) -> applyPathChange. updateTabAfterRenameOrMove runs at path-change.service.ts:132, after await diskOp at :127. saveFileByPath(oldPath) (editor.service.ts:161-170) writes the captured old path. Fetched commands.rs: write_text_file defaults to create:true, so old.md is recreated. markSavedByPath(oldPath) (editor.store.svelte.ts:91-96) can mark the tab clean before its path moves.

**Repro test.** `.scratch/file-io-audit/repro/o04-delete-rename/autosave-during-rename.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
AssertionError: expected [ '/vault/new.md', '/vault/old.md' ] to deeply equal [ '/vault/new.md' ]; AssertionError: expected { new: 'v1', old: 'v2' } to deeply equal { new: 'v2', old: undefined }
```

**Fix sketch.** Before diskOp on a rename or move, cancel the debounced timers or await saves of the dirty tabs under `from`, then re-arm after updateTabAfterRenameOrMove.

## Saves of the same path are not serialized: two truncate+write_all calls can be in flight at once, and failing debounce runs stack independent 5 s retry chains

- Verdict: CONFIRMED_BY_TEST (deep dive priority P3, severity corruption)
- Claims covered: cross-cutting-10, save-pipeline-14

**How a user hits it.** Two same-path writes in flight at once: the user edits a property, or a rename link rewrite or calendar action runs, inside the IPC round trip of a firing body autosave. That is milliseconds on a local SSD, so it is rare. Corrupt bytes (the shorter content followed by the longer one's tail) or out-of-order completion (disk holds the older bytes while the store marks the newer ones saved) also need the two tokio tasks to cross between open and write_all, which takes microseconds. Very rare. The retry stacking happens every time saves keep failing (disk full, permissions, unmounted volume) while the user keeps editing: N toasts and N writes every 5 s.

**Recoverable from.** Usually the next autosave of the still-dirty buffer overwrites corrupt bytes. In the out-of-order-clean case, recovery is File History (the snapshot of the newer content was taken on its save) or a backup.

**Root cause.** src/lib/core/editor/editor.service.ts:161-177 saveFileByPath has no per-path lock or in-flight check. editor.service.ts:192 starts a new setTimeout retry chain on every failing saveDirtyTabs run. link-updater.service.ts:39 writes the same path outside any coordination.

**Evidence.** Callers of saveFileByPath: saveDirtyTabs editor.service.ts:183-194 (debounced and retry), saveAllDirtyTabs :234-247, the updateNoteFrontmatter tab branch frontmatter-write.service.ts:128-129, and event-calendar.service.ts:1037. Fetched tauri tag tauri-v2.12.5 crates/tauri/src/ipc/mod.rs: respond_async_serialized_inner calls crate::async_runtime::spawn per async command. plugin-fs 2.7.1 write_text_file is an async fn with blocking std::fs, so concurrent invokes run on separate worker threads with independent O_TRUNC fds at offset 0. resetEditor does not cancel retry chains, but after a reset they find no tabs, so that part is harmless.

**Limits found while trying to refute.** Downgraded to P3. The concurrent-in-flight condition is proven at the TS level, but the on-disk interleave or reorder needs sub-millisecond scheduling on the Rust side. I did not observe it; it is inferred from upstream source. The retry stacking is cosmetic (extra toasts and writes).

**Repro test.** `.scratch/file-io-audit/repro/o08-atomicity/same-path-save-overlap.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
2 failed. 'a Properties edit while the body save is in flight must not start a second write of the same path': AssertionError: expected 2 to be 1 at same-path-save-overlap.test.ts:70 expect(pending.filter((p) => p.path === NOTE).length).toBe(1). 'repeated failing debounce runs must not stack independent 5 s retry chains': AssertionError: expected 2 to be 1 at :91 expect(writeCalls - before).toBe(1).
```

**Fix sketch.** Add a per-path promise chain in saveFileByPath (await the in-flight write, then save the current tab.content if it is still dirty) and use it from the link updater too. Use a single module-level retry timer, guarded so a second chain cannot start, and clear it in resetEditor. An atomic temp-file + rename writer removes the byte-interleave outcome.

## Create at a name whose Trash restore is in flight can be overwritten by the restore's rename

- Verdict: CONFIRMED_BY_TEST (deep dive priority P3, severity data-loss)
- Claims covered: calendar-4

**How a user hits it.** Needs the create's create_note to land inside the restore's exists-to-rename gap (two IPC round trips, sub-ms to a few ms). Creating an event needs dialog submission, so a human cannot issue Cmd+Z and a create inside that window; the create chain is longer than the restore chain, so the restore usually lands first and the create picks a suffixed name. A main-thread stall widens the gap but still needs a create issued during it. Theoretical for normal use.

**Recoverable from.** none for the overwritten just-created note (no Trash entry, no copy on disk); the restored note is intact

**Root cause.** src/lib/core/trash/trash.service.ts:116-126 (restoreItem: exists then rename, non-atomic; plugin-fs rename overwrites) together with src/lib/features/event-calendar/event-calendar.service.ts:926-948 (createNow: holdPath at :939 does not wait for the restore's queue; createFile in src/lib/core/filesystem/fs.service.ts:119-129 writes without joining it). Same gap for renameItem (fs.service.ts:205-211) when a create is still before its buildContent hold.

**Evidence.** event-calendar.service.ts:438-445 holdPath chains without awaiting the previous tail; :1003-1004 duplicateEvent does use joinPath, createNow does not. trash.service.ts:116 exists, :126 rename. Fetched tauri-apps/plugins-workspace tag fs-v2.7.1 plugins/fs/src/commands.rs: pub fn rename (sync) calls std::fs::rename with no destination check; exists is sync. std::fs::rename docs: replaces the original file if to exists. Tauri docs: sync commands run on the main thread, so create_note (vault.rs:888-905) and plugin-fs exists/rename cannot interleave with each other; the claim's 'Order A' (restore rename inside create_note's exists-to-write_atomic gap) is refuted for that reason. Repro: src/tests/repro/h04-calendar-a/calendar-4-create-vs-restore.test.ts test 1 FAILS with 'expected [ '[]', ...(2) ] to include ---\n_type: Event\ndate: 2026-11-10...' (created bytes gone); control test 2 (sequential undo then create) PASSES with 'Standup 1.md' created and both notes kept.

**Repro test.** `.scratch/file-io-audit/repro/src/tests/repro/h04-calendar-a/calendar-4-create-vs-restore.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
FAIL (test 1): AssertionError: expected [ '[]', …(2) ] to include '---\n_type: Event\ndate: 2026-11-10\n…'. PASS (test 2 control).
```

**Fix sketch.** Serialize the create's name pick and write against restores and renames on the same name: have createNow join the target path queue (joinPath) right after its name is chosen and before createFile, and make restoreItem/renameItem refuse an existing target atomically (or re-check after the rename with a no-overwrite primitive). Simplest: route the create's disk write through a Rust create-if-absent check that also covers rename targets.

## Missing initVersion check between await configureSentry and startSettingsPersistence lets a superseded init write the next vault's settings into the previous vault's settings.json

- Verdict: CONFIRMED_BY_TEST (deep dive priority P3, severity corruption)
- Claims covered: vault-lifecycle-5

**How a user hits it.** init(B) has to start while init(A) is suspended in configureSentry. With Sentry off (the default) and no active client, that is one IPC round-trip; it reaches up to Sentry.close(2000) only when a client was active. There is no auto-open of the last vault at launch, so the triggers are two deep links to different vaults in one batch or in quick succession, or a deep link arriving while a recent vault is being opened. Once the race is entered, the corrupting flush is certain (debounce timer or B's restart flush).

**Recoverable from.** None in the app: vault A's settings.json is replaced by B's settings with no backup. Only an external backup restores it.

**Root cause.** src/lib/app/lifecycle/app-lifecycle.service.ts:210 (startSettingsPersistence after the await at :202 with no initVersion check; the next check is at :240)

**Evidence.** app-lifecycle.service.ts:150 B's unconditional stopSettingsPersistence runs before A's session exists. :199-200 load then version check. :202 await configureSentry. :210 startSettingsPersistence(A) with baseline = store at that moment (settings-persistence.svelte.ts:50). B's loadSettings then calls setSettings(B). B's startSettingsPersistence -> stopSettingsPersistence -> flushSettingsPersistence writes serialize() (B) to session.path (A) because it differs from lastWritten (A) (settings-persistence.svelte.ts:79-83). sentry.service.ts:39-56 and :95-99 show the window length.

**Limits found while trying to refute.** Downgraded to P3. The entry window is a millisecond-scale race, reachable only through deep-link or overlapping vault switches; there is no cold-start auto-open that would widen it.

**Repro test.** `.scratch/file-io-audit/repro/o06-trash-settings-io/settings-superseded-init.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
× does not write vault B settings into vault A when init(B) starts while init(A) awaits configureSentry: AssertionError: expected 'B-journal' to be 'A-journal' (A's settings.json periodicNotes.folder)
```

**Fix sketch.** Add `if (initVersion !== version) return;` right after the configureSentry try/catch, before startSettingsPersistence.

## Failed frontmatter save leaves the calendar's moved frontmatter in a dirty tab after the calendar rolled the move back

- Verdict: CONFIRMED_BY_TRACE (deep dive priority P3, severity stale-state)
- Claims covered: calendar-8

**How a user hits it.** Needs a failed write (disk full, permission, sync lock) during a calendar drag, with typing in the same note during that save. Rare.

**Recoverable from.** Yes. Bytes are not lost: the typed text and the moved frontmatter both stay in the buffer and the 5 s retry or next autosave writes them. The user can also edit the frontmatter back. Only the calendar op stack misses the move (no op recorded), as the claim says.

**Root cause.** src/lib/core/frontmatter/frontmatter-write.service.ts:128-134: the tab is set to next (:128) and on save failure reverted to base only if findTab(path)?.content === next (:133). Deliberate per the comment at :132; with typing, the moved frontmatter stays dirty. Calendar rollback at event-calendar.service.ts:767-771.

**Evidence.** Traced: frontmatter-write.service.ts:128-134; event-calendar.service.ts:767-771 (dropPending or putPending(prior), no op); editor.service.ts:183-193 saveDirtyTabs retries after 5 s; editor.service.ts:224-227 onContentChange re-arms autosave. saveFileByPath toasts 'Failed to save file.' (editor.service.ts:172-175). No test: the expected outcome (keep typing vs revert the move) is a design choice, so a repro would assert a guess.

**Fix sketch.** Optional: when the content changed during the failed save, keep the typed text but restore the frontmatter fields from base, or surface the dirty state to the calendar so the overlay stays pending until the retry lands.

## Create reported as failed after create_note succeeded; retry creates a duplicate with a suffixed name

- Verdict: CONFIRMED_BY_TRACE (deep dive priority P3, severity minor)
- Claims covered: calendar-9

**How a user hits it.** Needs scan_vault (loadDirectoryTree) to fail once right after a successful create_note. Rare. The retry itself is deterministic once the first note exists.

**Recoverable from.** Yes. The first note is complete on disk (create_note wrote the content). The user deletes the duplicate. No content is lost.

**Root cause.** src/lib/core/filesystem/fs.service.ts:138 refreshTree() inside the try of createFile after create_note (:129); the catch at :141-143 rethrows. type-definitions.service.ts:136-139 maps any throw to Error('create-failed'); event-calendar.service.ts:946 maps that to EventCalendarError('create-failed') before any overlay or op is recorded.

**Evidence.** Traced: fs.service.ts:129, :138, :141-143; loadDirectoryTree (fs.service.ts:74-102) rethrows after logging; type-definitions.service.ts:136-139; event-calendar.service.ts:926-946; EventDialog.svelte:145-158 keeps the form. Retry dedupe: type-definitions.service.ts:61-68 readDir sibling names, so the retry becomes 'Standup 1.md'. No test: the intended contract (throw vs report success with a warning) is not settled by the code.

**Fix sketch.** Return the path from createFile when create_note succeeded and only the tree refresh failed (log the refresh error), so the caller reports success.

## Properties panel skip flag swallows the only re-parse after a quick frontmatter edit; the next panel edit reverts that edit

- Verdict: CONFIRMED_BY_TEST (deep dive priority P3, severity data-loss)
- Claims covered: fidelity-9

**How a user hits it.** Needs a second frontmatter change in the same note within 300 ms of a panel commit, with no later edit to that note before the next panel edit. The second change can be typed, a meta-bind toggle, or the favorite/organized keybinding. Timing-dependent and hard to hit by hand.

**Recoverable from.** Not via undo: the rewrite uses addToHistory(false). The lost line is a small user edit, and File History has it only if a save happened in between.

**Root cause.** src/lib/features/properties/properties.service.ts:33-37 (consumeSkipNextParse skips whatever the content is). PropertiesView.svelte:100-114 clears the 300 ms timer on every content change, so the single parse that eventually runs is the one that gets skipped.

**Evidence.** commitChanges (:86-89) arms the flag and rebuilds from propertiesStore. propertiesMatchActiveNote (:64-69) compares only sourcePath, so it accepts the stale store. The test copies the effect line for line, the same way properties-cross-note.test.ts does.

**Repro test.** `.scratch/file-io-audit/repro/o10-frontmatter-fidelity/skip-parse-stale-store.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
AssertionError: expected [ 'done', 'priority' ] to include 'status' (soft). Then: AssertionError: ---\ndone: true\npriority: high\n---\n# Task\n: expected '---\ndone: true\npriority: high\n---\…' to contain 'status: done'
```

**Fix sketch.** Store the content the commit produced alongside the skip flag, and skip only when the content being parsed equals it. Or rebuild commits from a fresh parse of the tab content rather than the store.

**No-op commit trigger (no timing needed).** The same flag is armed by a panel commit that does not change the content, and then nothing consumes it until the next editor edit of that note. Example: the note has `rating: 5`; the user types '5.0' in the number field; `Number('5.0')` is 5 (PropertyField.svelte:61-66), so commitChanges builds `newContent === content` and still sets `skipNextParseFor` (properties.service.ts:86-89). The tab content does not change, so the PropertiesView effect (PropertiesView.svelte:100-114) does not re-run and the flag stays armed. Seconds or minutes later the user types `status: draft` into the frontmatter in the editor; the one debounced re-parse of that burst consumes the stale flag and is skipped (properties.service.ts:33-37). The next panel edit (a checkbox toggle) rebuilds the block from the stale store and removes `status: draft`, which then autosaves. Only a switch to another note clears the flag first (properties.service.ts:52). This trigger is ordinary use and not timing-dependent, so this section should be split into its own issue at a higher priority than this P3 bundle.

**Fix sketch (no-op commit).** In commitChanges, return before arming the flag (and before syncExternalContentToEditor) when `newContent === content`. The content-signature option above also covers it: skip a parse only when the content being parsed equals the content the commit wrote.

These criteria cover only the editor-data-safety amendment (2026-11-02). Triage must add criteria for the original sections above before this Issue runs; each section's repro test is its red test.

- Moved to Issue 152 on 2026-11-06: A panel commit that leaves the content unchanged, followed more than 300 ms later by an editor edit that adds `status: draft` to the frontmatter, followed by another panel edit, keeps `status: draft` in the tab content and on disk
- Moved to Issue 152 on 2026-11-06: A panel commit with `newContent === content` does not arm `skipNextParseFor`

## Audit evidence (editor-data-safety, 2026-11-02)

- Finding G7 (.scratch/editor-data-safety/audit-2026-11-02.md, audit priority P0, likelihood rare; cross-reference in .scratch/editor-data-safety/xref-file-io-audit.md). Repro test: /Users/diegorv/Dev/pet-projects/koko/brain/.scratch/editor-data-safety/repro/frontmatter-roundtrip/g7-stale-skip-flag.test.ts (copy it to src/tests/audit-repro/frontmatter-roundtrip/ to run, per the README in that folder). It mounts the real PropertiesView on real stores and mocks only Tauri.
- Verified at the current main: properties.service.ts:24 (flag), :33-37 (consumed whatever the content), :78-98 (commitChanges arms the flag at :89 with no `newContent !== content` check); PropertiesView.svelte:100-114 (the effect reads only activeTabPath and the tab content); src/lib/core/editor/editor.store.svelte.ts:139-144 (updateTabContentOnly assigns the same string, so nothing re-runs); PropertyField.svelte:61-66 (number field commits `Number(input.value)`).

## Comments

- 2026-11-06: migrated from `.scratch/file-io-audit/issues/41-minor-write-races.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
- 2026-11-06: its no-op-commit criteria moved to Issue 152, in the first wave; the rest of this Issue stays for later.
- 2026-11-06: status needs-triage: its only criteria moved to Issue 152, and its other sections still need criteria before it runs.
