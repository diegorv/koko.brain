# file card src/lib/features/event-calendar/event-calendar-view.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, store, calls
file src/lib/features/event-calendar/event-calendar-view.store.svelte.ts store L231 module src/lib/features/event-calendar in20 t20
## imports
imp src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:1 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:2 -> src/lib/features/event-calendar/event-calendar-dates.logic.ts toKey
imp src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:3 -> src/lib/features/event-calendar/event-calendar-view.logic.ts buildMonthCells,nowOffsetMinutes,rangeLabel,stepDate,visibleDays,type:MonthCell,type:RangeLabel
imp src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:12 -> src/lib/features/event-calendar/event-calendar.types.ts type:CalendarViewMode,type:DialogState,type:EventDialogPayload,type:FocusRequest,type:PopoverRect,type:PopoverTarget
## imported-by
imp src/lib/app/commands.ts:42 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
imp src/lib/features/event-calendar/EventAllDayLane.svelte:6 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
imp src/lib/features/event-calendar/EventBlock.svelte:6 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
imp src/lib/features/event-calendar/EventCalendarHeader.svelte:7 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
imp src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte:4 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
imp src/lib/features/event-calendar/EventCalendarView.svelte:25 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
imp src/lib/features/event-calendar/EventDayHeaders.svelte:3 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
imp src/lib/features/event-calendar/EventDialog.svelte:21 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
imp src/lib/features/event-calendar/EventMonthGrid.svelte:10 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
imp src/lib/features/event-calendar/EventPopover.svelte:13 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
imp src/lib/features/event-calendar/EventShortcutsDialog.svelte:3 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
imp src/lib/features/event-calendar/EventTimeGrid.svelte:22 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
imp src/lib/features/event-calendar/EventWeekStrip.svelte:4 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
imp src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:4 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
imp src/lib/features/event-calendar/event-calendar-gesture-guard.ts:1 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
imp src/lib/features/event-calendar/event-calendar.service.ts:42 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
imp src/lib/features/rail-shell/RailNoteList.svelte:60 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
imp src/lib/plugins/calendar/CalendarNavigator.svelte:11 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
imp src/lib/plugins/calendar/calendar-rail.service.ts:4 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
imp src/lib/plugins/one-on-one/MyPeopleSection.svelte:9 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
## reach
in2 src/lib/features/event-calendar/event-calendar-view.store.svelte.ts 9 files in 3 modules: src/lib/app(6) src/lib/features/event-calendar(2) src/lib/plugins/one-on-one(1)
out2 src/lib/features/event-calendar/event-calendar-view.store.svelte.ts 4 files in 2 modules: src/lib/core/settings(3) src/lib/features/event-calendar(1)
## tests
test src/tests/lib/features/event-calendar/event-calendar-view.store.test.ts imports src/lib/features/event-calendar/event-calendar-view.store.svelte.ts mirror
test src/tests/lib/app/commands.test.ts imports src/lib/features/event-calendar/event-calendar-view.store.svelte.ts
test src/tests/lib/features/backlinks/LinkItem.test.ts imports src/lib/features/event-calendar/event-calendar-view.store.svelte.ts
test src/tests/lib/features/event-calendar/EventAllDayLane.test.ts imports src/lib/features/event-calendar/event-calendar-view.store.svelte.ts
test src/tests/lib/features/event-calendar/EventCalendarView.test.ts imports src/lib/features/event-calendar/event-calendar-view.store.svelte.ts
test src/tests/lib/features/event-calendar/EventDialog.test.ts imports src/lib/features/event-calendar/event-calendar-view.store.svelte.ts
test src/tests/lib/features/event-calendar/EventMonthGrid.test.ts imports src/lib/features/event-calendar/event-calendar-view.store.svelte.ts
test src/tests/lib/features/event-calendar/EventPopover.test.ts imports src/lib/features/event-calendar/event-calendar-view.store.svelte.ts
test src/tests/lib/features/event-calendar/EventTimeGrid.test.ts imports src/lib/features/event-calendar/event-calendar-view.store.svelte.ts
test src/tests/lib/features/event-calendar/EventWeekStrip.test.ts imports src/lib/features/event-calendar/event-calendar-view.store.svelte.ts
test src/tests/lib/features/event-calendar/ShowInCalendarButton.test.ts imports src/lib/features/event-calendar/event-calendar-view.store.svelte.ts
test src/tests/lib/features/event-calendar/event-calendar-day-drag.test.ts imports src/lib/features/event-calendar/event-calendar-view.store.svelte.ts
test src/tests/lib/features/event-calendar/event-calendar-gesture-guard.test.ts imports src/lib/features/event-calendar/event-calendar-view.store.svelte.ts
test src/tests/lib/features/event-calendar/event-calendar-gestures.characterization.test.ts imports src/lib/features/event-calendar/event-calendar-view.store.svelte.ts
test src/tests/lib/features/event-calendar/event-calendar.service.test.ts imports src/lib/features/event-calendar/event-calendar-view.store.svelte.ts
test src/tests/lib/features/rail-shell/RailNoteList.search.test.ts imports src/lib/features/event-calendar/event-calendar-view.store.svelte.ts
test src/tests/lib/features/search/SearchResult.test.ts imports src/lib/features/event-calendar/event-calendar-view.store.svelte.ts
test src/tests/lib/plugins/calendar/CalendarNavigator.test.ts imports src/lib/features/event-calendar/event-calendar-view.store.svelte.ts
test src/tests/lib/plugins/calendar/calendar-rail.service.test.ts imports src/lib/features/event-calendar/event-calendar-view.store.svelte.ts
test src/tests/lib/plugins/one-on-one/MyPeopleSection.test.ts imports src/lib/features/event-calendar/event-calendar-view.store.svelte.ts
## symbols
sym src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:50 store eventCalendarViewStore L182 | Reactive state of the Calendar tab: view, date, popover, dialogs and clock.
by src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore <- src/lib/app/commands.ts:249 in getBuiltInCommands mcall
by src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore <- src/lib/features/event-calendar/EventAllDayLane.svelte:30 in selectedPath=$derived member +4
by src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore <- src/lib/features/event-calendar/EventBlock.svelte:40 in selected=$derived member +2
by src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore <- src/lib/features/event-calendar/EventCalendarHeader.svelte:20 in label=$derived member +9
by src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore <- src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte:14 in showArchived=$derived member +1
by src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore <- src/lib/features/event-calendar/EventCalendarView.svelte:40 in (script) mcall +20
by src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore <- src/lib/features/event-calendar/EventDayHeaders.svelte:15 in handleClick member +4
by src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore <- src/lib/features/event-calendar/EventDialog.svelte:43 in dialog=$derived member +13
more by 12 not shown: src/lib/features/event-calendar(8) src/lib/plugins/calendar(2) src/lib/features/rail-shell(1) src/lib/plugins/one-on-one(1): q importers src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore
## store
store src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:50 eventCalendarViewStore esc:0
mem src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:52 get eventCalendarViewStore.view r:8 w-via:setView,initFromSettings,reset | The active view.
more r 8 not shown: src/lib/features/event-calendar(8): q store src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.view
mem src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:54 get eventCalendarViewStore.focusedDate r:11 w-via:setDate,step,goToToday,reset | The day the visible range is built around.
more r 11 not shown: src/lib/features/event-calendar(11): q store src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.focusedDate
mem src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:56 get eventCalendarViewStore.popover r:src/lib/features/event-calendar/EventPopover.svelte:32 w-via:setView,setDate,step,goToToday,openPopover,+4 | The popover target, or null.
mem src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:58 get eventCalendarViewStore.dialog r:src/lib/features/event-calendar/EventDialog.svelte:43,src/lib/features/event-calendar/EventDialog.svelte:126,src/lib/features/event-calendar/EventDialog.svelte:134,src/lib/features/event-calendar/EventDialog.svelte:153,src/lib/features/event-calendar/EventDialog.svelte:159 w-via:openDialog,closeDialog,closeTransient,remapPath,reset | The open dialog, or null.
mem src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:60 get eventCalendarViewStore.helpOpen r:src/lib/features/event-calendar/EventShortcutsDialog.svelte:11 w-via:openHelp,closeHelp,closeTransient,reset | Whether the keyboard shortcuts help is open.
mem src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:62 get eventCalendarViewStore.nowMs r:src/lib/features/event-calendar/EventTimeGrid.svelte:294 w-via:setNow | Current instant in epoch milliseconds.
mem src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:64 get eventCalendarViewStore.initialized r:- w-via:initFromSettings,reset | Whether the default view was applied this session.
mem src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:66 get eventCalendarViewStore.focusRequest r:src/lib/features/event-calendar/EventCalendarView.svelte:157,src/lib/features/event-calendar/EventCalendarView.svelte:167 w-via:setView,setDate,step,goToToday,requestFocus,+4 | Event the view should focus and pulse, or null.
mem src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:68 get eventCalendarViewStore.gestureLive r:src/lib/features/event-calendar/EventBlock.svelte:64,src/lib/features/event-calendar/EventCalendarView.svelte:53 w-via:setGestureLive,reset | Whether a pointer gesture is live: the view's shortcuts stay off until it ends.
mem src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:70 get eventCalendarViewStore.showArchived r:src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte:14,src/lib/features/event-calendar/EventCalendarView.svelte:129,src/lib/features/event-calendar/event-calendar.service.ts:190 w-via:setShowArchived,reset | Whether archived event notes render, dimmed.
mem src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:73 get eventCalendarViewStore.visibleDays r:src/lib/features/event-calendar/EventCalendarView.svelte:255 w-via:setView,setDate,step,goToToday,initFromSettings,+1 | Days the active view shows, per the `weekStartsOn` and `showWeekends` settings.
mem src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:78 get eventCalendarViewStore.monthCells r:src/lib/features/event-calendar/EventMonthGrid.svelte:14 w-via:setDate,step,goToToday,reset | Cells of the month grid around `focusedDate`, per the week settings.
mem src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:83 get eventCalendarViewStore.rangeLabel r:src/lib/features/event-calendar/EventCalendarHeader.svelte:20 w-via:setView,setDate,step,goToToday,initFromSettings,+1 | Header title and subtitle of the visible range.
mem src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:87 get eventCalendarViewStore.todayKey r:11 w-via:setNow | Day key of `nowMs`.
more r 11 not shown: src/lib/features/event-calendar(4) src/lib/plugins/calendar(4) src/lib/features/rail-shell(2) src/lib/plugins/one-on-one(1): q store src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.todayKey
mem src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:91 get eventCalendarViewStore.nowMinutes r:src/lib/features/event-calendar/event-calendar.service.ts:290 w-via:setNow | Wall-clock minutes from midnight of `nowMs` (correct on DST transition days).
mem src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:95 get eventCalendarViewStore.isDialogOpen r:src/lib/features/event-calendar/EventCalendarView.svelte:52 w-via:openDialog,closeDialog,openHelp,closeHelp,closeTransient,+2 | Whether the event dialog or the shortcuts help is open.
mem src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:99 get eventCalendarViewStore.selectedEventPath r:src/lib/features/event-calendar/EventAllDayLane.svelte:30,src/lib/features/event-calendar/EventBlock.svelte:40,src/lib/features/event-calendar/EventCalendarView.svelte:55,src/lib/features/event-calendar/EventMonthGrid.svelte:28 w-via:setView,setDate,step,goToToday,openPopover,+4 | Path of the selected event: the popover target, else null.
mem src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:104 do eventCalendarViewStore.setView w:7 | Switches the view, closes the popover and drops the focus request.
more w 7 not shown: src/lib/features/event-calendar(7): q store src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.setView
mem src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:111 do eventCalendarViewStore.setDate w:7 | Moves to a day, closes the popover and drops the focus request.
more w 7 not shown: src/lib/features/event-calendar(7): q store src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.setDate
mem src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:118 do eventCalendarViewStore.step w:src/lib/features/event-calendar/EventCalendarHeader.svelte:53,src/lib/features/event-calendar/EventCalendarHeader.svelte:70,src/lib/features/event-calendar/EventCalendarView.svelte:71 | Moves one view unit back (`-1`) or forward (`1`), closes the popover and drops the focus request.
mem src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:125 do eventCalendarViewStore.goToToday w:src/lib/app/commands.ts:249,src/lib/features/event-calendar/EventCalendarHeader.svelte:43,src/lib/features/event-calendar/EventCalendarView.svelte:65 | Moves to today (read from the system clock), closes the popover and drops the focus request.
mem src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:132 do eventCalendarViewStore.openPopover w:src/lib/features/event-calendar/EventAllDayLane.svelte:85,src/lib/features/event-calendar/EventBlock.svelte:58,src/lib/features/event-calendar/EventMonthGrid.svelte:134,src/lib/features/event-calendar/EventTimeGrid.svelte:182 | Opens the popover for an event anchored at `rect` (copied).
mem src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:137 do eventCalendarViewStore.closePopover w:12 | Closes the popover.
more w 12 not shown: src/lib/features/event-calendar(12): q store src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.closePopover
mem src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:142 do eventCalendarViewStore.openDialog w:src/lib/features/event-calendar/EventAllDayLane.svelte:49,src/lib/features/event-calendar/EventMonthGrid.svelte:62,src/lib/features/event-calendar/EventPopover.svelte:121,src/lib/features/event-calendar/EventTimeGrid.svelte:177,src/lib/features/event-calendar/event-calendar.service.ts:294 | Opens the dialog with a copy of `payload` under a new session.
mem src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:148 do eventCalendarViewStore.closeDialog w:9 | Closes the dialog.
more w 9 not shown: src/lib/features/event-calendar(9): q store src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.closeDialog
mem src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:153 do eventCalendarViewStore.openHelp w:src/lib/features/event-calendar/EventCalendarHeader.svelte:88,src/lib/features/event-calendar/EventCalendarView.svelte:62 | Opens the keyboard shortcuts help.
mem src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:158 do eventCalendarViewStore.closeHelp w:src/lib/features/event-calendar/EventShortcutsDialog.svelte:7 | Closes the keyboard shortcuts help.
mem src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:166 do eventCalendarViewStore.requestFocus w:src/lib/features/event-calendar/event-calendar.service.ts:273 | Asks the view to focus and pulse the event at `path` once it renders.
mem src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:172 do eventCalendarViewStore.clearFocusRequest w:src/lib/features/event-calendar/EventCalendarView.svelte:180 | Drops the focus request when it is still the one numbered `seq`.
mem src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:177 do eventCalendarViewStore.closeTransient w:src/lib/features/event-calendar/EventCalendarView.svelte:224 | Closes the popover, the dialog and the shortcuts help and drops the focus request; the view calls it when it unmounts.
mem src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:185 do eventCalendarViewStore.setGestureLive w:src/lib/features/event-calendar/event-calendar-gesture-guard.ts:53,src/lib/features/event-calendar/event-calendar-gesture-guard.ts:60 | Marks a pointer gesture live or ended; the gesture controllers call it.
mem src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:190 do eventCalendarViewStore.setNow w:src/lib/features/event-calendar/event-calendar.service.ts:299 | Sets the current instant; the mounted view's clock calls it.
mem src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:195 do eventCalendarViewStore.setShowArchived w:src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte:108 | Shows or hides the archived event notes; the view reloads the events when it changes.
mem src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:200 do eventCalendarViewStore.remapPath w:src/lib/features/event-calendar/event-calendar.service.ts:648,src/lib/features/event-calendar/event-calendar.service.ts:740 | Points the popover, an edit dialog and the focus request at `to` after the note at `from` was renamed.
mem src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:213 do eventCalendarViewStore.initFromSettings w:src/lib/features/event-calendar/EventCalendarView.svelte:40,src/lib/features/event-calendar/event-calendar.service.ts:138,src/lib/features/event-calendar/event-calendar.service.ts:269 | Applies the `defaultView` setting the first time it is called in a session.
mem src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:220 do eventCalendarViewStore.reset w:src/lib/features/event-calendar/event-calendar.service.ts:348 | Restores view, date (today), popover, dialog, shortcuts help, focus request, `gestureLive`, `showArchived` and `initialized`; leaves `nowMs` alone.
## calls
call src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:27 in focusedDate -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:toKey call
call src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:75 in eventCalendarViewStore.visibleDays -> src/lib/features/event-calendar/event-calendar-view.logic.ts:visibleDays call
call src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:80 in eventCalendarViewStore.monthCells -> src/lib/features/event-calendar/event-calendar-view.logic.ts:buildMonthCells call
call src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:84 in eventCalendarViewStore.rangeLabel -> src/lib/features/event-calendar/event-calendar-view.logic.ts:rangeLabel call
call src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:88 in eventCalendarViewStore.todayKey -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:toKey call
call src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:92 in eventCalendarViewStore.nowMinutes -> src/lib/features/event-calendar/event-calendar-view.logic.ts:nowOffsetMinutes call
call src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:119 in eventCalendarViewStore.step -> src/lib/features/event-calendar/event-calendar-view.logic.ts:stepDate call
call src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:126 in eventCalendarViewStore.goToToday -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:toKey call
call src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:224 in eventCalendarViewStore.reset -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:toKey call
