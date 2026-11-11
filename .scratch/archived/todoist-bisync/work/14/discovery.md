# 14 discovery: the sync runs on its own and reports failures

No `spec.md`; the design is `research/design.md` Triggers, rules 9 and 13. Builds on 06 (`syncNow`, fake `/sync`, fake vault).

## Files

- `features/todoist-sync/sync-now.service.ts:23-79`: `SyncNowOutcome` gains `failure` (Todoist failure kind with `retryAfter`, `root-missing`, `vault-switched`, `error`) on runs that started and failed; refusals keep no `failure`. `syncNowFromUi` moves to the scheduler (it must queue behind a running cycle; keeping it here would make an import cycle).
- New `features/todoist-sync/sync-scheduler.service.ts`: `startAutoSync(vaultPath)`, `stopAutoSync()`, `syncNowFromUi()`. Triggers: start (vault open), a `setTimeout` chain reading `syncIntervalMinutes` each period, window `focus`, an after-save observer (5 s debounce) for a note in the vault holding an anchored task line. One cycle at a time; a trigger during a cycle queues one follow-up (manual wins over auto); automatic cycles wait until 30 s after the last cycle ended and until a 429's `retry_after` (else 60 s); a 401 stops automatic cycles while the token is the rejected one. Automatic cycles read `todoist_read_kv` and skip unless `first_run_done` is set; they never ask.
- New `features/todoist-sync/sync-scheduler.logic.ts`: `hasAnchoredLine(content)`, `isFirstRunDone(kv)`, `autoSyncFailureMessage(kind)`, `syncStatusLabel(...)`, `formatLogTime`.
- `todoist-sync.store.svelte.ts`: getter `lastSyncedAt` (finishedAt of the last pull), log dialog state (`logOpen`, `logEntries`, `openLog`, `closeLog`).
- New `features/todoist-sync/sync-log.service.ts`: `showSyncLog()` reads `todoist_read_log` (newest 100) and opens the dialog; failure -> error toast.
- New `TodoistSyncStatus.svelte` (status bar, only while `syncEnabled`), `TodoistSyncLogDialog.svelte`; wired in `app/AppShell.svelte:301-310` and `app/AppOverlays.svelte`.
- `app/commands.ts:42,250-255`: "Sync now" imports from the scheduler; new `todoist:show-sync-log` "Todoist: Show sync log".
- `app/lifecycle/app-lifecycle.service.ts`: `startAutoSync(vaultPath)` in the step 9 deferred block (version guarded); `stopAutoSync()` at init entry (double-switch window, like `stopModsHost`) and in `teardownVault`.

## Prior art

- `sync-now.service.test.ts` (fake `/sync`, fake vault, real stores) for the scheduler test, plus `vi.useFakeTimers()`; `syncNowFromUi` tests move with it.
- Lifecycle test mocks the scheduler like `mods-host.service.js` (`app-lifecycle.service.test.ts:234`, 1690-1765).
- `SemanticIndexStatus.test.ts` (jsdom `mount`) for the two components.

## Defaults taken

- `first_run_done` counts as set when its kv value is `1` or `true` (Issue 10 writes it; tests set it).
- Persistent toast: `toast.error(msg, { id: 'todoist-sync-<kind>', duration: Infinity, closeButton: true })`, only for automatic cycles (manual cycles keep their normal error toast); once per kind; a successful cycle dismisses them and re-arms every kind. `vault-switched` shows none.
- 429 and 401 from manual cycles also set the wait and the rejected token. A manual "Sync now" during a 429 wait sends nothing and says how long to wait.
- Automatic refusals (sync off, no token/root, index not ready, bad folder, another run) are silent and change no store.
- `stopAutoSync` drops a queued follow-up and resolves a waiting manual request with a refusal; in-flight writes stay guarded by `syncNow`'s vault recheck.
- Sync log dialog lists the newest 100 rows: time, kind, anchor, message.

## Risks

- A sync write into an open tab is autosaved, so a save-triggered cycle follows (no-op pull, at most once per 30 s).
- Window `focus` (DOM) is what the event calendar relies on in the Tauri webview; not verified in the real app here.
