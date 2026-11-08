# Analysis 11: embedding-integration

Recovered from the workflow journal: the analyst's Write was refused, so only its structured return survives.

## Headline

In-note task queries are limited to QueryJS, whose task object has only text/completed/line/path, and `completed` is true for in-progress, question, forwarded, important and cancelled tasks (parsing.rs:1633, queryjs.logic.ts:127), so "open tasks" lists drop `[/]` and `[!]` work and no script can query by due date, priority or status; recommended fix is additive (richer KBTask fields + kb.tasks() + one shared open/closed definition), not a new block type or a task row kind in .view.

## Candidate issues

- I1. One shared open/closed task-status definition used by Tasks view hide-completed and stats (tasks.logic.ts:34-57,119 treat any non-space checkbox as completed), the calendar chip (EventTaskChip.svelte:13-18 uses done+cancelled) and QueryJS; default open = todo/in-progress/question/forwarded/important. Test-first on filterCompletedTasks keeping [/]. Needs owner decision Q1.
- I2. QueryJS: add status, dueDate, scheduledDate, startDate, priority, tags to KBTaskV1 and a kb.tasks(source?) DataArray helper (additive); keep `completed` unchanged. Files: contract/kb-api.v1.ts:40-49, queryjs.logic.ts:125-130, kb-api.ts, help/documentation/13-queryjs.md, _shared-open-tasks.js; update kbapi-firewall.test.ts:280-295 and queryjs.logic.test.ts:284-320 first. No owner decision for the additive part.
- I3. taskList and table rows with path+line link open the note at the line (KBLinkV1 has no line, kb-api.ts:348-367); read-only checkboxes stay. Depends on I2.
- I4. Docs/example: daily-note 'Due today and overdue' queryjs block and template snippet (help/documentation/08, help/examples/queryjs-features); no engine change. Depends on I2, I3.
- I5. Conditional: calendar follows the Tasks-view source scope (event-calendar.service.ts:106-121 ignores the section tag today) via one pure scoping function plus an opt-out setting. Depends on the Tasks-view PRD scope model. Needs owner decision Q2.
- I6. Conditional: toggle tasks from embedded lists and the calendar by reusing the toggleTask flow (tasks.service.ts:100-155), not calling Rust directly; widens the QueryJS contract and needs an ADR-0010 amendment; note toggle resets any non-todo status to todo (parsing.rs:1895-1900). Needs owner decision Q3.
- I7. Conditional, recommend decline: kanban cards ({YYYY-MM-DD} dates, 2-state checkbox, .kanban not indexed per utils/fs.rs:139-141) and .view bodies (entry.rs:241-249 skips extract_tasks) as task sources; cheaper alternative is making the kanban date writer emit the due signifier Rust already parses. Needs owner decision Q4.
- I8. Measure first: record QJS-PROFILE ensureCache and calendar get_all_tasks_v2 reload timings (EventCalendarView.svelte:200-215; kb-api.ts:431-441) on the owner's vault with Tasks tab, calendar and a task block open; no code unless numbers justify a task-only cache.

## Owner questions

- Q1. What counts as open vs closed for in-progress, question, forwarded, important and cancelled tasks across Tasks view, calendar and scripts? Recommended default: open = todo/in-progress/question/forwarded/important, closed = done/cancelled (the calendar's existing rule); keep QueryJS `completed` unchanged and add `status`, because changing `completed` is a major contract change that silently alters existing scripts.
- Q2. Should the calendar follow the Tasks view's source scope? Recommended default: yes once the Tasks-view PRD defines scope rules, with a calendar setting to opt out; leave as is until then.
- Q3. Do you want to tick tasks from a note's query block and from the calendar? Recommended default: no for now; rows link to the line first, toggle later only through the shared toggleTask flow.
- Q4. Should kanban cards with dates and .view body checkboxes appear in task surfaces? Recommended default: no; if dated kanban cards on the calendar are wanted, change the card date writer to emit the due signifier instead of adding a second date reader.
- Q5. Declarative `tasks` fence or is kb.tasks() in a queryjs block enough for the daily note? Recommended default: kb.tasks() first; revisit a `tasks` fence only if the Tasks-view PRD ships a serializable saved-query model.
- Q6. Is a tasks-due-today dock badge or daily-note rollover wanted (dock badge counts the inbox, dock-badge.logic.ts:14; periodic-notes has no task logic)? Recommended default: no; the I4 due-today block covers the daily-note case.
- Q7. Is a meta-bind button action that opens the Tasks view wanted (actions today: updateMetadata, open, createNote, openView, meta-bind-button.logic.ts:20-60)? Recommended default: no. Unverified: whether a queryjs block re-renders promptly after a meta-bind frontmatter autosave when it reads kb.current().<key>.
- Corrections to scouts: scout 11's 'major version change' for new task fields is wrong (policy at kb-api.v1.ts:23-26 and help/documentation/13-queryjs.md:1151-1158 makes only page-root keys, DataArray members and changed meaning major); scout 12's unverified hide-completed question is answered (it hides every non-todo status); scout-24 (ext-dataview-bases) file does not exist; docs/agents/live-preview-rules.md was not read.

## Agent note on file

.scratch/tasks-view/research/analysis-11-embedding-integration.md (NOT WRITTEN: the Write tool refused with "Subagents should return findings as text, not write report files"; the content below is the full finding set, the orchestrator must persist it)
