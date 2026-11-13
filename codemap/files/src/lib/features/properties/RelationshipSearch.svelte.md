# file card src/lib/features/properties/RelationshipSearch.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/properties/RelationshipSearch.svelte ' codemap/files
file src/lib/features/properties/RelationshipSearch.svelte component L94 module src/lib/features/properties in1 t1
## imports
imp src/lib/features/properties/RelationshipSearch.svelte:4 -> src/lib/components/ui/popover/index.ts *
imp src/lib/features/properties/RelationshipSearch.svelte:5 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/features/properties/RelationshipSearch.svelte:6 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/properties/RelationshipSearch.svelte:7 -> src/lib/core/filesystem/file-entries.logic.ts flattenFileTree,filterAndRank
imp src/lib/features/properties/RelationshipSearch.svelte:8 -> src/lib/core/filesystem/wikilink-resolution.logic.ts isLinkTargetFile
imp src/lib/features/properties/RelationshipSearch.svelte:9 -> src/lib/utils/path.ts relativePath
imp src/lib/features/properties/RelationshipSearch.svelte:10 -> src/lib/features/file-icons/icon-resolver.ts resolveIconForPath
imp src/lib/features/properties/RelationshipSearch.svelte:11 -> src/lib/features/file-icons/file-icons.logic.ts iconColorStyle
imp src/lib/features/properties/RelationshipSearch.svelte:12 -> src/lib/features/file-icons/IconRenderer.svelte default
## imported-by
imp src/lib/features/properties/PropertiesView.svelte:41 -> src/lib/features/properties/RelationshipSearch.svelte default
## reach
in2 src/lib/features/properties/RelationshipSearch.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/properties/RelationshipSearch.svelte 12 files in 9 modules: src/lib/features/file-icons(3) src/lib/utils(2) src/lib/components(1) src/lib/contracts(1) src/lib/core/filesystem(1) +4 modules
## tests
test src/tests/lib/features/properties/RelationshipSearch.test.ts imports src/lib/features/properties/RelationshipSearch.svelte mirror
## symbols
sym src/lib/features/properties/RelationshipSearch.svelte:1 component RelationshipSearch props:onSelect L94
by src/lib/features/properties/RelationshipSearch.svelte:default <- src/lib/features/properties/PropertiesView.svelte:252 in (markup) mount
## locals
local src/lib/features/properties/RelationshipSearch.svelte:27 fn handleSelect(fileName: string) L5
local src/lib/features/properties/RelationshipSearch.svelte:33 fn handleKeydown(e: KeyboardEvent) L6
## mounts
mount src/lib/features/properties/RelationshipSearch.svelte:74 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
## mounted-at
mount src/lib/features/properties/PropertiesView.svelte:252 RelationshipSearch -> src/lib/features/properties/RelationshipSearch.svelte
## calls
call src/lib/features/properties/RelationshipSearch.svelte:24 in allFiles=$derived -> src/lib/core/filesystem/file-entries.logic.ts:flattenFileTree call
call src/lib/features/properties/RelationshipSearch.svelte:24 in allFiles=$derived -> src/lib/core/filesystem/wikilink-resolution.logic.ts:isLinkTargetFile call
call src/lib/features/properties/RelationshipSearch.svelte:25 in results=$derived -> src/lib/core/filesystem/file-entries.logic.ts:filterAndRank call
call src/lib/features/properties/RelationshipSearch.svelte:58 in (markup) -> src/lib/features/properties/RelationshipSearch.svelte:handleKeydown markup
call src/lib/features/properties/RelationshipSearch.svelte:65 in (markup) -> src/lib/features/file-icons/icon-resolver.ts:resolveIconForPath markup
call src/lib/features/properties/RelationshipSearch.svelte:70 in (markup) -> src/lib/features/properties/RelationshipSearch.svelte:handleSelect markup
call src/lib/features/properties/RelationshipSearch.svelte:76 in (markup) -> src/lib/features/file-icons/file-icons.logic.ts:iconColorStyle markup
call src/lib/features/properties/RelationshipSearch.svelte:82 in (markup) -> src/lib/utils/path.ts:relativePath markup
## effects
fx src/lib/features/properties/RelationshipSearch.svelte:41 timer.queueMicrotask in (markup)
