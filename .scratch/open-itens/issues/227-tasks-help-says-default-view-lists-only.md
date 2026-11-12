# 227: The Tasks help says the default view lists only tasks under a #to-list heading, and that the date filter uses the note's modification date

**Origin:** `audit-2026-11-05` Issue 78, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** Doc 10:13 and :29 say every checkbox line in every note is listed. The store default sectionTag is '#to-list' (src/lib/features/tasks/tasks.store.svelte.ts:8, reset at :30), buildTaskIndex then calls get_tasks_in_section_v2 (tasks.service.ts:68-71), which keeps only tasks under a heading containing that tag. The default appears only as a table cell (10:101). The field is not saved, so it returns to #to-list on every app start. The Date filter compares the file's modifiedAt (src/lib/features/tasks/tasks.logic.ts:76-90), while 10:99 says 'Filter tasks by date'. Fix: say in doc 10 that the default view lists only tasks under a heading tagged #to-list, that an empty field lists all tasks, that the field resets on restart, and that the date filter is by note modification date.

**Blocked by:** none

**Status:** wontfix

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/features/tasks/tasks.store.test.ts: read help/documentation/10-tasks-and-todoist.md (as event-calendar-keys.logic.test.ts:159 does) and assert it names the reset store's sectionTag as the default together with the statement that tasks outside such a heading are not listed. It fails today.
- [ ] Doc 10 says an empty section field lists all tasks and the field resets on restart.
- [ ] Doc 10 says the Date filter uses the note's modification date.
- [ ] Targeted test run of the touched test file plus `pnpm check`.

## Notes

- **Priority:** polish (bucket 3-polish). Re-rated polish: a documentation fix only.
- **Trigger:** Write tasks as doc 10:21-29 shows, outside any #to-list heading, and open the Tasks view with defaults: 'No tasks found'. Or edit one line of an old note and see all of its tasks under 'Last 7 days'.
- **Evidence (verified by reading code at `5f8003d67`):** help/documentation/10-tasks-and-todoist.md:13 'scanning every .md file', :29 'will be picked up automatically', :99 Date filter, :101 default `#to-list`. src/lib/features/tasks/tasks.store.svelte.ts:8 sectionTag '#to-list', :28-30 reset. src/lib/features/tasks/tasks.service.ts:68-71 section call. src/lib/features/tasks/tasks.logic.ts:76-90 filterByDate on g.modifiedAt.
- **Second opinion:** upheld (polish, low). Confirmed. tasks.store.svelte.ts:8 defaults sectionTag to '#to-list' and reset restores it (:30). buildTaskIndex then calls get_tasks_in_section_v2 (tasks.service.ts:68-71), while doc 10:13 and :29 say every checkbox in every note is picked up. filterByDate uses modifiedAt (tasks.logic.ts:76-90). The fix is documentation only. Corrections to apply while implementing: Category polish (documentation fix).
- **Source:** audit 2026-11-05, domain `calendar`, finding `N-calendar-06` (from calendar-spec-3). Size S.

## Comments

- 2026-11-12: closed as wontfix, covered by Issue 108. The owner chose to make the section tag empty by default, so the help must say the view lists every task, not that it lists only `#to-list` tasks; Issue 108 updates doc 10 with the default, the field reset and the date filter meaning.
