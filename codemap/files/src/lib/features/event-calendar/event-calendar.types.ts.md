# file card src/lib/features/event-calendar/event-calendar.types.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/event-calendar/event-calendar.types.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols
file src/lib/features/event-calendar/event-calendar.types.ts types L321 module src/lib/features/event-calendar in17 t0 | Shared types of the event-calendar feature.
## imports
imp src/lib/features/event-calendar/event-calendar.types.ts:11 -> src/lib/core/settings/settings.types.ts type:EventCalendarColor,type:EventCalendarViewMode
## imported-by
imp src/lib/features/event-calendar/EventAllDayLane.svelte:7 -> src/lib/features/event-calendar/event-calendar.types.ts type:EventNote
imp src/lib/features/event-calendar/EventBlock.svelte:7 -> src/lib/features/event-calendar/event-calendar.types.ts type:EventNote
imp src/lib/features/event-calendar/EventCalendarHeader.svelte:8 -> src/lib/features/event-calendar/event-calendar.types.ts type:CalendarViewMode
imp src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte:5 -> src/lib/features/event-calendar/event-calendar.types.ts type:EventIssue
imp src/lib/features/event-calendar/EventColorSwatches.svelte:3 -> src/lib/features/event-calendar/event-calendar.types.ts type:EventColor
imp src/lib/features/event-calendar/EventTimeGrid.svelte:28 -> src/lib/features/event-calendar/event-calendar.types.ts type:DragState
imp src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:5 -> src/lib/features/event-calendar/event-calendar.types.ts type:DayDragState,type:EventNote
imp src/lib/features/event-calendar/event-calendar-drag.logic.ts:14 -> src/lib/features/event-calendar/event-calendar.types.ts type:DayDragState,type:DragState,type:EventNote
imp src/lib/features/event-calendar/event-calendar-event.logic.ts:19 -> src/lib/features/event-calendar/event-calendar.types.ts type:EventColor,type:EventDraft,type:EventIssue,type:EventIssueReason,type:EventNote,type:EventPatch,type:EventProjection,type:EventState,type:PendingWrite
imp src/lib/features/event-calendar/event-calendar-form.logic.ts:15 -> src/lib/features/event-calendar/event-calendar.types.ts type:EventDraft,type:EventNote,type:EventPatch,type:EventState
imp src/lib/features/event-calendar/event-calendar-history.logic.ts:13 -> src/lib/features/event-calendar/event-calendar.types.ts type:EventState,type:HistoryOp
imp src/lib/features/event-calendar/event-calendar-keys.logic.ts:8 -> src/lib/features/event-calendar/event-calendar.types.ts type:CalendarViewMode
imp src/lib/features/event-calendar/event-calendar-layout.logic.ts:8 -> src/lib/features/event-calendar/event-calendar.types.ts type:EventNote,type:PositionedEvent
imp src/lib/features/event-calendar/event-calendar-view.logic.ts:38 -> src/lib/features/event-calendar/event-calendar.types.ts type:CalendarViewMode,type:EventNote
imp src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:12 -> src/lib/features/event-calendar/event-calendar.types.ts type:CalendarViewMode,type:DialogState,type:EventDialogPayload,type:FocusRequest,type:PopoverRect,type:PopoverTarget
imp src/lib/features/event-calendar/event-calendar.service.ts:43 -> src/lib/features/event-calendar/event-calendar.types.ts type:CalendarViewMode,type:EventDraft,type:EventNote,type:EventPatch,type:EventState,type:HistoryOp,type:PendingWrite
imp src/lib/features/event-calendar/event-calendar.store.svelte.ts:16 -> src/lib/features/event-calendar/event-calendar.types.ts type:EventIssue,type:EventNote,type:EventProjection,type:EventState,type:PendingWrite
## reach
in2 src/lib/features/event-calendar/event-calendar.types.ts 21 files in 5 modules: src/lib/features/event-calendar(13) src/lib/app(4) src/lib/plugins/calendar(2) src/lib/features/rail-shell(1) src/lib/plugins/one-on-one(1)
out2 src/lib/features/event-calendar/event-calendar.types.ts 2 files in 1 modules: src/lib/core/settings(2)
## tests
test src/tests/fixtures/event-notes.fixture.ts imports-type src/lib/features/event-calendar/event-calendar.types.ts
test src/tests/lib/features/event-calendar/EventAllDayLane.test.ts imports-type src/lib/features/event-calendar/event-calendar.types.ts
test src/tests/lib/features/event-calendar/EventMonthGrid.test.ts imports-type src/lib/features/event-calendar/event-calendar.types.ts
test src/tests/lib/features/event-calendar/EventPopover.test.ts imports-type src/lib/features/event-calendar/event-calendar.types.ts
test src/tests/lib/features/event-calendar/EventTimeGrid.test.ts imports-type src/lib/features/event-calendar/event-calendar.types.ts
test src/tests/lib/features/event-calendar/event-calendar-day-drag.test.ts imports-type src/lib/features/event-calendar/event-calendar.types.ts
test src/tests/lib/features/event-calendar/event-calendar-drag.logic.test.ts imports-type src/lib/features/event-calendar/event-calendar.types.ts
test src/tests/lib/features/event-calendar/event-calendar-event.logic.test.ts imports-type src/lib/features/event-calendar/event-calendar.types.ts
test src/tests/lib/features/event-calendar/event-calendar-form.logic.test.ts imports-type src/lib/features/event-calendar/event-calendar.types.ts
test src/tests/lib/features/event-calendar/event-calendar-gestures.characterization.test.ts imports-type src/lib/features/event-calendar/event-calendar.types.ts
test src/tests/lib/features/event-calendar/event-calendar-history.logic.test.ts imports-type src/lib/features/event-calendar/event-calendar.types.ts
test src/tests/lib/features/event-calendar/event-calendar-layout.logic.test.ts imports-type src/lib/features/event-calendar/event-calendar.types.ts
test src/tests/lib/features/event-calendar/event-calendar-view.logic.test.ts imports-type src/lib/features/event-calendar/event-calendar.types.ts
test src/tests/lib/features/event-calendar/event-calendar.model.test.ts imports-type src/lib/features/event-calendar/event-calendar.types.ts
test src/tests/lib/features/event-calendar/event-calendar.service.test.ts imports-type src/lib/features/event-calendar/event-calendar.types.ts
test src/tests/lib/features/event-calendar/event-calendar.store.test.ts imports-type src/lib/features/event-calendar/event-calendar.types.ts
## symbols
sym src/lib/features/event-calendar/event-calendar.types.ts:14 type EventColor L1 | One of the event colors (`EVENT_CALENDAR_COLORS`).
by src/lib/features/event-calendar/event-calendar.types.ts:EventColor <- src/lib/features/event-calendar/EventColorSwatches.svelte:3 in (script) import
by src/lib/features/event-calendar/event-calendar.types.ts:EventColor <- src/lib/features/event-calendar/event-calendar-event.logic.ts:20 in (module) import
sym src/lib/features/event-calendar/event-calendar.types.ts:17 type CalendarViewMode L1 | One of the calendar views (`EVENT_CALENDAR_VIEW_MODES`).
by src/lib/features/event-calendar/event-calendar.types.ts:CalendarViewMode <- src/lib/features/event-calendar/EventCalendarHeader.svelte:8 in (script) import
by src/lib/features/event-calendar/event-calendar.types.ts:CalendarViewMode <- src/lib/features/event-calendar/event-calendar-keys.logic.ts:8 in (module) import
by src/lib/features/event-calendar/event-calendar.types.ts:CalendarViewMode <- src/lib/features/event-calendar/event-calendar-view.logic.ts:38 in (module) import
by src/lib/features/event-calendar/event-calendar.types.ts:CalendarViewMode <- src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:13 in (module) import
by src/lib/features/event-calendar/event-calendar.types.ts:CalendarViewMode <- src/lib/features/event-calendar/event-calendar.service.ts:43 in (module) import
sym src/lib/features/event-calendar/event-calendar.types.ts:23 interface EventNote L37 | An event note as the calendar renders it.
by src/lib/features/event-calendar/event-calendar.types.ts:EventNote <- src/lib/features/event-calendar/EventAllDayLane.svelte:7 in (script) import
by src/lib/features/event-calendar/event-calendar.types.ts:EventNote <- src/lib/features/event-calendar/EventBlock.svelte:7 in (script) import
by src/lib/features/event-calendar/event-calendar.types.ts:EventNote <- src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:5 in (module) import
by src/lib/features/event-calendar/event-calendar.types.ts:EventNote <- src/lib/features/event-calendar/event-calendar-drag.logic.ts:14 in (module) import
by src/lib/features/event-calendar/event-calendar.types.ts:EventNote <- src/lib/features/event-calendar/event-calendar-event.logic.ts:24 in (module) import
by src/lib/features/event-calendar/event-calendar.types.ts:EventNote <- src/lib/features/event-calendar/event-calendar-form.logic.ts:15 in (module) import
by src/lib/features/event-calendar/event-calendar.types.ts:EventNote <- src/lib/features/event-calendar/event-calendar-layout.logic.ts:8 in (module) import
by src/lib/features/event-calendar/event-calendar.types.ts:EventNote <- src/lib/features/event-calendar/event-calendar-view.logic.ts:38 in (module) import
more by 2 not shown: src/lib/features/event-calendar(2): q importers src/lib/features/event-calendar/event-calendar.types.ts:EventNote
sym src/lib/features/event-calendar/event-calendar.types.ts:62 interface EventFields L14 | The scheduling fields an event note stores in its frontmatter.
sym src/lib/features/event-calendar/event-calendar.types.ts:78 type EventState L6 | Full calendar-visible state of an event: its fields plus the display title.
by src/lib/features/event-calendar/event-calendar.types.ts:EventState <- src/lib/features/event-calendar/event-calendar-event.logic.ts:27 in (module) import
by src/lib/features/event-calendar/event-calendar.types.ts:EventState <- src/lib/features/event-calendar/event-calendar-form.logic.ts:15 in (module) import
by src/lib/features/event-calendar/event-calendar.types.ts:EventState <- src/lib/features/event-calendar/event-calendar-history.logic.ts:13 in (module) import
by src/lib/features/event-calendar/event-calendar.types.ts:EventState <- src/lib/features/event-calendar/event-calendar.service.ts:43 in (module) import
by src/lib/features/event-calendar/event-calendar.types.ts:EventState <- src/lib/features/event-calendar/event-calendar.store.svelte.ts:16 in (module) import
sym src/lib/features/event-calendar/event-calendar.types.ts:86 type EventPatch L4 | A partial update to an event's fields.
by src/lib/features/event-calendar/event-calendar.types.ts:EventPatch <- src/lib/features/event-calendar/event-calendar-event.logic.ts:25 in (module) import
by src/lib/features/event-calendar/event-calendar.types.ts:EventPatch <- src/lib/features/event-calendar/event-calendar-form.logic.ts:15 in (module) import
by src/lib/features/event-calendar/event-calendar.types.ts:EventPatch <- src/lib/features/event-calendar/event-calendar.service.ts:43 in (module) import
sym src/lib/features/event-calendar/event-calendar.types.ts:92 type EventDraft L6 | Everything needed to create a new event note.
by src/lib/features/event-calendar/event-calendar.types.ts:EventDraft <- src/lib/features/event-calendar/event-calendar-event.logic.ts:21 in (module) import
by src/lib/features/event-calendar/event-calendar.types.ts:EventDraft <- src/lib/features/event-calendar/event-calendar-form.logic.ts:15 in (module) import
by src/lib/features/event-calendar/event-calendar.types.ts:EventDraft <- src/lib/features/event-calendar/event-calendar.service.ts:43 in (module) import
sym src/lib/features/event-calendar/event-calendar.types.ts:100 type EventIssueReason L1 | Why an event-typed note cannot be shown.
by src/lib/features/event-calendar/event-calendar.types.ts:EventIssueReason <- src/lib/features/event-calendar/event-calendar-event.logic.ts:23 in (module) import
sym src/lib/features/event-calendar/event-calendar.types.ts:103 interface EventIssue L10 | One problem found while projecting event notes.
by src/lib/features/event-calendar/event-calendar.types.ts:EventIssue <- src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte:5 in (script) import
by src/lib/features/event-calendar/event-calendar.types.ts:EventIssue <- src/lib/features/event-calendar/event-calendar-event.logic.ts:22 in (module) import
by src/lib/features/event-calendar/event-calendar.types.ts:EventIssue <- src/lib/features/event-calendar/event-calendar.store.svelte.ts:16 in (module) import
sym src/lib/features/event-calendar/event-calendar.types.ts:115 interface EventProjection L8 | Result of projecting the vault entries onto the calendar.
by src/lib/features/event-calendar/event-calendar.types.ts:EventProjection <- src/lib/features/event-calendar/event-calendar-event.logic.ts:26 in (module) import
by src/lib/features/event-calendar/event-calendar.types.ts:EventProjection <- src/lib/features/event-calendar/event-calendar.store.svelte.ts:16 in (module) import
sym src/lib/features/event-calendar/event-calendar.types.ts:128 type PendingWrite L42 | A calendar write that the vault index may not reflect yet.
by src/lib/features/event-calendar/event-calendar.types.ts:PendingWrite <- src/lib/features/event-calendar/event-calendar-event.logic.ts:28 in (module) import
by src/lib/features/event-calendar/event-calendar.types.ts:PendingWrite <- src/lib/features/event-calendar/event-calendar.service.ts:43 in (module) import
by src/lib/features/event-calendar/event-calendar.types.ts:PendingWrite <- src/lib/features/event-calendar/event-calendar.store.svelte.ts:16 in (module) import
sym src/lib/features/event-calendar/event-calendar.types.ts:172 type HistoryOp L35 | One undoable calendar change.
by src/lib/features/event-calendar/event-calendar.types.ts:HistoryOp <- src/lib/features/event-calendar/event-calendar-history.logic.ts:13 in (module) import
by src/lib/features/event-calendar/event-calendar.types.ts:HistoryOp <- src/lib/features/event-calendar/event-calendar.service.ts:43 in (module) import
sym src/lib/features/event-calendar/event-calendar.types.ts:213 interface DragState L25 | A pointer drag in progress on the time grid.
by src/lib/features/event-calendar/event-calendar.types.ts:DragState <- src/lib/features/event-calendar/EventTimeGrid.svelte:28 in (script) import
by src/lib/features/event-calendar/event-calendar.types.ts:DragState <- src/lib/features/event-calendar/event-calendar-drag.logic.ts:14 in (module) import
sym src/lib/features/event-calendar/event-calendar.types.ts:243 interface DayDragState L10 | A pointer drag of an event chip between day cells: the month grid or the all-day lane.
by src/lib/features/event-calendar/event-calendar.types.ts:DayDragState <- src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:5 in (module) import
by src/lib/features/event-calendar/event-calendar.types.ts:DayDragState <- src/lib/features/event-calendar/event-calendar-drag.logic.ts:14 in (module) import
sym src/lib/features/event-calendar/event-calendar.types.ts:255 interface PositionedEvent L8 | A timed event placed in its day column by the overlap layout.
by src/lib/features/event-calendar/event-calendar.types.ts:PositionedEvent <- src/lib/features/event-calendar/event-calendar-layout.logic.ts:8 in (module) import
sym src/lib/features/event-calendar/event-calendar.types.ts:265 interface PopoverRect L10 | Viewport rect the popover anchors to: plain numbers, so the store does no DOM work.
by src/lib/features/event-calendar/event-calendar.types.ts:PopoverRect <- src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:17 in (module) import
sym src/lib/features/event-calendar/event-calendar.types.ts:277 interface PopoverTarget L6 | The event the details popover shows and where it is anchored.
by src/lib/features/event-calendar/event-calendar.types.ts:PopoverTarget <- src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:18 in (module) import
sym src/lib/features/event-calendar/event-calendar.types.ts:285 interface FocusRequest L6 | An event the Calendar view focuses and pulses once its block renders.
by src/lib/features/event-calendar/event-calendar.types.ts:FocusRequest <- src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:16 in (module) import
sym src/lib/features/event-calendar/event-calendar.types.ts:293 type EventDialogPayload L19 | What opens the event dialog: a new event (day and optional range) or an existing note.
by src/lib/features/event-calendar/event-calendar.types.ts:EventDialogPayload <- src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:15 in (module) import
sym src/lib/features/event-calendar/event-calendar.types.ts:314 interface DialogState L8 | The open event dialog; the view store holds `null` while it is closed.
by src/lib/features/event-calendar/event-calendar.types.ts:DialogState <- src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:14 in (module) import
