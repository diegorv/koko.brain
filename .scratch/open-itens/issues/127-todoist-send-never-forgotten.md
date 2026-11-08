# 127: A Todoist send is never silently forgotten

**Origin:** `tasks-view` Issue 21, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/tasks-view/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** `sendTaskToTodoist` creates the Todoist task, adds the entry in memory, then saves the sidecar (`src/lib/features/tasks/todoist.service.ts:213-224`). When that save fails after the POST succeeded, the error propagates, the session shows the task as sent, and a restart forgets it; sending again creates a duplicate.

- After a successful POST, the sidecar save is retried once.
- If it still fails, a persistent error toast (no auto-dismiss) says the task was created in Todoist but could not be recorded, with the Todoist URL and an "Open in Todoist" action. The in-memory entry stays, so the row shows "sent" for this session.
- No pending or unconfirmed state is written before the POST: such an entry has no Todoist id and nothing could check it later (PRD "Todoist > Target design").
- Passing a `requestId` to `addTask` (`todoist-api.d.ts:212` in the installed SDK) is not part of this Issue: whether Todoist deduplicates REST POSTs on `X-Request-Id` is unverified. The v1 docs show the header only in one `curl` example for `POST /api/v1/comments` and give it no semantics; the only documented idempotency is the Sync command `uuid` (https://developer.todoist.com/api/v1/, read 2026-11-06). Without a `requestId`, the SDK sends no `X-Request-Id` on v1 at all (`dist/esm/transport/http-client.js:85-88` skips the generated id for `/api/v1/` URLs).
- With `audit-2026-11-05/116` (migrated from `audit-2026-11-04/14`) in place, a sidecar that failed to load refuses the save; the same persistent toast covers that case, naming the load failure.

**Blocked by:** 072, 031

**Blocked by (origin):** added from the Issue text: audit-2026-11-05 116.

**Status:** needs-triage

**Waits on:** `audit-2026-11-05/116` resolved (a corrupt `todoist-sent.json` still loads as `[]` today, `todoist.service.ts:114-117`, and this Issue writes it more often). PRD B3 is answered: Todoist is to be used.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in the `todoist-sync.http.test.ts` file from Issue 20 (not `todoist.service.test.ts`, which mocks `todoist-client.js` at `:14`), with the real `todoistStore`, mocking only `@tauri-apps/plugin-http` `fetch` and `@tauri-apps/plugin-fs`: the POST succeeds, the first `writeTextFile` rejects, the second resolves; the file holds the entry. Fails today (no retry).
- [ ] Both writes reject: a persistent toast carries the Todoist URL, and the store still lists the entry.
- [ ] A failed POST writes nothing and adds nothing.

## Notes

- **Size:** S.
- The SDK retries a network error up to 3 times on every method, POST included (`dist/esm/transport/http-client.js:70-74`), so a POST whose response was lost could create the task twice. Through the Tauri adapter this probably never fires: the SDK only retries a `TypeError` with "fetch" or "network" in its message, or a `TimeoutError` (`dist/esm/types/http.js:4-14`), and `@tauri-apps/plugin-http` passes `invoke` rejections through as they come (from memory, as strings). Not in scope here; worth knowing when reading a duplicate.
- The Todoist URL in the toast comes from the SDK, not the API: v1 task objects have no `url` ("This has been removed", https://developer.todoist.com/api/v1/#tag/Migrating-from-v9, "Task URLs"), and the SDK builds it with `getTaskUrl(id, content)` (`dist/esm/types/tasks/types.js:55`, `dist/esm/utils/url-helpers.js:41-43`), falling back to `https://app.todoist.com/app/task/<id>`, the format the docs give.
