# file card src/lib/features/event-calendar/EventPopover.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/event-calendar/EventPopover.svelte ' codemap/files
file src/lib/features/event-calendar/EventPopover.svelte component L195 module src/lib/features/event-calendar in1 t1
## imports
imp src/lib/features/event-calendar/EventPopover.svelte:5 -> src/lib/components/ui/button/index.ts Button
imp src/lib/features/event-calendar/EventPopover.svelte:6 -> src/lib/components/ui/popover/index.ts *
imp src/lib/features/event-calendar/EventPopover.svelte:7 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/event-calendar/EventPopover.svelte:8 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/event-calendar/EventPopover.svelte:9 -> src/lib/features/event-calendar/event-calendar-focus.logic.ts focusReturnTarget
imp src/lib/features/event-calendar/EventPopover.svelte:10 -> src/lib/features/event-calendar/event-calendar-view.logic.ts eventWhenLabel
imp src/lib/features/event-calendar/EventPopover.svelte:11 -> src/lib/features/event-calendar/event-calendar.service.ts deleteEventFromUi,duplicateEventFromUi
imp src/lib/features/event-calendar/EventPopover.svelte:12 -> src/lib/features/event-calendar/event-calendar.store.svelte.ts eventCalendarStore
imp src/lib/features/event-calendar/EventPopover.svelte:13 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
## imported-by
imp src/lib/features/event-calendar/EventCalendarView.svelte:31 -> src/lib/features/event-calendar/EventPopover.svelte default
## reach
in2 src/lib/features/event-calendar/EventPopover.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/event-calendar/EventPopover.svelte 35 files in 13 modules: src/lib/features/event-calendar(8) src/lib/core/editor(4) src/lib/core/filesystem(3) src/lib/core/settings(3) src/lib/core/trash(3) +8 modules
## tests
test src/tests/lib/features/event-calendar/EventPopover.test.ts imports src/lib/features/event-calendar/EventPopover.svelte mirror
## symbols
sym src/lib/features/event-calendar/EventPopover.svelte:1 component EventPopover props:root L195
by src/lib/features/event-calendar/EventPopover.svelte:default <- src/lib/features/event-calendar/EventCalendarView.svelte:262 in (markup) mount
## locals
local src/lib/features/event-calendar/EventPopover.svelte:69 fn handleInteractOutside(e: PointerEvent) L9
local src/lib/features/event-calendar/EventPopover.svelte:79 fn handleOpenChange(next: boolean) L3
local src/lib/features/event-calendar/EventPopover.svelte:88 fn handleCloseAutoFocus(e: Event) L19
local src/lib/features/event-calendar/EventPopover.svelte:108 fn openNote() L6
local src/lib/features/event-calendar/EventPopover.svelte:116 fn editNote() L7
local src/lib/features/event-calendar/EventPopover.svelte:125 fn deleteNote() L7
local src/lib/features/event-calendar/EventPopover.svelte:134 fn duplicateNote() L7
## mounts
mount src/lib/features/event-calendar/EventPopover.svelte:182 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/event-calendar/EventPopover.svelte:183 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/event-calendar/EventPopover.svelte:185 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/event-calendar/EventPopover.svelte:188 Button -> src/lib/components/ui/button/button.svelte
## mounted-at
mount src/lib/features/event-calendar/EventCalendarView.svelte:262 EventPopover -> src/lib/features/event-calendar/EventPopover.svelte
## calls
call src/lib/features/event-calendar/EventPopover.svelte:36 in when=$derived -> src/lib/features/event-calendar/event-calendar-view.logic.ts:eventWhenLabel call
call src/lib/features/event-calendar/EventPopover.svelte:49 in $effect@48 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.closePopover mcall
call src/lib/features/event-calendar/EventPopover.svelte:58 in $effect@53 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.closePopover mcall
call src/lib/features/event-calendar/EventPopover.svelte:80 in handleOpenChange -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.closePopover mcall
call src/lib/features/event-calendar/EventPopover.svelte:92 in handleCloseAutoFocus -> src/lib/features/event-calendar/event-calendar-focus.logic.ts:focusReturnTarget call
call src/lib/features/event-calendar/EventPopover.svelte:111 in openNote -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.closePopover mcall
call src/lib/features/event-calendar/EventPopover.svelte:112 in openNote -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/features/event-calendar/EventPopover.svelte:120 in editNote -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.closePopover mcall
call src/lib/features/event-calendar/EventPopover.svelte:121 in editNote -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.openDialog mcall
call src/lib/features/event-calendar/EventPopover.svelte:129 in deleteNote -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.closePopover mcall
call src/lib/features/event-calendar/EventPopover.svelte:130 in deleteNote -> src/lib/features/event-calendar/event-calendar.service.ts:deleteEventFromUi call
call src/lib/features/event-calendar/EventPopover.svelte:138 in duplicateNote -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.closePopover mcall
call src/lib/features/event-calendar/EventPopover.svelte:139 in duplicateNote -> src/lib/features/event-calendar/event-calendar.service.ts:duplicateEventFromUi call
call src/lib/features/event-calendar/EventPopover.svelte:143 in (markup) -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.closePopover markup
call src/lib/features/event-calendar/EventPopover.svelte:148 in (markup) -> src/lib/features/event-calendar/EventPopover.svelte:handleOpenChange markup
call src/lib/features/event-calendar/EventPopover.svelte:159 in (markup) -> src/lib/features/event-calendar/EventPopover.svelte:handleCloseAutoFocus markup
call src/lib/features/event-calendar/EventPopover.svelte:160 in (markup) -> src/lib/features/event-calendar/EventPopover.svelte:handleInteractOutside markup
call src/lib/features/event-calendar/EventPopover.svelte:182 in (markup) -> src/lib/features/event-calendar/EventPopover.svelte:editNote markup
call src/lib/features/event-calendar/EventPopover.svelte:183 in (markup) -> src/lib/features/event-calendar/EventPopover.svelte:openNote markup
call src/lib/features/event-calendar/EventPopover.svelte:185 in (markup) -> src/lib/features/event-calendar/EventPopover.svelte:duplicateNote markup
call src/lib/features/event-calendar/EventPopover.svelte:188 in (markup) -> src/lib/features/event-calendar/EventPopover.svelte:deleteNote markup
## effects
fx src/lib/features/event-calendar/EventPopover.svelte:42 svelte.$effect in (script)
fx src/lib/features/event-calendar/EventPopover.svelte:48 svelte.$effect in (script)
fx src/lib/features/event-calendar/EventPopover.svelte:53 svelte.$effect in (script)
fx src/lib/features/event-calendar/EventPopover.svelte:60 dom.scroll el in $effect@53
fx src/lib/features/event-calendar/EventPopover.svelte:143 dom.resize svelte:window in (markup)
