# file card src/lib/features/tags/TagsView.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/tags/TagsView.svelte ' codemap/files
file src/lib/features/tags/TagsView.svelte component L16 module src/lib/features/tags in1 t0
## imports
imp src/lib/features/tags/TagsView.svelte:2 -> src/lib/features/tags/TagRow.svelte default
imp src/lib/features/tags/TagsView.svelte:3 -> src/lib/core/notes/notes.store.svelte.ts notesStore
imp src/lib/features/tags/TagsView.svelte:4 -> src/lib/core/notes/notes.service.ts loadTags
## imported-by
imp src/routes/+page.svelte:2 -> src/lib/features/tags/TagsView.svelte default
## reach
in2 src/lib/features/tags/TagsView.svelte 0 files in 0 modules: -
out2 src/lib/features/tags/TagsView.svelte 3 files in 3 modules: src/lib/contracts(1) src/lib/core/notes(1) src/lib/utils(1)
## symbols
sym src/lib/features/tags/TagsView.svelte:1 component TagsView L16
by src/lib/features/tags/TagsView.svelte:default <- src/routes/+page.svelte:6 in (markup) mount
## locals
local src/lib/features/tags/TagsView.svelte:9 fn label(t: string) L3
## mounts
mount src/lib/features/tags/TagsView.svelte:15 TagRow -> src/lib/features/tags/TagRow.svelte
## mounted-at
mount src/routes/+page.svelte:6 TagsView -> src/lib/features/tags/TagsView.svelte
## calls
call src/lib/features/tags/TagsView.svelte:13 in (markup) -> src/lib/core/notes/notes.service.ts:loadTags markup
call src/lib/features/tags/TagsView.svelte:15 in (markup) -> src/lib/features/tags/TagsView.svelte:label markup
## effects
fx src/lib/features/tags/TagsView.svelte:6 svelte.$effect in (script)
