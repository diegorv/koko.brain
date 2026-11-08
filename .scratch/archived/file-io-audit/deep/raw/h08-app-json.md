# h08-app-json deep dive (raw)

Worktree read: /Users/diegorv/Dev/pet-projects/koko/brain/.claude/worktrees/file-io-repro
Ids in group: feature-writers-12, vault-lifecycle-8, feature-writers-13, fidelity-12.

## Summary

| Bug | ids | Verdict | Priority |
|---|---|---|---|
| Unparseable auto-move-rules.json is overwritten by the next Settings save | vault-lifecycle-8 (first half) | CONFIRMED_BY_TEST | P2 |
| Unparseable todoist-sent.json is overwritten by the next send/sync | feature-writers-12 | CONFIRMED_BY_TEST | P2 |
| Quick-capture dedupe anchor advances before the frontend accepts the capture | feature-writers-13 | CONFIRMED_BY_TRACE | P2 |
| .view toolbar and icon writes re-serialize YAML (drops comments); toolbar write under a dirty open tab is reverted by autosave | fidelity-12 | CONFIRMED_BY_TEST (comments) + CONFIRMED_BY_TRACE (revert) | P2 |

The auto-move timer half of vault-lifecycle-8 (debounced save resolves vaultStore.path on fire) is folded into the vault-lifecycle-8 entry as a narrower, mostly refuted sub-claim. See that entry's refutation.

## Repro tests written

All under src/tests/repro/h08-app-json/. Run with `./node_modules/.bin/vitest run <file>`.

1. yaml-comments.test.ts (fidelity-12). FAILS as expected:
   `expected 'views:\n  - type: table\n    name: Al…' to contain '# Project tracker, do not reorder the…'`
   Output after updateCollectionYaml with viewSort: `views:\n  - type: table\n    name: All\n    sort:\n      - column: title\n        direction: ASC\n`. All comments gone.
2. auto-move-corrupt-overwrite.test.ts (vault-lifecycle-8). FAILS: after loading a truncated rules file and saving once, writeTextFile was called on `/vault/.kokobrain/auto-move-rules.json` and the original bytes were not kept anywhere else.
3. todoist-corrupt-overwrite.test.ts (feature-writers-12). FAILS: after initTodoist on a truncated sent file and one sendTaskToTodoist, writeTextFile wrote `/test-vault/.kokobrain/todoist-sent.json` and the original bytes were not kept anywhere else.

Repro tests assert "the unreadable bytes survive the next save (file left alone or copied aside)". That is a chosen correct behavior; the owner may prefer a different fix, but the current code loses the bytes in both cases.

Not reproducible in vitest: feature-writers-13 (Rust, cargo is off limits), the deep-link timing half of vault-lifecycle-8 (needs real timers plus the Svelte component mounted during initializeVault).

## Per-bug trace

### B1. auto-move rules overwritten after an unparseable load (vault-lifecycle-8, first half)
- Load: src/lib/features/auto-move/auto-move.service.ts:41-63. Parse failure hits the catch at :60-63 and calls `autoMoveStore.setConfig({ ...DEFAULT_CONFIG })`. The error is logged only (`error('AUTO-MOVE', ...)`). Also an empty file (:50-53) gives the same empty state.
- Save: :69-87 writes `autoMoveStore.rules` / `excludedFolders` with `writeTextFile(filePath, ...)`. No check that the last load succeeded. `isConfigLoaded` is set true by setConfig and is never consulted before saving.
- Trigger: AutoMoveSection.svelte:33-39 saveConfig is called from addRule (:57-58), removeRule (:67-68), moveRuleUp/Down (:77), and debounced updateRule (:61-64).
- Reachability: the file is hand-editable under .kokobrain/ (a typo leaves it unparseable), and a crash or force-quit during writeTextFile can tear it (see plugin note below). Then the first Settings edit replaces the file. No file history covers .kokobrain config (file history snapshots editor saves only).
- Recoverable: no. The original bytes are overwritten unless the user has their own copy.
- Priority P2: app config, low impact, silent. Not note content.

### B2. todoist sent history overwritten after an unparseable load (feature-writers-12)
- Load: src/lib/features/tasks/todoist.service.ts:103-118. Parse failure returns [] (:114-117) after error log.
- initTodoist :238-244 calls setSentTasks(entries) with that [].
- sendTaskToTodoist :215-224 adds the new entry to the store, then saveSentTasks(todoistStore.sentTasks), which at :124-131 calls `writeTextFile` on the whole file with only the new entry.
- syncTodoistTasks :281 has the same overwrite.
- initTodoist is called from TasksView.svelte:73 on mount (not on vault init). So a send right after mount, before the read resolves, is a small race too, but the main path is the unparseable-file one.
- Third-party check (WebFetch, raw.githubusercontent.com/tauri-apps/plugins-workspace/v2/plugins/fs/src/commands.rs): write_text_file goes through write_file_inner, which opens the real target path with `truncate: !opts.append` and calls write_all in place. No temp file, no rename, no sync_all. So a crash mid-write can leave a torn file.
- Impact: lost "already sent" links (filePath to Todoist task id). Re-sending creates duplicate Todoist tasks. The Todoist tasks themselves are not deleted.
- Recoverable: no, from the app. The bytes are overwritten.
- Priority P2: app-owned JSON, low impact. Reachability: needs a torn or hand-broken file, which is rare.

### B3. quick-capture anchor advances before the frontend accepts (feature-writers-13)
- Rust: src-tauri/src/quick_capture/commands.rs:77-96. `last_signature` is set at :94 (`*last_signature = signature;`) for each item the batch emits. Emission happens before the frontend does anything.
- Shortcut path: src-tauri/src/lib.rs:56-80 uses the same LastCaptureSignature and the same function, then emits.
- Frontend: src/lib/plugins/quick-capture/quick-capture.service.ts:82-91. With no vault, it toasts 'Open a vault before capturing' and returns. The payload is dropped and cannot be retried.
- Retry: the next press with the same clipboard produces a batch of zero (the dedupe at :85-88 skips it), so nothing is emitted. This holds until the clipboard changes.
- A downstream write failure in executeAction would drop the same way. Not separately traced.
- Recoverable: the text or URL still sits on the clipboard until something else is copied. The capture itself was never written.
- Priority P2: silent drop of a capture the user asked for, trivially recoverable by re-copying. Not permanent loss of stored content.
- Note: src-tauri/tests does not appear to cover this interaction. The code comment at :29-33 says the dedupe is best-effort and in-session, which reads as intended for the dedupe but not for drops.

### B4. .view toolbar and icon writes drop comments; toolbar write under a dirty tab is reverted (fidelity-12)
- Comments: yaml-parser.ts:145-158 parses with `parseYaml` (comments discarded) and returns `stringifyYaml(raw)` at :32 of the excerpt (end of updateCollectionYaml). Confirmed by the repro. The same pattern is in type-sidebar.logic.ts:17-41 (updateViewIconYaml, the icon/color writer used by TypesNavigator.svelte:134 through type-definitions.service.ts:284-292).
- Toolbar callers: RailNoteList.svelte:188-201 persistViewState calls updateViewQuery (type-definitions.service.ts:305-311). That function does readTextFile, updateCollectionYaml, writeTextFile, then refreshViewDefinition. No notifyAfterSave / applyNoteChange, so no file-history snapshot and no tab sync.
- Dirty tab revert: editor.service.ts:375-392 reloadExternallyChangedTabs skips dirty tabs (`isTabDirty(tab)`). The header comment says the editor wins. The pending editor autosave then writes the editor's copy of the YAML, which lacks the toolbar change. Only reachable while the same .view is dirty in source mode during the autosave window (2 s) or while a save is failing. Narrow.
- Recoverable: comments are not in file history for this write path. The toolbar change can be re-applied by hand.
- Priority P2: user-authored comments in a vault config file, not note body; the revert is a stale-state issue.

## Refuted or narrowed sub-claims

### vault-lifecycle-8, second half: debounced save resolves vaultStore.path when it fires
- AutoMoveSection.svelte:42-47 is the debounce; saveConfig (:33-39) reads vaultStore.path at fire time. That part is true.
- The "A's rules written into B's file" path requires the timer to fire after vaultStore.path is B but before teardownVault resets the store. switchVault (vault.service.ts:18-22) saves dirty tabs and drains pending writes, then calls vaultStore.open(path). initializeVault (app-lifecycle.service.ts:~171-190) then awaits only saveAllDirtyTabs and drainEventCalendarWrites before teardownVault. That window is microtask- to millisecond-scale. REFUTED in practice.
- The "empty config into B" path is real but narrow. teardownVault calls resetAutoMove (app-lifecycle.service.ts:641), which empties the store. loadAutoMoveConfig for B runs in step 3 (app-lifecycle.service.ts:289). If the 500 ms timer fires after teardown and before that load resolves, saveAutoMoveConfig writes `{rules: [], excludedFolders: []}` into B's file, with no isConfigLoaded check. This requires a deep-link switch within about 500 ms of typing in a rule field, with Settings open, and the timer landing in the load window. P3.
- A's last edit (up to 500 ms) is never flushed on switch: the store is reset and the component's timer goes on to save B. A loses that edit. P3, config only.

### feature-writers-12 severity
- Claim said minor. Agree with a bump to P2 only because the loss is permanent and silent. Reachability is low.

## What I did not check

- The AutoMoveSection component under a real deep-link switch (no timer repro).
- Rust quick-capture (no cargo, per instructions). The trace is from source only.
- Whether saveAllDirtyTabs / drainEventCalendarWrites take long enough to widen the vault-switch window.
- Whether file history or any other observer hooks the toolbar write path beyond the source reading above.
