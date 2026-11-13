# file card src/lib/features/backlinks/LinkItem.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/backlinks/LinkItem.svelte ' codemap/files
file src/lib/features/backlinks/LinkItem.svelte component L35 module src/lib/features/backlinks in1 t1
## imports
imp src/lib/features/backlinks/LinkItem.svelte:3 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/backlinks/LinkItem.svelte:4 -> src/lib/features/event-calendar/ShowInCalendarButton.svelte default
imp src/lib/features/backlinks/LinkItem.svelte:5 -> src/lib/features/backlinks/backlinks.types.ts type:BacklinkEntry
## imported-by
imp src/lib/features/backlinks/BacklinksPanel.svelte:14 -> src/lib/features/backlinks/LinkItem.svelte default
## reach
in2 src/lib/features/backlinks/LinkItem.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/backlinks/LinkItem.svelte 14 files in 8 modules: src/lib/core/editor(4) src/lib/utils(3) src/lib/features/event-calendar(2) src/lib/contracts(1) src/lib/core/filesystem(1) +3 modules
## tests
test src/tests/lib/features/backlinks/LinkItem.test.ts imports src/lib/features/backlinks/LinkItem.svelte mirror
## symbols
sym src/lib/features/backlinks/LinkItem.svelte:1 component LinkItem props:entry L35
by src/lib/features/backlinks/LinkItem.svelte:default <- src/lib/features/backlinks/BacklinksPanel.svelte:74 in (markup) mount
## locals
local src/lib/features/backlinks/LinkItem.svelte:9 fn handleClick() L3
## mounts
mount src/lib/features/backlinks/LinkItem.svelte:34 ShowInCalendarButton -> src/lib/features/event-calendar/ShowInCalendarButton.svelte
## mounted-at
mount src/lib/features/backlinks/BacklinksPanel.svelte:74 LinkItem -> src/lib/features/backlinks/LinkItem.svelte
## calls
call src/lib/features/backlinks/LinkItem.svelte:10 in handleClick -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/features/backlinks/LinkItem.svelte:18 in (markup) -> src/lib/features/backlinks/LinkItem.svelte:handleClick markup
