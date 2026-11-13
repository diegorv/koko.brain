# Scout 06: Todoist service layer

Scope: read-only pass over the Todoist client, service, adapter, bridge, store, popover, settings section, Tauri HTTP capability, and the installed SDK source (`node_modules/@doist/todoist-sdk`, 15.8.0). Nothing was built, run or tested. Line numbers are from the files as read.

## Facts

### Package and SDK
- SDK is `@doist/todoist-sdk`, declared `^15.8.0` (`package.json:33`), locked at `15.8.0` (`pnpm-lock.yaml:429`).
- Base URL `https://api.todoist.com` and API version `v1`, path prefix `/api/v1/` (`node_modules/@doist/todoist-sdk/dist/esm/consts/endpoints.js:2-9`). The client sets `syncApiBase = getSyncBaseUri(opts.baseUrl)` (`dist/esm/todoist-api.js:41`).
- Version is not configurable in the SDK (comment at `endpoints.js:6`).
- Client factory: `src/lib/features/tasks/todoist-client.ts:8-12`. A new `TodoistApi` is built on every call (`todoist.service.ts:21, 41, 63, 80`). No connection or client reuse.

### Transport and Tauri adapter
- `src/lib/features/tasks/tauri-fetch-adapter.ts:11-26` wraps `@tauri-apps/plugin-http` `fetch` as the SDK `customFetch`. It forwards `options` (including the SDK's `timeout` and `signal`) unchanged. It maps `ok`, `status`, `statusText`, `headers` (`Object.fromEntries`), `text()`, `json()`.
- Tauri capability scope: `src-tauri/capabilities/default.json:227-262` allows `https://api.todoist.com/**` for `http:allow-fetch`, `allow-fetch-send`, `allow-fetch-read-body`, `allow-fetch-cancel-body`. The same block also allows `raw.githubusercontent.com/diegorv/koko.brain-themes/**`.
- SDK HTTP client config: `dist/esm/transport/http-client.js:70-75`: timeout 30000 ms, `retries: 3`, `retryCondition: isNetworkError`, `retryDelay` 0 ms on first retry then 500 ms.
- Retry loop: `dist/esm/transport/fetch-with-retry.js:100-210`. Any HTTP non-2xx becomes `Error("HTTP <status>: <statusText>")` with `.status` set (`:143-147`). Retry happens only when `isNetworkError` (`dist/esm/types/http.js:6-16`): TypeError containing "fetch"/"network"/"Failed to fetch"/"NetworkError", or `TimeoutError`, or flagged `isNetworkError`. So 429 and 5xx are not retried, and there is no `Retry-After` handling.
- Retries apply to all methods, POST included. `http-client.js:86-87` adds an `X-Request-Id` only for POST when `!baseUri.includes(API_BASE_URI)`. The v1 base includes `/api/v1/`, so the condition is false and no request ID is generated for v1 POSTs. A POST that reaches the server but loses its response is retried by the SDK with no idempotency key. (Code-read; not exercised.)
- SDK errors: `toTodoistRequestError` (`http-client.js`, exported) wraps into `TodoistRequestError`, which carries `httpStatusCode` and `responseData` (`dist/esm/types/errors.js:3-7`). Non-`Error` throwables become `new Error('An unknown error occurred during the request')`. Our adapter re-throws whatever `tauriFetch` throws.

### Endpoints actually used (through SDK methods)
| Our function | SDK method | HTTP | Path | Evidence |
|---|---|---|---|---|
| `fetchProjects` | `getProjects()` | GET | `/api/v1/projects` | `service.ts:22`; `dist/esm/clients/project-client.js:25-40` |
| `fetchSections` | `getSections({projectId})` | GET | `/api/v1/sections?project_id=` | `service.ts:42`; `dist/esm/clients/section-client.js:13-28` |
| `createTodoistTask` | `addTask(args)` | POST | `/api/v1/tasks` | `service.ts:64`; `dist/esm/clients/task-client.js:133-146` |
| `fetchTaskById` | `getTask(id)` | GET | `/api/v1/tasks/{id}` | `service.ts:81`; `dist/esm/clients/task-client.js:29-39` |

- Not used: `getTasks`, `quickAddTask`, `updateTask`, `closeTask`, `reopenTask`, `deleteTask`, labels, comments, reminders, workspaces, sync API. No write path other than create.
- Pagination: list endpoints return `{results, nextCursor}` and accept `cursor`/`limit` (`dist/types/types/projects/requests.d.ts:21-50`). `fetchProjects` reads only `results` (`service.ts:22-29`) and ignores `nextCursor`. `fetchSections` does the same (`service.ts:42-48`). Users with more projects or sections than one page silently lose the rest. Default page size is not verified (from memory: about 50; not checked).
- `fetchTaskById` maps only `id` and `checked` (`service.ts:83`).

### Argument building (send payload)
- `buildTodoistArgs` (`todoist-bridge.logic.ts:41-63`) maps to `content` (= `metadata.description`), `priority` (only when mapped value > 1), `dueString` (if recurrence, overrides due date), else `dueDate`, `labels` (= `tags`).
- `mapPriorityToTodoist` (`todoist-bridge.logic.ts:15-29`): highest 4, high 3, medium 2, low/lowest/none 1.
- `sendTaskToTodoist` (`service.ts:196-205`): metadata args as defaults; `content` falls back to raw `text`; popover `projectId`, `sectionId`, `priority` override metadata when set.
- Default label (`service.ts:207-211`) merged into `labels` via `mergeLabel` (`todoist-bridge.logic.ts:72-79`), deduped, trimmed.
- `description` is never sent (not in `buildTodoistArgs`). Full description text is used only as `content`.
- Not sent: `description`, `parentId`, `deadline`, `duration`, `assigneeId`, `dueDatetime` (SDK type supports it; code never sets it, `task-client.js:192/220` only forwards project/section/parent).

### Send flow
1. `TaskRow` shows a `TodoistPopover` only when the token is set and the task is not already sent (`TasksView.svelte:241-266`). Popover trigger is `opacity-0` until hover/focus (`TodoistPopover.svelte:113`).
2. `handleOpen` (`TodoistPopover.svelte:55-78`) seeds project and section from `todoistStore.lastProjectId/lastSectionId` and priority from metadata, then `loadProjects()` and `loadSections()` if a project is selected. Errors are stringified into the popover (`:75-77`).
3. `handleProjectChange` (`:80-92`) clears section and reloads sections.
4. `handleSend` (`:94-109`) calls `sendTaskToTodoist(filePath, taskText, projectId|undefined, sectionId|undefined, Number(priority)|undefined, metadata)`. Errors shown inline (`:106-108`). Popover closes on success (`:105`).
5. Service (`service.ts:181-235`): `setSending(true)`; build args; `createTodoistTask` (POST); `addSentTask` to store (`:223`); `saveSentTasks` writes JSON to disk (`:224`); remembers project, section and priority (`:227-229`); `setSending(false)` in finally.
6. Priority options are hardcoded to four Todoist levels (`TodoistPopover.svelte:31-36`). Metadata priority is mapped through the same function on open (`:64-65`).

### Sync flow (completion status only)
- Triggered only by the toolbar Sync button in `TasksView.svelte:85-91` (`handleSync`) and calls `syncTodoistTasks`. Failures are only `console.error`.
- `syncTodoistTasks` (`service.ts:250-286`): loops all sent tasks, `Promise.allSettled` over `fetchTaskById` with no concurrency cap (`:263`). Each fulfilled result sets `todoistCompleted` to `task?.checked ?? false` and `syncedAt` (`:270-275`). Rejected results only go to `debug()` (`:276-278`). Then saves the full list (`:281`).
- 404 (deleted in Todoist): `fetchTaskById` returns `null` (`:86-88`) and sync writes `todoistCompleted: false`. A deleted task is indistinguishable from an open one. Detection is by substring match on the error message (`:86`: `message.includes('404') || message.includes('not found')`). The SDK error does carry `httpStatusCode`, so the string match is not needed.
- Sync is read-only. Nothing is written back to Todoist, and nothing is written back to the note.
- Initial load: `initTodoist` runs on mount (`TasksView.svelte:72-74`, `service.ts:238-244`). Loads `.kokobrain/todoist-sent.json`.

### Persistence
- Sent-task list: `<vault>/.kokobrain/todoist-sent.json` (`service.ts:12, 95-97`). JSON with tab indent. Entry shape `SentTaskEntry` (`todoist.types.ts:25-40`): `filePath` (absolute), `text`, `todoistTaskId`, `todoistUrl`, `sentAt`, `todoistCompleted?`, `syncedAt?`.
- `loadSentTasks` (`service.ts:103-118`): any read or parse failure returns `[]` after `error()`. `saveSentTasks` (`:124-131`) overwrites the file whole. A corrupt file is replaced with `[]` on the next send or sync. No backup. (Code-read.)
- Store (`todoist.store.svelte.ts`): module-level `$state` for projects, sections, sentTasks, last IDs, loading and sending flags (`:4-22`). Lookup key is `"filePath:text"` (`:24-31`, `:49-51`). Duplicate text in one file collapses to one key.
- `updateSentTask` by `todoistTaskId` (`:86-93`); `isCompletedInTodoist`/`getTodoistUrl` by `filePath+text` (`:70-83`).
- Projects are cached in memory. `loadProjects` skips fetch when cached unless `forceRefresh` (`service.ts:137-144`). Nothing calls `forceRefresh=true` in the reviewed files, so the project list stays stale until restart (`from code`).
- Sections are not cached per project; the single `sections` store slot is replaced on every project change (`service.ts:159-171`, store `:6`).

### Settings and token
- Token: `settingsStore.todoist.apiToken` (`settings.types.ts:243-245`, default `''` at `settings.store.svelte.ts:123`). Updated per keystroke via `updateTodoist` (`TodoistSection.svelte:7-9`, store `settings.store.svelte.ts:307-311`). No validation, no "test connection" action. Where the settings file is written and whether it is encrypted was not traced.
- UI: password input (`TodoistSection.svelte:19-30`). Link to `todoist.com/prefs/integrations` opens externally (`:33-39`).
- Default label field (`TodoistSection.svelte:42-52`). Description text claims Todoist creates the label automatically (UI copy, not verified against API).
- Token is passed as `Bearer` header by the SDK (`http-client.js:` getAuthHeader). Not logged by our code: `debug('TODOIST', 'createTask: sending', args)` logs args, which contain content, labels and dates, not the token (`service.ts:62`).

### Error handling (services)
- Service functions propagate errors (`fetchProjects` `:19-32`, `fetchSections`, `createTodoistTask`, `loadProjects`, `loadSections`, `sendTaskToTodoist`) per CLAUDE.md. `loadSentTasks` is the exception: it swallows and returns `[]`, which feeds the overwrite issue above.
- Sync swallows per-task failures to `debug()` (`service.ts:276-278`) and reports nothing to the user, violating the repo rule that user-facing errors show a toast or inline state.
- `handleSync` (`TasksView.svelte:85-91`) logs to `console.error` only.
- `sendTaskToTodoist` ordering: `addSentTask` (memory) happens before `saveSentTasks` (disk). If the save throws after the POST succeeded, the Todoist task exists, the popover shows an error, and the in-memory store has the entry (so the UI shows it as sent). After restart the entry is gone and the task can be sent again: duplicate in Todoist.

### Offline and rate limiting
- No offline queue. A send with no network fails after the SDK's retries (3 retries, 0 ms then 500 ms) and the error is shown inline. Nothing is stored for later.
- Sync with no network: each `fetchTaskById` fails, goes to `debug()`, and the sync still writes the file (`service.ts:281`). `todoistCompleted` values are kept because the failed entries are not updated, so stale state persists silently.
- No client-side rate limiting, no concurrency cap on sync (`service.ts:263`), no backoff on 429. SDK retries do not cover 429 (see Transport). From memory, Todoist REST has per-user rate limits and returns 429 with `Retry-After`; not checked in this pass.
- Timeout: SDK sets 30 s and forwards `timeout` and `signal` to `customFetch`. Whether `@tauri-apps/plugin-http` honors `timeout` and `signal` was not verified.

### Not supported (verified from code)
- Labels: sent from `tags` and default label (`todoist-bridge.logic.ts:58-60`, `service.ts:207-211`). Not read back. Labels already in Todoist are not shown.
- Sections: selectable manually only. Not inferred from note structure or metadata. Not read back for display (only as the name shown in the popover).
- Due dates: sent (`dueDate` or `dueString`), not read back, not editable after send.
- Priority: sent (1-4), not read back, not editable after send.
- Descriptions: not sent; `metadata.description` is used as `content` only.
- Subtasks/parentId, duration, deadline, assignee, comments, reminders: no code.
- Two-way edits: none. Completion is the only field pulled back (`service.ts:270-275`). Our task text, file, and line never change from Todoist state.
- Import from Todoist: none. No project or task listing beyond projects and sections.
- Deletion detection: none (404 is folded into "not completed", see Sync flow).
- Completing a task from the app in Todoist: no call (no `closeTask`).
- Multiple accounts, workspaces: only personal token; no workspace filter.
- Offline queue, retries on 429, backoff: none.

### Tests that exist
- `src/tests/lib/features/tasks/todoist.service.test.ts`: fetchProjects, fetchSections, createTodoistTask, fetchTaskById (including 404 and rethrow), loadSentTasks (missing file, parse error returns `[]`), saveSentTasks, loadProjects (cache and forceRefresh). Test names read only; the mocking approach was not inspected.
- `todoist-bridge.logic.test.ts`: priority mapping, `buildTodoistArgs`, `mergeLabel`.
- `todoist-client.test.ts` and `todoist.store.test.ts` exist; not read.
- No test found in the names above for `sendTaskToTodoist`, `syncTodoistTasks`, or `initTodoist`. (Names grep only, not a full read.)

## Problems and gaps

1. **Sync cannot tell deleted from open.** 404 becomes `todoistCompleted: false` (`service.ts:86-88, 270-275`). Users see a normal cloud icon for a task that no longer exists. The 404 test (`todoist.service.test.ts:161`) asserts `null` but the UI handles it as "open".
2. **Corrupt sent-task file gets overwritten.** `loadSentTasks` returns `[]` on parse error (`service.ts:114-117`). The next `saveSentTasks` writes the new list over the damaged file (`:124-131`). Sent history for the vault is lost with no backup.
3. **Non-atomic send bookkeeping.** POST succeeds, then disk save can fail (`service.ts:213-224`). The task exists in Todoist but not in the file. A restart forgets it and a re-send duplicates it.
4. **Retries can duplicate tasks.** SDK retries POST on network errors (`fetch-with-retry.js` retry loop) and v1 POSTs carry no `X-Request-Id` (`http-client.js:86-87`). A timeout after the server accepted the task can create a second one. Not reproduced.
5. **No handling for 429.** Sync fires one request per sent task at once (`service.ts:263`). Large lists can hit rate limits; the 429 error is caught per task and silently dropped (`:276-278`).
6. **Pagination dropped.** `fetchProjects` and `fetchSections` ignore `nextCursor` (`service.ts:22-29, 42-48`). Accounts with more projects than one page will show a partial project list.
7. **Stale project list.** `loadProjects` never refreshes unless `forceRefresh` is passed (`service.ts:141`). No caller passes it in the reviewed files.
8. **Sections store is a single slot.** Replaced on each project change (`service.ts:166`). Fine for the popover, but cannot back a richer UI that shows sections for several projects.
9. **Lookup by text collides.** Key is `filePath:text` (`todoist.store.svelte.ts:24-31`). Two identical tasks in one file both show as sent. Editing the text makes a sent task look unsent, and resend creates a duplicate. Task text changes are common in notes.
10. **Source file path is absolute and brittle.** `filePath` (`service.ts:215-217`) is stored as absolute; renaming or moving a note orphans the link. No reconciliation.
11. **Errors hidden from the user.** Sync failures only go to `debug()` (`service.ts:276-278`) and `console.error` (`TasksView.svelte:89`). Violates the repo error-handling rule.
12. **Substring-based 404 detection.** `err.message.includes('404') || includes('not found')` (`service.ts:86`) is brittle and could mis-match any message containing those words. The SDK exposes `httpStatusCode`.
13. **No description, no read-back.** Note description is dropped (`todoist-bridge.logic.ts:41-63`). UI shows Todoist completion only; due date, priority and project of a sent task are not shown after send.
14. **Priority and section cannot be edited after send.** Only at send time; no update call exists.
15. **No token check.** Save and no connection test. Bad token shows up only at first send or sync, as a raw error string (`TodoistPopover.svelte:75-77, 106-108`).
16. **Client per call.** `createTodoistClient` builds a new `TodoistApi` for every service call (`todoist.service.ts` multiple). Small overhead; no shared rate budget.
17. **Adapter error shape (suspected).** `createTauriFetchAdapter` re-throws whatever `tauriFetch` rejects with. If that is not an `Error` instance, the SDK replaces it with `'An unknown error occurred during the request'` (`http-client.js` `toTodoistRequestError`), and `isNetworkError` (which needs a `TypeError`) will not retry offline failures. The rejection type of `@tauri-apps/plugin-http` was not verified (from memory: likely a string). Needs a check.

## Ideas worth keeping

- Keep the service/bridge split: `todoist-bridge.logic.ts` is pure and tested (`buildTodoistArgs`, `mapPriorityToTodoist`, `mergeLabel`). Any richer rule engine can reuse it as the mapping layer.
- Keep the SDK's typed `AddTaskArgs`. The bridge already covers content, priority, due date or string, labels. Adding `description` or `parentId` is a one-line change in `buildTodoistArgs` if wanted.
- The popover already reads `TaskMetadata` (due, recurrence, tags, priority) and shows it as chips before send (`TodoistPopover.svelte:121-141`). Reuse this to show a preview of the exact Todoist payload before sending.
- Use the SDK's `httpStatusCode` (or `TodoistRequestError.isAuthenticationError()` at `errors.js:9-11`) instead of string matching.
- Use `nextCursor` to page projects and sections, or set a higher `limit`.
- Store sent tasks by the Todoist task ID or by a stable note identity (block ID or a hash of file + line + text), not `filePath:text`.
- Sync with bounded concurrency (2-4 at once) and honor `Retry-After` on 429.
- Write the sent-task file atomically (temp file + rename) and back up a corrupt file before overwriting.
- A "last sync" timestamp is already stored per entry (`syncedAt`, `types.ts:38-39`). It can drive a "stale" indicator in the UI.

## Open questions

1. Does `@tauri-apps/plugin-http` reject with `Error` instances or strings? Decides whether SDK retries and error messages work as the code assumes (Problem 17). Check the plugin source in `node_modules/@tauri-apps/plugin-http`.
2. Does the Tauri HTTP plugin honor the `timeout` and `signal` options the SDK forwards (`tauri-fetch-adapter.ts:16`)? If not, the 30 s SDK timeout is inactive and a stalled request can hang the sync.
3. Todoist REST v1 rate-limit numbers and whether 429 includes `Retry-After`. Not checked; needs the official docs (developer.todoist.com).
4. Todoist v1 default and maximum `limit` for projects and sections. Not checked.
5. Does Todoist accept `X-Request-Id` for v1 POST idempotency? The SDK sets it only for non-v1 bases (`http-client.js:86-87`); the intent is unclear, and the server-side behavior is not verified.
6. Where the settings file is stored, and whether the token is encrypted or plain text on disk. Not traced (`settings.store.svelte.ts`, Tauri store plugin).
7. Does the default-label copy ("Todoist creates the label automatically") match the API? Not verified against Todoist docs.
8. Test coverage detail: the existing service tests mock the SDK (the mocking approach was not inspected). Whether they cover `sendTaskToTodoist`, `syncTodoistTasks` and `initTodoist` was not confirmed by reading the test bodies.
9. Whether `TasksView.svelte` sync button is always visible or only with a token (only the `hasTodoistToken` gate at `:70` and the handler at `:85-91` were read).

Not checked in this pass: `TaskMetadata` shape (`task-metadata.types.ts`), `todoist.store.test.ts` contents, `todoist-client.test.ts`, the Rust side (`src-tauri/src` was not searched for Todoist; the one grep attempt failed on a shell glob), and any network behavior at runtime.
