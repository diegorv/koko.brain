# 017 discovery: keep the external version of a dirty open note

Scope (owner, 2026-11-06): watcher side only. `writeTab` and the calendar path are Issue 153.

## Files that change

- `src/lib/core/editor/editor.service.ts:478-514` `reloadExternallyChangedTabs`: today a dirty tab is skipped before any read (:489). It now reads dirty tabs too (after `waitForTabSave`), and when the disk differs from both `savedContent` and `content` it hands the disk bytes to the external-version keeper, then toasts. The tab keeps its typing; clean tabs reload as before.
- `src/lib/core/editor/editor.hooks.ts`: new single-slot `setExternalVersionKeeper(keeper)` / `getExternalVersionKeeper()`, cleared by `resetHooks`. Needed because core must not import `features/file-history` (ADR-0003, layer-rules test).
- `src/lib/features/file-history/file-history.service.ts:190-197` `registerFileHistoryHook`: also registers `saveSnapshotForFile` as the keeper; the returned unsubscribe drops both. The lifecycle (`app-lifecycle.service.ts:283-285`) already calls it only when File History is enabled, so no lifecycle change.

## Plan

1. Red test in `src/tests/lib/core/editor/editor.service.test.ts` (reloadExternallyChangedTabs describe): mock `@tauri-apps/api/core` invoke, open vault `/vault`, call the real `registerFileHistoryHook()`; dirty tab 'base' / 'base plus mine', disk 'base plus external' -> invoke('save_snapshot', { filePath: 'note.md', content: 'base plus external' }), tab keeps 'base plus mine', toast names the note and File History.
2. Hooks slot + file-history registration, then the editor change. Update 'skips dirty tabs, editor always wins': keeps the tab-wins asserts, gains the snapshot check (its `readTextFile` not-called assert goes: the dirty tab is now read).
3. Extra tests: dirty tab with disk == savedContent or == content -> no snapshot, no toast; clean tab reload takes no snapshot; keeper rejects -> error toast, tab kept; no keeper -> no snapshot, no toast. Hooks test for the slot; file-history test for the combined unsubscribe.

## Prior art

- `src/tests/lib/features/file-history/file-history.service.test.ts` 'observer calls saveSnapshotForFile on save' (invoke + vaultStore.open).
- Single-slot registration: `registerCalendarDailyNoteOpener` in app-lifecycle.

## Defaults taken

- File History off (no keeper): behavior as today, no snapshot, no toast (debug log only). The owner chose File History as the store; a conflict copy is not added.
- Disk equal to the tab's `content` is not a conflict (nothing would be lost).
- `waitForTabSave` before reading a dirty tab, so a save in flight is not mistaken for an external write.
- Keeper failure: `error()` log plus an error toast saying the external version could not be kept.
- The conflicts are awaited at the end of the batch so the toast only claims what was kept.

## Risks

- `registerFileHistoryHook` return value changes from the observer's unsubscribe to a combined one; its test that asserted identity changes to assert both are removed.
