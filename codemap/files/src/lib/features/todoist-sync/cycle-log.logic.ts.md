# file card src/lib/features/todoist-sync/cycle-log.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/todoist-sync/cycle-log.logic.ts ' codemap/files
file src/lib/features/todoist-sync/cycle-log.logic.ts logic L158 module src/lib/features/todoist-sync in4 t5 | The `cycle` rows of the Todoist sync log: one per cycle that started, its summary stored as JSON in the row's message, and the dialog's filter.
## imports
imp src/lib/features/todoist-sync/cycle-log.logic.ts:8 -> src/lib/contracts/index.ts type:TodoistSyncLogEntry,type:TodoistSyncLogInput
imp src/lib/features/todoist-sync/cycle-log.logic.ts:9 -> src/lib/features/todoist-sync/pull.logic.ts type:PullCounts
imp src/lib/features/todoist-sync/cycle-log.logic.ts:10 -> src/lib/features/todoist-sync/sync-scheduler.logic.ts formatLogTime
## imported-by
imp src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte:4 -> src/lib/features/todoist-sync/cycle-log.logic.ts filterLogEntries,logEntryText,newestCycle,type:LogFilter
imp src/lib/features/todoist-sync/sync-log.service.ts:5 -> src/lib/features/todoist-sync/cycle-log.logic.ts cycleLogEntry,type:CycleRun
imp src/lib/features/todoist-sync/sync-now.service.ts:29 -> src/lib/features/todoist-sync/cycle-log.logic.ts type:CycleRun,type:CycleTrigger
imp src/lib/features/todoist-sync/sync-scheduler.service.ts:7 -> src/lib/features/todoist-sync/cycle-log.logic.ts type:CycleTrigger
## reach
in2 src/lib/features/todoist-sync/cycle-log.logic.ts 3 files in 1 modules: src/lib/app(3)
out2 src/lib/features/todoist-sync/cycle-log.logic.ts 58 files in 3 modules: src/lib/contracts(52) src/lib/features/todoist-sync(5) src/lib/core/frontmatter(1)
## tests
test src/tests/lib/features/todoist-sync/cycle-log.logic.test.ts imports src/lib/features/todoist-sync/cycle-log.logic.ts mirror
test src/tests/lib/features/todoist-sync/TodoistSyncLogDialog.test.ts imports src/lib/features/todoist-sync/cycle-log.logic.ts
test src/tests/lib/features/todoist-sync/sync-log.service.test.ts imports src/lib/features/todoist-sync/cycle-log.logic.ts
test src/tests/lib/features/todoist-sync/sync-now.service.test.ts imports src/lib/features/todoist-sync/cycle-log.logic.ts
test src/tests/lib/features/todoist-sync/sync-scheduler.service.test.ts imports src/lib/features/todoist-sync/cycle-log.logic.ts
## symbols
sym src/lib/features/todoist-sync/cycle-log.logic.ts:13 const CYCLE_KIND L1 | Log kind of a cycle row; every other kind is an event.
sym src/lib/features/todoist-sync/cycle-log.logic.ts:16 type CycleTrigger L1 | What started a cycle: "Sync now", or one of the scheduler's triggers.
by src/lib/features/todoist-sync/cycle-log.logic.ts:CycleTrigger <- src/lib/features/todoist-sync/sync-now.service.ts:29 in (module) import
by src/lib/features/todoist-sync/cycle-log.logic.ts:CycleTrigger <- src/lib/features/todoist-sync/sync-scheduler.service.ts:7 in (module) import
sym src/lib/features/todoist-sync/cycle-log.logic.ts:19 interface CycleCounts L4 | A finished cycle's counts: the pull's, plus the links it detached.
sym src/lib/features/todoist-sync/cycle-log.logic.ts:25 interface CycleSkips L10 | What an automatic cycle left out for being over a cap (design rule 9).
sym src/lib/features/todoist-sync/cycle-log.logic.ts:37 interface CycleRun L20 | One cycle as it ran.
by src/lib/features/todoist-sync/cycle-log.logic.ts:CycleRun <- src/lib/features/todoist-sync/sync-log.service.ts:5 in (module) import
by src/lib/features/todoist-sync/cycle-log.logic.ts:CycleRun <- src/lib/features/todoist-sync/sync-now.service.ts:29 in (module) import
sym src/lib/features/todoist-sync/cycle-log.logic.ts:59 interface CycleRecord L6 | A stored cycle row: the newest run of a series of quiet automatic cycles that one row stands for.
sym src/lib/features/todoist-sync/cycle-log.logic.ts:67 type LogFilter L1 | Log dialog filter: every row, cycle rows only, or event rows only.
by src/lib/features/todoist-sync/cycle-log.logic.ts:LogFilter <- src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte:4 in (script) import
sym src/lib/features/todoist-sync/cycle-log.logic.ts:97 fn cycleLogEntry(run: CycleRun, newest: TodoistSyncLogEntry | null): TodoistSyncLogInput L6 | The log entry for `run`.
by src/lib/features/todoist-sync/cycle-log.logic.ts:cycleLogEntry <- src/lib/features/todoist-sync/sync-log.service.ts:39 in logCycle call
sym src/lib/features/todoist-sync/cycle-log.logic.ts:105 fn parseCycle(message: string): CycleRecord | null L10 | The cycle record stored in a row's message, or null when it holds none.
sym src/lib/features/todoist-sync/cycle-log.logic.ts:117 fn formatCycleSummary(record: CycleRecord): string L19 | One line for a cycle row, e.g. `Automatic (interval) ok in 812 ms; nothing changed; sync_token kept`.
sym src/lib/features/todoist-sync/cycle-log.logic.ts:138 fn logEntryText(entry: TodoistSyncLogEntry): string L4 | The text the log dialog shows for a row: a cycle row's summary, any other row's message.
by src/lib/features/todoist-sync/cycle-log.logic.ts:logEntryText <- src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte:33 in (markup) markup +1
sym src/lib/features/todoist-sync/cycle-log.logic.ts:144 fn filterLogEntries(entries: TodoistSyncLogEntry[], filter: LogFilter): TodoistSyncLogEntry[] L4 | The rows `filter` keeps, in their order.
by src/lib/features/todoist-sync/cycle-log.logic.ts:filterLogEntries <- src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte:15 in shown=$derived call
sym src/lib/features/todoist-sync/cycle-log.logic.ts:150 fn newestCycle(entries: TodoistSyncLogEntry[]): TodoistSyncLogEntry | null L3 | The first cycle row of `entries` (newest first), or null.
by src/lib/features/todoist-sync/cycle-log.logic.ts:newestCycle <- src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte:16 in latest=$derived call
## locals
local src/lib/features/todoist-sync/cycle-log.logic.ts:155 fn isQuiet(run: CycleRun): boolean L4
## calls
call src/lib/features/todoist-sync/cycle-log.logic.ts:98 in cycleLogEntry -> src/lib/features/todoist-sync/cycle-log.logic.ts:parseCycle call
call src/lib/features/todoist-sync/cycle-log.logic.ts:99 in cycleLogEntry -> src/lib/features/todoist-sync/cycle-log.logic.ts:isQuiet call +1
call src/lib/features/todoist-sync/cycle-log.logic.ts:133 in formatCycleSummary -> src/lib/features/todoist-sync/sync-scheduler.logic.ts:formatLogTime call
call src/lib/features/todoist-sync/cycle-log.logic.ts:139 in logEntryText -> src/lib/features/todoist-sync/cycle-log.logic.ts:parseCycle call
call src/lib/features/todoist-sync/cycle-log.logic.ts:140 in logEntryText -> src/lib/features/todoist-sync/cycle-log.logic.ts:formatCycleSummary call
