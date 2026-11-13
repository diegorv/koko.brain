# file card src/lib/features/event-calendar/EventColorSwatches.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/event-calendar/EventColorSwatches.svelte ' codemap/files
file src/lib/features/event-calendar/EventColorSwatches.svelte component L58 module src/lib/features/event-calendar in2 t0
## imports
imp src/lib/features/event-calendar/EventColorSwatches.svelte:2 -> src/lib/core/settings/settings.logic.ts EVENT_CALENDAR_COLORS
imp src/lib/features/event-calendar/EventColorSwatches.svelte:3 -> src/lib/features/event-calendar/event-calendar.types.ts type:EventColor
## imported-by
imp src/lib/features/event-calendar/EventCalendarSection.svelte:20 -> src/lib/features/event-calendar/EventColorSwatches.svelte default
imp src/lib/features/event-calendar/EventForm.svelte:15 -> src/lib/features/event-calendar/EventColorSwatches.svelte default
## reach
in2 src/lib/features/event-calendar/EventColorSwatches.svelte 2 files in 2 modules: src/lib/app(1) src/lib/features/event-calendar(1)
out2 src/lib/features/event-calendar/EventColorSwatches.svelte 2 files in 2 modules: src/lib/core/settings(1) src/lib/utils(1)
## symbols
sym src/lib/features/event-calendar/EventColorSwatches.svelte:1 component EventColorSwatches props:value,onchange,label= L58
by src/lib/features/event-calendar/EventColorSwatches.svelte:default <- src/lib/features/event-calendar/EventCalendarSection.svelte:237 in (markup) mount
by src/lib/features/event-calendar/EventColorSwatches.svelte:default <- src/lib/features/event-calendar/EventForm.svelte:161 in (markup) mount
## locals
local src/lib/features/event-calendar/EventColorSwatches.svelte:19 fn select(index: number) L6
local src/lib/features/event-calendar/EventColorSwatches.svelte:27 fn handleKeydown(e: KeyboardEvent, index: number) L10
## mounted-at
mount src/lib/features/event-calendar/EventCalendarSection.svelte:237 EventColorSwatches -> src/lib/features/event-calendar/EventColorSwatches.svelte
mount src/lib/features/event-calendar/EventForm.svelte:161 EventColorSwatches -> src/lib/features/event-calendar/EventColorSwatches.svelte
## calls
call src/lib/features/event-calendar/EventColorSwatches.svelte:35 in handleKeydown -> src/lib/features/event-calendar/EventColorSwatches.svelte:select call
call src/lib/features/event-calendar/EventColorSwatches.svelte:54 in (markup) -> src/lib/features/event-calendar/EventColorSwatches.svelte:select markup
call src/lib/features/event-calendar/EventColorSwatches.svelte:55 in (markup) -> src/lib/features/event-calendar/EventColorSwatches.svelte:handleKeydown markup
