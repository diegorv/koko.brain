# Verdict: feedback-a (P01 P17 P14 P15 P16 P21 P22 P77 P83 P89 P91)

Refutation of `scout-feedback-a.md` at HEAD 085b23c5d (main = origin/main). Read-only: no source edited, nothing run except read-only git and grep.

MVP branch check: `git diff --name-only origin/main...origin/mvp-claude` contains none of the files any ticket below touches (it does contain `SettingsPanel.svelte`, `settings.store.svelte.ts`, `settings.service.ts`, `settings.types.ts`, `settings.logic.ts`, `help/documentation/19-settings.md`, `e2e/mocks/tauri-core.ts`; no ticket edits those, tickets only call existing `settingsStore` methods).

## Calls

| id | scout | final | changed | one line |
|----|-------|-------|---------|----------|
| P01 | QUICK-PART (b, c, d) | QUICK-PART (b, d) | yes | (c) changes the documented mod API contract "Enter confirms" (`help/documentation/28-mods.md:446`, `ModDialogHost.svelte:73-79`): owner decision, DEFER. (b) needs a vault-switch guard the scout missed. |
| P17 | QUICK-PART | QUICK-PART | no | Theme tokens + severity accent in `AppOverlays.svelte` holds; helper/duration/Copy details DEFER. |
| P14 | QUICK-PART | QUICK-PART | yes (scope kept, criteria added) | The 600 ms hold widens an existing double-capture window on resummon; ticket must drop the written text from the stored draft before the hold. |
| P15 | QUICK | QUICK | no | One component, localStorage draft only; same resummon criterion as P14. |
| P16 | QUICK-PART | QUICK-PART (2, 4); (1) DONE; (3) in P77 | no | Split from File History into its own ticket; sequence with settings-a P53 (same `TroubleshootingSection.svelte`). |
| P21 | DEFER | DEFER | no | New shared kit across 7+ components plus owner sizing decision; no safe slice outside the kanban scout. |
| P22 | QUICK-PART | QUICK-PART (narrowed) | yes | `AutoOrganizeRuleRow` names are already in settings-a P28; `SortPanel` remove name is in collection scout Q5. Left: `FilterRow` and `FormulaRow` remove buttons. |
| P77 | QUICK-PART | QUICK-PART | yes (criteria added) | Missed: a failed diff leaves the previous snapshot's `diffLines` on screen under the new selection; a load failure after `setSnapshots` must not hide the list. Same files as feedback-b Q1 (P153/P87): one ticket or strict sequence. |
| P83 | QUICK-PART | QUICK-PART (toasts removed) | yes | Toast selectability conflicts with sonner swipe (`Toast.svelte:349-360` pointer capture, `:418-421`): DEFER with Copy details. |
| P89 | QUICK-PART | QUICK-PART (toasts only) | yes | The "clipboard before `^id`" reorder moves a note-content dispatch after an `await` with a stale `line.to` (`copy-block-link.service.ts:22,51-53`): note-write risk, DEFER. |
| P91 | QUICK-PART | QUICK-PART | no | `EventForm.svelte` only; fully covers open-itens 217. |

## Per proposal evidence

### P01. QUICK-PART (b, d), changed
- Verified: rule delete `AutoOrganizeSection.svelte:66-69` (`removeRule` + `saveConfig`), `saveConfig` writes `<vault>/.kokobrain/auto-organize-rules.json` (`auto-organize.service.ts:104-107,182-200`). Theme delete `AppearanceSection.svelte:92-103`; `updateAppearance` merges (`settings.store.svelte.ts:282-287`) and settings persist to `<vault>/.kokobrain/settings.json` (`settings.service.ts:14-18`).
- Refutation found: both stores are per vault. An Undo clicked after a vault switch inside the 8 s toast would insert the deleted rule into the other vault's rules and save it there, where it moves or renames notes on save. The ticket must capture `vaultStore.path` at delete time and make Undo a no-op (or dismiss) when it changed. The Undo closure must not depend on the Settings panel staying mounted (`saveConfig` is component-local; call `saveAutoOrganizeConfig(capturedPath)` directly).
- Writes go through existing store APIs and the existing config writers, no schema change. Accepted as QUICK only with the guard.
- (c) DEFER: `handleConfirmKeydown` (`ModDialogHost.svelte:73-79`) confirms on Enter anywhere except other buttons; moving `initialFocus` to Cancel requires rewriting that rule and changes `28-mods.md:446` ("Enter confirms") for all of the owner's vault mods. That is an API decision for the owner, not polish.
- (a) kanban and property removal DEFER (rewrite `.kanban` / frontmatter).
- Sequencing: `AutoOrganizeSection.svelte` is also edited by settings-a P08 (save failure toast), P28 and P54 (debounce block); `AppearanceSection.svelte` by color P108/C4 and feedback-b (row keydown).

### P17. QUICK-PART, unchanged
- `AppOverlays.svelte:17` `<Toaster richColors ...>`. svelte-sonner 1.2.3: `--normal-bg/-border/-text` defined per theme on `[data-sonner-toaster][data-sonner-theme=...]` (`Toaster.svelte:1027-1030`), so an inline `style` on the Toaster (`restProps.style`, `:432`) wins. Per-type classes are applied (`Toast.svelte:529-530`). `--popover`, `--popover-foreground`, `--border`, `--destructive`, `--success`, `--warning`, `--primary` exist in both themes (`app.css:160-278`).
- No other scout (color included) touches the Toaster. E2E only locate `[data-sonner-toast]` by text, unaffected.
- A test that could pass while broken: asserting only `data-rich-colors` false. Ticket also asserts the style vars and the per-type class.

### P14. QUICK-PART, criteria added
- `ComposerCaptureResult` is `{ requestId, ok }` (generated, ts-rs), no notification plugin in `src-tauri/Cargo.toml` or `package.json`: folder/name and clipboard feedback DEFER.
- Refutation found: during the saved flash the written text is still in the editor and in the stored draft (`$effect(() => writeDraft(text))`, `+page.svelte:41`; removal only after the flash, `:144-148`). A summon in that window runs `resetForShow` (`:166-186`), which restores the draft and sets `saving = false`, so Cmd+Enter would capture the same text twice, and the new "Draft restored" note would label already-saved text. Today the window is 180 ms (`:12`); 600 ms widens it. Fix inside the same file: on `ok === true`, write `withoutWritten(text, body)` to storage before the hold. Existing test "does not hide a composer summoned again during the saved flash" (`composer-page.test.ts:336-351`, advances 500 ms) must be updated to the new hold.

### P15. QUICK, unchanged
- Hints at `+page.svelte:250-256`, `saving` is a plain `let` (`:26`), draft in localStorage (`:16,56-71`). No help doc pins "ESC cancels". Tests pin the strings at `composer-page.test.ts:107-108,271,429`.
- Manual check: the Discard button sits inside `data-tauri-drag-region` (`:241`); confirm a click on it is not taken as a window drag.

### P16. QUICK-PART (2, 4), (1) DONE, (3) via P77
- (1) DONE: `search.store.svelte.ts:16,46,69,94`, `SearchPanel.svelte:190,283-287`, commit 0de35de11.
- (2) `LabsSection.svelte:26-29` catch only logs. Flag is localStorage (`mods-enabled.store.svelte.ts:57-63`). `startModsHost` registers the file-change listener before its first await (`mods-host.service.ts:1077`), so the revert must call `stopModsHost()` too. No mods-host-robustness Issue (01-04) touches this file.
- (4) Premise "no catch" is false (`log.service.ts:70-72` catches and `console.error`s), the effect is real: the switch stays on with no session (`TroubleshootingSection.svelte:41-49,146-154`). `isLogSessionActive` exists (`log.service.ts:218-220`). Revert writes the same settings field through the existing store method.
- Split from File History (different features, 8 files was too much for one agent). Sequence with settings-a P53, which edits `TroubleshootingSection.svelte`.

### P21. DEFER, unchanged
- No `components/ui/toolbar`. A kit migrated across kanban, graph, tags, note action bar, rail list, search, tasks, collection, with an owner sizing decision. Every visible slice is in the kanban scout or in live shell-sidebars-ux / tasks-view-ux files.

### P22. QUICK-PART, narrowed
- Verified unnamed: `FilterRow.svelte:101-103,184-186` (both remove buttons), `FormulaRow.svelte:57-59` (editing-mode remove) and `:89-91` (view-mode remove; edit at `:84` is named). `AutoOrganizeRuleRow.svelte:298-322` (up, down, delete) and its `Switch` (`:294-297`) are unnamed too, but settings-a P28 already names exactly those. `SortPanel.svelte:126-133` remove is named "Remove sort by <label>" in the collection scout's SortPanel ticket. `CollectionView` triggers belong to shell-sidebars-ux 16.
- `FilterRow` is shared by four `FilterPanel` consumers; adding names changes no behavior.
- IconButton + Tooltip primitive DEFER (overlaps open-itens 207).

### P77. QUICK-PART, criteria added
- `handleRestore` awaits with no catch (`FileHistoryDialog.svelte:40-51`), service rethrows (`file-history.service.ts:101-104`). Load catch only logs (`:47-50`), `SnapshotList.svelte:24-27` then says "No history available". Diff catch only logs (`:72-76`), `DiffViewer.svelte:31-34`.
- Refutation found: (1) on a diff failure `selectedSnapshot` is already the new snapshot (`:58`) while `diffLines` still holds the previous one, so the pane shows the wrong diff under the new selection and Restore restores a snapshot whose diff was never shown. The error state must replace the diff, not sit beside stale lines. (2) The load catch also catches `loadBackupTimestamps` after `setSnapshots` (`:33-37`); the list must stay visible then. (3) `fileHistoryStore.reset()` (`file-history.store.svelte.ts:50-60`) must clear the new fields; `file-history.store.test.ts` covers them.
- The restore path itself (`saveCurrentFile`, a core save) is not changed; only the dialog catch is added. open-itens 023 (restore guard, P1) is not covered and stays.
- Same four files as feedback-b Q1 (P153 diff summary, P87 nested button): one ticket, or strict sequence. Use P153's `diffSummary` for "No differences" instead of a second helper.
- DEFER: compact empty-history dialog.

### P83. QUICK-PART, toasts removed
- `app.css:507` `user-select: none` on `body`; editor opts in (`editor-theme.ts:40`). Targets exist: `SettingItem.svelte:26,28`, `BuildInfo.svelte:49-52` (scout's `:62-63` is wrong), `UpdateSection.svelte:291` and `:353`, `dialog-description.svelte` (8 consumer files).
- Refutation found: sonner's toast sets pointer capture on pointerdown and moves the toast on the first 1 px of drag (`Toast.svelte:349-360, 418-427`), so drag-selecting toast text swipes it. Toast copy belongs with P17's Copy details (DEFER).
- Sequencing: settings-a P28 adds ids and aria wiring to the same `SettingItem` spans.

### P89. QUICK-PART, toasts only
- `copy-block-link.service.ts:25` silent return, `:32-43` heading success silent, `:51-53` `^id` dispatched before `:58` clipboard write.
- Refutation found: writing the clipboard first puts the `view.dispatch` that inserts `^id` into the note after an `await`, with `line.to` computed before it (`:22`). A doc change or editor teardown during the await would insert the id at a wrong offset in the note. That is a note-content write; DEFER the reorder (it needs re-validation of the line after the await). Toasts alone keep today's synchronous insert.
- Existing test mocks `svelte-sonner` with `error` only (`copy-block-link.service.test.ts:3-5`); extend with `success` and `info`. E2E `copy-block-link.spec.ts` asserts clipboard and marker, unaffected.

### P91. QUICK-PART, unchanged
- `EventForm.svelte:38` errors with no touched gate, `:69-75` aria and message. `text-meta` is 12 px (`app.css:94`). open-itens 217 has the same scope and criteria; mark it wontfix with a pointer once Q6 lands. Calendar-tasks scout explicitly leaves 217 out.

## Quick tickets

### Q1. Toasts follow the theme; Settings and dialog text is selectable (P17 slice, P83 slice)
- Ids: P17, P83
- Files: `src/lib/app/AppOverlays.svelte`, `src/lib/core/settings/sections/SettingItem.svelte`, `src/lib/core/settings/BuildInfo.svelte`, `src/lib/components/ui/dialog/dialog-description.svelte`, `src/lib/core/settings/sections/UpdateSection.svelte`; tests `src/tests/lib/app/AppOverlays.test.ts`, `src/tests/lib/core/settings/SettingItem.test.ts`, `BuildInfo.test.ts`, an UpdateSection test.
- What to build: drop `richColors`; pass `style` with `--normal-bg: var(--popover); --normal-text: var(--popover-foreground); --normal-border: var(--border)`; `toastOptions.classes` gives error/success/warning/info a thin left accent from `--destructive`, `--success`, `--warning`, `--primary`. Add `select-text` to the SettingItem label and description spans, BuildInfo's container, the dialog description, the Update error span and the "Changes in this build" text. Toasts stay non-selectable.
- Acceptance:
  1. Failing test first (`AppOverlays.test.ts`): after `toast.error('x')` the toast has `data-rich-colors="false"` (fails today).
  2. The toaster element's style declares the three `--normal-*` vars with the popover/border tokens; an error toast carries the error accent class and a success toast the success class.
  3. SettingItem label and description, BuildInfo, a dialog description and the Update error carry `select-text` (render tests).
  4. Manual in `pnpm tauri dev`: a Settings description and the version can be selected and copied; rail and tabs cannot; a toast in light and dark uses the popover colors.
- Sequence after settings-a P28 (same SettingItem spans) or rebase on it.

### Q2. Quick Capture composer says what it does (P15, P14 slice)
- Ids: P15, P14
- Files: `src/routes/composer/+page.svelte`, `src/tests/routes/composer-page.test.ts`.
- What to build: hints "Esc hides (draft kept) · ⌘↩ saves", "Could not save. ⌘↩ retries, Esc hides (draft kept).", "Save not confirmed. ⌘↩ saves again, Esc hides (draft kept)."; `saving` becomes `$state` and the hint reads "Saving..." while waiting; a non-empty draft restored on mount or summon shows "Draft restored" with a Discard button that empties the text and the stored draft, removed on the first edit; a confirmed save shows a check and "Saved" for about 600 ms. On `ok === true`, the stored draft is set to `withoutWritten(text, body)` before the hold.
- Acceptance:
  1. Failing test first: default hint is the new string, both error hints no longer say "cancels" (update pins at `:107-108,271,429`).
  2. While `submit_composer_capture` is pending the hint reads "Saving...".
  3. Mount or summon with a stored draft shows "Draft restored"; typing removes it; Discard empties editor and storage; no draft shows no note.
  4. A confirmed save keeps the `saved` class and "Saved" for 600 ms (fake timers) before `dismiss_composer`.
  5. Esc then summon during the saved hold: editor is empty, no "Draft restored", and Cmd+Enter sends no second `submit_composer_capture` (update `:336-351` to the new hold).

### Q3. File History says when something failed (P77 slice, P16 item 3)
- Ids: P77, P16
- Files: `src/lib/features/file-history/FileHistoryDialog.svelte`, `SnapshotList.svelte`, `DiffViewer.svelte`, `file-history.store.svelte.ts`, `file-history.service.ts`; tests `FileHistoryDialog.test.ts`, `file-history.service.test.ts`, `file-history.store.test.ts`. Merge with feedback-b Q1 (P153, P87) or land strictly before/after it; reuse its `diffSummary` for the no-differences check.
- What to build: `handleRestore` catches and toasts "Could not restore this version. The editor may hold the restored text unsaved." and the dialog stays open. Store gets `loadError` and `diffError` (cleared on success and by `reset()`). The list pane shows the load error with Retry only when no snapshots loaded; the diff pane shows the diff error with Retry instead of any diff; an all-unchanged diff shows "No differences from the current version".
- Acceptance:
  1. Failing test first (`FileHistoryDialog.test.ts`): `restoreSnapshot` rejects after confirm; dialog stays open, `toast.error` fires, no unhandled rejection (fails today).
  2. `get_file_history` rejects: `loadError` set, list shows the message and Retry, not "No history available"; Retry re-runs the load.
  3. Snapshot A shown, then selecting B makes `compute_diff` reject: `diffError` set, A's lines are not rendered, Retry re-runs `selectSnapshot(B)`.
  4. `loadBackupTimestamps` failing after snapshots loaded keeps the list visible.
  5. All-unchanged diff shows the no-differences notice.
  6. `reset()` clears both errors (store test).

### Q4. A switch that failed to start turns back off (P16 items 2 and 4)
- Ids: P16
- Files: `src/lib/app/LabsSection.svelte`, `src/lib/core/settings/sections/TroubleshootingSection.svelte`; tests `src/tests/lib/app/LabsSection.test.ts`, `src/tests/lib/core/settings/TroubleshootingSection.test.ts`.
- What to build: on `startModsHost` rejection, toast "Could not start vault mods", `modsEnabledStore.setEnabled(false)` and `stopModsHost()`. After `initLogSession()` resolves with `!isLogSessionActive()`, toast and set the switch that started it back to false (`updateDebugLogToFile(false)` / `updateDebugTauriLogToFile(false)`), no heartbeat.
- Acceptance:
  1. Failing test first: `startModsHost` rejects; `modsEnabledStore.enabled` is false and a toast fired (fails today).
  2. `isLogSessionActive` false after init: `settingsStore.debugLogToFile` ends false, toast fired, `startHeartbeat` not called; same for the Tauri log switch.
  3. With the other log switch already on (session active), turning one on keeps it on.
- Sequence with settings-a P53 (same Troubleshooting file).

### Q5. Copy block link confirms (P89 slice)
- Ids: P89
- Files: `src/lib/features/copy-block-link/copy-block-link.service.ts`, `src/tests/lib/features/copy-block-link/copy-block-link.service.test.ts`.
- What to build: after a successful write, `toast.success('Block link copied')` or `'Block embed copied'` (headings and blocks); an empty line toasts `toast.info('Place the cursor on a block')`. The `^id` insert order stays as it is.
- Acceptance:
  1. Failing test first: a heading line with a working clipboard fires `toast.success` (fails today).
  2. A block line fires `toast.success` with the embed text when `embed` is true.
  3. An empty line fires `toast.info` and writes nothing.
  4. Failure cases keep `toast.error` and no success toast.

### Q6. New event dialog opens without an error (P91 slice)
- Ids: P91
- Files: `src/lib/features/event-calendar/EventForm.svelte`, `src/tests/lib/features/event-calendar/EventDialog.test.ts`.
- What to build: `titleTouched` set on title `oninput` and `onblur`; `aria-invalid`, `aria-describedby` and the message use `titleTouched && errors.title`; Save still reads the full `errors`; placeholder "Event title"; message `text-meta`.
- Acceptance:
  1. Failing test first: after opening create, no `[data-error="title"]`, no `aria-invalid`, Save disabled (fails today).
  2. Focus and blur of the empty title show "Enter a title." with `aria-invalid="true"` and `aria-describedby` to the message.
  3. Existing spaces, colon and edit-mode cases pass unchanged; `event-calendar-form.logic.test.ts` untouched.
  4. Title has placeholder "Event title".
- Closes open-itens 217 (wontfix with pointer).

### Q7. Name the filter and formula remove buttons (P22 slice)
- Ids: P22
- Files: `src/lib/features/collection/toolbar/FilterRow.svelte`, `FormulaRow.svelte`; tests `FilterRow.svelte.test.ts`, `FormulaRow.svelte.test.ts`.
- What to build: `aria-label` and `title` on the two FilterRow remove buttons ("Remove filter on <property>", "Remove filter" when no property) and the two FormulaRow remove buttons ("Remove formula <name>", "Remove formula" when unnamed). No class change.
- Acceptance:
  1. Failing test first: `getByRole('button', { name: 'Remove filter on status' })` finds the visual-mode remove (fails today).
  2. Raw-mode remove and both FormulaRow removes are found by name.
  3. Existing FilterPanel and FormulaRow tests pass.
- Could fold into the collection scout's SortPanel ticket if the orchestrator prefers fewer tickets.

### Q8. Undo for deleted rules and themes (P01 slices b and d)
- Ids: P01
- Files: `src/lib/features/auto-organize/AutoOrganizeSection.svelte`, `src/lib/core/settings/sections/AppearanceSection.svelte`, a pure "insert at index" helper in `auto-organize.logic.ts`; tests `AutoOrganizeSection.test.ts`, `AppearanceSection.test.ts`, `auto-organize.logic.test.ts`.
- What to build: rule delete and user-theme delete show an Undo toast for 8000 ms. Undo re-inserts only the removed item at its old index (clamped), then saves through `saveAutoOrganizeConfig(capturedVaultPath)` / `updateAppearance`; theme Undo restores `activeTheme` only when the deleted theme was active and the active theme is still the default, then `applyActiveTheme()`. Undo does nothing when `vaultStore.path` differs from the path at delete time, or when an item with the same id/name already exists.
- Acceptance:
  1. Failing test first: removing a rule shows a toast with an Undo action and duration 8000; Undo restores the rule at its index and saves; a rule edited in between keeps its edit.
  2. Undo after the vault path changed does not touch the store and writes nothing.
  3. Undo works after the Settings section unmounted.
  4. Theme delete and Undo, including the `activeTheme` rule.
- Sequence after settings-a P08/P28/P54 (`AutoOrganizeSection.svelte`) and the AppearanceSection tickets in color and feedback-b. Lowest value of the eight.

## Deferred

- P01(a): kanban card/lane/archive Undo and lane-with-cards prompt rewrite `.kanban` files the owner edits daily.
- P01 property removal: frontmatter write (`PropertyField.svelte:159`), and that file is owned by shell-sidebars-ux 04/10/11.
- P01(c): mod destructive confirm focusing Cancel changes the documented `ctx.ui.confirm` Enter contract (`28-mods.md:446`); owner decision.
- P01 open questions (File History confirm, Trash confirm): owner decisions.
- P17 rest: errors that stay until closed, close button, Copy details, 8 s Undo default need a toast helper and a sweep of about 104 call sites (M).
- P14 rest: "Saved to <folder>/<name>" needs a Rust DTO change; clipboard and deep-link feedback needs `tauri-plugin-notification` (new dependency, Rust).
- P21: toolbar kit across 7+ components with an owner sizing decision (M).
- P22 primitive: IconButton + styled Tooltip + shortcut chip + one Tooltip.Provider (M, open-itens 207).
- P77 compact empty-history dialog: layout rework of the full dialog.
- P83 toasts: drag-select fights sonner swipe; copying toast text waits for P17 Copy details. Other surfaces when touched.
- P89 reorder (clipboard before `^id`): moves a note-content dispatch after an await; needs line re-validation.
- P89 shared `copyToClipboard` helper: the other call sites live in shell-sidebars-ux and tasks-view-ux files.
- P91 one error style across ViewDialog, ThemeEditor, FormulaRow, AutoOrganizeRuleRow: several components owned by other slices.

## Overlaps

- open-itens 217: fully covered by Q6; mark wontfix with a pointer.
- open-itens 023 (File History restore guard): not covered; Q3's catch will display its future error.
- open-itens 207: not covered (Q7 is names only).
- feedback-b Q1 (P153, P87): same File History files as Q3; merge or sequence.
- settings-a P28 (SettingItem ids, AutoOrganizeRuleRow names), P08 and P54 (AutoOrganizeSection), P53 (TroubleshootingSection): sequence with Q1, Q8, Q4.
- collection scout SortPanel ticket owns the sort remove name; shell-sidebars-ux 16 owns the CollectionView triggers.

## Not verified

- Real-webview selectability of `select-text` under `body { user-select: none }`, the Discard click inside the composer drag region, and the visual result of the toast tokens were not run.
