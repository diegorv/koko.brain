# file card src/lib/features/event-calendar/event-calendar-history.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/event-calendar/event-calendar-history.logic.ts ' codemap/files
file src/lib/features/event-calendar/event-calendar-history.logic.ts logic L107 module src/lib/features/event-calendar in2 t2 | Field-level undo / redo history of the event calendar.
## imports
imp src/lib/features/event-calendar/event-calendar-history.logic.ts:12 -> src/lib/features/event-calendar/event-calendar-event.logic.ts sameEventState
imp src/lib/features/event-calendar/event-calendar-history.logic.ts:13 -> src/lib/features/event-calendar/event-calendar.types.ts type:EventState,type:HistoryOp
## imported-by
imp src/lib/features/event-calendar/event-calendar.service.ts:39 -> src/lib/features/event-calendar/event-calendar-history.logic.ts dropPath,pushOp,refuseOp,removeOp,takeRedo,takeUndo
imp src/lib/features/event-calendar/event-calendar.store.svelte.ts:13 -> src/lib/features/event-calendar/event-calendar-history.logic.ts createEventHistory,followRename,remapPath,type:EventHistory
## reach
in2 src/lib/features/event-calendar/event-calendar-history.logic.ts 15 files in 4 modules: src/lib/features/event-calendar(9) src/lib/app(4) src/lib/features/rail-shell(1) src/lib/plugins/calendar(1)
out2 src/lib/features/event-calendar/event-calendar-history.logic.ts 7 files in 5 modules: src/lib/core/frontmatter(2) src/lib/core/settings(2) src/lib/features/event-calendar(1) src/lib/features/type-definitions(1) src/lib/types(1)
## tests
test src/tests/lib/features/event-calendar/event-calendar-history.logic.test.ts imports src/lib/features/event-calendar/event-calendar-history.logic.ts mirror
test src/tests/lib/features/event-calendar/event-calendar.store.test.ts imports src/lib/features/event-calendar/event-calendar-history.logic.ts
## symbols
sym src/lib/features/event-calendar/event-calendar-history.logic.ts:16 interface EventHistory L8 | Undo and redo stacks of the calendar, newest op last.
by src/lib/features/event-calendar/event-calendar-history.logic.ts:EventHistory <- src/lib/features/event-calendar/event-calendar.store.svelte.ts:13 in (module) import
sym src/lib/features/event-calendar/event-calendar-history.logic.ts:26 interface TakenOp L6 | An op taken off one stack, plus the history with it on the other stack.
sym src/lib/features/event-calendar/event-calendar-history.logic.ts:34 fn createEventHistory(max = 100): EventHistory L3 | Creates an empty history that keeps at most `max` undo ops.
by src/lib/features/event-calendar/event-calendar-history.logic.ts:createEventHistory <- src/lib/features/event-calendar/event-calendar.store.svelte.ts:29 in history call +1
sym src/lib/features/event-calendar/event-calendar-history.logic.ts:43 fn pushOp(h: EventHistory, op: HistoryOp): EventHistory L5 | Records a new op.
by src/lib/features/event-calendar/event-calendar-history.logic.ts:pushOp <- src/lib/features/event-calendar/event-calendar.service.ts:663 in record call
sym src/lib/features/event-calendar/event-calendar-history.logic.ts:50 fn takeUndo(h: EventHistory): TakenOp | null L5 | Takes the newest undo op and moves it to the redo stack; null when there is none.
by src/lib/features/event-calendar/event-calendar-history.logic.ts:takeUndo <- src/lib/features/event-calendar/event-calendar.service.ts:1326 in applyHistoryNow call
sym src/lib/features/event-calendar/event-calendar-history.logic.ts:57 fn takeRedo(h: EventHistory): TakenOp | null L5 | Takes the newest redo op and moves it to the undo stack; null when there is none.
by src/lib/features/event-calendar/event-calendar-history.logic.ts:takeRedo <- src/lib/features/event-calendar/event-calendar.service.ts:1326 in applyHistoryNow call
sym src/lib/features/event-calendar/event-calendar-history.logic.ts:64 fn removeOp(h: EventHistory, predicate: (op: HistoryOp) => boolean): EventHistory L3 | Removes every op matching `predicate` from both stacks.
by src/lib/features/event-calendar/event-calendar-history.logic.ts:removeOp <- src/lib/features/event-calendar/event-calendar.service.ts:1351 in applyHistoryNow call
sym src/lib/features/event-calendar/event-calendar-history.logic.ts:74 fn refuseOp(h: EventHistory, op: HistoryOp): EventHistory L3 | Removes `op` itself (by reference) from both stacks.
by src/lib/features/event-calendar/event-calendar-history.logic.ts:refuseOp <- src/lib/features/event-calendar/event-calendar.service.ts:1193 in restoreNow call +4
sym src/lib/features/event-calendar/event-calendar-history.logic.ts:79 fn remapPath(h: EventHistory, from: string, to: string): EventHistory L4 | Points every op on `from` at `to`, on both stacks (a renamed or moved note).
by src/lib/features/event-calendar/event-calendar-history.logic.ts:remapPath <- src/lib/features/event-calendar/event-calendar.store.svelte.ts:224 in eventCalendarStore.remapPath call
sym src/lib/features/event-calendar/event-calendar-history.logic.ts:95 fn followRename(h: EventHistory, from: string, to: string, fromBase: string, toBase: string): EventHistory L8 | Follows a note renamed or moved outside the calendar: `remapPath`, and a recorded title equal to `fromBase` becomes `toBase`.
by src/lib/features/event-calendar/event-calendar-history.logic.ts:followRename <- src/lib/features/event-calendar/event-calendar.store.svelte.ts:224 in eventCalendarStore.remapPath call
sym src/lib/features/event-calendar/event-calendar-history.logic.ts:105 fn dropPath(h: EventHistory, path: string): EventHistory L3 | Removes every op on `path` from both stacks (a note that is gone).
by src/lib/features/event-calendar/event-calendar-history.logic.ts:dropPath <- src/lib/features/event-calendar/event-calendar.service.ts:642 in followPathChange call +2
## calls
call src/lib/features/event-calendar/event-calendar-history.logic.ts:44 in pushOp -> src/lib/features/event-calendar/event-calendar-event.logic.ts:sameEventState call
call src/lib/features/event-calendar/event-calendar-history.logic.ts:75 in refuseOp -> src/lib/features/event-calendar/event-calendar-history.logic.ts:removeOp call
call src/lib/features/event-calendar/event-calendar-history.logic.ts:106 in dropPath -> src/lib/features/event-calendar/event-calendar-history.logic.ts:removeOp call
