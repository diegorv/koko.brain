# 20: Todoist sync failures are visible and read the HTTP status

**What to build:** Todoist failures are silent, against the repo's error-handling rule (CLAUDE.md "Error Handling > Components"):

- Per-task sync errors go only to `debug()` (`src/lib/features/tasks/todoist.service.ts:276-278`).
- The toolbar Sync button only calls `console.error` (`TasksView.svelte:85-91`).
- A 404 is detected by message substring (`todoist.service.ts:86`) and then shown as "not completed" (`:270-275`), so a completed or deleted task looks open.
- Sync fires every request at once (`:263`), with no 429 handling.

Fix:

- `fetchTaskById` checks `err instanceof TodoistRequestError && err.httpStatusCode === 404` (the class and field are in the installed SDK, `node_modules/@doist/todoist-sdk/dist/types/types/errors.d.ts:2-8`). Today's substring check works only by accident: the SDK builds the message as `HTTP 404: Not Found` (`dist/esm/transport/fetch-with-retry.js:143`). A 404 now means "closed in Todoist (completed or deleted)", stored as `closed: true` on the entry. `GET /api/v1/tasks/{task_id}` "Returns a single active (non-completed) task by ID" and lists 404 among its responses (https://developer.todoist.com/api/v1/#tag/Tasks/operation/get_task_api_v1_tasks__task_id__get, read 2026-11-06), but the docs do not say which status a completed or a deleted id gets, so the completed icon's title uses that wording until PRD decision B3's live check says more.
- Sync runs at most 3 requests at a time. The SDK retries only network errors, 3 times (`dist/esm/transport/fetch-with-retry.js:17-24`, `:197-198`; unchanged on the SDK's main branch on 2026-11-06), so a 429 reaches the caller as a `TodoistRequestError` with `httpStatusCode` 429 (`dist/esm/transport/http-client.js:37-46`). A 429 waits once and retries: `responseData.error_extra.retry_after` seconds when present, else 5 s. That location is verified: the v1 docs list `retry_after` under `error_extra` ("Seconds to wait before retrying. May be returned on rate-limited requests and other API errors, not just `429` responses", https://developer.todoist.com/api/v1/#tag/Migrating-from-v9, section "Previous REST API endpoints error responses"), and `responseData` is the raw parsed body, still snake_case, because the SDK camel-cases only successful responses (`http-client.js:43`, `:133-135`). The `Retry-After` header is not reachable: `TodoistRequestError` copies only the status and the body (`http-client.js:41-44`). Only a 429 is retried: the docs show `retry_after` on 401 and 404 bodies too, and say a 401 must not be retried with the same token.
- A rejection that is not a `TodoistRequestError`, or one without `httpStatusCode`, is "Todoist could not be reached". The SDK wraps a thrown value that is not an `Error` into a plain `Error` (`http-client.js:53-58`); `@tauri-apps/plugin-http` 2.8.3 passes `invoke` rejections through unwrapped (`node_modules/@tauri-apps/plugin-http/dist-js/index.js:102`, `:123`), and that they arrive as strings is from memory.
- A per-task failure stores `lastError` on that entry in memory, and the row shows an error icon whose title is a fixed message for the failure kind ("Todoist rate limit", "Todoist could not be reached", "Todoist returned HTTP 500"), not the raw error text. The raw error goes to `error()` (`#lib/utils/debug.js`). This follows open Issue `audit-2026-11-05/146` (migrated from `ux-polish/60`), which bans raw `String(err)` copy in `TodoistPopover`.
- After Sync, one summary toast: "Todoist: 3 of 12 tasks could not be checked" with the first fixed message. `handleSync` shows `toast.error` with a fixed message instead of `console.error`, and logs the error with `error()`.
- `SentTaskEntry` (`todoist.types.ts`) gains optional `closed` and `lastError`. Old files without them still load.
- A fulfilled `getTask` sets `closed: false`, clears `lastError`, and sets `todoistCompleted` from `task.checked`. `lastError` is stripped before saving, so it never persists across restarts. The row shows the closed icon when `closed || todoistCompleted`.
- `syncTodoistTasks` captures `vaultStore.path` at the start and skips the store updates and the final `saveSentTasks` when the vault changed during the sync, as `loadCalendarTasks` guards with `isCurrent` (`event-calendar.service.ts:114-118`). Today's code saves to whatever vault is open at the end (`todoist.service.ts:95-97`, `:124-131`, `:281`), and this Issue makes a sync last seconds.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in a new `src/tests/lib/features/tasks/todoist-sync.http.test.ts` with the real `todoistStore` and the real SDK, mocking only `fetch` from `@tauri-apps/plugin-http` (the transport `tauri-fetch-adapter.ts` calls) and `@tauri-apps/plugin-fs`. It cannot go in `todoist.service.test.ts`: that file mocks `#lib/features/tasks/todoist-client.js` (`:14`), which replaces the SDK, so a fake error there proves nothing about `TodoistRequestError`. One task returns 404, one throws a 500, one succeeds. After `syncTodoistTasks` the store shows the first as closed, the second with `lastError`, the third synced, and a summary toast was shown. Fails today (404 becomes "not completed", the 500 is only logged).
- [ ] A 429 followed by success retries once and ends synced.
- [ ] A task that had `closed` and `lastError` and now returns 200 ends with both cleared; the saved file holds no `lastError`.
- [ ] Switching the vault while a mocked request is pending writes nothing to the new vault's `todoist-sent.json`.
- [ ] No more than 3 requests are in flight at once (count in the transport mock).
- [ ] `TasksView.test.ts` (created by Issue 01; create it here if 01 has not landed): a failing Sync shows a toast, and a row with `lastError` shows the error icon.

## Notes

- **Size:** M.
- Ships whether or not Todoist is in real use (B3).
- `audit-2026-11-05/55` (Todoist sync tells the user when it could not reach Todoist) is a subset of this Issue. The owner answered PRD L4 (a) on 2026-11-06: `audit-2026-11-05/55` is closed as wontfix, covered by this Issue. Do not edit `.scratch/audit-2026-11-05/`.
- The installed SDK is `@doist/todoist-sdk` 15.8.0 (`package.json:33`, the renamed `@doist/todoist-api-typescript`; repo https://github.com/Doist/todoist-sdk-typescript). It calls the unified API v1 (`dist/esm/consts/endpoints.js:7-8`, `/api/v1/`), so it does not target a deprecated API: REST v2 and Sync v9 were shut down on February 10, 2026 (https://groups.google.com/a/doist.com/g/todoist-api/c/brwENjfT_tk). No Issue needs a bump for that.
- The v1 docs give rate-limit numbers only for `/sync` (1000 partial and 100 full syncs per user per 15 minutes, https://developer.todoist.com/api/v1/#tag/Request-limits), none for `GET /tasks/{id}`. The cap of 3 is a design choice, not a documented limit.
- An option for the implementer, not part of this spec: `GET /api/v1/tasks` takes `ids` (comma-separated, `limit` up to 200) and returns only active tasks (https://developer.todoist.com/api/v1/#tag/Tasks/operation/get_tasks_api_v1_tasks_get); the SDK's `getTasks({ ids })` joins the array (`dist/esm/clients/task-client.js:49`). One paged call per 200 entries, with every missing id treated as closed, would replace the per-task requests. Whether an id of a completed task is absent from that list is not stated in the docs (from memory, it is).
