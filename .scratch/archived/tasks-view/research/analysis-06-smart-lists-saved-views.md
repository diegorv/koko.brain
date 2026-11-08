# Analysis 06: smart-lists-saved-views

Recovered from the workflow journal: the analyst's Write was refused, so only its structured return survives.

## Headline

Recommend built-in lists defined in code plus user saved views stored in per-vault .kokobrain/settings.json, navigated by a list column inside the Tasks tab, because tasks are not notes and the .view/rail machinery is note-keyed (NOTE: the harness refused the file write, so this file does NOT exist; the full analysis is in my text reply).

## Candidate issues

- S1: Pure task-list predicates (shared isOpenStatus, local today, Today/Overdue/Upcoming/No date/Someday/Done/All open) and built-in definitions; align calendar chip's closed rule
- S2: Saved task view model, boundary validation and tasks.views in per-vault settings.json, store/service CRUD, ADR for storage and identity
- S3: List column in the Tasks tab with counts, active list, draft state with Save / Save as new / Reset
- S4: Move section tag out of global store into a list's source and remove the #to-list default that empties a fresh vault
- S5 (optional): Palette commands per list and a due/overdue section in the rail Today lens via registerTodaySection
- S6: Stamp a done date on completion in Rust toggle_task_in_content so Done can be ordered by completion
- S7: Help doc, ADR and CONTEXT glossary entries for task list, saved view and source

## Owner questions

- Keep the #to-list workflow? Default: yes, as a saved view named To-list; global default becomes no section filter.
- OK with saved task views in .kokobrain/settings.json instead of .view files (no _rail pinning, not hand-editable as notes)? Default: yes.
- What marks Someday? Default: a #someday tag on the task.
- Is a forwarded [>] task open or closed? Default: closed; in progress, question and important stay open.
- Should a task Inbox exist? Default: no (rail Inbox already means unorganized notes); use No date for undated open tasks.
- Should Today include overdue tasks? Default: no, keep Overdue its own list and show both counts.
- May completing a task write a done date into the note line? Default: yes, after the Todoist identity key stops depending on exact task text; until then Done orders by file mtime.
- Do you want due/overdue tasks in the rail Today lens? Default: Tasks tab only for now.
- Should the active list persist across restarts? Default: session only; restart opens Today.

## Agent note on file

.scratch/tasks-view/research/analysis-06-smart-lists-saved-views.md
