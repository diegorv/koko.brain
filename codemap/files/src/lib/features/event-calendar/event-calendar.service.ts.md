# file card src/lib/features/event-calendar/event-calendar.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/event-calendar/event-calendar.service.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls, effects
file src/lib/features/event-calendar/event-calendar.service.ts service L1587 module src/lib/features/event-calendar in13 t21 | Service of the Calendar tab.
## imports
imp src/lib/features/event-calendar/event-calendar.service.ts:13 -> pkg:@tauri-apps/plugin-fs exists,readDir,readTextFile
imp src/lib/features/event-calendar/event-calendar.service.ts:16 -> src/lib/contracts/ipc.ts call
imp src/lib/features/event-calendar/event-calendar.service.ts:17 -> src/lib/core/editor/editor.logic.ts EVENT_CALENDAR_VIRTUAL_PATH,findTabIndex
imp src/lib/features/event-calendar/event-calendar.service.ts:18 -> src/lib/core/editor/editor.service.ts openFileInEditor,saveFileByPath
imp src/lib/features/event-calendar/event-calendar.service.ts:19 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/event-calendar/event-calendar.service.ts:20 -> src/lib/core/filesystem/fs.logic.ts generateUniqueName,getFileName,getParentPath,getRelativePath,renamedPath
imp src/lib/features/event-calendar/event-calendar.service.ts:21 -> src/lib/core/filesystem/fs.service.ts createFile,deleteItem,renameItem
imp src/lib/features/event-calendar/event-calendar.service.ts:22 -> src/lib/core/filesystem/path-change.service.ts registerPathChangeConsumer
imp src/lib/features/event-calendar/event-calendar.service.ts:23 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/event-calendar/event-calendar.service.ts:24 -> src/lib/core/trash/trash.service.ts restoreItem
imp src/lib/features/event-calendar/event-calendar.service.ts:25 -> src/lib/core/trash/trash.store.svelte.ts trashStore
imp src/lib/features/event-calendar/event-calendar.service.ts:26 -> src/lib/core/trash/trash.types.ts type:TrashItem
imp src/lib/features/event-calendar/event-calendar.service.ts:27 -> src/lib/core/vault/vault-entries.service.ts getVaultEntries
imp src/lib/features/event-calendar/event-calendar.service.ts:28 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/event-calendar/event-calendar.service.ts:29 -> src/lib/core/frontmatter/frontmatter-write.service.ts FrontmatterWriteError,updateNoteFrontmatter,type:FrontmatterWriteReason
imp src/lib/features/event-calendar/event-calendar.service.ts:30 -> src/lib/core/frontmatter/properties.logic.ts detectLossyFrontmatter,extractBody,parseFrontmatterProperties,rebuildContent
imp src/lib/features/event-calendar/event-calendar.service.ts:31 -> src/lib/features/type-definitions/type-definitions.service.ts createTypedNote
imp src/lib/features/event-calendar/event-calendar.service.ts:32 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/features/event-calendar/event-calendar.service.ts:33 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/features/event-calendar/event-calendar.service.ts:34 -> src/lib/utils/debug.ts error
imp src/lib/features/event-calendar/event-calendar.service.ts:35 -> src/lib/features/event-calendar/event-calendar-event.logic.ts applyEventDraft,applyEventFields,eventFileBase,eventState,eventsFromEntries,prunePending,resolveEventTypeName,sameEventState
imp src/lib/features/event-calendar/event-calendar.service.ts:36 -> src/lib/features/event-calendar/event-calendar-drag.logic.ts type:EventTiming
imp src/lib/features/event-calendar/event-calendar.service.ts:37 -> src/lib/features/event-calendar/event-calendar-form.logic.ts planTitleChange,type:EventFormPatch
imp src/lib/features/event-calendar/event-calendar.service.ts:38 -> src/lib/features/event-calendar/event-calendar-tasks.logic.ts tasksFromGroups
imp src/lib/features/event-calendar/event-calendar.service.ts:39 -> src/lib/features/event-calendar/event-calendar-history.logic.ts dropPath,pushOp,refuseOp,removeOp,takeRedo,takeUndo
imp src/lib/features/event-calendar/event-calendar.service.ts:40 -> src/lib/features/event-calendar/event-calendar.store.svelte.ts eventCalendarStore
imp src/lib/features/event-calendar/event-calendar.service.ts:41 -> src/lib/features/event-calendar/event-calendar-view.logic.ts defaultCreateSlot,focusViewFor
imp src/lib/features/event-calendar/event-calendar.service.ts:42 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
imp src/lib/features/event-calendar/event-calendar.service.ts:43 -> src/lib/features/event-calendar/event-calendar.types.ts type:CalendarViewMode,type:EventDraft,type:EventNote,type:EventPatch,type:EventState,type:HistoryOp,type:PendingWrite
## imported-by
imp src/lib/app/boot.ts:10 -> src/lib/features/event-calendar/event-calendar.service.ts drainEventCalendarWrites
imp src/lib/app/commands.ts:35 -> src/lib/features/event-calendar/event-calendar.service.ts openEventCalendarTab,openNewEventDialog,redoEventChangeFromUi,toggleEventCalendarTab,undoEventChangeFromUi
imp src/lib/app/global-keybindings.ts:14 -> src/lib/features/event-calendar/event-calendar.service.ts toggleEventCalendarTab
imp src/lib/app/lifecycle/app-lifecycle.service.ts:58 -> src/lib/features/event-calendar/event-calendar.service.ts drainEventCalendarWrites,registerEventCalendarPathChangeConsumer,resetEventCalendar
imp src/lib/features/event-calendar/EventCalendarView.svelte:15 -> src/lib/features/event-calendar/event-calendar.service.ts acquireCalendarClock,deleteEventFromUi,loadCalendarTasks,loadEvents,openNewEventDialog,redoEventChangeFromUi,undoEventChangeFromUi
imp src/lib/features/event-calendar/EventDialog.svelte:12 -> src/lib/features/event-calendar/event-calendar.service.ts createEvent,deleteEventFromUi,duplicateEventFromUi,editEvent,eventErrorMessage,toastEventError
imp src/lib/features/event-calendar/EventForm.svelte:14 -> src/lib/features/event-calendar/event-calendar.service.ts eventErrorMessage
imp src/lib/features/event-calendar/EventPopover.svelte:11 -> src/lib/features/event-calendar/event-calendar.service.ts deleteEventFromUi,duplicateEventFromUi
imp src/lib/features/event-calendar/EventTimeGrid.svelte:20 -> src/lib/features/event-calendar/event-calendar.service.ts moveEvent,resizeEvent,toastEventError
imp src/lib/features/event-calendar/ShowInCalendarButton.svelte:8 -> src/lib/features/event-calendar/event-calendar.service.ts findCalendarEvent,openEventInCalendar
imp src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:2 -> src/lib/features/event-calendar/event-calendar.service.ts moveEventToDay,toastEventError
imp src/lib/features/rail-shell/RailNoteList.svelte:59 -> src/lib/features/event-calendar/event-calendar.service.ts acquireCalendarClock
imp src/lib/plugins/calendar/CalendarNavigator.svelte:10 -> src/lib/features/event-calendar/event-calendar.service.ts acquireCalendarClock,openEventCalendarTab
## reach
in2 src/lib/features/event-calendar/event-calendar.service.ts 9 files in 6 modules: src/lib/app(3) src/lib/features/event-calendar(2) src/lib/features/backlinks(1) src/lib/features/search(1) src/lib/plugins/calendar(1) +1 modules: q impact src/lib/features/event-calendar/event-calendar.service.ts --depth 2
out2 src/lib/features/event-calendar/event-calendar.service.ts 35 files in 13 modules: src/lib/core/settings(6) src/lib/utils(5) src/lib/core/filesystem(4) src/lib/features/type-definitions(4) src/lib/contracts(3) +8 modules
## tests
test src/tests/lib/features/event-calendar/event-calendar.service.test.ts imports src/lib/features/event-calendar/event-calendar.service.ts mirror
test src/tests/fixtures/calendar-vault.fixture.ts imports src/lib/features/event-calendar/event-calendar.service.ts
test src/tests/lib/features/backlinks/LinkItem.test.ts imports src/lib/features/event-calendar/event-calendar.service.ts
test src/tests/lib/features/event-calendar/EventCalendarView.test.ts imports src/lib/features/event-calendar/event-calendar.service.ts
test src/tests/lib/features/event-calendar/EventDialog.test.ts imports src/lib/features/event-calendar/event-calendar.service.ts
test src/tests/lib/features/event-calendar/ShowInCalendarButton.test.ts imports src/lib/features/event-calendar/event-calendar.service.ts
test src/tests/lib/features/event-calendar/event-calendar.model.test.ts imports src/lib/features/event-calendar/event-calendar.service.ts
test src/tests/lib/features/search/SearchResult.test.ts imports src/lib/features/event-calendar/event-calendar.service.ts
test src/tests/lib/plugins/calendar/CalendarNavigator.test.ts imports src/lib/features/event-calendar/event-calendar.service.ts
test src/tests/lib/app/boot.test.ts mocks src/lib/features/event-calendar/event-calendar.service.ts
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts mocks src/lib/features/event-calendar/event-calendar.service.ts
test src/tests/lib/app/tauri-listeners.service.test.ts mocks src/lib/features/event-calendar/event-calendar.service.ts
test src/tests/lib/core/vault/vault.service.switch-save.test.ts mocks src/lib/features/event-calendar/event-calendar.service.ts
test src/tests/lib/core/vault/vault.service.test.ts mocks src/lib/features/event-calendar/event-calendar.service.ts
test src/tests/lib/features/deep-link/deep-link.service.test.ts mocks src/lib/features/event-calendar/event-calendar.service.ts
test src/tests/lib/features/event-calendar/EventAllDayLane.test.ts mocks src/lib/features/event-calendar/event-calendar.service.ts
test src/tests/lib/features/event-calendar/EventMonthGrid.test.ts mocks src/lib/features/event-calendar/event-calendar.service.ts
test src/tests/lib/features/event-calendar/EventPopover.test.ts mocks src/lib/features/event-calendar/event-calendar.service.ts
test src/tests/lib/features/event-calendar/EventTimeGrid.test.ts mocks src/lib/features/event-calendar/event-calendar.service.ts
test src/tests/lib/features/event-calendar/event-calendar-day-drag.test.ts mocks src/lib/features/event-calendar/event-calendar.service.ts
test src/tests/lib/features/event-calendar/event-calendar-gestures.characterization.test.ts mocks src/lib/features/event-calendar/event-calendar.service.ts
## symbols
sym src/lib/features/event-calendar/event-calendar.service.ts:74 fn loadEvents(): Promise<void> L30 | Projects the current vault entries snapshot into `eventCalendarStore`.
by src/lib/features/event-calendar/event-calendar.service.ts:loadEvents <- src/lib/features/event-calendar/EventCalendarView.svelte:134 in $effect@121 call
sym src/lib/features/event-calendar/event-calendar.service.ts:114 fn loadCalendarTasks(): Promise<void> L13 | Reads the Rust task index (`get_all_tasks_v2`, every task of the vault) and stores its dated tasks in `eventCalendarStore.tasks`.
by src/lib/features/event-calendar/event-calendar.service.ts:loadCalendarTasks <- src/lib/features/event-calendar/EventCalendarView.svelte:211 in $effect@205 call
sym src/lib/features/event-calendar/event-calendar.service.ts:135 fn openEventCalendarTab(options: { date?: string; view?: CalendarViewMode } = {}): void L19 | Opens or focuses the Calendar tab, creating it when absent.
by src/lib/features/event-calendar/event-calendar.service.ts:openEventCalendarTab <- src/lib/app/commands.ts:248 in getBuiltInCommands call
by src/lib/features/event-calendar/event-calendar.service.ts:openEventCalendarTab <- src/lib/plugins/calendar/CalendarNavigator.svelte:77 in openCalendarTab call
sym src/lib/features/event-calendar/event-calendar.service.ts:156 fn closeEventCalendarTab(): void L6 | Closes the Calendar tab if it exists.
sym src/lib/features/event-calendar/event-calendar.service.ts:164 fn toggleEventCalendarTab(): void L10 | Toggles the Calendar tab: opens if closed, closes if active, focuses if open but not active.
by src/lib/features/event-calendar/event-calendar.service.ts:toggleEventCalendarTab <- src/lib/app/commands.ts:232 in getBuiltInCommands call
by src/lib/features/event-calendar/event-calendar.service.ts:toggleEventCalendarTab <- src/lib/app/global-keybindings.ts:130 in GLOBAL_KEYBINDINGS call
sym src/lib/features/event-calendar/event-calendar.service.ts:251 fn findCalendarEvent(path: string): Promise<EventNote | null> L3 | The calendar event at `path`, whether or not the Calendar tab has loaded.
by src/lib/features/event-calendar/event-calendar.service.ts:findCalendarEvent <- src/lib/features/event-calendar/ShowInCalendarButton.svelte:39 in $effect@25 call
sym src/lib/features/event-calendar/event-calendar.service.ts:266 fn openEventInCalendar(path: string): Promise<boolean> L10 | Opens the Calendar on the day of the event at `path` and asks the view to focus and pulse its block.
by src/lib/features/event-calendar/event-calendar.service.ts:openEventInCalendar <- src/lib/features/event-calendar/ShowInCalendarButton.svelte:53 in handleClick call
sym src/lib/features/event-calendar/event-calendar.service.ts:283 fn openNewEventDialog(): void L13 | Opens the Calendar tab and the create dialog at the default slot: now, rounded, on today; `dayStartHour` on any other focused day.
by src/lib/features/event-calendar/event-calendar.service.ts:openNewEventDialog <- src/lib/app/commands.ts:240 in getBuiltInCommands call
by src/lib/features/event-calendar/event-calendar.service.ts:openNewEventDialog <- src/lib/features/event-calendar/EventCalendarView.svelte:74 in handleKeydown call
sym src/lib/features/event-calendar/event-calendar.service.ts:310 fn acquireCalendarClock(): () => void L20 | Holds the calendar clock, which keeps `eventCalendarViewStore.nowMs` current across midnight and sleep: a tick on first acquire, every 30 s, and on window `foc…
by src/lib/features/event-calendar/event-calendar.service.ts:acquireCalendarClock <- src/lib/features/event-calendar/EventCalendarView.svelte:220 in $effect@220 call
by src/lib/features/event-calendar/event-calendar.service.ts:acquireCalendarClock <- src/lib/features/rail-shell/RailNoteList.svelte:119 in $effect@117 call
by src/lib/features/event-calendar/event-calendar.service.ts:acquireCalendarClock <- src/lib/plugins/calendar/CalendarNavigator.svelte:21 in $effect@21 call
sym src/lib/features/event-calendar/event-calendar.service.ts:339 fn resetEventCalendar(): void L11 | Resets the two event-calendar stores, discards any load in flight and bumps the write generation, so a write still in flight leaves the stores alone when it re…
by src/lib/features/event-calendar/event-calendar.service.ts:resetEventCalendar <- src/lib/app/lifecycle/app-lifecycle.service.ts:149 in initializeVault call +1
sym src/lib/features/event-calendar/event-calendar.service.ts:414 type EventChangeLabel L1 | Label of a recorded calendar change.
sym src/lib/features/event-calendar/event-calendar.service.ts:417 type EventUpdateLabel L1 | Label of a recorded `update` op.
sym src/lib/features/event-calendar/event-calendar.service.ts:420 interface EventChangeResult L14 | Outcome of `undoEventChange` / `redoEventChange`.
sym src/lib/features/event-calendar/event-calendar.service.ts:436 interface UpdateEventOptions L6 | Options of `updateEventFields`.
sym src/lib/features/event-calendar/event-calendar.service.ts:517 fn drainEventCalendarWrites(): Promise<void> L11 | Resolves once the write queue is idle: every write queued before the call, and every write queued while it waits, has settled.
by src/lib/features/event-calendar/event-calendar.service.ts:drainEventCalendarWrites <- src/lib/app/boot.ts:42 in registerAppPorts ref
by src/lib/features/event-calendar/event-calendar.service.ts:drainEventCalendarWrites <- src/lib/app/lifecycle/app-lifecycle.service.ts:198 in initializeVault call
sym src/lib/features/event-calendar/event-calendar.service.ts:657 fn registerEventCalendarPathChangeConsumer(): () => void L3 | Registers the calendar as a path-change consumer, so its undo history follows notes renamed, moved or deleted elsewhere.
by src/lib/features/event-calendar/event-calendar.service.ts:registerEventCalendarPathChangeConsumer <- src/lib/app/lifecycle/app-lifecycle.service.ts:265 in initializeVault call
sym src/lib/features/event-calendar/event-calendar.service.ts:815 fn updateEventFields(path: string, patch: EventPatch, options: UpdateEventOptions): Promise<void> L9 | Writes calendar fields to an existing event, queued per path.
sym src/lib/features/event-calendar/event-calendar.service.ts:830 fn moveEvent(path: string, timing: EventTiming): Promise<void> L3 | Moves an event to a new day and time range (a drag), as a 'Move event' op.
by src/lib/features/event-calendar/event-calendar.service.ts:moveEvent <- src/lib/features/event-calendar/EventTimeGrid.svelte:194 in commitDrop call
sym src/lib/features/event-calendar/event-calendar.service.ts:842 fn moveEventToDay(path: string, date: string): Promise<void> L3 | Moves an event to another day (a drag in the month grid or the all-day lane), as a 'Move event' op.
by src/lib/features/event-calendar/event-calendar.service.ts:moveEventToDay <- src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:136 in DayDrag.#commit call
sym src/lib/features/event-calendar/event-calendar.service.ts:851 fn resizeEvent(path: string, end: number): Promise<void> L3 | Changes an event's end (a resize), as a 'Resize event' op.
by src/lib/features/event-calendar/event-calendar.service.ts:resizeEvent <- src/lib/features/event-calendar/EventTimeGrid.svelte:194 in commitDrop call
sym src/lib/features/event-calendar/event-calendar.service.ts:868 fn editEvent(path: string, patch: EventFormPatch): Promise<string> L9 | Saves the edit dialog as one queued unit and one 'Edit event' op.
by src/lib/features/event-calendar/event-calendar.service.ts:editEvent <- src/lib/features/event-calendar/EventDialog.svelte:124 in save call
sym src/lib/features/event-calendar/event-calendar.service.ts:879 type EventCalendarErrorReason L1 | Why a create, duplicate, restore or timing write was refused.
sym src/lib/features/event-calendar/event-calendar.service.ts:891 class EventCalendarError extends Error L10 | A create, duplicate, restore or timing write the calendar refused; `toastEventError` shows its message.
sym src/lib/features/event-calendar/event-calendar.service.ts:920 fn createEvent(draft: EventDraft): Promise<string> L4 | Creates an event note through `createTypedNote`, so it lands in the same folder, with the same dedupe and template, as the type sidebar's "New Event".
by src/lib/features/event-calendar/event-calendar.service.ts:createEvent <- src/lib/features/event-calendar/EventDialog.svelte:151 in create call
sym src/lib/features/event-calendar/event-calendar.service.ts:995 fn duplicateEvent(path: string): Promise<string> L37 | Duplicates an event note into the same folder as "<title> (copy).md", queued after the writes on `path` and on the copy's path, which a later write there waits…
sym src/lib/features/event-calendar/event-calendar.service.ts:1072 fn deleteEvent(path: string): Promise<void> L7 | Moves an event note to the Trash, queued per path, and records a 'Delete event' op that can restore it.
sym src/lib/features/event-calendar/event-calendar.service.ts:1237 fn restoreDeletedEvent(path: string, trashId?: string): Promise<string> L7 | Restores a deleted event note from the Trash, queued per path.
sym src/lib/features/event-calendar/event-calendar.service.ts:1252 fn undoDeleteEvent(path: string): Promise<string> L6 | The toast's Undo of a delete: restores the event and retires the delete op, so Cmd+Z does not offer it again.
sym src/lib/features/event-calendar/event-calendar.service.ts:1366 fn undoEventChange(): Promise<EventChangeResult> L3 | Undoes the newest calendar change when the note still shows its result.
sym src/lib/features/event-calendar/event-calendar.service.ts:1375 fn redoEventChange(): Promise<EventChangeResult> L3 | Redoes the newest undone change when the note still shows its prior state.
sym src/lib/features/event-calendar/event-calendar.service.ts:1397 fn eventErrorMessage(err: unknown): string L9 | The user-facing text of a failed calendar write, for an inline error.
by src/lib/features/event-calendar/event-calendar.service.ts:eventErrorMessage <- src/lib/features/event-calendar/EventDialog.svelte:154 in create call
by src/lib/features/event-calendar/event-calendar.service.ts:eventErrorMessage <- src/lib/features/event-calendar/EventForm.svelte:55 in handleSubmit call
sym src/lib/features/event-calendar/event-calendar.service.ts:1415 fn toastEventError(err: unknown, path: string): void L12 | Reports a failed calendar write in a toast.
by src/lib/features/event-calendar/event-calendar.service.ts:toastEventError <- src/lib/features/event-calendar/EventDialog.svelte:127 in save call
by src/lib/features/event-calendar/event-calendar.service.ts:toastEventError <- src/lib/features/event-calendar/EventTimeGrid.svelte:196 in commitDrop call
by src/lib/features/event-calendar/event-calendar.service.ts:toastEventError <- src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:138 in DayDrag.#commit call
sym src/lib/features/event-calendar/event-calendar.service.ts:1456 fn deleteEventFromUi(path: string, root: HTMLElement | undefined): Promise<void> L27 | The popover's and the dialog's Delete: deletes the event and shows an "Event deleted" toast, described by the event's title, whose Undo restores it through `un…
by src/lib/features/event-calendar/event-calendar.service.ts:deleteEventFromUi <- src/lib/features/event-calendar/EventCalendarView.svelte:80 in handleKeydown call
by src/lib/features/event-calendar/event-calendar.service.ts:deleteEventFromUi <- src/lib/features/event-calendar/EventDialog.svelte:171 in remove call
by src/lib/features/event-calendar/event-calendar.service.ts:deleteEventFromUi <- src/lib/features/event-calendar/EventPopover.svelte:130 in deleteNote call
sym src/lib/features/event-calendar/event-calendar.service.ts:1492 fn duplicateEventFromUi(path: string, root: HTMLElement | undefined): Promise<void> L15 | The popover's and the dialog's Duplicate: duplicates the event, shows an "Event duplicated" toast with the copy's title, and once the view has rendered moves f…
by src/lib/features/event-calendar/event-calendar.service.ts:duplicateEventFromUi <- src/lib/features/event-calendar/EventDialog.svelte:180 in duplicate call
by src/lib/features/event-calendar/event-calendar.service.ts:duplicateEventFromUi <- src/lib/features/event-calendar/EventPopover.svelte:139 in duplicateNote call
sym src/lib/features/event-calendar/event-calendar.service.ts:1537 fn undoEventChangeFromUi(root?: HTMLElement): Promise<void> L3 | The Calendar keys' and the palette's undo: runs `undoEventChange` and reports the outcome in a toast. "Undone: <label>" carries a Redo action that focuses the …
by src/lib/features/event-calendar/event-calendar.service.ts:undoEventChangeFromUi <- src/lib/app/commands.ts:257 in getBuiltInCommands call
by src/lib/features/event-calendar/event-calendar.service.ts:undoEventChangeFromUi <- src/lib/features/event-calendar/EventCalendarView.svelte:86 in handleKeydown call
sym src/lib/features/event-calendar/event-calendar.service.ts:1546 fn redoEventChangeFromUi(root?: HTMLElement): Promise<void> L3 | The Calendar keys' and the palette's redo: `undoEventChangeFromUi` the other way round, "Redone: <label>" with an Undo action.
by src/lib/features/event-calendar/event-calendar.service.ts:redoEventChangeFromUi <- src/lib/app/commands.ts:265 in getBuiltInCommands call
by src/lib/features/event-calendar/event-calendar.service.ts:redoEventChangeFromUi <- src/lib/features/event-calendar/EventCalendarView.svelte:89 in handleKeydown call
## locals
local src/lib/features/event-calendar/event-calendar.service.ts:183 fn projectionOptions() L10
local src/lib/features/event-calendar/event-calendar.service.ts:195 fn withoutPending({ pending: _pending, ...event }: EventNote & { pending?: boolean }): EventNote L3
local src/lib/features/event-calendar/event-calendar.service.ts:211 fn lookupCalendarEvent(path: string): Promise<{ event: EventNote | null; events: EventNote[] }> L29
local src/lib/features/event-calendar/event-calendar.service.ts:298 fn tick(): void L3
local src/lib/features/event-calendar/event-calendar.service.ts:444 fn holdPath(path: string, promise: Promise<unknown>): void L8
local src/lib/features/event-calendar/event-calendar.service.ts:461 fn joinPath(path: string): Promise<() => void> L7
local src/lib/features/event-calendar/event-calendar.service.ts:470 fn generationCheck(): () => boolean L4
local src/lib/features/event-calendar/event-calendar.service.ts:476 fn claimPath<T>(path: string, task: (isCurrent: () => boolean) => Promise<T>, isCurrent: () => boolean): Promise<T> L6
local src/lib/features/event-calendar/event-calendar.service.ts:487 fn takeTurn<T>(start: () => Promise<T>, after: Promise<unknown> = Promise.resolve()): Promise<T> L12
local src/lib/features/event-calendar/event-calendar.service.ts:506 fn enqueue<T>(path: string, task: (isCurrent: () => boolean) => Promise<T>): Promise<T> L5
local src/lib/features/event-calendar/event-calendar.service.ts:530 fn fileBase(path: string): string L4
local src/lib/features/event-calendar/event-calendar.service.ts:536 fn requireEvent(path: string): EventNote L6
local src/lib/features/event-calendar/event-calendar.service.ts:549 fn patchedState(before: EventState, patch: EventPatch, title: string): EventState L13
local src/lib/features/event-calendar/event-calendar.service.ts:564 fn patchBetween(from: EventState, to: EventState): EventPatch L14
local src/lib/features/event-calendar/event-calendar.service.ts:583 fn asOwnPathChange<T>(from: string, to: string | null, change: () => Promise<T>): Promise<T> L9
local src/lib/features/event-calendar/event-calendar.service.ts:594 fn takeOwnPathChange(from: string, to: string | null): boolean L8
local src/lib/features/event-calendar/event-calendar.service.ts:631 fn followPathChange(from: string, to: string | null): void L20
local src/lib/features/event-calendar/event-calendar.service.ts:662 fn record(op: HistoryOp): void L3
local src/lib/features/event-calendar/event-calendar.service.ts:680 fn writeEvent(path: string, current: EventNote, after: EventState, patch: EventPatch, options: { label: EventUpdateLabel; record: bo… L35
local src/lib/features/event-calendar/event-calendar.service.ts:721 fn renameAndWrite(path: string, rename: { name: string; path: string } | null, current: EventNote, before: EventState, after: EventState… L82
local src/lib/features/event-calendar/event-calendar.service.ts:903 fn showCreated(event: EventNote, label: 'Create event' | 'Duplicate event'): void L4
local src/lib/features/event-calendar/event-calendar.service.ts:932 fn createNow(draft: EventDraft, isCurrent: () => boolean): Promise<string> L50
local src/lib/features/event-calendar/event-calendar.service.ts:1040 fn deleteNow(path: string, isCurrent: () => boolean): Promise<string | undefined> L23
local src/lib/features/event-calendar/event-calendar.service.ts:1081 fn findTrashEntry(path: string, trashId: string | undefined): TrashItem | undefined L14
local src/lib/features/event-calendar/event-calendar.service.ts:1100 fn findDeleteOp(path: string, trashId?: string): Extract<HistoryOp, { kind: 'delete' }> | undefined L7
local src/lib/features/event-calendar/event-calendar.service.ts:1122 fn opsUpTo(path: string, anchor: HistoryOp | undefined): Set<HistoryOp> L13
local src/lib/features/event-calendar/event-calendar.service.ts:1137 fn followFilename(state: EventState, from: string, to: string): EventState L3
local src/lib/features/event-calendar/event-calendar.service.ts:1161 fn restoreNow(path: string, trashId: string | undefined, state: EventState | undefined, isCurrent: () => boolean, anchor: HistoryOp … L62
local src/lib/features/event-calendar/event-calendar.service.ts:1264 fn applyNoteOp(op: Exclude<HistoryOp, { kind: 'update' }>, direction: 'undo' | 'redo'): Promise<EventChangeResult> L32
local src/lib/features/event-calendar/event-calendar.service.ts:1307 fn applyHistory(direction: 'undo' | 'redo'): Promise<EventChangeResult> L13
local src/lib/features/event-calendar/event-calendar.service.ts:1325 fn applyHistoryNow(direction: 'undo' | 'redo'): Promise<EventChangeResult> L34
local src/lib/features/event-calendar/event-calendar.service.ts:1429 fn focusRoot(root: HTMLElement | undefined): void L3
local src/lib/features/event-calendar/event-calendar.service.ts:1439 fn liveRoot(root: HTMLElement | undefined): HTMLElement | undefined L4
local src/lib/features/event-calendar/event-calendar.service.ts:1551 fn applyEventChangeFromUi(direction: 'undo' | 'redo', root: HTMLElement | undefined): Promise<void> L37
## calls
more calls codemap/files/src/lib/features/event-calendar/event-calendar.service.ts.calls.md
## effects
ipc-call src/lib/features/event-calendar/event-calendar.service.ts:119 in loadCalendarTasks -> ipc:get_all_tasks_v2 -> src-tauri/src/commands/vault.rs:652
fx src/lib/features/event-calendar/event-calendar.service.ts:313 timer.setInterval delay=CLOCK_INTERVAL_MS in acquireCalendarClock
fx src/lib/features/event-calendar/event-calendar.service.ts:314 dom.focus window in acquireCalendarClock
fx src/lib/features/event-calendar/event-calendar.service.ts:315 dom.visibilitychange document in acquireCalendarClock
reg src/lib/features/event-calendar/event-calendar.service.ts:658 src/lib/core/filesystem/path-change.service.ts:registerPathChangeConsumer in registerEventCalendarPathChangeConsumer args={ name: 'event-calendar', pathChanged: followPathChange }
fx src/lib/features/event-calendar/event-calendar.service.ts:693 tauri-fs.readDir in writeEvent
fx src/lib/features/event-calendar/event-calendar.service.ts:766 tauri-fs.exists in renameAndWrite
fx src/lib/features/event-calendar/event-calendar.service.ts:999 tauri-fs.readTextFile in duplicateEvent
fx src/lib/features/event-calendar/event-calendar.service.ts:1009 tauri-fs.readDir in duplicateEvent
fx src/lib/features/event-calendar/event-calendar.service.ts:1187 tauri-fs.exists in restoreNow
fx src/lib/features/event-calendar/event-calendar.service.ts:1269 tauri-fs.exists in applyNoteOp
fx src/lib/features/event-calendar/event-calendar.service.ts:1335 tauri-fs.exists in applyHistoryNow
