# file card src/lib/utils/date.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/utils/date.ts ' codemap/files
file src/lib/utils/date.ts other L170 module src/lib/utils in16 t3
## imported-by
imp src/lib/core/markdown-editor/extensions/date-shortcut/completion.logic.ts:1 -> src/lib/utils/date.ts formatNow
imp src/lib/features/collection/calendar.logic.ts:1 -> src/lib/utils/date.ts formatDate
imp src/lib/features/file-history/file-history.logic.ts:1 -> src/lib/utils/date.ts formatDate
imp src/lib/features/tasks/TaskLists.svelte:9 -> src/lib/utils/date.ts formatNow
imp src/lib/features/tasks/TasksView.svelte:32 -> src/lib/utils/date.ts formatDate,formatNow
imp src/lib/features/tasks/task-query.logic.ts:2 -> src/lib/utils/date.ts formatDateWithOffset
imp src/lib/features/tasks/task-row-edit.logic.ts:1 -> src/lib/utils/date.ts formatDateWithOffset
imp src/lib/features/tasks/tasks.logic.ts:1 -> src/lib/utils/date.ts formatDate
imp src/lib/features/tasks/tasks.store.svelte.ts:2 -> src/lib/utils/date.ts formatNow
imp src/lib/plugins/calendar/calendar.logic.ts:2 -> src/lib/utils/date.ts side-effect
imp src/lib/plugins/kanban/KanbanCard.svelte:12 -> src/lib/utils/date.ts formatNow
imp src/lib/plugins/kanban/KanbanListView.svelte:5 -> src/lib/utils/date.ts formatNow
imp src/lib/plugins/kanban/KanbanTableView.svelte:5 -> src/lib/utils/date.ts formatNow
imp src/lib/plugins/periodic-notes/periodic-notes.logic.ts:2 -> src/lib/utils/date.ts formatToCapturingRegex
imp src/lib/plugins/queryjs/kb-datetime.ts:5 -> src/lib/utils/date.ts side-effect
imp src/lib/utils/template.ts:2 -> src/lib/utils/date.ts formatDateWithOffset,formatNow,formatNowOnDate
## reach
in2 src/lib/utils/date.ts 27 files in 13 modules: src/lib/app(4) src/lib/features/collection(3) src/lib/features/file-history(3) src/lib/features/tasks(3) src/lib/plugins/calendar(3) +8 modules: q impact src/lib/utils/date.ts --depth 2
out2 src/lib/utils/date.ts 0 files in 0 modules: -
## tests
test src/tests/lib/utils/date.test.ts imports src/lib/utils/date.ts mirror
test src/tests/lib/features/tasks/tasks.service.test.ts imports src/lib/utils/date.ts
test src/tests/lib/utils/template.test.ts mocks src/lib/utils/date.ts
## symbols
sym src/lib/utils/date.ts:15 fn formatNow(outputFormat: string, offsetDays: number = 0): string L3 | Returns the current datetime formatted, with an optional day offset.
by src/lib/utils/date.ts:formatNow <- src/lib/core/markdown-editor/extensions/date-shortcut/completion.logic.ts:40 in dateForToken call +2
by src/lib/utils/date.ts:formatNow <- src/lib/features/tasks/TaskLists.svelte:55 in savedCounts=$derived call
by src/lib/utils/date.ts:formatNow <- src/lib/features/tasks/TasksView.svelte:166 in today=$derived call
by src/lib/utils/date.ts:formatNow <- src/lib/features/tasks/tasks.store.svelte.ts:89 in visibleRows=$derived call +1
by src/lib/utils/date.ts:formatNow <- src/lib/plugins/kanban/KanbanCard.svelte:114 in dateProximity=$derived call
by src/lib/utils/date.ts:formatNow <- src/lib/plugins/kanban/KanbanListView.svelte:30 in (markup) markup
by src/lib/utils/date.ts:formatNow <- src/lib/plugins/kanban/KanbanTableView.svelte:37 in (markup) markup
by src/lib/utils/date.ts:formatNow <- src/lib/utils/template.ts:115 in evaluateDateNow call
sym src/lib/utils/date.ts:26 fn formatNowOnDate(contextDate: dayjs.Dayjs, outputFormat: string, offsetDays: number = 0): string L14 | Like `formatNow`, but anchored to a specific calendar date instead of today.
by src/lib/utils/date.ts:formatNowOnDate <- src/lib/utils/template.ts:114 in evaluateDateNow call
sym src/lib/utils/date.ts:42 fn formatDate(date: dayjs.ConfigType, format: string): string L3 | Formats a date value (string, Date, dayjs, etc.) into the given format string.
by src/lib/utils/date.ts:formatDate <- src/lib/features/collection/calendar.logic.ts:178 in formatDateKey call
by src/lib/utils/date.ts:formatDate <- src/lib/features/file-history/file-history.logic.ts:177 in toDateKey call
by src/lib/utils/date.ts:formatDate <- src/lib/features/tasks/TasksView.svelte:597 in modifiedTitle call
by src/lib/utils/date.ts:formatDate <- src/lib/features/tasks/tasks.logic.ts:131 in chipDate call
sym src/lib/utils/date.ts:92 fn formatToCapturingRegex(format: string): RegExp L36 | Converts a dayjs format string into an anchored regex (`^...$`) with named capture groups.
by src/lib/utils/date.ts:formatToCapturingRegex <- src/lib/plugins/periodic-notes/periodic-notes.logic.ts:219 in detectPeriodicNoteType call
sym src/lib/utils/date.ts:136 fn formatDateWithOffset(referenceDate: string, inputFormat: string, outputFormat: string, offsetDays: number, useCurrentTime: boolean = false)… L35 | Parses a reference date string using the given input format, applies a day offset, and returns the result in the output format.
by src/lib/utils/date.ts:formatDateWithOffset <- src/lib/features/tasks/task-query.logic.ts:774 in duePredicate call +2
by src/lib/utils/date.ts:formatDateWithOffset <- src/lib/features/tasks/task-row-edit.logic.ts:15 in resolveDuePreset call
by src/lib/utils/date.ts:formatDateWithOffset <- src/lib/utils/template.ts:119 in evaluateDateNow call
## locals
local src/lib/utils/date.ts:50 fn formatToRegex(format: string): RegExp L35
## calls
call src/lib/utils/date.ts:148 in formatDateWithOffset -> src/lib/utils/date.ts:formatToRegex call
