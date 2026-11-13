# file card src/lib/features/tasks/tasks.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/tasks/tasks.logic.ts ' codemap/files
file src/lib/features/tasks/tasks.logic.ts logic L207 module src/lib/features/tasks in4 t2
## imports
imp src/lib/features/tasks/tasks.logic.ts:1 -> src/lib/utils/date.ts formatDate
imp src/lib/features/tasks/tasks.logic.ts:2 -> src/lib/utils/path.ts vaultRelativeKey
imp src/lib/features/tasks/tasks.logic.ts:3 -> src/lib/utils/sanitize-url.ts isSafeUrl
imp src/lib/features/tasks/tasks.logic.ts:4 -> src/lib/features/tasks/task-status.logic.ts isTaskOpen
imp src/lib/features/tasks/tasks.logic.ts:5 -> src/lib/features/tasks/task-metadata.types.ts type:TaskMetadata
imp src/lib/features/tasks/tasks.logic.ts:6 -> src/lib/features/tasks/tasks.types.ts type:TaskItem
## imported-by
imp src/lib/features/tasks/TasksView.svelte:36 -> src/lib/features/tasks/tasks.logic.ts parseTaskTextSegments,stripTaskTrailers,taskChips,taskDisplayText,usesRawTaskText
imp src/lib/features/tasks/task-query.logic.ts:10 -> src/lib/features/tasks/tasks.logic.ts compareTaskPaths,noteFolder,noteTaskCounts,taskDisplayText
imp src/lib/features/tasks/task-views.logic.ts:24 -> src/lib/features/tasks/tasks.logic.ts parseSectionTags
imp src/lib/features/tasks/tasks.service.ts:15 -> src/lib/features/tasks/tasks.logic.ts taskDisplayText
## reach
in2 src/lib/features/tasks/tasks.logic.ts 7 files in 2 modules: src/lib/app(4) src/lib/features/tasks(3)
out2 src/lib/features/tasks/tasks.logic.ts 1 files in 1 modules: src/lib/contracts(1)
## tests
test src/tests/lib/features/tasks/tasks.logic.test.ts imports src/lib/features/tasks/tasks.logic.ts mirror
test src/tests/lib/features/tasks/task-query.logic.test.ts imports src/lib/features/tasks/tasks.logic.ts
## symbols
sym src/lib/features/tasks/tasks.logic.ts:22 fn parseSectionTags(text: string): string[] L9 | Splits a legacy saved section tag text (`tasksView.sectionTag`) into the tags whose heading cards (`headingSources`) select the rows: split on whitespace and c…
by src/lib/features/tasks/tasks.logic.ts:parseSectionTags <- src/lib/features/tasks/task-views.logic.ts:145 in toListView call
sym src/lib/features/tasks/tasks.logic.ts:33 type TaskTextSegment L4 | A segment of task text for rich rendering in the Tasks view
sym src/lib/features/tasks/tasks.logic.ts:46 fn parseTaskTextSegments(text: string): TaskTextSegment[] L32 | Parses task text into text, wikilink and markdown-link segments.
by src/lib/features/tasks/tasks.logic.ts:parseTaskTextSegments <- src/lib/features/tasks/TasksView.svelte:840 in (markup) markup
sym src/lib/features/tasks/tasks.logic.ts:90 fn stripTaskTrailers(text: string): string L3 | Removes a trailing block id, then a trailing Todoist anchor, from task text.
by src/lib/features/tasks/tasks.logic.ts:stripTaskTrailers <- src/lib/features/tasks/TasksView.svelte:587 in copyTaskText call
sym src/lib/features/tasks/tasks.logic.ts:104 fn usesRawTaskText(task: Pick<TaskItem, 'text' | 'metadata'>): boolean L3 | Whether the row shows its raw text instead of Rust's description.
by src/lib/features/tasks/tasks.logic.ts:usesRawTaskText <- src/lib/features/tasks/TasksView.svelte:799 in (markup) markup
sym src/lib/features/tasks/tasks.logic.ts:113 fn taskDisplayText(task: Pick<TaskItem, 'text' | 'metadata'>): string L3 | The text a task row shows: Rust's description (dates, priority, recurrence, ids and tags removed) without its trailing block id, or the raw text without its tr…
by src/lib/features/tasks/tasks.logic.ts:taskDisplayText <- src/lib/features/tasks/TasksView.svelte:798 in (markup) markup +1
by src/lib/features/tasks/tasks.logic.ts:taskDisplayText <- src/lib/features/tasks/task-query.logic.ts:803 in metaPredicate call +2
by src/lib/features/tasks/tasks.logic.ts:taskDisplayText <- src/lib/features/tasks/tasks.service.ts:483 in holdUndoToast call
sym src/lib/features/tasks/tasks.logic.ts:118 interface TaskChip L10 | One metadata chip after a task row's text
sym src/lib/features/tasks/tasks.logic.ts:146 fn taskChips(metadata: TaskMetadata, today: string, options: { tags: boolean; open: boolean }): TaskChip[] L24 | The chips a task row shows after its text, in this order: due, scheduled, start, priority, recurrence, then one per tag.
by src/lib/features/tasks/tasks.logic.ts:taskChips <- src/lib/features/tasks/TasksView.svelte:799 in (markup) markup
sym src/lib/features/tasks/tasks.logic.ts:183 fn compareTaskPaths(a: string, b: string): number L3 | Orders two note paths for the Tasks list: numbers compare as numbers (`note 9` before `note 10`) and case and accents are ignored, with raw code-unit order bre…
by src/lib/features/tasks/tasks.logic.ts:compareTaskPaths <- src/lib/features/tasks/task-query.logic.ts:245 in buildTaskRows call +4
sym src/lib/features/tasks/tasks.logic.ts:192 fn noteFolder(vaultPath: string | null, filePath: string): string L7 | The vault-relative folder of a note, e.g. `Projects/Clients` for `Projects/Clients/ACME.md`.
by src/lib/features/tasks/tasks.logic.ts:noteFolder <- src/lib/features/tasks/task-query.logic.ts:268 in buildTaskRows call
sym src/lib/features/tasks/tasks.logic.ts:201 fn noteTaskCounts(tasks: TaskItem[]): { open: number; total: number } L7 | A note's open tasks (`isTaskOpen`) and all its tasks.
by src/lib/features/tasks/tasks.logic.ts:noteTaskCounts <- src/lib/features/tasks/task-query.logic.ts:269 in buildTaskRows call
## locals
local src/lib/features/tasks/tasks.logic.ts:130 fn chipDate(date: string, today: string): string L3
## calls
call src/lib/features/tasks/tasks.logic.ts:60 in parseTaskTextSegments -> src/lib/utils/sanitize-url.ts:isSafeUrl call
call src/lib/features/tasks/tasks.logic.ts:105 in usesRawTaskText -> src/lib/features/tasks/tasks.logic.ts:stripTaskTrailers call
call src/lib/features/tasks/tasks.logic.ts:114 in taskDisplayText -> src/lib/features/tasks/tasks.logic.ts:stripTaskTrailers call
call src/lib/features/tasks/tasks.logic.ts:114 in taskDisplayText -> src/lib/features/tasks/tasks.logic.ts:usesRawTaskText call
call src/lib/features/tasks/tasks.logic.ts:131 in chipDate -> src/lib/utils/date.ts:formatDate call
call src/lib/features/tasks/tasks.logic.ts:154 in taskChips -> src/lib/features/tasks/tasks.logic.ts:chipDate call +2
call src/lib/features/tasks/tasks.logic.ts:194 in noteFolder -> src/lib/utils/path.ts:vaultRelativeKey call
call src/lib/features/tasks/tasks.logic.ts:204 in noteTaskCounts -> src/lib/features/tasks/task-status.logic.ts:isTaskOpen call
