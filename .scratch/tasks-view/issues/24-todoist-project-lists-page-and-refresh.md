# 24: Todoist send: full project lists, refresh, the default label and recurring due dates

**What to build:** The send popover lists only the first page of projects and sections (`src/lib/features/tasks/todoist.service.ts:22`, `:42`, which read `results` and ignore the cursor), and the project list is fetched once and never refreshed (`:137-144`), so a project created in Todoist after the first fetch never appears.

- `fetchProjects` and `fetchSections` (`todoist.service.ts:19`, `:39`) pass `cursor` to the SDK's `getProjects` and `getSections` and follow the response's `nextCursor` until it is `null` (installed SDK: `todoist-api.d.ts:285`, `:454`; `cursor` and `limit` in `types/types/projects/requests.d.ts:16-23` and `types/types/sections/requests.d.ts:8-12`; `nextCursor` in `projects/requests.d.ts:32-35`, `sections/requests.d.ts:23-26`). Pass `limit: 200`: the v1 default page is 50 and the maximum 200, a larger value is a 400 (https://developer.todoist.com/api/v1/#tag/Pagination). The docs also say to keep the other parameters identical across pages and not to store cursors.
- The popover has a "Refresh projects" action that drops the cached list and fetches again.
- The configured default label is shown in the popover (today it is added to every send without being shown, `:207-211`), with a checkbox to leave it off for this send.
- **Recurring tasks keep their due date.** `buildTodoistArgs` sends only `dueString = recurrence.text` when a task has a recurrence and drops `dueDate` (`src/lib/features/tasks/todoist-bridge.logic.ts:51-56`), so `every week 📅 2026-11-10` starts from today in Todoist. With both, send `dueString = "<recurrence text> starting <YYYY-MM-DD>"`. Todoist's help documents the `starting` form ("every 2 weeks starting 3 January", "everyday starting on aug 3", "every 14 days 7am starting 1 Nov"), says to put the start date at the end, and says a recurring task without one starts today (https://www.todoist.com/help/articles/introduction-to-recurring-due-dates-YUYVJJAV, read 2026-11-06). Every documented example names the month in words; whether the parser accepts an ISO `2026-11-10` after `starting` is unverified, so the test pins the string the bridge builds, and B3's live check confirms that Todoist reads it with the right first date. If it does not, format the date as `10 Nov 2026`, and if no form works, show the dropped date in the popover instead. Sending `dueDate` together with `dueString` is not a fix: the SDK types allow both, but which one the server keeps is undocumented.
- Out of scope, noted for later: v1 tasks also have a `deadline` (`{ date: "YYYY-MM-DD" }`, non-recurring, no time; https://developer.todoist.com/api/v1/#tag/Deadlines), which the SDK sends as `deadlineDate` (`types/types/tasks/requests.d.ts:20`). The bridge maps `📅` to the due date and no task signifier to `deadline`.

**Blocked by:** 20

**Status:** needs-info

**Waits on:** PRD decision B3. Its live check also confirms the recurring `starting` string below.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in the `todoist-sync.http.test.ts` file from Issue 20 (not `todoist.service.test.ts`, which mocks `todoist-client.js` at `:14`), with the real `todoistStore`, mocking only `@tauri-apps/plugin-http` `fetch`: two pages of projects load into the store as one list. Fails today (first page only).
- [ ] Refresh after a project is added on the server shows it.
- [ ] Unchecking the default label sends no label.
- [ ] `todoist-bridge.logic.test.ts` (real logic): a task with recurrence `every week` and due `2026-11-10` produces `dueString` `every week starting 2026-11-10` (or the fallback form B3's live check settles on). Fails today.

## Notes

- **Size:** S.
