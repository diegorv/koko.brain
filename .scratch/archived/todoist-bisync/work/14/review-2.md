VERDICT: APPROVED

# Re-review round 2: Issue 14, the sync runs on its own and reports failures

Reviewed `git diff 645b4347a..HEAD` (f386d619c, 1b29f8b02, 2e291abd0, 0620ee951, 529f4e562): `sync-scheduler.service.ts`, `sync-now.service.ts` and their two test files.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | major | resolved | `sync-scheduler.service.ts:124-129` `rateLimitRefusal()` is shared; `runCycle` (`:174-176`) resolves the queued manual waiters with it after a cycle that set `blockedUntil`, and starts no cycle. Test "refuses a "Sync now" queued during the cycle that gets a 429, without calling Todoist" asserts 1 request and the 90 s toast; without the fix the queued run would make a second request. |
| 2 | minor | resolved | `sync-now.service.ts:88` skips `todoistSyncStore.fail` for `vault-switched`. Test "leaves the store reset by the vault teardown alone when the old run stops" (idle, no error). The changed mid-cycle assertion (`syncing`, no error) is not a weakened test: the writes and commits assertions stay. See new finding 1 for a narrow side effect. |
| 3 | minor | resolved | `sync-scheduler.service.ts:191-194` `autoCycleAllowed` rechecks `s === session && vaultStore.path === s.vaultPath` after the `todoist_read_kv` await. Test "skips a cycle whose vault switches while its first_run_done is read" (0 requests, no writes to `/other-vault`) would see 1 cycle without the fix. |
| 4 | nit | resolved | `sync-scheduler.service.ts:68-69` returns before `hasAnchoredLine` while sync is off. Test "schedules nothing for a save made while sync is off". |

## Acceptance criteria re-checked

- [met] 429: wait `responseData.error_extra.retry_after` seconds (else 60) before the next cycle. 401: stop automatic cycles until the token changes, with a toast saying the token is invalid. — The queued "Sync now" now honors the wait (finding 1 resolved); the 60 s default, `retry_after`, direct refusal and 401 tests still pass in `sync-scheduler.service.test.ts`.
- [met] Started in the vault lifecycle's deferred startup step and stopped on teardown and vault switch; a cycle never writes to a vault other than the one it started in. — `autoCycleAllowed` closes the first_run_done gap; "skips a cycle whose vault switches while its first_run_done is read" and the existing vault-switch tests pass.
- [met] Status bar item: syncing / last synced time / error, from the sync store. — The stale error after a switch is gone (`sync-now.service.ts:88`); `TodoistSyncStatus.test.ts` and `AppShell.test.ts` pass.
- [met] Gate: frontend. — `pnpm check` exit 0 and the targeted tests pass (below). No `src-tauri/` change. The full suite is deliver's to run.

## Findings

1. **minor** `src/lib/features/todoist-sync/sync-now.service.ts:88` Skipping `fail` on `vault-switched` leaves the store in `syncing` until `teardownVault` resets it, and `syncNow` refuses every run while `todoistSyncStore.isSyncing` (`:75`). `initializeVault` calls `teardownVault` only when `unsubscribeFileChange` is set (`app-lifecycle.service.ts:182-198`), which happens at `:508`, after `markIndexReady` at `:341` and several awaits (`:373`, `:395`, `:462`). So a "Sync now" started in that window, or after an init that threw between those lines, followed by a vault switch leaves the store stuck in `syncing`: the status bar shows syncing and every later sync answers "A Todoist sync is already running." until restart. Before the fix the same case ended as a stale, non-blocking error. Rare and recoverable by restart. Fix (optional): on `vault-switched`, reset the store only if it is still in the state this run set (e.g. call `todoistSyncStore.reset()` when `isSyncing`), or have `teardownVault`'s reset also run from `initializeVault`'s entry with the other `stop*` calls; add a test where no teardown runs.

## Checks run in this review

- `pnpm check`: exit 0, 229 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/todoist-sync/ src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts src/tests/lib/app/AppShell.test.ts src/tests/lib/app/commands.todoist.test.ts`: exit 0, 23 files, 475 tests passed.
- No test deleted or skipped; no layer baseline change; no scope creep outside the two services and their tests.

## Resolution

1. **fixed** (finding 1, minor). `initializeVault` now calls `todoistSyncStore.reset()` at entry, right after `stopAutoSync()` (`src/lib/app/lifecycle/app-lifecycle.service.ts:170-173`), on the path that runs even when `teardownVault` is skipped. A previous-vault "Sync now" stopped by the switch can no longer leave the store in `syncing` and refuse later runs. Test: "an init that skips teardownVault still resets a sync store left syncing by the previous vault" in `src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts` (failed before the fix: `isSyncing` stayed true). The comment at `sync-now.service.ts:86-88` now names the init reset. Checks: `pnpm check` exit 0; the targeted test files (lifecycle, todoist-sync, AppShell, commands.todoist) exit 0, 23 files, 476 tests.
