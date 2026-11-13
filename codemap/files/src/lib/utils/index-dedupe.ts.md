# file card src/lib/utils/index-dedupe.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/utils/index-dedupe.ts ' codemap/files
file src/lib/utils/index-dedupe.ts other L39 module src/lib/utils in3 t33
## imported-by
imp src/lib/app/lifecycle/index-updater.service.ts:3 -> src/lib/utils/index-dedupe.ts isAlreadyIndexed
imp src/lib/core/editor/editor.hooks.ts:2 -> src/lib/utils/index-dedupe.ts clearAllIndexed
imp src/lib/core/filesystem/note-change.service.ts:2 -> src/lib/utils/index-dedupe.ts isAlreadyIndexed,markIndexed,clearIndexedEntry
## reach
in2 src/lib/utils/index-dedupe.ts 30 files in 19 modules: src/lib/app(5) src/lib/core/filesystem(4) src/lib/features/rail-shell(2) src/lib/features/search(2) src/lib/features/todoist-sync(2) +14 modules: q impact src/lib/utils/index-dedupe.ts --depth 2
out2 src/lib/utils/index-dedupe.ts 0 files in 0 modules: -
## tests
test src/tests/lib/utils/index-dedupe.test.ts imports src/lib/utils/index-dedupe.ts mirror
test src/tests/fixtures/calendar-vault.fixture.ts imports src/lib/utils/index-dedupe.ts
test src/tests/lib/app/lifecycle/index-updater.service.test.ts imports src/lib/utils/index-dedupe.ts
test src/tests/lib/app/lifecycle/watcher-handler.mixed-batch.test.ts imports src/lib/utils/index-dedupe.ts
test src/tests/lib/app/lifecycle/watcher-handler.service.test.ts imports src/lib/utils/index-dedupe.ts
test src/tests/lib/core/editor/editor.hooks.test.ts imports src/lib/utils/index-dedupe.ts
test src/tests/lib/core/filesystem/fs.service.test.ts imports src/lib/utils/index-dedupe.ts
test src/tests/lib/core/filesystem/link-updater.service.test.ts imports src/lib/utils/index-dedupe.ts
test src/tests/lib/core/filesystem/note-change.service.test.ts imports src/lib/utils/index-dedupe.ts
test src/tests/lib/core/frontmatter/frontmatter-write.service.test.ts imports src/lib/utils/index-dedupe.ts
test src/tests/lib/core/note-creator/note-creator.service.test.ts imports src/lib/utils/index-dedupe.ts
test src/tests/lib/core/note-creator/note-creator.tree.test.ts imports src/lib/utils/index-dedupe.ts
test src/tests/lib/core/trash/trash.restore-tree.test.ts imports src/lib/utils/index-dedupe.ts
test src/tests/lib/core/trash/trash.service.test.ts imports src/lib/utils/index-dedupe.ts
test src/tests/lib/features/collection/CollectionView.view-writes.test.ts imports src/lib/utils/index-dedupe.ts
test src/tests/lib/features/collection/collection.service.test.ts imports src/lib/utils/index-dedupe.ts
test src/tests/lib/features/event-calendar/EventDialog.test.ts imports src/lib/utils/index-dedupe.ts
test src/tests/lib/features/file-icons/file-icons.service.test.ts imports src/lib/utils/index-dedupe.ts
test src/tests/lib/features/file-icons/frontmatter-icon.service.test.ts imports src/lib/utils/index-dedupe.ts
test src/tests/lib/features/note-action-bar/NoteActionBar.test.ts imports src/lib/utils/index-dedupe.ts
test src/tests/lib/features/properties/bookmark-migration.service.test.ts imports src/lib/utils/index-dedupe.ts
test src/tests/lib/features/properties/lifecycle.service.favorite-path.test.ts imports src/lib/utils/index-dedupe.ts
test src/tests/lib/features/properties/lifecycle.service.rail-pin.test.ts imports src/lib/utils/index-dedupe.ts
test src/tests/lib/features/properties/lifecycle.service.test.ts imports src/lib/utils/index-dedupe.ts
test src/tests/lib/features/rail-shell/list-prefs.service.test.ts imports src/lib/utils/index-dedupe.ts
test src/tests/lib/features/type-definitions/edit-view.service.test.ts imports src/lib/utils/index-dedupe.ts
test src/tests/lib/features/type-definitions/rewrite-view-file.service.test.ts imports src/lib/utils/index-dedupe.ts
test src/tests/lib/features/type-definitions/type-definitions.service.test.ts imports src/lib/utils/index-dedupe.ts
test src/tests/lib/plugins/mods/mod-vault-paths.test.ts imports src/lib/utils/index-dedupe.ts
test src/tests/lib/plugins/mods/mod-vault.service.test.ts imports src/lib/utils/index-dedupe.ts
test src/tests/lib/plugins/one-on-one/MyPeopleSection.test.ts imports src/lib/utils/index-dedupe.ts
test src/tests/lib/plugins/one-on-one/one-on-one.create.test.ts imports src/lib/utils/index-dedupe.ts
test src/tests/lib/core/filesystem/fs.service.race-audit.test.ts mocks src/lib/utils/index-dedupe.ts
## symbols
sym src/lib/utils/index-dedupe.ts:19 fn isAlreadyIndexed(path: string, content: string): boolean L3 | Returns true if the given (path, content) was the most recent input to the shared updaters.
by src/lib/utils/index-dedupe.ts:isAlreadyIndexed <- src/lib/app/lifecycle/index-updater.service.ts:29 in updateIndexesForFile call
by src/lib/utils/index-dedupe.ts:isAlreadyIndexed <- src/lib/core/filesystem/note-change.service.ts:230 in applyNoteChange call
sym src/lib/utils/index-dedupe.ts:26 fn markIndexed(path: string, content: string): void L3 | Records that the given (path, content) has just been sent through the shared updaters.
by src/lib/utils/index-dedupe.ts:markIndexed <- src/lib/core/filesystem/note-change.service.ts:234 in applyNoteChange call
sym src/lib/utils/index-dedupe.ts:32 fn clearIndexedEntry(path: string): void L3 | Removes the signature for a path.
by src/lib/utils/index-dedupe.ts:clearIndexedEntry <- src/lib/core/filesystem/note-change.service.ts:205 in applyNoteChange call
sym src/lib/utils/index-dedupe.ts:37 fn clearAllIndexed(): void L3 | Drops every signature.
by src/lib/utils/index-dedupe.ts:clearAllIndexed <- src/lib/core/editor/editor.hooks.ts:136 in resetHooks call
