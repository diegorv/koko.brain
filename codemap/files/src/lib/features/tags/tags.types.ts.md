# file card src/lib/features/tags/tags.types.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/tags/tags.types.ts ' codemap/files
file src/lib/features/tags/tags.types.ts types L16 module src/lib/features/tags in3 t0
## imported-by
imp src/lib/features/tags/TagItem.svelte:4 -> src/lib/features/tags/tags.types.ts type:TagTreeNode
imp src/lib/features/tags/tags.logic.ts:1 -> src/lib/features/tags/tags.types.ts type:TagEntry,type:TagTreeNode,type:TagSortMode
imp src/lib/features/tags/tags.store.svelte.ts:1 -> src/lib/features/tags/tags.types.ts type:TagTreeNode,type:TagSortMode
## reach
in2 src/lib/features/tags/tags.types.ts 2 files in 1 modules: src/lib/features/tags(2)
out2 src/lib/features/tags/tags.types.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/tags/TagsView.test.ts imports-type src/lib/features/tags/tags.types.ts
## symbols
sym src/lib/features/tags/tags.types.ts:1 interface TagEntry L5
by src/lib/features/tags/tags.types.ts:TagEntry <- src/lib/features/tags/tags.logic.ts:1 in (module) import
sym src/lib/features/tags/tags.types.ts:7 interface TagTreeNode L8
by src/lib/features/tags/tags.types.ts:TagTreeNode <- src/lib/features/tags/TagItem.svelte:4 in (script) import
by src/lib/features/tags/tags.types.ts:TagTreeNode <- src/lib/features/tags/tags.logic.ts:1 in (module) import
by src/lib/features/tags/tags.types.ts:TagTreeNode <- src/lib/features/tags/tags.store.svelte.ts:1 in (module) import
sym src/lib/features/tags/tags.types.ts:16 type TagSortMode L1
by src/lib/features/tags/tags.types.ts:TagSortMode <- src/lib/features/tags/tags.logic.ts:1 in (module) import
by src/lib/features/tags/tags.types.ts:TagSortMode <- src/lib/features/tags/tags.store.svelte.ts:1 in (module) import
