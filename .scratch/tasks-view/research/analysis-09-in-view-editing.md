# Analysis 09: in-view-editing

Recovered from the workflow journal: the analyst's Write was refused, so only its structured return survives.

## Headline

The Tasks view can write exactly one thing (the checkbox), and even that write is unguarded: toggle_task_status flips whatever line number it is given (src-tauri/src/commands/vault.rs:760-829, parsing.rs:1873-1906) with no check against the displayed text, while the TS store lags the disk by the throttled 2-10 s version bump (src/lib/app/tauri-listeners.service.ts:106-109); recommended design is Rust-owned guarded edit commands (update_task_lines with expectedText, insert_task_line) plus one TS orchestration service reusing the dirty-buffer protocol (tasks.service.ts:121-155), with no new writeTextFile site.

## Candidate issues

- 1. fix: guard toggle_task_status with expectedText (stale outcome) and reject paths not in the index or not markdown before writing (vault.rs:760-829; ADR-0020 gap). Test-first Rust inner tests + extend task-toggle-dirty-buffer.test.ts with a clean-tab drift case. Depends on: none. Owner decision: no
- 2. feat(rust): pure task line rewrite module task_edit.rs: set_status, set_date, set_priority, insert_task; reuse parser regexes so parse and edit agree; keep trailing block id (^id from copy-block-link.service.ts:52) last, preserve CRLF, collapse multiple priority emojis. Round-trip tests against parse_task_metadata. Depends on: none. Owner decision: no
- 3. feat(rust): update_task_lines {path, edits[{lineNumber, expectedText, op}]} and insert_task_line commands; one read/write/emit per file under the index lock; ts-rs DTOs (TaskEdit, TaskEditOutcome, TaskEditResult); register in lib.rs near L346 and commands.ts. Gate = Both (cargo regenerates src/lib/contracts/generated). Depends on: 1, 2. Owner decision: no
- 4. feat(tasks): tasks-edit.service.ts (dirty-tab save-first, call, syncExternalContentToEditor, optimistic tasksStore.patchTask, toast on stale/failure) with Todoist sent-entry re-key shipped in the same issue (sent key is filePath:text, todoist.store.svelte.ts:24-31); toggleTask delegates to it. Depends on: 3. Owner decision: no
- 5. fix(tasks): refresh without blanking the list (isLoading set on every buildTaskIndex, tasks.service.ts:65; list swapped for 'Indexing tasks...' at TasksView.svelte:169-170) and drop the double refetch per edit (tasks.service.ts:150 + version effect). Keep the sequence guard. Depends on: none (needed before 6). Owner decision: no
- 6. feat(tasks): row actions menu: status (todo/in progress/done/cancelled), due and scheduled pickers with quick choices, priority, open at task via openNoteAt (core/editor/open-note-at.service.ts:35); keyboard-visible. Sub-issue 6a: lift KanbanDatePicker out of plugins/kanban so a feature can use it (layer rules). Depends on: 4, 5. Owner decision: yes for removing text-click-toggles (TasksView.svelte:215-220)
- 7. feat(tasks): add task / quick add to a target note: insert_task_line, target via a port registered by the periodic-notes plugin (precedent: eventCalendarDailyNoteStore + registerCalendarDailyNoteOpener, periodic-notes.service.ts:72-74), ensureNote extracted from openOrCreateNote so focus stays on Tasks (note-creator.service.ts:126 always opens), placement under the heading matching the active section tag so the new row is not hidden by the #to-list default. Depends on: 3, 4. Owner decision: yes
- 8. feat(tasks): bulk select and actions (complete, cancel, set due quick choices, priority), grouped by file, one IPC and one lock per file, one refetch, summary toast with skipped-stale count. Depends on: 4, 5, 6; 'reschedule overdue' also needs due-date grouping/filter from other analysts. Owner decision: yes (which actions)
- 9. feat(tasks): undo toast via a guarded replaceLine op (expectedText = new text, so undo also refuses on drift). Optional. Depends on: 3, 4. Owner decision: no
- 10. Blocked, not an issue yet: completion semantics (done-date stamp, next occurrence for recurrence); stamping changes line text and so the Todoist key. Needs owner answer

## Owner questions

- Statuses from the view: offer todo, in progress, done, cancelled ([ ] [/] [x] [-])? Recommended: yes, all four; toggling a cancelled/in-progress task goes to done, not silently back to todo (today any non-space becomes space, parsing.rs:1896-1900, and no UI can write [-] or [/])
- Text click currently toggles the task (TasksView.svelte:215-220). Recommended: remove it; text click opens the note at the task line, the circle stays the toggle
- Completion side effects: stamp done/cancelled date and create the next occurrence for recurring tasks? Recommended: no in v1 (recurrence is raw text only, the stamp changes the Todoist key, nothing reads the done date)
- Quick add parsing: natural-language dates? Recommended: no; explicit due/priority chips, text stored verbatim (a second date grammar next to Rust's is a long-term cost; Todoist smart-date misfires per scout 22)
- Where in the target note does a new task go? Recommended: end of the first section whose heading contains the active section tag when set and present (so it stays visible under #to-list), else end of file; do not auto-create a tagged heading, warn instead
- Target note: daily note (needs periodic-notes plugin) or a fixed inbox note path? Recommended: a setting with both; default to daily note when periodic notes is on, else require the note path before the add box appears
- Bulk actions for the first cut? Recommended: complete, cancel, set due (today/tomorrow/next week/clear), set priority; defer move-between-notes and bulk Todoist send
- Undo: toast-only, or also File History snapshots? Recommended: undo toast only (not verified whether File History snapshots writes that bypass the editor)
- Accept that a view edit reaches FTS5/semantic/queryjs via the watcher round trip (about 500 ms) as toggle does today, instead of calling notifyAfterSave from the view? Recommended: accept; verify in issue 4, revisit only if stale search results are observed. Never add markRecentSave without applyNoteChange (would suppress the watcher repair)

## Agent note on file

/Users/diegorv/Dev/pet-projects/koko/brain/.scratch/tasks-view/research/analysis-09-in-view-editing.md (NOT WRITTEN: the Write tool refused with "Subagents should return findings as text, not write report files"; I did not work around it. The full analysis is condensed into this output.)
