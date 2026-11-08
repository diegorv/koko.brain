# 073: Todoist send: full project lists, refresh, the default label and recurring due dates

**Origin:** `tasks-view` Issue 24, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/tasks-view/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** The send popover lists only the first page of projects and sections (`src/lib/features/tasks/todoist.service.ts:22`, `:42`, which read `results` and ignore the cursor), and the project list is fetched once and never refreshed (`:137-144`), so a project created in Todoist after the first fetch never appears.

- `fetchProjects` and `fetchSections` (`todoist.service.ts:19`, `:39`) pass `cursor` to the SDK's `getProjects` and `getSections` and follow the response's `nextCursor` until it is `null` (installed SDK: `todoist-api.d.ts:285`, `:454`; `cursor` and `limit` in `types/types/projects/requests.d.ts:16-23` and `types/types/sections/requests.d.ts:8-12`; `nextCursor` in `projects/requests.d.ts:32-35`, `sections/requests.d.ts:23-26`). Pass `limit: 200`: the v1 default page is 50 and the maximum 200, a larger value is a 400 (https://developer.todoist.com/api/v1/#tag/Pagination). The docs also say to keep the other parameters identical across pages and not to store cursors.
- The popover has a "Refresh projects" action that drops the cached list and fetches again.
- **A section can always be left out.** After one send with a section, every later popover in the session preselects it (`TodoistPopover.svelte:61`), the section list holds only real sections (`:187-191`), and a send without a section does not clear the remembered one (`todoist.service.ts:228` sets it only when present). So once a section was used, a task cannot go to the project without one except by switching project and back (`handleProjectChange` clears it, `:80-83`). Add a first "No section" item to the section list (with a sentinel value such as `'none'` mapped to `''` in `onValueChange`; whether bits-ui `Select` accepts an empty-string item value is from memory, so do not rely on it), and make `sendTaskToTodoist` call `todoistStore.setLastSectionId(sectionId ?? '')` whenever a project was chosen, so the next popover starts from the last real choice.
- The configured default label is shown in the popover (today it is added to every send without being shown, `:207-211`), with a checkbox to leave it off for this send.
- **Recurring tasks keep their due date.** `buildTodoistArgs` sends only `dueString = recurrence.text` when a task has a recurrence and drops `dueDate` (`src/lib/features/tasks/todoist-bridge.logic.ts:51-56`), so `every week 📅 2026-11-10` starts from today in Todoist. With both, send `dueString = "<recurrence text> starting <D MMM YYYY>"` with the English month abbreviation (`every week starting 10 Nov 2026`), the documented word-month form. Todoist's help documents the `starting` form ("every 2 weeks starting 3 January", "everyday starting on aug 3", "every 14 days 7am starting 1 Nov"), says to put the start date at the end, and says a recurring task without one starts today (https://www.todoist.com/help/articles/introduction-to-recurring-due-dates-YUYVJJAV, read 2026-11-06). Every documented example names the month in words, so the ISO form is not used. The test pins the string the bridge builds; the owner confirms in Todoist after delivery that the first date is right (PRD B3 runbook). Sending `dueDate` together with `dueString` is not a fix: the SDK types allow both, but which one the server keeps is undocumented.
- Out of scope, noted for later: v1 tasks also have a `deadline` (`{ date: "YYYY-MM-DD" }`, non-recurring, no time; https://developer.todoist.com/api/v1/#tag/Deadlines), which the SDK sends as `deadlineDate` (`types/types/tasks/requests.d.ts:20`). The bridge maps `📅` to the due date and no task signifier to `deadline`.

**Blocked by:** 072

**Status:** ready-for-agent

**Answered:** PRD B3: the owner wants to use Todoist. The live API check is the owner's, after delivery (PRD B3 runbook), so this Issue sends the documented word-month form (owner, 2026-11-06).

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in the `todoist-sync.http.test.ts` file from Issue 20 (not `todoist.service.test.ts`, which mocks `todoist-client.js` at `:14`), with the real `todoistStore`, mocking only `@tauri-apps/plugin-http` `fetch`: two pages of projects load into the store as one list. Fails today (first page only).
- [ ] Refresh after a project is added on the server shows it.
- [ ] Unchecking the default label sends no label.
- [ ] After a send with section `s1`, a send from a popover where "No section" is picked posts no `section_id`, and the next popover opens with "No section" selected. Fails today (the item does not exist, and `lastSectionId` stays `s1`).
- [ ] `todoist-bridge.logic.test.ts` (real logic): a task with recurrence `every week` and due `2026-11-10` produces `dueString` `every week starting 10 Nov 2026`. Fails today.

## Notes

- **Size:** S.
