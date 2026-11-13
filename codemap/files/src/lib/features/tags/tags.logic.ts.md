# file card src/lib/features/tags/tags.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/tags/tags.logic.ts ' codemap/files
file src/lib/features/tags/tags.logic.ts logic L123 module src/lib/features/tags in2 t1
## imports
imp src/lib/features/tags/tags.logic.ts:1 -> src/lib/features/tags/tags.types.ts type:TagEntry,type:TagTreeNode,type:TagSortMode
## imported-by
imp src/lib/features/tags/TagsView.svelte:8 -> src/lib/features/tags/tags.logic.ts filterTagTree
imp src/lib/features/tags/tags.service.ts:7 -> src/lib/features/tags/tags.logic.ts buildTagTree,sortTagTree,tagTreeShape
## reach
in2 src/lib/features/tags/tags.logic.ts 3 files in 1 modules: src/lib/app(3)
out2 src/lib/features/tags/tags.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/tags/tags.logic.test.ts imports src/lib/features/tags/tags.logic.ts mirror
## symbols
sym src/lib/features/tags/tags.logic.ts:3 fn buildTagTree(entries: TagEntry[]): TagTreeNode[] L44
by src/lib/features/tags/tags.logic.ts:buildTagTree <- src/lib/features/tags/tags.service.ts:39 in buildTagIndex call
sym src/lib/features/tags/tags.logic.ts:59 interface TagTreeShape L8 | Shape of a built tag tree, logged to tell the cost drivers of `buildTagTree` apart.
sym src/lib/features/tags/tags.logic.ts:69 fn tagTreeShape(entries: TagEntry[], tree: TagTreeNode[]): TagTreeShape L24 | Counts roots, parent-child pairs and the uppercase segment share of a tag tree.
by src/lib/features/tags/tags.logic.ts:tagTreeShape <- src/lib/features/tags/tags.service.ts:47 in buildTagIndex call
sym src/lib/features/tags/tags.logic.ts:98 fn filterTagTree(nodes: TagTreeNode[], minCount: number): TagTreeNode[] L11 | Recursively filters a tag tree, keeping only nodes whose own count exceeds minCount or that have surviving children.
by src/lib/features/tags/tags.logic.ts:filterTagTree <- src/lib/features/tags/TagsView.svelte:37 in displayedTree=$derived call
sym src/lib/features/tags/tags.logic.ts:110 fn sortTagTree(nodes: TagTreeNode[], mode: TagSortMode): TagTreeNode[] L14
by src/lib/features/tags/tags.logic.ts:sortTagTree <- src/lib/features/tags/tags.service.ts:41 in buildTagIndex call +1
## locals
local src/lib/features/tags/tags.logic.ts:48 fn computeTotalCounts(nodes: TagTreeNode[]): number L9
## calls
call src/lib/features/tags/tags.logic.ts:44 in buildTagTree -> src/lib/features/tags/tags.logic.ts:computeTotalCounts call
call src/lib/features/tags/tags.logic.ts:51 in computeTotalCounts -> src/lib/features/tags/tags.logic.ts:computeTotalCounts call
call src/lib/features/tags/tags.logic.ts:101 in filterTagTree -> src/lib/features/tags/tags.logic.ts:filterTagTree call
call src/lib/features/tags/tags.logic.ts:119 in sortTagTree -> src/lib/features/tags/tags.logic.ts:sortTagTree call
