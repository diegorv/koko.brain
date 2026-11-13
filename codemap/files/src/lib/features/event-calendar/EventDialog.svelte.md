# file card src/lib/features/event-calendar/EventDialog.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/event-calendar/EventDialog.svelte ' codemap/files
file src/lib/features/event-calendar/EventDialog.svelte component L223 module src/lib/features/event-calendar in1 t1
## imports
imp src/lib/features/event-calendar/EventDialog.svelte:6 -> src/lib/components/ui/button/index.ts Button
imp src/lib/features/event-calendar/EventDialog.svelte:7 -> src/lib/components/ui/dialog/index.ts *
imp src/lib/features/event-calendar/EventDialog.svelte:8 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/event-calendar/EventDialog.svelte:9 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/event-calendar/EventDialog.svelte:10 -> src/lib/features/event-calendar/event-calendar-event.logic.ts eventState
imp src/lib/features/event-calendar/EventDialog.svelte:11 -> src/lib/features/event-calendar/event-calendar-form.logic.ts draftForCreate,draftFromEvent,draftToPatch,type:EventFormDraft
imp src/lib/features/event-calendar/EventDialog.svelte:12 -> src/lib/features/event-calendar/event-calendar.service.ts createEvent,deleteEventFromUi,duplicateEventFromUi,editEvent,eventErrorMessage,toastEventError
imp src/lib/features/event-calendar/EventDialog.svelte:20 -> src/lib/features/event-calendar/event-calendar.store.svelte.ts eventCalendarStore
imp src/lib/features/event-calendar/EventDialog.svelte:21 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
imp src/lib/features/event-calendar/EventDialog.svelte:22 -> src/lib/features/event-calendar/EventForm.svelte default
## imported-by
imp src/lib/features/event-calendar/EventCalendarView.svelte:29 -> src/lib/features/event-calendar/EventDialog.svelte default
## reach
in2 src/lib/features/event-calendar/EventDialog.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/event-calendar/EventDialog.svelte 49 files in 13 modules: src/lib/components(13) src/lib/features/event-calendar(8) src/lib/core/editor(4) src/lib/core/settings(4) src/lib/core/filesystem(3) +8 modules
## tests
test src/tests/lib/features/event-calendar/EventDialog.test.ts imports src/lib/features/event-calendar/EventDialog.svelte mirror
## symbols
sym src/lib/features/event-calendar/EventDialog.svelte:1 component EventDialog props:root L223
by src/lib/features/event-calendar/EventDialog.svelte:default <- src/lib/features/event-calendar/EventCalendarView.svelte:263 in (markup) mount
## locals
local src/lib/features/event-calendar/EventDialog.svelte:83 fn handleOpenChange(next: boolean) L3
local src/lib/features/event-calendar/EventDialog.svelte:92 fn handleCloseAutoFocus(e: Event) L13
local src/lib/features/event-calendar/EventDialog.svelte:115 fn save(draft: EventFormDraft) L24
local src/lib/features/event-calendar/EventDialog.svelte:145 fn create(draft: EventFormDraft) L19
local src/lib/features/event-calendar/EventDialog.svelte:166 fn remove() L7
local src/lib/features/event-calendar/EventDialog.svelte:175 fn duplicate() L7
local src/lib/features/event-calendar/EventDialog.svelte:183 fn openNote() L6
## mounts
mount src/lib/features/event-calendar/EventDialog.svelte:199 EventForm -> src/lib/features/event-calendar/EventForm.svelte
mount src/lib/features/event-calendar/EventDialog.svelte:208 EventForm -> src/lib/features/event-calendar/EventForm.svelte
mount src/lib/features/event-calendar/EventDialog.svelte:210 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/event-calendar/EventDialog.svelte:213 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/event-calendar/EventDialog.svelte:216 Button -> src/lib/components/ui/button/button.svelte
## mounted-at
mount src/lib/features/event-calendar/EventCalendarView.svelte:263 EventDialog -> src/lib/features/event-calendar/EventDialog.svelte
## calls
call src/lib/features/event-calendar/EventDialog.svelte:47 in event=$derived -> src/lib/features/event-calendar/event-calendar.store.svelte.ts:eventCalendarStore.eventByPath mcall
call src/lib/features/event-calendar/EventDialog.svelte:58 in opened=$derived -> src/lib/features/event-calendar/event-calendar-form.logic.ts:draftForCreate call
call src/lib/features/event-calendar/EventDialog.svelte:60 in opened=$derived -> src/lib/features/event-calendar/event-calendar-event.logic.ts:eventState call
call src/lib/features/event-calendar/EventDialog.svelte:60 in opened=$derived -> src/lib/features/event-calendar/event-calendar-form.logic.ts:draftFromEvent call
call src/lib/features/event-calendar/EventDialog.svelte:80 in $effect@79 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.closeDialog mcall
call src/lib/features/event-calendar/EventDialog.svelte:84 in handleOpenChange -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.closeDialog mcall
call src/lib/features/event-calendar/EventDialog.svelte:119 in save -> src/lib/features/event-calendar/event-calendar-form.logic.ts:draftToPatch call
call src/lib/features/event-calendar/EventDialog.svelte:124 in save -> src/lib/features/event-calendar/event-calendar.service.ts:editEvent call
call src/lib/features/event-calendar/EventDialog.svelte:127 in save -> src/lib/features/event-calendar/event-calendar.service.ts:toastEventError call
call src/lib/features/event-calendar/EventDialog.svelte:137 in save -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.closeDialog mcall
call src/lib/features/event-calendar/EventDialog.svelte:151 in create -> src/lib/features/event-calendar/event-calendar.service.ts:createEvent call
call src/lib/features/event-calendar/EventDialog.svelte:154 in create -> src/lib/features/event-calendar/event-calendar.service.ts:eventErrorMessage call
call src/lib/features/event-calendar/EventDialog.svelte:161 in create -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.closeDialog mcall
call src/lib/features/event-calendar/EventDialog.svelte:162 in create -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/features/event-calendar/EventDialog.svelte:170 in remove -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.closeDialog mcall
call src/lib/features/event-calendar/EventDialog.svelte:171 in remove -> src/lib/features/event-calendar/event-calendar.service.ts:deleteEventFromUi call
call src/lib/features/event-calendar/EventDialog.svelte:179 in duplicate -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.closeDialog mcall
call src/lib/features/event-calendar/EventDialog.svelte:180 in duplicate -> src/lib/features/event-calendar/event-calendar.service.ts:duplicateEventFromUi call
call src/lib/features/event-calendar/EventDialog.svelte:186 in openNote -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.closeDialog mcall
call src/lib/features/event-calendar/EventDialog.svelte:187 in openNote -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/features/event-calendar/EventDialog.svelte:191 in (markup) -> src/lib/features/event-calendar/EventDialog.svelte:handleOpenChange markup
call src/lib/features/event-calendar/EventDialog.svelte:192 in (markup) -> src/lib/features/event-calendar/EventDialog.svelte:handleCloseAutoFocus markup
call src/lib/features/event-calendar/EventDialog.svelte:199 in (markup) -> src/lib/features/event-calendar/EventDialog.svelte:create markup
call src/lib/features/event-calendar/EventDialog.svelte:199 in (markup) -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.closeDialog markup +1
call src/lib/features/event-calendar/EventDialog.svelte:208 in (markup) -> src/lib/features/event-calendar/EventDialog.svelte:save markup
call src/lib/features/event-calendar/EventDialog.svelte:210 in (markup) -> src/lib/features/event-calendar/EventDialog.svelte:remove markup
call src/lib/features/event-calendar/EventDialog.svelte:213 in (markup) -> src/lib/features/event-calendar/EventDialog.svelte:duplicate markup
call src/lib/features/event-calendar/EventDialog.svelte:216 in (markup) -> src/lib/features/event-calendar/EventDialog.svelte:openNote markup
## effects
fx src/lib/features/event-calendar/EventDialog.svelte:64 svelte.$effect in (script)
fx src/lib/features/event-calendar/EventDialog.svelte:70 svelte.$effect in (script)
fx src/lib/features/event-calendar/EventDialog.svelte:79 svelte.$effect in (script)
