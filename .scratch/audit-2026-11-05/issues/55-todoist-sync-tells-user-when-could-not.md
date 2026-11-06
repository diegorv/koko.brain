# 55: Todoist sync tells the user when it could not reach Todoist or the token was rejected

**What to build:** fetchTaskById rethrows every error except a 404/not found (src/lib/features/tasks/todoist.service.ts:84-91). syncTodoistTasks collects them with Promise.allSettled and only passes each rejection to debug() (:277), then saves the sent-tasks file and returns normally (:281). handleSync (src/lib/features/tasks/TasksView.svelte:85-91) has nothing to catch, so the spinner stops and no message appears. Fix direction: syncTodoistTasks reports how many fetches failed (return a count or throw when any failed), logs them through error(), and handleSync shows a toast that names the cause when it is known (token rejected, network). Successful entries still update.

**Blocked by:** none

**Status:** needs-info

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

**Owner decision needed:** Overlaps `.scratch/tasks-view/issues/20-todoist-sync-errors-visible.md`, which another session was writing while this audit ran (untracked at the time). Keep this Issue or that one, and close the other.

- [ ] Failing test first, in src/tests/lib/features/tasks/todoist.service.test.ts: with one sent task and mockGetTask rejecting with an Error('401 Unauthorized'), syncTodoistTasks signals the failure (rejects or returns a failed count of 1), and the entry's syncedAt is unchanged. It fails today.
- [ ] With two sent tasks where one fetch fails and one succeeds, the successful one updates and the failure is still reported.
- [ ] A 404 still counts as deleted, not as a failure.
- [ ] The Tasks view shows an error toast when the sync reports a failure.
- [ ] Frontend gate: `pnpm check` + `pnpm vitest run` pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Ux/low. A sync that is offline or has a bad token fails silently.
- **Trigger:** Click the Todoist sync button in the Tasks toolbar while offline, or with an expired or revoked token.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/features/tasks/todoist.service.ts:74-92 fetchTaskById rethrows non-404; :250-284 syncTodoistTasks: allSettled at :263-265, rejected branch only debug() at :276-278, saveSentTasks at :281, normal return. src/lib/features/tasks/TasksView.svelte:85-91 handleSync only console.error. Test mocks the client at src/tests/lib/features/tasks/todoist.service.test.ts:14-19.
- **Related Issues before the audit:** `.scratch/audit-2026-11-04/issues/14-aux-json-load-failure-guard.md`
- **Source:** audit 2026-11-05, domain `calendar`, finding `N-calendar-07` (from calendar-ux-5). Size S.

## Comments
