# file card src/lib/features/collection/collection.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/collection/collection.store.svelte.ts ' codemap/files
file src/lib/features/collection/collection.store.svelte.ts store L83 module src/lib/features/collection in13 t44
## imports
imp src/lib/features/collection/collection.store.svelte.ts:1 -> src/lib/features/collection/collection.types.ts type:PropertyIndexRecord
## imported-by
imp src/lib/app/boot.ts:8 -> src/lib/features/collection/collection.store.svelte.ts collectionStore
imp src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:18 -> src/lib/features/collection/collection.store.svelte.ts collectionStore
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:16 -> src/lib/features/collection/collection.store.svelte.ts collectionStore
imp src/lib/features/auto-organize/auto-organize.service.ts:45 -> src/lib/features/collection/collection.store.svelte.ts collectionStore
imp src/lib/features/collection/CollectionView.svelte:15 -> src/lib/features/collection/collection.store.svelte.ts collectionStore
imp src/lib/features/collection/collection-block-widget.ts:7 -> src/lib/features/collection/collection.store.svelte.ts collectionStore
imp src/lib/features/collection/collection.service.ts:8 -> src/lib/features/collection/collection.store.svelte.ts collectionStore
imp src/lib/features/rail-shell/RailNoteList.svelte:29 -> src/lib/features/collection/collection.store.svelte.ts collectionStore
imp src/lib/features/rail-shell/TypesNavigator.svelte:46 -> src/lib/features/collection/collection.store.svelte.ts collectionStore
imp src/lib/features/type-definitions/ViewDialog.svelte:7 -> src/lib/features/collection/collection.store.svelte.ts collectionStore
imp src/lib/plugins/mods/mod-app.service.ts:9 -> src/lib/features/collection/collection.store.svelte.ts collectionStore
imp src/lib/plugins/mods/mod-query.service.ts:2 -> src/lib/features/collection/collection.store.svelte.ts collectionStore
imp src/lib/plugins/queryjs/queryjs-block-widget.ts:9 -> src/lib/features/collection/collection.store.svelte.ts collectionStore
## reach
in2 src/lib/features/collection/collection.store.svelte.ts 11 files in 6 modules: src/lib/app(6) src/lib/features/auto-organize(1) src/lib/features/rail-shell(1) src/lib/plugins/mods(1) src/lib/plugins/queryjs(1) +1 modules: q impact src/lib/features/collection/collection.store.svelte.ts --depth 2
out2 src/lib/features/collection/collection.store.svelte.ts 1 files in 1 modules: src/lib/features/collection(1)
## tests
test src/tests/lib/features/collection/collection.store.test.ts imports src/lib/features/collection/collection.store.svelte.ts mirror
test src/tests/lib/app/EditorView.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/app/lifecycle/index-updater.service.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/app/lifecycle/watcher-handler.mixed-batch.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/app/lifecycle/watcher-handler.service.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/app/meta-bind-open-view.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/app/tauri-listeners.service.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/core/editor/editor.hooks.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/core/filesystem/fs.service.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/core/filesystem/link-updater.service.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/core/filesystem/note-change.service.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/core/note-creator/note-creator.service.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/features/auto-organize/AutoOrganizeRuleRow.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/features/auto-organize/auto-organize.service.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/features/collection/CollectionView.restored-view.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/features/collection/CollectionView.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/features/collection/CollectionView.view-writes.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/features/collection/collection-block-click.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/features/collection/collection-block-row-rule.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/features/collection/collection-block-widget.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/features/collection/collection-view-index-path-change.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/features/collection/collection.service.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/features/collection/toolbar/suggestions-skip-views.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/features/file-icons/file-icons.service.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/features/file-icons/frontmatter-icon.service.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/features/properties/lifecycle.service.favorite-path.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/features/properties/lifecycle.service.rail-pin.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/features/rail-shell/RailNoteList.properties.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/features/rail-shell/RailNoteList.search.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/features/rail-shell/RailNoteList.sort.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/features/rail-shell/RailNoteList.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/features/rail-shell/RailNoteList.toolbar.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/features/rail-shell/RailNoteList.view.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/features/rail-shell/TypesNavigator.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/features/type-definitions/ViewDialog.svelte.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/features/type-definitions/type-definitions.service.test.ts imports src/lib/features/collection/collection.store.svelte.ts
test src/tests/lib/plugins/mods/mod-note-saved.test.ts imports src/lib/features/collection/collection.store.svelte.ts
more tests 4 not shown: src/tests/lib/plugins/mods(2) src/tests/lib/plugins/queryjs(2): q tests src/lib/features/collection/collection.store.svelte.ts
## symbols
sym src/lib/features/collection/collection.store.svelte.ts:28 store collectionStore L56 | Reactive store for the collection property index
by src/lib/features/collection/collection.store.svelte.ts:collectionStore <- src/lib/app/boot.ts:79 in registerAppPorts member
by src/lib/features/collection/collection.store.svelte.ts:collectionStore <- src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:172 in preview=$derived member
by src/lib/features/collection/collection.store.svelte.ts:collectionStore <- src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:85 in availableProperties=$derived member +4
by src/lib/features/collection/collection.store.svelte.ts:collectionStore <- src/lib/features/auto-organize/auto-organize.service.ts:293 in evaluateAndMove member
by src/lib/features/collection/collection.store.svelte.ts:collectionStore <- src/lib/features/collection/CollectionView.svelte:145 in restoreViewIndex mcall +7
by src/lib/features/collection/collection.store.svelte.ts:collectionStore <- src/lib/features/collection/collection-block-widget.ts:79 in CollectionBlockWidget.constructor member +5
by src/lib/features/collection/collection.store.svelte.ts:collectionStore <- src/lib/features/collection/collection.service.ts:101 in buildPropertyIndex mcall +11
by src/lib/features/collection/collection.store.svelte.ts:collectionStore <- src/lib/features/rail-shell/RailNoteList.svelte:182 in availableProperties=$derived member +6
more by 5 not shown: src/lib/plugins/mods(2) src/lib/features/rail-shell(1) src/lib/features/type-definitions(1) src/lib/plugins/queryjs(1): q importers src/lib/features/collection/collection.store.svelte.ts:collectionStore
## store
store src/lib/features/collection/collection.store.svelte.ts:28 collectionStore esc:0
mem src/lib/features/collection/collection.store.svelte.ts:29 get collectionStore.propertyIndex r:28 w-via:setPropertyIndex,updateRecord,removeRecord,reset
more r 28 not shown: src/lib/features/collection(8) src/lib/features/auto-organize(7) src/lib/features/rail-shell(6) src/lib/plugins/mods(3) src/lib/features/type-definitions(2) src/lib/app(1) src/lib/plugins/queryjs(1): q store src/lib/features/collection/collection.store.svelte.ts:collectionStore.propertyIndex
mem src/lib/features/collection/collection.store.svelte.ts:30 get collectionStore.isIndexReady r:12 w-via:setPropertyIndex,reset
more r 12 not shown: src/lib/features/collection(5) src/lib/features/rail-shell(3) src/lib/plugins/queryjs(3) src/lib/plugins/mods(1): q store src/lib/features/collection/collection.store.svelte.ts:collectionStore.isIndexReady
mem src/lib/features/collection/collection.store.svelte.ts:31 get collectionStore.version r:src/lib/features/collection/collection-block-widget.ts:80,src/lib/features/collection/collection-block-widget.ts:423,src/lib/plugins/mods/mod-app.service.ts:88,src/lib/plugins/queryjs/queryjs-block-widget.ts:249 w-via:setPropertyIndex,updateRecord,removeRecord
mem src/lib/features/collection/collection.store.svelte.ts:34 do collectionStore.setPropertyIndex w:src/lib/features/collection/collection.service.ts:101,src/lib/features/collection/collection.service.ts:137 | Replaces the entire property index and marks it as ready
mem src/lib/features/collection/collection.store.svelte.ts:41 do collectionStore.updateRecord w:src/lib/features/collection/collection.service.ts:161 | Updates a single note record in the index
mem src/lib/features/collection/collection.store.svelte.ts:49 do collectionStore.removeRecord w:src/lib/features/collection/collection.service.ts:168 | Removes a note record from the index
mem src/lib/features/collection/collection.store.svelte.ts:57 do collectionStore.getViewIndex w:src/lib/features/collection/CollectionView.svelte:145,src/lib/features/collection/collection.service.ts:201 | Returns the view index last used in the collection at `path`, if any
mem src/lib/features/collection/collection.store.svelte.ts:62 do collectionStore.setViewIndex w:src/lib/features/collection/CollectionView.svelte:154,src/lib/features/collection/collection.service.ts:203 | Remembers `index` as the view last used in the collection at `path`
mem src/lib/features/collection/collection.store.svelte.ts:67 do collectionStore.deleteViewIndex w:src/lib/features/collection/collection.service.ts:202 | Forgets the view index remembered for `path`
mem src/lib/features/collection/collection.store.svelte.ts:72 do collectionStore.viewIndexPaths w:src/lib/features/collection/collection.service.ts:199 | Paths that currently have a remembered view index
mem src/lib/features/collection/collection.store.svelte.ts:78 do collectionStore.reset w:src/lib/features/collection/collection.service.ts:218 | Resets the store to its initial state.
