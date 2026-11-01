# Issue 34 discovery

## Files that change

- `src/lib/core/vault/vault.service.ts:15-18` `switchVault`: `await saveAllDirtyTabs()` then the existing `await drainEventCalendarWrites()` then `vaultStore.open(path)`. JSDoc updated to say why the save comes first (observers read `vaultStore.path`).
- `src/lib/core/app-lifecycle/app-lifecycle.service.ts:179` save stays as the no-op safety net (no removal, so no removal proof needed). Its comment updated: on a `switchVault` path the tabs are already clean.
- New test `src/tests/lib/core/vault/vault.service.switch-save.test.ts`: real editor/vault/settings stores, real `editor.service`, real `registerFileHistoryHook` + `registerSearchIndexHook` (what `initializeVault` registers); mocks only `@tauri-apps/*`, `svelte-sonner`, debug/log and the event-calendar service (side-effect service, same as `vault.service.test.ts`). Cases: `switchVault('/B')` and deep-link `resolveAndDispatch({ vault: 'B' })`.
- `src/tests/lib/features/deep-link/deep-link.service.test.ts` and `deep-link.service.race-audit.test.ts` mock `editor.service.js` without `saveAllDirtyTabs`; add it to the factory, since `switchVault` now calls it.
- `src/tests/lib/core/vault/vault.service.test.ts`: add one ordering test (save, drain, open) if not covered by the new file.

## Assertions

- `invoke('save_snapshot', { filePath: 'note.md', ... })` and `invoke('update_search_index_file', { filePath: 'note.md', vaultPath: '/A' })`.
- Every `writeTextFile` of a file of A records `vaultStore.path === '/A'` at call time (criterion 3).
- Drain still runs, after the save and before the path changes.

## Prior art

- `vault.service.test.ts` (localStorage mock, `holdDrain`, `flush`).
- `file-history.service.test.ts` / `search.service.test.ts` for invoke mocks of the hooks.

## Risks / defaults

- A failed save (`saveAllDirtyTabs` returns failed paths) does not block the switch: same as `initializeVault` today, and the editor already toasts the failure. Default taken: no new prompt.
- vault.service now imports editor.service (core -> core, allowed by ADR-0003). No cycle: editor.service does not import vault.service.
- Path-change consumer dropped at app-lifecycle :164-165: saves change no path, so it does not matter for the save. For the drain it no longer matters either: the drain in `switchVault` runs before the path changes and before `initializeVault` unregisters anything. Recorded in the commit message.
