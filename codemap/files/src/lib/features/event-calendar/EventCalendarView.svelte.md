# file card src/lib/features/event-calendar/EventCalendarView.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/event-calendar/EventCalendarView.svelte ' codemap/files
file src/lib/features/event-calendar/EventCalendarView.svelte component L290 module src/lib/features/event-calendar in1 t1
## imports
imp src/lib/features/event-calendar/EventCalendarView.svelte:12 -> src/lib/components/ui/tooltip/index.ts *
imp src/lib/features/event-calendar/EventCalendarView.svelte:13 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/event-calendar/EventCalendarView.svelte:14 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/event-calendar/EventCalendarView.svelte:15 -> src/lib/features/event-calendar/event-calendar.service.ts acquireCalendarClock,deleteEventFromUi,loadCalendarTasks,loadEvents,openNewEventDialog,redoEventChangeFromUi,undoEventChangeFromUi
imp src/lib/features/event-calendar/EventCalendarView.svelte:24 -> src/lib/features/event-calendar/event-calendar.store.svelte.ts eventCalendarStore
imp src/lib/features/event-calendar/EventCalendarView.svelte:25 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
imp src/lib/features/event-calendar/EventCalendarView.svelte:26 -> src/lib/features/event-calendar/event-calendar-keys.logic.ts isTypingTarget,resolveCalendarKey
imp src/lib/features/event-calendar/EventCalendarView.svelte:27 -> src/lib/features/event-calendar/EventCalendarHeader.svelte default
imp src/lib/features/event-calendar/EventCalendarView.svelte:28 -> src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte default
imp src/lib/features/event-calendar/EventCalendarView.svelte:29 -> src/lib/features/event-calendar/EventDialog.svelte default
imp src/lib/features/event-calendar/EventCalendarView.svelte:30 -> src/lib/features/event-calendar/EventMonthGrid.svelte default
imp src/lib/features/event-calendar/EventCalendarView.svelte:31 -> src/lib/features/event-calendar/EventPopover.svelte default
imp src/lib/features/event-calendar/EventCalendarView.svelte:32 -> src/lib/features/event-calendar/EventShortcutsDialog.svelte default
imp src/lib/features/event-calendar/EventCalendarView.svelte:33 -> src/lib/features/event-calendar/EventTimeGrid.svelte default
imp src/lib/features/event-calendar/EventCalendarView.svelte:34 -> src/lib/features/event-calendar/EventWeekStrip.svelte default
## imported-by
imp src/lib/app/EditorView.svelte:21 -> src/lib/features/event-calendar/EventCalendarView.svelte default
## reach
in2 src/lib/features/event-calendar/EventCalendarView.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/event-calendar/EventCalendarView.svelte 48 files in 12 modules: src/lib/features/event-calendar(19) src/lib/components(8) src/lib/core/editor(3) src/lib/core/filesystem(3) src/lib/core/settings(3) +7 modules
## tests
test src/tests/lib/features/event-calendar/EventCalendarView.test.ts imports src/lib/features/event-calendar/EventCalendarView.svelte mirror
## symbols
sym src/lib/features/event-calendar/EventCalendarView.svelte:1 component EventCalendarView L290
by src/lib/features/event-calendar/EventCalendarView.svelte:default <- src/lib/app/EditorView.svelte:79 in (markup) mount
## locals
local src/lib/features/event-calendar/EventCalendarView.svelte:48 fn handleKeydown(e: KeyboardEvent) L45
local src/lib/features/event-calendar/EventCalendarView.svelte:100 fn parkFocusAfterDelete() L5
local src/lib/features/event-calendar/EventCalendarView.svelte:190 fn pulse(block: HTMLElement) L7
## mounts
mount src/lib/features/event-calendar/EventCalendarView.svelte:238 EventCalendarHeader -> src/lib/features/event-calendar/EventCalendarHeader.svelte
mount src/lib/features/event-calendar/EventCalendarView.svelte:247 EventMonthGrid -> src/lib/features/event-calendar/EventMonthGrid.svelte
mount src/lib/features/event-calendar/EventCalendarView.svelte:251 EventWeekStrip -> src/lib/features/event-calendar/EventWeekStrip.svelte
mount src/lib/features/event-calendar/EventCalendarView.svelte:255 EventTimeGrid -> src/lib/features/event-calendar/EventTimeGrid.svelte
mount src/lib/features/event-calendar/EventCalendarView.svelte:261 EventCalendarNeedsAttention -> src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte
mount src/lib/features/event-calendar/EventCalendarView.svelte:262 EventPopover -> src/lib/features/event-calendar/EventPopover.svelte
mount src/lib/features/event-calendar/EventCalendarView.svelte:263 EventDialog -> src/lib/features/event-calendar/EventDialog.svelte
mount src/lib/features/event-calendar/EventCalendarView.svelte:264 EventShortcutsDialog -> src/lib/features/event-calendar/EventShortcutsDialog.svelte
## mounted-at
mount src/lib/app/EditorView.svelte:79 EventCalendarView -> src/lib/features/event-calendar/EventCalendarView.svelte
## calls
call src/lib/features/event-calendar/EventCalendarView.svelte:40 in (script) -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.initFromSettings mcall
call src/lib/features/event-calendar/EventCalendarView.svelte:50 in handleKeydown -> src/lib/features/event-calendar/event-calendar-keys.logic.ts:resolveCalendarKey call
call src/lib/features/event-calendar/EventCalendarView.svelte:51 in handleKeydown -> src/lib/features/event-calendar/event-calendar-keys.logic.ts:isTypingTarget call
call src/lib/features/event-calendar/EventCalendarView.svelte:62 in handleKeydown -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.openHelp mcall
call src/lib/features/event-calendar/EventCalendarView.svelte:65 in handleKeydown -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.goToToday mcall
call src/lib/features/event-calendar/EventCalendarView.svelte:68 in handleKeydown -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.setView mcall
call src/lib/features/event-calendar/EventCalendarView.svelte:71 in handleKeydown -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.step mcall
call src/lib/features/event-calendar/EventCalendarView.svelte:74 in handleKeydown -> src/lib/features/event-calendar/event-calendar.service.ts:openNewEventDialog call
call src/lib/features/event-calendar/EventCalendarView.svelte:78 in handleKeydown -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.closePopover mcall +1
call src/lib/features/event-calendar/EventCalendarView.svelte:80 in handleKeydown -> src/lib/features/event-calendar/EventCalendarView.svelte:parkFocusAfterDelete ref
call src/lib/features/event-calendar/EventCalendarView.svelte:80 in handleKeydown -> src/lib/features/event-calendar/event-calendar.service.ts:deleteEventFromUi call
call src/lib/features/event-calendar/EventCalendarView.svelte:86 in handleKeydown -> src/lib/features/event-calendar/event-calendar.service.ts:undoEventChangeFromUi call
call src/lib/features/event-calendar/EventCalendarView.svelte:89 in handleKeydown -> src/lib/features/event-calendar/event-calendar.service.ts:redoEventChangeFromUi call
call src/lib/features/event-calendar/EventCalendarView.svelte:112 in $effect@110 -> src/lib/features/event-calendar/EventCalendarView.svelte:handleKeydown call
call src/lib/features/event-calendar/EventCalendarView.svelte:134 in $effect@121 -> src/lib/features/event-calendar/event-calendar.service.ts:loadEvents call
call src/lib/features/event-calendar/EventCalendarView.svelte:173 in $effect@156 -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.eventByPath mcall
call src/lib/features/event-calendar/EventCalendarView.svelte:180 in $effect@156 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.clearFocusRequest mcall
call src/lib/features/event-calendar/EventCalendarView.svelte:184 in $effect@156 -> src/lib/features/event-calendar/EventCalendarView.svelte:pulse call
call src/lib/features/event-calendar/EventCalendarView.svelte:211 in $effect@205 -> src/lib/features/event-calendar/event-calendar.service.ts:loadCalendarTasks call
call src/lib/features/event-calendar/EventCalendarView.svelte:220 in $effect@220 -> src/lib/features/event-calendar/event-calendar.service.ts:acquireCalendarClock call
call src/lib/features/event-calendar/EventCalendarView.svelte:224 in $effect@224 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.closeTransient mcall
call src/lib/features/event-calendar/EventCalendarView.svelte:235 in (markup) -> src/lib/features/event-calendar/EventCalendarView.svelte:handleKeydown markup
## effects
fx src/lib/features/event-calendar/EventCalendarView.svelte:110 svelte.$effect in (script)
fx src/lib/features/event-calendar/EventCalendarView.svelte:114 dom.keydown document in $effect@110
fx src/lib/features/event-calendar/EventCalendarView.svelte:121 svelte.$effect in (script)
fx src/lib/features/event-calendar/EventCalendarView.svelte:156 svelte.$effect in (script)
fx src/lib/features/event-calendar/EventCalendarView.svelte:195 timer.setTimeout delay=PULSE_MS in pulse
fx src/lib/features/event-calendar/EventCalendarView.svelte:205 svelte.$effect in (script)
fx src/lib/features/event-calendar/EventCalendarView.svelte:220 svelte.$effect in (script)
reg src/lib/features/event-calendar/EventCalendarView.svelte:220 src/lib/features/event-calendar/event-calendar.service.ts:acquireCalendarClock in $effect@220
fx src/lib/features/event-calendar/EventCalendarView.svelte:224 svelte.$effect in (script)
