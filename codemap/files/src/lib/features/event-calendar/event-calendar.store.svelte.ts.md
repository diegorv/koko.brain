# file card src/lib/features/event-calendar/event-calendar.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/event-calendar/event-calendar.store.svelte.ts ' codemap/files
file src/lib/features/event-calendar/event-calendar.store.svelte.ts store L247 module src/lib/features/event-calendar in8 t9 | Reactive data of the Calendar tab: the projected index snapshot, the pending-write overlay, the undo history, the load state and the dated tasks overlay.
## imports
imp src/lib/features/event-calendar/event-calendar.store.svelte.ts:13 -> src/lib/features/event-calendar/event-calendar-history.logic.ts createEventHistory,followRename,remapPath,type:EventHistory
imp src/lib/features/event-calendar/event-calendar.store.svelte.ts:14 -> src/lib/features/event-calendar/event-calendar-event.logic.ts eventState,isActionableIssue,mergePending,prunePending,sameEventState,type:PendingEventNote
imp src/lib/features/event-calendar/event-calendar.store.svelte.ts:15 -> src/lib/features/event-calendar/event-calendar-tasks.logic.ts type:CalendarTask
imp src/lib/features/event-calendar/event-calendar.store.svelte.ts:16 -> src/lib/features/event-calendar/event-calendar.types.ts type:EventIssue,type:EventNote,type:EventProjection,type:EventState,type:PendingWrite
## imported-by
imp src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte:3 -> src/lib/features/event-calendar/event-calendar.store.svelte.ts eventCalendarStore
imp src/lib/features/event-calendar/EventCalendarView.svelte:24 -> src/lib/features/event-calendar/event-calendar.store.svelte.ts eventCalendarStore
imp src/lib/features/event-calendar/EventDialog.svelte:20 -> src/lib/features/event-calendar/event-calendar.store.svelte.ts eventCalendarStore
imp src/lib/features/event-calendar/EventMonthGrid.svelte:9 -> src/lib/features/event-calendar/event-calendar.store.svelte.ts eventCalendarStore
imp src/lib/features/event-calendar/EventPopover.svelte:12 -> src/lib/features/event-calendar/event-calendar.store.svelte.ts eventCalendarStore
imp src/lib/features/event-calendar/EventTimeGrid.svelte:21 -> src/lib/features/event-calendar/event-calendar.store.svelte.ts eventCalendarStore
imp src/lib/features/event-calendar/ShowInCalendarButton.svelte:9 -> src/lib/features/event-calendar/event-calendar.store.svelte.ts eventCalendarStore
imp src/lib/features/event-calendar/event-calendar.service.ts:40 -> src/lib/features/event-calendar/event-calendar.store.svelte.ts eventCalendarStore
## reach
in2 src/lib/features/event-calendar/event-calendar.store.svelte.ts 11 files in 6 modules: src/lib/app(5) src/lib/features/event-calendar(2) src/lib/features/backlinks(1) src/lib/features/rail-shell(1) src/lib/features/search(1) +1 modules: q impact src/lib/features/event-calendar/event-calendar.store.svelte.ts --depth 2
out2 src/lib/features/event-calendar/event-calendar.store.svelte.ts 8 files in 5 modules: src/lib/core/frontmatter(2) src/lib/core/settings(2) src/lib/features/event-calendar(2) src/lib/features/type-definitions(1) src/lib/types(1)
## tests
test src/tests/lib/features/event-calendar/event-calendar.store.test.ts imports src/lib/features/event-calendar/event-calendar.store.svelte.ts mirror
test src/tests/lib/features/event-calendar/EventCalendarView.test.ts imports src/lib/features/event-calendar/event-calendar.store.svelte.ts
test src/tests/lib/features/event-calendar/EventDialog.test.ts imports src/lib/features/event-calendar/event-calendar.store.svelte.ts
test src/tests/lib/features/event-calendar/EventMonthGrid.test.ts imports src/lib/features/event-calendar/event-calendar.store.svelte.ts
test src/tests/lib/features/event-calendar/EventPopover.test.ts imports src/lib/features/event-calendar/event-calendar.store.svelte.ts
test src/tests/lib/features/event-calendar/EventTimeGrid.test.ts imports src/lib/features/event-calendar/event-calendar.store.svelte.ts
test src/tests/lib/features/event-calendar/event-calendar-gestures.characterization.test.ts imports src/lib/features/event-calendar/event-calendar.store.svelte.ts
test src/tests/lib/features/event-calendar/event-calendar.model.test.ts imports src/lib/features/event-calendar/event-calendar.store.svelte.ts
test src/tests/lib/features/event-calendar/event-calendar.service.test.ts imports src/lib/features/event-calendar/event-calendar.store.svelte.ts
## symbols
sym src/lib/features/event-calendar/event-calendar.store.svelte.ts:74 store eventCalendarStore L174 | Reactive data store of the Calendar tab.
by src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore <- src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte:10 in attention=$derived member +3
by src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore <- src/lib/features/event-calendar/EventCalendarView.svelte:139 in $effect@121 member +8
by src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore <- src/lib/features/event-calendar/EventDialog.svelte:47 in event=$derived mcall
by src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore <- src/lib/features/event-calendar/EventMonthGrid.svelte:18 in events=$derived member +1
by src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore <- src/lib/features/event-calendar/EventPopover.svelte:33 in event=$derived member
by src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore <- src/lib/features/event-calendar/EventTimeGrid.svelte:78 in events=$derived member +1
by src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore <- src/lib/features/event-calendar/ShowInCalendarButton.svelte:29 in $effect@25 member
by src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore <- src/lib/features/event-calendar/event-calendar.service.ts:79 in loadEvents mcall +70
## store
store src/lib/features/event-calendar/event-calendar.store.svelte.ts:74 eventCalendarStore esc:0
mem src/lib/features/event-calendar/event-calendar.store.svelte.ts:76 get eventCalendarStore.events r:7 w-via:setSnapshot,putPending,settlePending,dropPending,remapPath,+1 | Merged and sorted events the calendar renders.
more r 7 not shown: src/lib/features/event-calendar(7): q store src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.events
mem src/lib/features/event-calendar/event-calendar.store.svelte.ts:78 do eventCalendarStore.eventByPath w:11 | Merged event at `path`, or undefined.
more w 11 not shown: src/lib/features/event-calendar(11): q store src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.eventByPath
mem src/lib/features/event-calendar/event-calendar.store.svelte.ts:80 do eventCalendarStore.isPending w:src/lib/features/event-calendar/event-calendar.service.ts:1207 | Whether `path` holds a pending write.
mem src/lib/features/event-calendar/event-calendar.store.svelte.ts:82 do eventCalendarStore.pendingWrite w:src/lib/features/event-calendar/event-calendar.service.ts:228,src/lib/features/event-calendar/event-calendar.service.ts:753,src/lib/features/event-calendar/event-calendar.service.ts:773,src/lib/features/event-calendar/event-calendar.service.ts:1047 | The pending write held for `path`, or undefined.
mem src/lib/features/event-calendar/event-calendar.store.svelte.ts:84 get eventCalendarStore.pendingPaths r:- w-via:setSnapshot,putPending,settlePending,dropPending,remapPath,+1 | Paths that hold a pending write.
mem src/lib/features/event-calendar/event-calendar.store.svelte.ts:86 get eventCalendarStore.issues r:- w-via:setSnapshot,reset | Every issue of the latest snapshot.
mem src/lib/features/event-calendar/event-calendar.store.svelte.ts:88 get eventCalendarStore.attentionIssues r:src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte:10 w-via:setSnapshot,putPending,settlePending,dropPending,remapPath,+1 | Issues that count toward Needs attention (`isActionableIssue`).
mem src/lib/features/event-calendar/event-calendar.store.svelte.ts:90 get eventCalendarStore.unscheduledIssues r:src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte:11 w-via:setSnapshot,putPending,settlePending,dropPending,remapPath,+1 | Informational `unscheduled` issues.
mem src/lib/features/event-calendar/event-calendar.store.svelte.ts:92 get eventCalendarStore.attentionCount r:src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte:12 w-via:setSnapshot,putPending,settlePending,dropPending,remapPath,+1 | Number of Needs-attention issues.
mem src/lib/features/event-calendar/event-calendar.store.svelte.ts:94 get eventCalendarStore.archivedCount r:src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte:13 w-via:setSnapshot,reset | Archived event notes of the latest snapshot, whether or not it renders them.
mem src/lib/features/event-calendar/event-calendar.store.svelte.ts:96 get eventCalendarStore.isLoading r:src/lib/features/event-calendar/EventCalendarView.svelte:159,src/lib/features/event-calendar/EventCalendarView.svelte:171 w-via:setLoading,reset | Whether a load is in progress.
mem src/lib/features/event-calendar/event-calendar.store.svelte.ts:98 get eventCalendarStore.loadError r:src/lib/features/event-calendar/EventCalendarView.svelte:139,src/lib/features/event-calendar/EventCalendarView.svelte:242,src/lib/features/event-calendar/EventCalendarView.svelte:244 w-via:setLoadError,reset | Message of the last failed load, or null.
mem src/lib/features/event-calendar/event-calendar.store.svelte.ts:100 get eventCalendarStore.snapshotVersion r:src/lib/features/event-calendar/EventCalendarView.svelte:160,src/lib/features/event-calendar/EventCalendarView.svelte:171,src/lib/features/event-calendar/event-calendar.service.ts:214 w-via:setSnapshot,reset | `vaultIndexVersion` the latest snapshot was read at.
mem src/lib/features/event-calendar/event-calendar.store.svelte.ts:102 get eventCalendarStore.history r:15 w-via:remapPath,setHistory,reset | Undo / redo history.
more r 15 not shown: src/lib/features/event-calendar(15): q store src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.history
mem src/lib/features/event-calendar/event-calendar.store.svelte.ts:104 get eventCalendarStore.canUndo r:- w-via:remapPath,setHistory,reset | Whether there is an op to undo.
mem src/lib/features/event-calendar/event-calendar.store.svelte.ts:106 get eventCalendarStore.canRedo r:- w-via:remapPath,setHistory,reset | Whether there is an op to redo.
mem src/lib/features/event-calendar/event-calendar.store.svelte.ts:108 get eventCalendarStore.tasks r:src/lib/features/event-calendar/EventMonthGrid.svelte:27,src/lib/features/event-calendar/EventTimeGrid.svelte:256 w-via:setTasks,reset | Dated tasks the calendar overlays, sorted by due date.
mem src/lib/features/event-calendar/event-calendar.store.svelte.ts:115 do eventCalendarStore.setSnapshot w:src/lib/features/event-calendar/event-calendar.service.ts:89 | Replaces the snapshot and drops the pending writes it has caught up with.
mem src/lib/features/event-calendar/event-calendar.store.svelte.ts:125 do eventCalendarStore.setLoading w:src/lib/features/event-calendar/event-calendar.service.ts:79,src/lib/features/event-calendar/event-calendar.service.ts:84,src/lib/features/event-calendar/event-calendar.service.ts:92,src/lib/features/event-calendar/event-calendar.service.ts:97,src/lib/features/event-calendar/event-calendar.service.ts:99 | Sets whether a load is in progress.
mem src/lib/features/event-calendar/event-calendar.store.svelte.ts:128 do eventCalendarStore.setLoadError w:src/lib/features/event-calendar/event-calendar.service.ts:91,src/lib/features/event-calendar/event-calendar.service.ts:96 | Sets the last load error; null clears it.
mem src/lib/features/event-calendar/event-calendar.store.svelte.ts:131 do eventCalendarStore.putPending w:9 | Adds a pending write, replacing any write already held for its path.
more w 9 not shown: src/lib/features/event-calendar(9): q store src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.putPending
mem src/lib/features/event-calendar/event-calendar.store.svelte.ts:143 do eventCalendarStore.settlePending w:src/lib/features/event-calendar/event-calendar.service.ts:799,src/lib/features/event-calendar/event-calendar.service.ts:1058 | Marks the write at `path` as finished on disk.
mem src/lib/features/event-calendar/event-calendar.store.svelte.ts:151 do eventCalendarStore.dropPending w:src/lib/features/event-calendar/event-calendar.service.ts:776,src/lib/features/event-calendar/event-calendar.service.ts:1054,src/lib/features/event-calendar/event-calendar.service.ts:1208 | Removes the pending write at `path` (a failed or abandoned write).
mem src/lib/features/event-calendar/event-calendar.store.svelte.ts:197 do eventCalendarStore.remapPath w:src/lib/features/event-calendar/event-calendar.service.ts:647,src/lib/features/event-calendar/event-calendar.service.ts:739 | Follows a renamed or restored note.
mem src/lib/features/event-calendar/event-calendar.store.svelte.ts:229 do eventCalendarStore.setHistory w:12 | Replaces the undo / redo history.
more w 12 not shown: src/lib/features/event-calendar(12): q store src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.setHistory
mem src/lib/features/event-calendar/event-calendar.store.svelte.ts:232 do eventCalendarStore.setTasks w:src/lib/features/event-calendar/event-calendar.service.ts:121 | Replaces the dated tasks (`tasksFromGroups` output).
mem src/lib/features/event-calendar/event-calendar.store.svelte.ts:235 do eventCalendarStore.reset w:src/lib/features/event-calendar/event-calendar.service.ts:347 | Returns every field to its initial value.
## locals
local src/lib/features/event-calendar/event-calendar.store.svelte.ts:49 fn compareEvents(a: EventNote, b: EventNote): number L7
local src/lib/features/event-calendar/event-calendar.store.svelte.ts:58 fn recompute(): void L8
local src/lib/features/event-calendar/event-calendar.store.svelte.ts:68 fn plainEvent(event: PendingEventNote): EventNote L4
## calls
call src/lib/features/event-calendar/event-calendar.store.svelte.ts:29 in history -> src/lib/features/event-calendar/event-calendar-history.logic.ts:createEventHistory call
call src/lib/features/event-calendar/event-calendar.store.svelte.ts:59 in recompute -> src/lib/features/event-calendar/event-calendar-event.logic.ts:mergePending call
call src/lib/features/event-calendar/event-calendar.store.svelte.ts:59 in recompute -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:compareEvents ref
call src/lib/features/event-calendar/event-calendar.store.svelte.ts:63 in recompute -> src/lib/features/event-calendar/event-calendar-event.logic.ts:isActionableIssue call +1
call src/lib/features/event-calendar/event-calendar.store.svelte.ts:120 in eventCalendarStore.setSnapshot -> src/lib/features/event-calendar/event-calendar-event.logic.ts:prunePending call
call src/lib/features/event-calendar/event-calendar.store.svelte.ts:121 in eventCalendarStore.setSnapshot -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:recompute call
call src/lib/features/event-calendar/event-calendar.store.svelte.ts:133 in eventCalendarStore.putPending -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:recompute call
call src/lib/features/event-calendar/event-calendar.store.svelte.ts:147 in eventCalendarStore.settlePending -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:recompute call
call src/lib/features/event-calendar/event-calendar.store.svelte.ts:156 in eventCalendarStore.dropPending -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:recompute call
call src/lib/features/event-calendar/event-calendar.store.svelte.ts:208 in eventCalendarStore.remapPath -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:plainEvent call
call src/lib/features/event-calendar/event-calendar.store.svelte.ts:219 in eventCalendarStore.remapPath -> src/lib/features/event-calendar/event-calendar-event.logic.ts:eventState call
call src/lib/features/event-calendar/event-calendar.store.svelte.ts:220 in eventCalendarStore.remapPath -> src/lib/features/event-calendar/event-calendar-event.logic.ts:sameEventState call
call src/lib/features/event-calendar/event-calendar.store.svelte.ts:224 in eventCalendarStore.remapPath -> src/lib/features/event-calendar/event-calendar-history.logic.ts:followRename call
call src/lib/features/event-calendar/event-calendar.store.svelte.ts:224 in eventCalendarStore.remapPath -> src/lib/features/event-calendar/event-calendar-history.logic.ts:remapPath call
call src/lib/features/event-calendar/event-calendar.store.svelte.ts:225 in eventCalendarStore.remapPath -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:recompute call
call src/lib/features/event-calendar/event-calendar.store.svelte.ts:241 in eventCalendarStore.reset -> src/lib/features/event-calendar/event-calendar-history.logic.ts:createEventHistory call
call src/lib/features/event-calendar/event-calendar.store.svelte.ts:245 in eventCalendarStore.reset -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:recompute call
