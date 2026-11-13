# module card src/lib/features/event-calendar
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/features/event-calendar ' codemap/modules
sections: neighbors, entry files, files, public, stores, effects, debt
module src/lib/features/event-calendar features files 36 in-modules 7 out-modules 12 pub 16/229 ipc 1/0 card ~4.5k
## neighbors
dep src/lib/app -> src/lib/features/event-calendar 8
dep src/lib/features/backlinks -> src/lib/features/event-calendar 1
dep src/lib/features/rail-shell -> src/lib/features/event-calendar 3
dep src/lib/features/search -> src/lib/features/event-calendar 1
dep src/lib/plugins/calendar -> src/lib/features/event-calendar 4
dep src/lib/plugins/one-on-one -> src/lib/features/event-calendar 1
dep src/lib/plugins/periodic-notes -> src/lib/features/event-calendar 1
dep src/lib/features/event-calendar -> src/lib/components 15
dep src/lib/features/event-calendar -> src/lib/contracts 1
dep src/lib/features/event-calendar -> src/lib/core/editor 8
dep src/lib/features/event-calendar -> src/lib/core/filesystem 5
dep src/lib/features/event-calendar -> src/lib/core/frontmatter 5
dep src/lib/features/event-calendar -> src/lib/core/settings 19
dep src/lib/features/event-calendar -> src/lib/core/trash 3
dep src/lib/features/event-calendar -> src/lib/core/vault 5
dep src/lib/features/event-calendar -> src/lib/features/tasks 1
dep src/lib/features/event-calendar -> src/lib/features/type-definitions 6
dep src/lib/features/event-calendar -> src/lib/types 3
dep src/lib/features/event-calendar -> src/lib/utils 3
in2 src/lib/features/event-calendar 2 modules: src/routes(3) src/lib/plugins/mods(1)
out2 src/lib/features/event-calendar 4 modules: src/lib/features/collection(4) src/lib/core/note-creator(2) src/lib/core/markdown-editor(1) src/lib/features/file-icons(1)
## entry files
entry src/lib/features/event-calendar/event-calendar.service.ts ext-in6 src/lib/app/boot.ts src/lib/app/commands.ts src/lib/app/global-keybindings.ts src/lib/app/lifecycle/app-lifecycle.service.ts src/lib/features/rail-shell/RailNoteList.svelte more importers 1 not shown: src/lib/plugins/calendar(1): q importers src/lib/features/event-calendar/event-calendar.service.ts
entry src/lib/features/event-calendar/event-calendar-view.store.svelte.ts ext-in5 src/lib/app/commands.ts src/lib/features/rail-shell/RailNoteList.svelte src/lib/plugins/calendar/CalendarNavigator.svelte src/lib/plugins/calendar/calendar-rail.service.ts src/lib/plugins/one-on-one/MyPeopleSection.svelte
entry src/lib/features/event-calendar/ShowInCalendarButton.svelte ext-in2 src/lib/features/backlinks/LinkItem.svelte src/lib/features/search/SearchResult.svelte
entry src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts ext-in2 src/lib/features/rail-shell/RailNoteList.svelte src/lib/plugins/periodic-notes/periodic-notes.service.ts
entry src/lib/features/event-calendar/EventCalendarSection.svelte ext-in1 src/lib/app/SettingsPanel.svelte
entry src/lib/features/event-calendar/EventCalendarView.svelte ext-in1 src/lib/app/EditorView.svelte
entry src/lib/features/event-calendar/event-calendar-dates.logic.ts ext-in1 src/lib/plugins/calendar/calendar.logic.ts
entry src/lib/features/event-calendar/event-calendar-keys.logic.ts ext-in1 src/lib/app/global-keybindings.ts
## files
file src/lib/features/event-calendar/EventAllDayLane.svelte component L104 module src/lib/features/event-calendar in1 t1
file src/lib/features/event-calendar/EventBlock.svelte component L122 module src/lib/features/event-calendar in1 t0
file src/lib/features/event-calendar/EventCalendarHeader.svelte component L124 module src/lib/features/event-calendar in1 t0
file src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte component L116 module src/lib/features/event-calendar in1 t0
file src/lib/features/event-calendar/EventCalendarSection.svelte component L273 module src/lib/features/event-calendar in1 t1
file src/lib/features/event-calendar/EventCalendarView.svelte component L290 module src/lib/features/event-calendar in1 t1
file src/lib/features/event-calendar/EventColorSwatches.svelte component L58 module src/lib/features/event-calendar in2 t0
file src/lib/features/event-calendar/EventDailyNoteButton.svelte component L38 module src/lib/features/event-calendar in2 t0
file src/lib/features/event-calendar/EventDayHeaders.svelte component L50 module src/lib/features/event-calendar in1 t0
file src/lib/features/event-calendar/EventDialog.svelte component L223 module src/lib/features/event-calendar in1 t1
file src/lib/features/event-calendar/EventForm.svelte component L190 module src/lib/features/event-calendar in1 t0
file src/lib/features/event-calendar/EventMonthGrid.svelte component L156 module src/lib/features/event-calendar in1 t1
file src/lib/features/event-calendar/EventPopover.svelte component L195 module src/lib/features/event-calendar in1 t1
file src/lib/features/event-calendar/EventShortcutsDialog.svelte component L34 module src/lib/features/event-calendar in1 t0
file src/lib/features/event-calendar/EventTaskChip.svelte component L43 module src/lib/features/event-calendar in2 t0
file src/lib/features/event-calendar/EventTaskLane.svelte component L48 module src/lib/features/event-calendar in1 t1
file src/lib/features/event-calendar/EventTimeGrid.svelte component L336 module src/lib/features/event-calendar in1 t4
file src/lib/features/event-calendar/EventWeekStrip.svelte component L60 module src/lib/features/event-calendar in1 t1
file src/lib/features/event-calendar/ShowInCalendarButton.svelte component L75 module src/lib/features/event-calendar in2 t1
file src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts store L61 module src/lib/features/event-calendar in3 t6 | Bridge from the Calendar to whatever opens a day's daily note.
file src/lib/features/event-calendar/event-calendar-dates.logic.ts logic L346 module src/lib/features/event-calendar in13 t9 | Native, dependency-free date helpers for the event calendar.
file src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts other L143 module src/lib/features/event-calendar in2 t2
file src/lib/features/event-calendar/event-calendar-drag.logic.ts logic L319 module src/lib/features/event-calendar in5 t1 | Pointer gestures of the time grid (create, move and resize) and of the day cells of the month grid and the all-day lane (move to another day).
file src/lib/features/event-calendar/event-calendar-event.logic.ts logic L507 module src/lib/features/event-calendar in10 t4 | Schema of event notes: how a Rust `VaultIndex` entry of the configured event type becomes a calendar event or a Needs-attention issue, what a calendar write pu…
file src/lib/features/event-calendar/event-calendar-focus.logic.ts logic L46 module src/lib/features/event-calendar in1 t1
file src/lib/features/event-calendar/event-calendar-form.logic.ts logic L224 module src/lib/features/event-calendar in3 t1 | Rules of the event dialog's form: building a draft, keeping start, end and all-day consistent, validation messages, the patch an edit writes, and the rename pl…
file src/lib/features/event-calendar/event-calendar-gesture-guard.ts other L162 module src/lib/features/event-calendar in2 t1
file src/lib/features/event-calendar/event-calendar-history.logic.ts logic L107 module src/lib/features/event-calendar in2 t2 | Field-level undo / redo history of the event calendar.
file src/lib/features/event-calendar/event-calendar-keys.logic.ts logic L123 module src/lib/features/event-calendar in3 t2 | Keyboard shortcuts of the Calendar tab, a port of `calender-app-design/src/components/shell/keyboard-shortcuts.tsx` scoped to the view.
file src/lib/features/event-calendar/event-calendar-layout.logic.ts logic L77 module src/lib/features/event-calendar in5 t3 | Time-grid geometry for the event calendar, ported from the prototype's `calender-app-design/src/components/calendar/layout.ts`.
file src/lib/features/event-calendar/event-calendar-tasks.logic.ts logic L96 module src/lib/features/event-calendar in5 t1 | Dated tasks on the Calendar: projects the Rust task index (`get_all_tasks_v2`) onto calendar days.
file src/lib/features/event-calendar/event-calendar-view.logic.ts logic L421 module src/lib/features/event-calendar in9 t2 | View math the Calendar tab renders from: which days each view shows, how the arrows step, the header labels, events grouped per day, month cells and chips, the…
file src/lib/features/event-calendar/event-calendar-view.store.svelte.ts store L231 module src/lib/features/event-calendar in20 t20
file src/lib/features/event-calendar/event-calendar.service.ts service L1587 module src/lib/features/event-calendar in13 t21 | Service of the Calendar tab.
file src/lib/features/event-calendar/event-calendar.store.svelte.ts store L247 module src/lib/features/event-calendar in8 t9 | Reactive data of the Calendar tab: the projected index snapshot, the pending-write overlay, the undo history, the load state and the dated tasks overlay.
file src/lib/features/event-calendar/event-calendar.types.ts types L321 module src/lib/features/event-calendar in17 t0 | Shared types of the event-calendar feature.
## public
sym src/lib/features/event-calendar/EventCalendarSection.svelte:1 component EventCalendarSection L273
sym src/lib/features/event-calendar/EventCalendarView.svelte:1 component EventCalendarView L290
sym src/lib/features/event-calendar/ShowInCalendarButton.svelte:1 component ShowInCalendarButton props:path,class= L75
sym src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts:22 store eventCalendarDailyNoteStore L40
sym src/lib/features/event-calendar/event-calendar-dates.logic.ts:15 type WeekStart L1 | First day of the week: 0 = Sunday, 1 = Monday.
sym src/lib/features/event-calendar/event-calendar-keys.logic.ts:80 fn isTypingTarget(el: EventTarget | null): boolean L6 | Whether a key landing on `el` is typing: an input, textarea or select, or a contenteditable element.
sym src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:50 store eventCalendarViewStore L182 | Reactive state of the Calendar tab: view, date, popover, dialogs and clock.
sym src/lib/features/event-calendar/event-calendar.service.ts:135 fn openEventCalendarTab(options: { date?: string; view?: CalendarViewMode } = {}): void L19 | Opens or focuses the Calendar tab, creating it when absent.
sym src/lib/features/event-calendar/event-calendar.service.ts:164 fn toggleEventCalendarTab(): void L10 | Toggles the Calendar tab: opens if closed, closes if active, focuses if open but not active.
sym src/lib/features/event-calendar/event-calendar.service.ts:283 fn openNewEventDialog(): void L13 | Opens the Calendar tab and the create dialog at the default slot: now, rounded, on today; `dayStartHour` on any other focused day.
sym src/lib/features/event-calendar/event-calendar.service.ts:310 fn acquireCalendarClock(): () => void L20 | Holds the calendar clock, which keeps `eventCalendarViewStore.nowMs` current across midnight and sleep: a tick on first acquire, every 30 s, and on window `foc…
sym src/lib/features/event-calendar/event-calendar.service.ts:339 fn resetEventCalendar(): void L11 | Resets the two event-calendar stores, discards any load in flight and bumps the write generation, so a write still in flight leaves the stores alone when it re…
sym src/lib/features/event-calendar/event-calendar.service.ts:517 fn drainEventCalendarWrites(): Promise<void> L11 | Resolves once the write queue is idle: every write queued before the call, and every write queued while it waits, has settled.
sym src/lib/features/event-calendar/event-calendar.service.ts:657 fn registerEventCalendarPathChangeConsumer(): () => void L3 | Registers the calendar as a path-change consumer, so its undo history follows notes renamed, moved or deleted elsewhere.
sym src/lib/features/event-calendar/event-calendar.service.ts:1537 fn undoEventChangeFromUi(root?: HTMLElement): Promise<void> L3 | The Calendar keys' and the palette's undo: runs `undoEventChange` and reports the outcome in a toast. "Undone: <label>" carries a Redo action that focuses the …
sym src/lib/features/event-calendar/event-calendar.service.ts:1546 fn redoEventChangeFromUi(root?: HTMLElement): Promise<void> L3 | The Calendar keys' and the palette's redo: `undoEventChangeFromUi` the other way round, "Redone: <label>" with an Undo action.
## stores
store src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts:22 eventCalendarDailyNoteStore esc:0
store src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:50 eventCalendarViewStore esc:0
store src/lib/features/event-calendar/event-calendar.store.svelte.ts:74 eventCalendarStore esc:0
## effects
fx-count dom.click 1
fx-count dom.focus 1
fx-count dom.focusin 1
fx-count dom.keydown 2
fx-count dom.pointercancel 1
fx-count dom.pointerdown 2
fx-count dom.pointermove 1
fx-count dom.pointerup 2
fx-count dom.resize 1
fx-count dom.scroll 1
fx-count dom.visibilitychange 1
fx-count svelte.$effect 19
fx-count tauri-fs.exists 4
fx-count tauri-fs.readDir 2
fx-count tauri-fs.readTextFile 1
fx-count timer.setInterval 1
fx-count timer.setTimeout 1
ipc-count ipc:get_all_tasks_v2 1
## debt
-
