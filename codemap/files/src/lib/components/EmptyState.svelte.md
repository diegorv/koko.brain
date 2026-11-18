# file card src/lib/components/EmptyState.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/components/EmptyState.svelte ' codemap/files
file src/lib/components/EmptyState.svelte component L57 module src/lib/components in1 t1
## imports
imp src/lib/components/EmptyState.svelte:5 -> src/lib/utils.ts cn
## imported-by
imp src/lib/features/rail-shell/RailNoteList.svelte:28 -> src/lib/components/EmptyState.svelte default
## reach
in2 src/lib/components/EmptyState.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/components/EmptyState.svelte 1 files in 1 modules: src/lib/utils(1)
## tests
test src/tests/lib/components/EmptyState.test.ts imports src/lib/components/EmptyState.svelte mirror
## symbols
sym src/lib/components/EmptyState.svelte:1 component EmptyState props:title,hint,icon,action,compact=,spinner=,class,...rest L57
by src/lib/components/EmptyState.svelte:default <- src/lib/features/rail-shell/RailNoteList.svelte:921 in (markup) mount +2
## mounted-at
mount src/lib/features/rail-shell/RailNoteList.svelte:921 EmptyState -> src/lib/components/EmptyState.svelte
mount src/lib/features/rail-shell/RailNoteList.svelte:923 EmptyState -> src/lib/components/EmptyState.svelte
mount src/lib/features/rail-shell/RailNoteList.svelte:948 EmptyState -> src/lib/components/EmptyState.svelte
## calls
call src/lib/components/EmptyState.svelte:32 in (markup) -> src/lib/utils.ts:cn markup +1
