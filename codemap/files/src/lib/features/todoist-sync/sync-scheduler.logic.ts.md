# file card src/lib/features/todoist-sync/sync-scheduler.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/todoist-sync/sync-scheduler.logic.ts ' codemap/files
file src/lib/features/todoist-sync/sync-scheduler.logic.ts logic L108 module src/lib/features/todoist-sync in5 t1 | Pure rules of the automatic Todoist sync: which saves trigger a cycle, when an automatic cycle may run, and the fixed texts it shows.
## imports
imp src/lib/features/todoist-sync/sync-scheduler.logic.ts:7 -> src/lib/features/todoist-sync/anchor.logic.ts readAnchor
imp src/lib/features/todoist-sync/sync-scheduler.logic.ts:8 -> src/lib/features/todoist-sync/pull.logic.ts extractTaskLines
## imported-by
imp src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte:5 -> src/lib/features/todoist-sync/sync-scheduler.logic.ts formatLogTime
imp src/lib/features/todoist-sync/TodoistSyncStatus.svelte:5 -> src/lib/features/todoist-sync/sync-scheduler.logic.ts syncStatusLabel
imp src/lib/features/todoist-sync/cycle-log.logic.ts:10 -> src/lib/features/todoist-sync/sync-scheduler.logic.ts formatLogTime
imp src/lib/features/todoist-sync/sync-now.service.ts:87 -> src/lib/features/todoist-sync/sync-scheduler.logic.ts isFirstRunDone
imp src/lib/features/todoist-sync/sync-scheduler.service.ts:8 -> src/lib/features/todoist-sync/sync-scheduler.logic.ts autoCycleDelay,autoSyncCreateCapMessage,autoSyncDetachCapMessage,autoSyncFailureMessage,autoSyncFieldCapMessage,autoSyncOverCapMessage,hasAnchoredLine,isFirstRunDone,rateLimitWaitMs,type:AutoSyncFailureKind
## reach
in2 src/lib/features/todoist-sync/sync-scheduler.logic.ts 5 files in 2 modules: src/lib/app(4) src/lib/features/todoist-sync(1)
out2 src/lib/features/todoist-sync/sync-scheduler.logic.ts 6 files in 3 modules: src/lib/features/todoist-sync(4) src/lib/contracts(1) src/lib/core/frontmatter(1)
## tests
test src/tests/lib/features/todoist-sync/sync-scheduler.logic.test.ts imports src/lib/features/todoist-sync/sync-scheduler.logic.ts mirror
## symbols
sym src/lib/features/todoist-sync/sync-scheduler.logic.ts:11 type AutoSyncFailureKind L1 | Failure kinds an automatic cycle reports in a persistent toast.
by src/lib/features/todoist-sync/sync-scheduler.logic.ts:AutoSyncFailureKind <- src/lib/features/todoist-sync/sync-scheduler.service.ts:18 in (module) import
sym src/lib/features/todoist-sync/sync-scheduler.logic.ts:17 fn hasAnchoredLine(content: string): boolean L3 | Whether a note's content holds a task line with a `🆔 td-…` anchor (code fences skipped).
by src/lib/features/todoist-sync/sync-scheduler.logic.ts:hasAnchoredLine <- src/lib/features/todoist-sync/sync-scheduler.service.ts:93 in startAutoSync call
sym src/lib/features/todoist-sync/sync-scheduler.logic.ts:22 fn isFirstRunDone(kv: readonly { key: string; value: string }[]): boolean L4 | Whether the sync state's `first_run_done` row is set (`1` or `true`).
by src/lib/features/todoist-sync/sync-scheduler.logic.ts:isFirstRunDone <- src/lib/features/todoist-sync/sync-now.service.ts:334 in cycle call
by src/lib/features/todoist-sync/sync-scheduler.logic.ts:isFirstRunDone <- src/lib/features/todoist-sync/sync-scheduler.service.ts:238 in firstRunDone call
sym src/lib/features/todoist-sync/sync-scheduler.logic.ts:32 fn autoCycleDelay(now: number, lastEndedAt: number, blockedUntil: number, minGapMs: number): number L3 | Milliseconds an automatic cycle must wait before it may run: until `minGapMs` after the last cycle ended and until a rate limit lifts at `blockedUntil`.
by src/lib/features/todoist-sync/sync-scheduler.logic.ts:autoCycleDelay <- src/lib/features/todoist-sync/sync-scheduler.service.ts:184 in requestAutoCycle call
sym src/lib/features/todoist-sync/sync-scheduler.logic.ts:37 fn rateLimitWaitMs(retryAfter: number | undefined): number L3 | How long to wait after a 429: `retry_after` seconds, else 60 seconds.
by src/lib/features/todoist-sync/sync-scheduler.logic.ts:rateLimitWaitMs <- src/lib/features/todoist-sync/sync-scheduler.service.ts:257 in handleOutcome call
sym src/lib/features/todoist-sync/sync-scheduler.logic.ts:42 fn autoSyncFailureMessage(kind: AutoSyncFailureKind): string L16 | The fixed message of an automatic cycle's failure kind.
by src/lib/features/todoist-sync/sync-scheduler.logic.ts:autoSyncFailureMessage <- src/lib/features/todoist-sync/sync-scheduler.service.ts:261 in handleOutcome call
sym src/lib/features/todoist-sync/sync-scheduler.logic.ts:60 fn autoSyncOverCapMessage(count: number): string L3 | The toast of an automatic cycle that skipped `count` close/reopen pushes over the cap (design rule 9).
by src/lib/features/todoist-sync/sync-scheduler.logic.ts:autoSyncOverCapMessage <- src/lib/features/todoist-sync/sync-scheduler.service.ts:249 in handleOutcome ref
sym src/lib/features/todoist-sync/sync-scheduler.logic.ts:65 fn autoSyncFieldCapMessage(count: number): string L3 | The toast of an automatic cycle that skipped the field pushes of `count` tasks over the cap (design rule 9).
by src/lib/features/todoist-sync/sync-scheduler.logic.ts:autoSyncFieldCapMessage <- src/lib/features/todoist-sync/sync-scheduler.service.ts:251 in handleOutcome ref
sym src/lib/features/todoist-sync/sync-scheduler.logic.ts:70 fn autoSyncCreateCapMessage(count: number): string L3 | The toast of an automatic cycle that skipped `count` creates of brain-born lines over the cap (design rule 9).
by src/lib/features/todoist-sync/sync-scheduler.logic.ts:autoSyncCreateCapMessage <- src/lib/features/todoist-sync/sync-scheduler.service.ts:252 in handleOutcome ref
sym src/lib/features/todoist-sync/sync-scheduler.logic.ts:75 fn autoSyncDetachCapMessage(count: number): string L3 | The toast of an automatic cycle that skipped `count` detaches over the cap (design rule 9).
by src/lib/features/todoist-sync/sync-scheduler.logic.ts:autoSyncDetachCapMessage <- src/lib/features/todoist-sync/sync-scheduler.service.ts:250 in handleOutcome ref
sym src/lib/features/todoist-sync/sync-scheduler.logic.ts:82 fn formatClockTime(ms: number): string L4 | A local time as `HH:MM`.
sym src/lib/features/todoist-sync/sync-scheduler.logic.ts:88 fn formatLogTime(ms: number): string L4 | A local date and time as `YYYY-MM-DD HH:MM`, for sync log rows.
by src/lib/features/todoist-sync/sync-scheduler.logic.ts:formatLogTime <- src/lib/features/todoist-sync/TodoistSyncLogDialog.svelte:33 in (markup) markup +1
by src/lib/features/todoist-sync/sync-scheduler.logic.ts:formatLogTime <- src/lib/features/todoist-sync/cycle-log.logic.ts:133 in formatCycleSummary call
sym src/lib/features/todoist-sync/sync-scheduler.logic.ts:94 interface SyncStatusInput L7 | What the status bar item reads from the sync store.
sym src/lib/features/todoist-sync/sync-scheduler.logic.ts:103 fn syncStatusLabel(input: SyncStatusInput): { text: string; title: string | null } L6 | The status bar item's text, and the tooltip carrying an error's message.
by src/lib/features/todoist-sync/sync-scheduler.logic.ts:syncStatusLabel <- src/lib/features/todoist-sync/TodoistSyncStatus.svelte:9 in label=$derived call
## locals
local src/lib/features/todoist-sync/sync-scheduler.logic.ts:79 fn pad2(n: number) L1
## calls
call src/lib/features/todoist-sync/sync-scheduler.logic.ts:18 in hasAnchoredLine -> src/lib/features/todoist-sync/anchor.logic.ts:readAnchor call
call src/lib/features/todoist-sync/sync-scheduler.logic.ts:18 in hasAnchoredLine -> src/lib/features/todoist-sync/pull.logic.ts:extractTaskLines call
call src/lib/features/todoist-sync/sync-scheduler.logic.ts:84 in formatClockTime -> src/lib/features/todoist-sync/sync-scheduler.logic.ts:pad2 call +1
call src/lib/features/todoist-sync/sync-scheduler.logic.ts:90 in formatLogTime -> src/lib/features/todoist-sync/sync-scheduler.logic.ts:formatClockTime call
call src/lib/features/todoist-sync/sync-scheduler.logic.ts:90 in formatLogTime -> src/lib/features/todoist-sync/sync-scheduler.logic.ts:pad2 call +1
call src/lib/features/todoist-sync/sync-scheduler.logic.ts:107 in syncStatusLabel -> src/lib/features/todoist-sync/sync-scheduler.logic.ts:formatClockTime call
