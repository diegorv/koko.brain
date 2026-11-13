# file card src/lib/features/type-definitions/view-parse-cache.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/type-definitions/view-parse-cache.ts ' codemap/files
file src/lib/features/type-definitions/view-parse-cache.ts other L100 module src/lib/features/type-definitions in6 t17
## imports
imp src/lib/features/type-definitions/view-parse-cache.ts:1 -> pkg:@tauri-apps/plugin-fs readTextFile
imp src/lib/features/type-definitions/view-parse-cache.ts:2 -> src/lib/features/collection/yaml-parser.ts parseCollectionYaml
## imported-by
imp src/lib/app/boot.ts:16 -> src/lib/features/type-definitions/view-parse-cache.ts clearViewParseCacheUnder
imp src/lib/app/lifecycle/app-lifecycle.service.ts:86 -> src/lib/features/type-definitions/view-parse-cache.ts clearAllViewParseCache
imp src/lib/features/rail-shell/RailNoteList.svelte:41 -> src/lib/features/type-definitions/view-parse-cache.ts getCachedViewDefinition,getViewContentHash,refreshViewDefinition
imp src/lib/features/rail-shell/view-lens.service.ts:4 -> src/lib/features/type-definitions/view-parse-cache.ts refreshViewDefinition
imp src/lib/features/type-definitions/ViewDialog.svelte:19 -> src/lib/features/type-definitions/view-parse-cache.ts refreshViewDefinition
imp src/lib/features/type-definitions/type-definitions.service.ts:24 -> src/lib/features/type-definitions/view-parse-cache.ts refreshViewDefinition
## reach
in2 src/lib/features/type-definitions/view-parse-cache.ts 11 files in 6 modules: src/lib/app(3) src/lib/features/rail-shell(3) src/lib/features/event-calendar(2) src/lib/features/note-list(1) src/lib/plugins/mods(1) +1 modules: q impact src/lib/features/type-definitions/view-parse-cache.ts --depth 2
out2 src/lib/features/type-definitions/view-parse-cache.ts 1 files in 1 modules: src/lib/features/collection(1)
## tests
test src/tests/lib/features/type-definitions/view-parse-cache.test.ts imports src/lib/features/type-definitions/view-parse-cache.ts mirror
test src/tests/lib/app/boot.test.ts imports src/lib/features/type-definitions/view-parse-cache.ts
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts imports src/lib/features/type-definitions/view-parse-cache.ts
test src/tests/lib/app/meta-bind-open-view.test.ts imports src/lib/features/type-definitions/view-parse-cache.ts
test src/tests/lib/core/filesystem/fs.service.test.ts imports src/lib/features/type-definitions/view-parse-cache.ts
test src/tests/lib/features/collection/CollectionView.test.ts imports src/lib/features/type-definitions/view-parse-cache.ts
test src/tests/lib/features/rail-shell/RailNoteList.properties.test.ts imports src/lib/features/type-definitions/view-parse-cache.ts
test src/tests/lib/features/rail-shell/RailNoteList.search.test.ts imports src/lib/features/type-definitions/view-parse-cache.ts
test src/tests/lib/features/rail-shell/RailNoteList.sort.test.ts imports src/lib/features/type-definitions/view-parse-cache.ts
test src/tests/lib/features/rail-shell/RailNoteList.toolbar.test.ts imports src/lib/features/type-definitions/view-parse-cache.ts
test src/tests/lib/features/rail-shell/RailNoteList.view.test.ts imports src/lib/features/type-definitions/view-parse-cache.ts
test src/tests/lib/features/rail-shell/TypesNavigator.test.ts imports src/lib/features/type-definitions/view-parse-cache.ts
test src/tests/lib/features/rail-shell/view-lens.service.test.ts imports src/lib/features/type-definitions/view-parse-cache.ts
test src/tests/lib/features/type-definitions/ViewDialog.svelte.test.ts imports src/lib/features/type-definitions/view-parse-cache.ts
test src/tests/lib/features/type-definitions/edit-view.service.test.ts imports src/lib/features/type-definitions/view-parse-cache.ts
test src/tests/lib/features/type-definitions/update-view-toolbar-key.service.test.ts imports src/lib/features/type-definitions/view-parse-cache.ts
test src/tests/lib/features/type-definitions/type-definitions.service.test.ts mocks src/lib/features/type-definitions/view-parse-cache.ts
## symbols
sym src/lib/features/type-definitions/view-parse-cache.ts:43 fn refreshViewDefinition(path: string): Promise<ReturnType<typeof parseCollectionYaml>> L13 | Reads a .view file from disk, parses it, and updates the cache.
by src/lib/features/type-definitions/view-parse-cache.ts:refreshViewDefinition <- src/lib/features/rail-shell/RailNoteList.svelte:260 in loadView call
by src/lib/features/type-definitions/view-parse-cache.ts:refreshViewDefinition <- src/lib/features/rail-shell/view-lens.service.ts:33 in countViewNotes call
by src/lib/features/type-definitions/view-parse-cache.ts:refreshViewDefinition <- src/lib/features/type-definitions/ViewDialog.svelte:83 in load call
by src/lib/features/type-definitions/view-parse-cache.ts:refreshViewDefinition <- src/lib/features/type-definitions/type-definitions.service.ts:530 in updateViewToolbarKey call +1
sym src/lib/features/type-definitions/view-parse-cache.ts:58 fn getCachedViewDefinition(path: string): Promise<ReturnType<typeof parseCollectionYaml>> L5 | Returns cached parsed definition without disk I/O.
by src/lib/features/type-definitions/view-parse-cache.ts:getCachedViewDefinition <- src/lib/features/rail-shell/RailNoteList.svelte:261 in loadView call
sym src/lib/features/type-definitions/view-parse-cache.ts:69 fn getViewContentHash(path: string): string | undefined L3 | Returns the content hash of the cached parse for a path, or `undefined` when the path is not cached.
by src/lib/features/type-definitions/view-parse-cache.ts:getViewContentHash <- src/lib/features/rail-shell/RailNoteList.svelte:262 in loadView call
sym src/lib/features/type-definitions/view-parse-cache.ts:74 fn clearViewParseCache(path: string): void L5 | Clears a single entry (e.g. on file deletion).
sym src/lib/features/type-definitions/view-parse-cache.ts:84 fn clearViewParseCacheUnder(path: string): void L10 | Clears `path` and every entry under `path + '/'`, so one call covers a renamed, moved or deleted folder and all the `.view` files inside it.
by src/lib/features/type-definitions/view-parse-cache.ts:clearViewParseCacheUnder <- src/lib/app/boot.ts:47 in registerAppPorts call
sym src/lib/features/type-definitions/view-parse-cache.ts:96 fn clearAllViewParseCache(): void L5 | Clears all entries.
by src/lib/features/type-definitions/view-parse-cache.ts:clearAllViewParseCache <- src/lib/app/lifecycle/app-lifecycle.service.ts:659 in teardownVault call
## locals
local src/lib/features/type-definitions/view-parse-cache.ts:36 fn simpleHash(str: string): string L5
## calls
call src/lib/features/type-definitions/view-parse-cache.ts:47 in refreshViewDefinition -> src/lib/features/collection/yaml-parser.ts:parseCollectionYaml call +1
call src/lib/features/type-definitions/view-parse-cache.ts:49 in refreshViewDefinition -> src/lib/features/type-definitions/view-parse-cache.ts:simpleHash call
call src/lib/features/type-definitions/view-parse-cache.ts:61 in getCachedViewDefinition -> src/lib/features/type-definitions/view-parse-cache.ts:refreshViewDefinition call
## effects
fx src/lib/features/type-definitions/view-parse-cache.ts:46 tauri-fs.readTextFile in refreshViewDefinition
