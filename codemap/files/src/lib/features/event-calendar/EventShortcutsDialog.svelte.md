# file card src/lib/features/event-calendar/EventShortcutsDialog.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/event-calendar/EventShortcutsDialog.svelte ' codemap/files
file src/lib/features/event-calendar/EventShortcutsDialog.svelte component L34 module src/lib/features/event-calendar in1 t0
## imports
imp src/lib/features/event-calendar/EventShortcutsDialog.svelte:2 -> src/lib/components/ui/dialog/index.ts *
imp src/lib/features/event-calendar/EventShortcutsDialog.svelte:3 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
imp src/lib/features/event-calendar/EventShortcutsDialog.svelte:4 -> src/lib/features/event-calendar/event-calendar-keys.logic.ts CALENDAR_SHORTCUTS
## imported-by
imp src/lib/features/event-calendar/EventCalendarView.svelte:32 -> src/lib/features/event-calendar/EventShortcutsDialog.svelte default
## reach
in2 src/lib/features/event-calendar/EventShortcutsDialog.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/event-calendar/EventShortcutsDialog.svelte 14 files in 3 modules: src/lib/components(10) src/lib/features/event-calendar(3) src/lib/core/settings(1)
## symbols
sym src/lib/features/event-calendar/EventShortcutsDialog.svelte:1 component EventShortcutsDialog L34
by src/lib/features/event-calendar/EventShortcutsDialog.svelte:default <- src/lib/features/event-calendar/EventCalendarView.svelte:264 in (markup) mount
## locals
local src/lib/features/event-calendar/EventShortcutsDialog.svelte:6 fn handleOpenChange(next: boolean) L3
## mounted-at
mount src/lib/features/event-calendar/EventCalendarView.svelte:264 EventShortcutsDialog -> src/lib/features/event-calendar/EventShortcutsDialog.svelte
## calls
call src/lib/features/event-calendar/EventShortcutsDialog.svelte:7 in handleOpenChange -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.closeHelp mcall
call src/lib/features/event-calendar/EventShortcutsDialog.svelte:11 in (markup) -> src/lib/features/event-calendar/EventShortcutsDialog.svelte:handleOpenChange markup
