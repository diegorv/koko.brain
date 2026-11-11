VERDICT: APPROVED

# Re-review round 3: Issue 14, the sync runs on its own and reports failures

Reviewed `git diff 718c2dc91..HEAD` (0972c4d1c): `app-lifecycle.service.ts`, the comment in `sync-now.service.ts`, one new lifecycle test, and the Resolution in `review-2.md`.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `app-lifecycle.service.ts:171-173` calls `todoistSyncStore.reset()` at `initializeVault` entry, after `stopAutoSync()` and before the `if (unsubscribeFileChange)` teardown guard (`:183`), so it runs whether or not teardown does. `reset()` (`todoist-sync.store.svelte.ts:88-95`) sets `status = 'idle'` and clears error, result, last-synced and log state, the same reset teardown already does at `:675`. Test "an init that skips teardownVault still resets a sync store left syncing by the previous vault": the suite's `beforeEach` calls `teardownVault()`, so `unsubscribeFileChange` is null and the init takes the no-teardown path; the test puts the store in `syncing` and asserts `isSyncing` false and `status` idle. The comment at `sync-now.service.ts:86-88` now matches the code. |

## Acceptance criteria re-checked

- [met] Started in the vault lifecycle's deferred startup step and stopped on teardown and vault switch; a cycle never writes to a vault other than the one it started in. — The fix only adds a store reset at init entry; the vault-switch and superseded-init tests in `app-lifecycle.service.test.ts` and the scheduler tests pass.
- [met] Status bar item: syncing / last synced time / error, from the sync store. — A previous-vault run stopped by a switch can no longer leave the status stuck at syncing on the no-teardown path (new test); the previous vault's last-synced time and error are also cleared on that path, as teardown already did.
- [met] Gate: frontend. — `pnpm check` exit 0 (229 files, 0 errors, 0 warnings); targeted tests pass (below). No `src-tauri/` change. The full suite is deliver's to run.

## Findings

None open or new.

Noted, not a finding: the fix report's "not checked" race (an old-vault run that passes its last vault check and then calls `succeed()` after the init reset) predates this fix and is unchanged by it; the reset does not widen it.

## Checks run in this review

- `pnpm check`: exit 0, 229 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts src/tests/lib/features/todoist-sync/`: exit 0, 21 files, 439 tests passed.
- No test deleted, skipped or weakened; no layer baseline change; no scope creep (3 source/test files plus the workflow's own `review-2.md`).
