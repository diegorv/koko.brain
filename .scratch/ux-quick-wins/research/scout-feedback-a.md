# Scout: feedback-a (P01 P17 P14 P15 P16 P21 P22 P77 P83 P89 P91)

Checked at HEAD 085b23c5d (main). Prototype: `.scratch/design-review/prototypes/feedback-components.html`. Read-only research; nothing was edited or run.

Files the Claude MVP branch also changes (`git diff --stat origin/main...origin/mvp-claude`) that matter here: `src/lib/app/SettingsPanel.svelte`, `src/lib/core/settings/settings.store.svelte.ts`, `settings.service.ts`, `settings.types.ts`, `settings.logic.ts`, `src/lib/app/commands.ts`, `AppShell.svelte`, `tauri-listeners.service.ts`. No candidate ticket below touches them (the settings content wrapper in `SettingsPanel.svelte:~150` is left alone on purpose; selectable text is applied in `SettingItem.svelte` instead).

## Summary table

| id | call | size | one-line reason |
|----|------|------|-----------------|
| P01 | QUICK-PART | S | Ship (b) Undo for rule and user-theme delete, (c) mod confirm focuses Cancel when destructive, (d) 8 s on the new Undo toasts. DEFER (a) kanban (writes `.kanban`, daily-use) and property removal (frontmatter write). |
| P17 | QUICK-PART | S | Ship drop `richColors` + popover tokens + severity accent in `AppOverlays.svelte`. DEFER error-stays-until-closed, Copy details and the toast helper (104 `toast.error` call sites, M). |
| P14 | QUICK-PART | S | Ship only the composer "Saved" confirmation held ~600 ms (folded into the P15 ticket). DEFER folder/name and clipboard/deep-link feedback (needs Rust DTO change, `tauri-plugin-notification`, new dependency). |
| P15 | QUICK | S | One component (`routes/composer/+page.svelte`), copy plus a Saving state plus a restored-draft note; draft lives in localStorage, no vault write. |
| P16 | QUICK-PART | S | (1) search error state is DONE (0de35de11). Ship (2) Labs start failure, (4) debug-log switch revert, (3) via P77. |
| P21 | DEFER | M | New `components/ui/toolbar` kit migrated across 7 features; needs owner sizing decision; kanban part belongs to the kanban scout. |
| P22 | QUICK-PART | S | Ship accessible names for the unnamed icon-only buttons NOT covered by shell-sidebars-ux/16. DEFER IconButton + Tooltip primitive (M). |
| P77 | QUICK-PART | S | Ship restore catch + toast, inline load/diff error with Retry, "No differences" notice. DEFER the compact empty-history dialog. |
| P83 | QUICK-PART | S | Ship `select-text` on toasts, Settings rows, BuildInfo, dialog descriptions, update error. Other surfaces wait for use. |
| P89 | QUICK-PART | S | Ship Copy block link feedback only (`copy-block-link.service.ts`). DEFER the shared helper across rail/note-list files owned by shell-sidebars-ux. |
| P91 | QUICK-PART | S | Ship EventForm title error after first edit or blur, placeholder, `text-meta`. DEFER the one-error-style sweep over 6 other forms. |

## Per-proposal detail

### P01. Destructive actions, no confirm or undo

Verified at HEAD:
- Kanban deletes are instant: `src/lib/plugins/kanban/KanbanView.svelte:106-108` (`handleDeleteItem`), `:122-124` (`handleDeleteLane`), `:338-340` (`handleDeleteArchivedItem`), no undo anywhere in the file.
- Rule delete is instant: `src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:316-322` calls `onremove`, `AutoOrganizeSection.svelte:~66-69` (`removeRule`) removes and calls `saveConfig()`.
- User theme delete is instant: `src/lib/core/settings/sections/AppearanceSection.svelte:92-103` (`deleteTheme`, `settingsStore.updateAppearance`).
- Mod destructive confirm focuses the destructive button: `src/lib/plugins/mods/ModDialogHost.svelte:132-139` (`bind:ref={initialFocus}` is the confirm button) and `:55-60` `focusInitial`.
- Only Undo toast in the app today is Tasks (`tasks.service.ts:431-437`), which sits in the live tasks-view-ux folder and is left alone.

Call: QUICK-PART.
- Ship (b): rule delete and user-theme delete show an Undo toast. Undo re-inserts only the removed item at its old index (not a whole-list restore, so later edits survive). Rule: `autoOrganizeStore.reorderRules(withItemAt(rules, rule, index))` then `saveConfig()` (existing path). Theme: `settingsStore.updateAppearance({ themes: [...with theme at index], activeTheme })`, restoring `activeTheme` only if the deleted theme had been active and the active theme is still the default.
- Ship (c): in `ModDialogHost.svelte`, when `dialog.kind === 'confirm' && dialog.destructive`, `bind:ref={initialFocus}` goes on Cancel instead of Confirm. Caution: `handleConfirmKeydown` (`:69-74`) lets Enter confirm when `e.target === initialFocus` or when the target is not a button; with Cancel as `initialFocus` Enter on Cancel would confirm. The guard must be rewritten so that, for a destructive dialog, Enter confirms only through a native click on the Confirm button and Enter in the body does nothing. This changes a documented contract (`help/documentation/28-mods.md:446` says "Enter confirms"); the line is updated in the same ticket.
- Ship (d): the new Undo toasts pass `duration: 8000`. Existing Tasks Undo toast is not touched.
- DEFER (a): kanban Undo and "delete lane with cards" prompt. `applyChange` rewrites the `.kanban` file and the owner uses kanban daily. Also P01's property removal (`PropertyField.svelte:159`) is a frontmatter write. The two owner questions (File History confirm, Trash confirm) stay open.

### P17. Toasts ignore the theme, errors vanish after 4 s

Verified: `src/lib/app/AppOverlays.svelte:17` is `<Toaster richColors theme=...>`; 104 `toast.error` calls in `src/lib` (grep count); only `settings.service.ts:210` (`BROKEN_FILE_TOAST`) and `sync-scheduler.service.ts:261,275` pass `duration: Infinity, closeButton: true`. svelte-sonner 1.2.3 exposes the CSS vars `--normal-bg`, `--normal-text`, `--normal-border` (`node_modules/svelte-sonner/dist/Toaster.svelte:633-635`) and `toastOptions.classes` per type; duration is not per type on the Toaster, so errors-stay-longer needs a wrapper at the call sites.

Call: QUICK-PART.
- Ship: remove `richColors`; set the three CSS vars to `var(--popover)`, `var(--popover-foreground)`, `var(--border)`; add a severity accent per type through `toastOptions.classes` (error/success/warning/info left bar using the destructive, success, warning, primary tokens). The existing theme-mode test in `src/tests/lib/app/AppOverlays.test.ts` already mounts the real Toaster.
- DEFER: error toasts that stay until closed, close button on errors only, "Copy details", Undo 8 s as a default. All need a `toast` helper and a sweep of 104 call sites (M), plus P83 for the copy to be usable.
- Overlap risk: the color slice (P19..P27, P85, P106..P109) may also restyle toast colors; keep the accent classes to existing status tokens so the two do not collide.

### P14. Quick Capture success invisible, clipboard gives no feedback

Verified: composer success is a 180 ms ring (`src/routes/composer/+page.svelte:12` `SAVE_FLASH_MS`, `:166-174`). `QC_COMPOSER_CAPTURE_RESULT` carries `ComposerCaptureResult` (`src/lib/contracts/generated/ComposerCaptureResult.ts`, generated by ts-rs from Rust), `{requestId, ok}` only, so "Saved to folder/name" needs an IPC DTO change (Rust + regenerated bindings). `tauri-plugin-notification` is absent from `src-tauri/Cargo.toml` and `package.json`. Clipboard captures run through `quick-capture.service.ts:62-107` and `executeAction` returns only a boolean; a main-window toast would not be seen from another app (review validation says so).

Call: QUICK-PART.
- Ship (inside the P15 ticket): hold the saved state ~600 ms with a check and "Saved" text instead of the bare 180 ms ring. No path shown.
- DEFER: "Saved to <folder>/<name>" (Rust DTO), toast/notification for clipboard and deep-link captures (new dependency + Rust).

### P15. Composer says "ESC cancels" but keeps the draft

Verified: hints at `src/routes/composer/+page.svelte:250-255` ("Could not save. ⌘↩ retries, ESC cancels.", "Save not confirmed. ⌘↩ saves again, ESC cancels.", "ESC cancels · ⌘↩ saves"); `dismiss()` keeps the draft (`:14` `DRAFT_STORAGE_KEY`, `$effect(() => writeDraft(text))` at `:41`); `saving` is a plain `let` (not `$state`), so nothing is shown during the up-to-3 s wait (`RESULT_TIMEOUT_MS`, `:105-108`). The draft is localStorage in the composer webview only, no vault write.

Call: QUICK. Behavior: hint reads "Esc hides (draft kept) · ⌘↩ saves" and the two error hints use "Esc hides, draft kept"; `saving` becomes `$state` and shows "Saving..." in the hint; when a non-empty draft is restored on mount or on a summon, the hint area shows "Draft restored" with a Discard button that clears the text; any edit removes the note; the saved state shows a check and "Saved" for ~600 ms (P14 slice). Discard is a click target only, no new shortcut (the review dropped the clear-draft shortcut).

### P16. Errors go to the wrong channel

Verified per item:
- (1) Search error: DONE. `searchStore.searchError` and the Retry state exist: `search.store.svelte.ts:16,46,69`, `SearchPanel.svelte:190,283-286`, commit 0de35de11 ("search panel states, operator hints and a11y labels", finders-ux Issue 04). The panel says "Search failed" without the message, acceptable.
- (2) Labs: `LabsSection.svelte:26-29` `startModsHost(...).catch` only logs; the switch stays on. Real but rare (`startModsHost` rejects only if `readDir` throws, `mods-host.service.ts:1080-1081`).
- (3) File History restore: handled by P77.
- (4) Debug log: `initLogSession` DOES have a catch (`utils/log.service.ts:70-72`, premise "no catch" is false) but it swallows the error with `console.error`, so `TroubleshootingSection.svelte:44-46,149-151` leaves the switch on with no session. `isLogSessionActive()` (`log.service.ts:218`) is already exported, so the fix lives in the component.

Call: QUICK-PART (items 2 and 4; 1 DONE; 3 in P77). Behavior: after a failed start, a toast.error and the switch reverts (Labs: `modsEnabledStore.setEnabled(false)` + `stopModsHost()`; Troubleshooting: `settingsStore.updateDebugLogToFile(false)` / `updateDebugTauriLogToFile(false)` when `!isLogSessionActive()` after the await). No sweep of other calls.

### P21. Toolbar kit

Verified: no `components/ui/toolbar` (`ls src/lib/components/ui`); kanban toolbar still uses `p-1` buttons, native `<select>` with `SORT_LABELS`, and a search field with the icon outside (`KanbanView.svelte:462-505`). Call: DEFER (M). Reasons: a new shared kit migrated across kanban, graph, tags, note action bar, rail list, search, tasks and collection (7+ components), several of which are live in shell-sidebars-ux and finders-ux (already done); sizes (28 px, 16 px icon) are an owner design decision. The kanban toolbar belongs to the kanban scout.

### P22. Icon-only controls have no enforced name

Verified: `CollectionView.svelte:594-602, 621-628, 644-651, 666-670` have no name, but `.scratch/shell-sidebars-ux/issues/16-filters-count-clear-view-triggers.md` (ready-for-agent) already renames exactly those four ("Filter", "Sort", "Columns", "Calendar settings") and removes the double tab stop. Trash action buttons already have titles (`TrashSection.svelte:119,126`), AppearanceSection buttons already have `aria-label`s (`:192-231`), canvas buttons have titles. Still unnamed (read in source): `AutoOrganizeRuleRow.svelte:298,307,316` (move up, move down, delete), `collection/toolbar/FilterRow.svelte:101,184` (remove filter), `FormulaRow.svelte:57` (remove) and the small edit/remove pair at `:80-90`, `SortPanel.svelte:126` (remove sort). The review's "about 27" is approximate; the exact list comes from an audit in the ticket.

Call: QUICK-PART. Ship: `aria-label` plus `title` on the unnamed icon-only buttons listed above (labels name the target, e.g. "Delete rule <name>", "Remove filter on <property>"). DEFER the `IconButton` + styled `Tooltip` + shortcut chip + single `Tooltip.Provider` (M, overlaps open-itens 207).

### P77. File History feedback

Verified: `FileHistoryDialog.svelte:40-51` `handleRestore` awaits `restoreSnapshot` with no catch; `file-history.service.ts:101-104` rethrows after logging, so the click handler produces an unhandled rejection. `:47-50` load failure only logs and sets `isLoading` false, `SnapshotList.svelte:26-29` then shows "No history available". `selectSnapshot` failure (`:63-72`) only logs and `DiffViewer.svelte:33-36` shows "Select a snapshot to view changes". Identical content produces an all-unchanged diff (not an empty list).

Call: QUICK-PART. Ship:
- `handleRestore` catches and `toast.error('Could not restore this version. The editor may hold the restored text unsaved.')` (the editor was already updated before `saveCurrentFile`, `file-history.service.ts:90-100`); the dialog stays open because `fileHistoryStore.reset()` is not reached.
- `fileHistoryStore` gets `loadError` / `diffError` (message or null); the service sets them in the two catches and clears them on success; `SnapshotList` and `DiffViewer` show the error with a Retry button (re-run `openFileHistory`/`selectSnapshot`).
- A pure helper in `file-history.logic.ts` (`hasChanges(diffLines)`) drives a "No differences from the current version" notice above the diff when every line is `unchanged`.
- DEFER: compact dialog for an empty history linking to the retention setting (layout rework of the 1020x720 dialog).
- Composition with open-itens 023 (restore guard, ready-for-agent): that ticket will make `restoreSnapshot` throw an error that this catch will display; no conflict, but both touch `restoreSnapshot`'s callers.
- Overlap with feedback-b P153 (File History diff orientation/summary): same `DiffViewer` and dialog; the orchestrator should give both to one ticket or sequence them.

### P83. Text selection disabled app-wide

Verified: `src/app.css:507` `user-select: none` on `body` (unprefixed only); editor opts back in at `core/markdown-editor/setup/editor-theme.ts:40`. Tailwind already ships `select-text`, so no new CSS utility is needed. Settings rows are all rendered through `SettingItem.svelte:30-40`; the Update error is `UpdateSection.svelte:291`; version value is `BuildInfo.svelte:62-63`.

Call: QUICK-PART. Ship `select-text` on: toast container (via the P17 `toastOptions.classes`), `SettingItem` label and description spans, `BuildInfo` value, `components/ui/dialog/dialog-description.svelte`, the UpdateSection error span and "Changes in this build" text. Chrome stays non-selectable. Risk to check in the real app: the base rule is the unprefixed property only; Tailwind emits `-webkit-user-select` for `select-text`, so confirm in the Tauri webview that the text is actually selectable. Remaining surfaces (other error texts, snippets) are added when touched.

### P89. Copy actions confirm four ways

Verified: `copy-block-link.service.ts:31-62`: heading branch writes silently; block branch dispatches the `^id` insert at `:46-49` BEFORE the clipboard write at `:58`; empty line returns silently at `:25`. Other clipboard writes: `NoteRowMenu.svelte:246-249`, `TypesNavigator.svelte:325-375`, `FilesNavigator.svelte:259`, `TasksView.svelte:585-590`, code block widget `code-block-widget.ts:95` (label swap), and `note-action-bar.service.ts:33-42` (the good pattern: write, then `toast.success`).

Call: QUICK-PART. Ship in `copy-block-link.service.ts` only: write to the clipboard first and insert `^id` only after success; `toast.success('Block link copied')` / `'Block embed copied'`; on an empty line `toast.info('Place the cursor on a block')`; failure toast stays. DEFER the shared `copyToClipboard` helper and the row-menu "Copy path" sites: they live in rail/note-list files that shell-sidebars-ux edits (Issue 15 touches `NoteRowMenu`, `TypesNavigator`), and `TasksView` is in tasks-view-ux.

### P91. Form validation on open

Verified: `EventForm.svelte:38-39` `errors = validateDraft(draft)` with no touched gate; the title error paragraph at `:73-75`; `draftForCreate` starts with `title: ''` (`event-calendar-form.logic.ts:104`). `TypeNameDialog.svelte:29-30` hides the error while empty (the pattern). Other forms with their own styles: `ViewDialog.svelte:189-192`, `ThemeEditor.svelte:81,141-145`, `FormulaRow.svelte:62`, `AutoOrganizeRuleRow.svelte:394`.

Call: QUICK-PART (EventForm only). Ship: add `titleTouched` set on first `oninput` and on `onblur`; `aria-invalid`, `aria-describedby` and the message use `titleTouched && errors.title`; Save stays disabled while invalid (`valid` still reads the full `errors`); `placeholder="Event title"`; message class `text-meta` instead of `text-xs`. DEFER the one-error-style restyle of the other forms (each its own component, touches ThemeEditor/ViewDialog/rule row).

## Candidate quick tickets

### Q1. Toasts follow the theme and message text is selectable (P17 slice, P83 slice)

- Behavior change: Toaster stops using `richColors`; toast background, text and border come from the popover/border tokens (CSS vars `--normal-bg`, `--normal-text`, `--normal-border`); each severity gets a thin left accent from the status tokens; toasts, Settings rows, the build version, dialog descriptions and the update error become selectable.
- Files: `src/lib/app/AppOverlays.svelte`, `src/lib/core/settings/sections/SettingItem.svelte`, `src/lib/core/settings/BuildInfo.svelte`, `src/lib/components/ui/dialog/dialog-description.svelte`, `src/lib/core/settings/sections/UpdateSection.svelte`.
- Test seam: real `AppOverlays` mount with real svelte-sonner (as `AppOverlays.test.ts` does), real `SettingItem`/`BuildInfo`/`UpdateSection` mounts. Nothing is mocked beyond what those tests already mock. Selectability is asserted by the `select-text` class (jsdom does not compute Tailwind); the real-webview check is manual.
- Acceptance criteria:
  1. Failing test first in `src/tests/lib/app/AppOverlays.test.ts`: after `toast.error('x')` the toast element has `data-rich-colors` not equal to `"true"` (fails today).
  2. The toaster declares the three `--normal-*` vars as the popover/border tokens, and an error toast carries the error accent class while a success toast carries the success one.
  3. The toast element has `select-text`.
  4. `SettingItem` label and description spans, and `BuildInfo`'s version span, have `select-text` (`SettingItem.test.ts`, a BuildInfo render).
  5. The dialog description and the Update error span have `select-text`.
  6. Manual: in `pnpm tauri dev` a toast, a Settings description and the version can be selected and copied; the rail and tabs still cannot.
- Not included: error toasts that stay until closed, close button, Copy details (DEFER, M).

### Q2. Quick Capture composer says what it does (P15, P14 slice)

- Behavior change: hint text "Esc hides (draft kept) · ⌘↩ saves" and matching error hints; "Saving..." during the wait; "Draft restored" with a Discard button after a restore; check plus "Saved" for ~600 ms after a successful write.
- Files: `src/routes/composer/+page.svelte`, `src/tests/routes/composer-page.test.ts`.
- Test seam: the existing harness (mocked `call`/`on` Tauri IPC, real component, real localStorage); no stores involved.
- Acceptance criteria:
  1. Failing test first: the default hint is "Esc hides (draft kept) · ⌘↩ saves" and both error hints no longer say "cancels" (update the pins at `composer-page.test.ts:107-108,271,429` on purpose).
  2. While `submit_composer_capture` is pending, the hint reads "Saving..."; it returns to the default or error hint when the result arrives.
  3. Mounting or summoning with a stored draft shows "Draft restored"; typing removes it; Discard empties the editor and the stored draft.
  4. A successful save shows "Saved" with the saved class for at least 600 ms (fake timers) before `dismiss_composer`.
  5. Mounting with no draft shows no "Draft restored".

### Q3. Failures reach the user: File History, Labs, debug-log switches (P77 slice, P16 items 2 and 4)

- Behavior change: a failed restore shows a toast; a failed history or diff load shows an inline error with Retry instead of "No history available" / "Select a snapshot"; an unchanged diff shows "No differences from the current version"; a failed mods start toasts and turns the Labs switch off; a failed debug-log start toasts and turns its switch off.
- Files: `src/lib/features/file-history/FileHistoryDialog.svelte`, `SnapshotList.svelte`, `DiffViewer.svelte`, `file-history.store.svelte.ts`, `file-history.service.ts`, `file-history.logic.ts`, `src/lib/app/LabsSection.svelte`, `src/lib/core/settings/sections/TroubleshootingSection.svelte`.
- Test seam: `FileHistoryDialog.test.ts` (mocks the service and `ask`, real store), `file-history.service.test.ts` (mocked `call`, real store), `LabsSection.test.ts` (mock `mods-host.service`), `TroubleshootingSection.test.ts` (mock `log.service`); assert real store and switch state. The ticket can be split into File History / switches if one agent run is too large.
- Acceptance criteria:
  1. Failing test first (`FileHistoryDialog.test.ts`): `restoreSnapshot` rejects after the user confirms; the dialog stays open, `toast.error` is called, and no unhandled rejection reaches vitest.
  2. `get_file_history` rejecting sets `fileHistoryStore.loadError`; the list pane shows the message and Retry, not "No history available"; Retry re-runs the load.
  3. `compute_diff` rejecting sets `diffError`; the right pane shows the error and Retry.
  4. `hasChanges` (logic test) is false for an all-unchanged diff and the dialog shows "No differences from the current version" for it.
  5. `startModsHost` rejecting leaves `modsEnabledStore.enabled === false` and shows a toast.
  6. With `isLogSessionActive()` false after `initLogSession()`, toggling "Save debug log to file" on ends with `settingsStore.debugLogToFile === false` and a toast; same for the Tauri log switch.

### Q4. Copy block link gives feedback (P89 slice)

- Behavior change: the link is written to the clipboard before the `^id` is inserted (a failed write leaves no stray id); success toasts "Block link copied" or "Block embed copied" (headings too); an empty line toasts "Place the cursor on a block".
- Files: `src/lib/features/copy-block-link/copy-block-link.service.ts`, `src/tests/lib/features/copy-block-link/copy-block-link.service.test.ts`.
- Test seam: real `editorStore`, fake CodeMirror view and `navigator.clipboard`, mocked `svelte-sonner` (existing test setup; extend the mock with `success` and `info`).
- Acceptance criteria:
  1. Failing test first: on a block line without an id where `writeText` rejects, `view.dispatch` is never called and an error toast shows.
  2. Success on a block line: `writeText` is called before `dispatch`, and `toast.success` fires.
  3. Success on a heading line fires `toast.success`.
  4. An empty line fires `toast.info('Place the cursor on a block')` and writes nothing.
  5. Existing cases (no active tab, existing id, embed flag) stay green.

### Q5. New event dialog opens without an error (P91 slice)

- Behavior change: the title error and red border appear only after the user edits or leaves the title; title placeholder "Event title"; message uses `text-meta`; Save stays disabled while the title is empty.
- Files: `src/lib/features/event-calendar/EventForm.svelte`, `src/tests/lib/features/event-calendar/EventDialog.test.ts`.
- Test seam: real `EventForm` through `EventDialog`/`EventCalendarView` mounts (existing); no mocks beyond what that test has.
- Acceptance criteria:
  1. Failing test first: after opening the create dialog, `[data-error="title"]` is absent, the title input has no `aria-invalid`, and Save is disabled.
  2. Focus then blur of the empty title shows "Enter a title." with `aria-invalid="true"` and `aria-describedby` pointing at the message.
  3. Typing spaces still shows the message (existing test at `EventDialog.test.ts:244-252` unchanged).
  4. The title input has placeholder "Event title".
  5. Edit mode for an event with a title is unchanged (no message on open; clearing the title shows it).
- Resolves open-itens 217 (same change, same criteria); that Issue can be marked wontfix with a pointer.

### Q6. Name the unnamed icon-only buttons (P22 slice)

- Behavior change: each listed icon-only button gets `aria-label` and `title` that name its action and target.
- Files: `src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte`, `src/lib/features/collection/toolbar/FilterRow.svelte`, `FormulaRow.svelte`, `SortPanel.svelte` (the four `.view` toolbar triggers in `CollectionView.svelte` are NOT here, they belong to shell-sidebars-ux/16).
- Test seam: existing component tests (`FilterRow.svelte.test.ts`, `FormulaRow.svelte.test.ts`, `AutoOrganizeRuleRowHarness.svelte`), query by `getByRole('button', { name })`; no mocks.
- Acceptance criteria:
  1. Failing test first: each button is found by role and name (fails today: no accessible name).
  2. The rule-row up/down/delete names include the rule name when it has one.
  3. Filter and sort remove buttons name the property.
  4. A short audit step lists any other icon-only `Button` without a name in these four files and the ticket names them too.
  5. No visual change: classes untouched.

### Q7. Destructive safety outside the vault (P01 slices b, c, d)

- Behavior change: deleting an auto-organize rule or a user theme shows an Undo toast (8 s) that puts it back at its old index; a destructive `ctx.ui.confirm` dialog focuses Cancel and Enter in the body no longer confirms.
- Files: `src/lib/features/auto-organize/AutoOrganizeSection.svelte`, `src/lib/core/settings/sections/AppearanceSection.svelte`, `src/lib/plugins/mods/ModDialogHost.svelte`, `help/documentation/28-mods.md` (line 446), plus a small pure helper in an existing `.logic.ts` for "insert at index".
- Test seam: real `autoOrganizeStore` and `settingsStore`; `saveAutoOrganizeConfig` and the settings persistence are the mocked side-effect services; sonner toast mocked to capture the action, or real Toaster click; `ModDialogHost.test.ts` helper `pressKey`.
- Acceptance criteria:
  1. Failing test first: removing a rule shows a toast with an Undo action; invoking it restores the rule at its original index and calls the save once more; another rule edited in between keeps its edit.
  2. Same for deleting a user theme, including restoring `activeTheme` only when the deleted theme was active.
  3. Failing test first (`ModDialogHost.test.ts`): a destructive confirm has Cancel focused; Enter on the dialog body does not resolve true; Enter on Cancel cancels; Enter on the Confirm button confirms.
  4. A non-destructive confirm keeps today's behavior (Enter confirms, Confirm focused).
  5. The Undo toasts last 8000 ms.
  6. `28-mods.md:446` states the destructive focus rule.
- Lowest value of the seven; the owner can skip it. It changes a documented mod API behavior (Enter) so it should be confirmed once.

## Overlaps found

- open-itens 217 (new event dialog error): fully covered by Q5. Mark wontfix with a pointer after Q5 lands.
- open-itens 207 (icon button sizes and shadcn tooltips): not covered by Q6 (Q6 is names only); the P22 primitive stays DEFER and 207 stays open.
- open-itens 023 (File History restore guard, ready-for-agent): composes with Q3 (its thrown error will surface in the new catch); both touch `restoreSnapshot`'s callers, so land one before the other and rebase.
- open-itens 204/205 (EmptyState/InlineAlert primitives): `EmptyState.svelte` exists in `src/lib/components`; no `InlineAlert` yet. Q3's inline errors are plain markup; if 204 lands first, use `InlineAlert`.
- shell-sidebars-ux/16 (ready-for-agent): owns the four `.view` toolbar names in `CollectionView.svelte`, the filter panel `onClear` and the `FilterPanel` count; Q6 deliberately skips `CollectionView.svelte` and `FilterPanel.svelte`. The `AutoOrganizeRuleRow` filter panel gets no change from 16.
- shell-sidebars-ux/15 touches `NoteRowMenu.svelte` and `TypesNavigator.svelte` (Copy path sites): excluded from Q4.
- tasks-view-ux owns the Tasks Undo toast and `TasksView.svelte` copy text: excluded.
- feedback-b scout, P153 (File History diff orientation/summary): same `DiffViewer.svelte` and `FileHistoryDialog.svelte` as Q3; give both slices to one ticket or sequence them.
- kanban scout: P21's kanban toolbar and P01(a) kanban deletes belong there; P01(a) is DEFER because it rewrites `.kanban` files.
- color scout (P19..P27, P85, P106..P109): may restyle toast colors; Q1 uses only existing status tokens.
- calendar-tasks scout: may also touch `EventForm.svelte` (P91 is the only form item in this slice); give Q5 to whoever owns the event form.
- Claude MVP branch: no candidate touches a file in `git diff --stat origin/main...origin/mvp-claude`.

## Not checked

- Real-webview behavior of `select-text` under the unprefixed `body { user-select: none }`, and the visual result of the toast tokens, were not run (read-only research).
- The exact count of unnamed icon buttons was read from source for six files, not from a rendered DOM audit.
