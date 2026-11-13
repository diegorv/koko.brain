# file card src/lib/features/event-calendar/ShowInCalendarButton.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/event-calendar/ShowInCalendarButton.svelte ' codemap/files
file src/lib/features/event-calendar/ShowInCalendarButton.svelte component L75 module src/lib/features/event-calendar in2 t1
## imports
imp src/lib/features/event-calendar/ShowInCalendarButton.svelte:5 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/event-calendar/ShowInCalendarButton.svelte:6 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/event-calendar/ShowInCalendarButton.svelte:7 -> src/lib/utils/debug.ts error
imp src/lib/features/event-calendar/ShowInCalendarButton.svelte:8 -> src/lib/features/event-calendar/event-calendar.service.ts findCalendarEvent,openEventInCalendar
imp src/lib/features/event-calendar/ShowInCalendarButton.svelte:9 -> src/lib/features/event-calendar/event-calendar.store.svelte.ts eventCalendarStore
## imported-by
imp src/lib/features/backlinks/LinkItem.svelte:4 -> src/lib/features/event-calendar/ShowInCalendarButton.svelte default
imp src/lib/features/search/SearchResult.svelte:6 -> src/lib/features/event-calendar/ShowInCalendarButton.svelte default
## reach
in2 src/lib/features/event-calendar/ShowInCalendarButton.svelte 2 files in 2 modules: src/lib/features/backlinks(1) src/lib/features/search(1)
out2 src/lib/features/event-calendar/ShowInCalendarButton.svelte 31 files in 11 modules: src/lib/features/event-calendar(8) src/lib/core/settings(4) src/lib/core/editor(3) src/lib/core/filesystem(3) src/lib/core/trash(3) +6 modules
## tests
test src/tests/lib/features/event-calendar/ShowInCalendarButton.test.ts imports src/lib/features/event-calendar/ShowInCalendarButton.svelte mirror
## symbols
sym src/lib/features/event-calendar/ShowInCalendarButton.svelte:1 component ShowInCalendarButton props:path,class= L75
by src/lib/features/event-calendar/ShowInCalendarButton.svelte:default <- src/lib/features/backlinks/LinkItem.svelte:34 in (markup) mount
by src/lib/features/event-calendar/ShowInCalendarButton.svelte:default <- src/lib/features/search/SearchResult.svelte:176 in (markup) mount
## locals
local src/lib/features/event-calendar/ShowInCalendarButton.svelte:51 fn handleClick() L11
## mounted-at
mount src/lib/features/backlinks/LinkItem.svelte:34 ShowInCalendarButton -> src/lib/features/event-calendar/ShowInCalendarButton.svelte
mount src/lib/features/search/SearchResult.svelte:176 ShowInCalendarButton -> src/lib/features/event-calendar/ShowInCalendarButton.svelte
## calls
call src/lib/features/event-calendar/ShowInCalendarButton.svelte:39 in $effect@25 -> src/lib/features/event-calendar/event-calendar.service.ts:findCalendarEvent call
call src/lib/features/event-calendar/ShowInCalendarButton.svelte:44 in $effect@25 -> src/lib/utils/debug.ts:error call
call src/lib/features/event-calendar/ShowInCalendarButton.svelte:53 in handleClick -> src/lib/features/event-calendar/event-calendar.service.ts:openEventInCalendar call
call src/lib/features/event-calendar/ShowInCalendarButton.svelte:71 in (markup) -> src/lib/features/event-calendar/ShowInCalendarButton.svelte:handleClick markup
## effects
fx src/lib/features/event-calendar/ShowInCalendarButton.svelte:25 svelte.$effect in (script)
