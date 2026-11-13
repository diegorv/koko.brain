# file card src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte ' codemap/files
file src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte component L116 module src/lib/features/event-calendar in1 t0
## imports
imp src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte:2 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte:3 -> src/lib/features/event-calendar/event-calendar.store.svelte.ts eventCalendarStore
imp src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte:4 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
imp src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte:5 -> src/lib/features/event-calendar/event-calendar.types.ts type:EventIssue
## imported-by
imp src/lib/features/event-calendar/EventCalendarView.svelte:28 -> src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte default
## reach
in2 src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte 16 files in 6 modules: src/lib/features/event-calendar(5) src/lib/core/editor(4) src/lib/utils(3) src/lib/core/settings(2) src/lib/core/filesystem(1) +1 modules
## symbols
sym src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte:1 component EventCalendarNeedsAttention L116
by src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte:default <- src/lib/features/event-calendar/EventCalendarView.svelte:261 in (markup) mount
## locals
local src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte:17 fn reasonText(issue: EventIssue): string L16
local src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte:35 fn unscheduledHint(issue: EventIssue): string L5
## mounted-at
mount src/lib/features/event-calendar/EventCalendarView.svelte:261 EventCalendarNeedsAttention -> src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte
## calls
call src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte:48 in (markup) -> src/lib/core/editor/editor.service.ts:openFileInEditor markup
call src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte:59 in (markup) -> src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte:unscheduledHint markup
call src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte:76 in (markup) -> src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte:reasonText markup
call src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte:108 in (markup) -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.setShowArchived markup
