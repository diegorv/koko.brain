# file card src/lib/core/filesystem/note-change.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/filesystem/note-change.service.ts ' codemap/files
file src/lib/core/filesystem/note-change.service.ts service L286 module src/lib/core/filesystem in16 t12
## imports
imp src/lib/core/filesystem/note-change.service.ts:1 -> src/lib/contracts/ipc.ts call
imp src/lib/core/filesystem/note-change.service.ts:2 -> src/lib/utils/index-dedupe.ts isAlreadyIndexed,markIndexed,clearIndexedEntry
imp src/lib/core/filesystem/note-change.service.ts:3 -> src/lib/utils/path.ts vaultRelativeKey
imp src/lib/core/filesystem/note-change.service.ts:4 -> src/lib/utils/debug.ts debug,error
## imported-by
imp src/lib/app/boot.ts:1 -> src/lib/core/filesystem/note-change.service.ts registerContentInvalidationListener
imp src/lib/app/lifecycle/index-updater.service.ts:1 -> src/lib/core/filesystem/note-change.service.ts applyNoteChange
imp src/lib/app/lifecycle/watcher-handler.service.ts:7 -> src/lib/core/filesystem/note-change.service.ts applyNoteChange,notifyContentInvalidated
imp src/lib/core/editor/editor.hooks.ts:1 -> src/lib/core/filesystem/note-change.service.ts applyNoteChange,notifyContentInvalidated
imp src/lib/core/filesystem/fs.service.ts:7 -> src/lib/core/filesystem/note-change.service.ts applyNoteChange
imp src/lib/core/filesystem/link-updater.service.ts:12 -> src/lib/core/filesystem/note-change.service.ts applyNoteChange
imp src/lib/core/filesystem/path-change.service.ts:6 -> src/lib/core/filesystem/note-change.service.ts applyNoteChange
imp src/lib/core/filesystem/task-write.service.ts:4 -> src/lib/core/filesystem/note-change.service.ts applyNoteChange,notifyContentInvalidated
imp src/lib/core/note-creator/note-creator.service.ts:8 -> src/lib/core/filesystem/note-change.service.ts applyNoteChange
imp src/lib/core/trash/trash.service.ts:16 -> src/lib/core/filesystem/note-change.service.ts applyNoteChange,notifyContentInvalidated
imp src/lib/features/collection/collection.service.ts:2 -> src/lib/core/filesystem/note-change.service.ts registerNoteChangeConsumer
imp src/lib/features/file-icons/file-icons.service.ts:3 -> src/lib/core/filesystem/note-change.service.ts applyNoteChange,registerNoteChangeConsumer
imp src/lib/features/todoist-sync/closed-note-writer.service.ts:6 -> src/lib/core/filesystem/note-change.service.ts applyNoteChange
imp src/lib/features/type-definitions/type-definitions.service.ts:13 -> src/lib/core/filesystem/note-change.service.ts applyNoteChange
imp src/lib/plugins/mods/mod-vault.service.ts:10 -> src/lib/core/filesystem/note-change.service.ts applyNoteChange
imp src/lib/plugins/queryjs/queryjs-ports.ts:2 -> src/lib/core/filesystem/note-change.service.ts registerContentInvalidationListener
## reach
in2 src/lib/core/filesystem/note-change.service.ts 44 files in 25 modules: src/lib/features/rail-shell(7) src/lib/app(6) src/lib/features/todoist-sync(3) src/lib/plugins/mods(3) src/lib/core/filesystem(2) +20 modules: q impact src/lib/core/filesystem/note-change.service.ts --depth 2
out2 src/lib/core/filesystem/note-change.service.ts 5 files in 3 modules: src/lib/contracts(2) src/lib/core/settings(2) src/lib/utils(1)
## tests
test src/tests/lib/core/filesystem/note-change.service.test.ts imports src/lib/core/filesystem/note-change.service.ts mirror
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts imports src/lib/core/filesystem/note-change.service.ts
test src/tests/lib/app/lifecycle/index-updater.service.test.ts imports src/lib/core/filesystem/note-change.service.ts
test src/tests/lib/app/lifecycle/watcher-handler.service.test.ts imports src/lib/core/filesystem/note-change.service.ts
test src/tests/lib/core/filesystem/task-write.service.test.ts imports src/lib/core/filesystem/note-change.service.ts
test src/tests/lib/core/frontmatter/frontmatter-write.service.test.ts imports src/lib/core/filesystem/note-change.service.ts
test src/tests/lib/core/note-creator/note-creator.service.test.ts imports src/lib/core/filesystem/note-change.service.ts
test src/tests/lib/core/trash/trash.service.test.ts imports src/lib/core/filesystem/note-change.service.ts
test src/tests/lib/features/collection/collection.service.test.ts imports src/lib/core/filesystem/note-change.service.ts
test src/tests/lib/features/tasks/tasks.service.test.ts imports src/lib/core/filesystem/note-change.service.ts
test src/tests/lib/features/todoist-sync/closed-note-writer.service.test.ts imports src/lib/core/filesystem/note-change.service.ts
test src/tests/lib/plugins/mods/mod-vault.service.test.ts imports src/lib/core/filesystem/note-change.service.ts
## symbols
sym src/lib/core/filesystem/note-change.service.ts:20 type NoteChangeSource L1 | Where a note change came from.
sym src/lib/core/filesystem/note-change.service.ts:27 interface NoteChangeConsumer L8 | A per-file index that has to follow a note's bytes.
sym src/lib/core/filesystem/note-change.service.ts:37 type NoteChange L21 | Descriptor for one note change.
sym src/lib/core/filesystem/note-change.service.ts:109 fn registerNoteChangeConsumer(consumer: NoteChangeConsumer): () => void L9 | Registers a per-file index to follow every note change.
by src/lib/core/filesystem/note-change.service.ts:registerNoteChangeConsumer <- src/lib/features/collection/collection.service.ts:183 in registerCollectionNoteChangeConsumer call
by src/lib/core/filesystem/note-change.service.ts:registerNoteChangeConsumer <- src/lib/features/file-icons/file-icons.service.ts:300 in registerFileIconsNoteChangeConsumer call
sym src/lib/core/filesystem/note-change.service.ts:144 fn registerContentInvalidationListener(name: string, invalidate: () => void): () => void L8 | Registers a listener for the vault-wide "note content changed" signal.
by src/lib/core/filesystem/note-change.service.ts:registerContentInvalidationListener <- src/lib/app/boot.ts:39 in registerAppPorts call +1
by src/lib/core/filesystem/note-change.service.ts:registerContentInvalidationListener <- src/lib/plugins/queryjs/queryjs-ports.ts:15 in registerQueryjsBlockPorts call
sym src/lib/core/filesystem/note-change.service.ts:154 fn notifyContentInvalidated(): void L9 | Fires every content-invalidation listener, isolating and logging failures.
by src/lib/core/filesystem/note-change.service.ts:notifyContentInvalidated <- src/lib/app/lifecycle/watcher-handler.service.ts:83 in rebuildAllIndexes call +1
by src/lib/core/filesystem/note-change.service.ts:notifyContentInvalidated <- src/lib/core/editor/editor.hooks.ts:83 in notifyAfterSave call
by src/lib/core/filesystem/note-change.service.ts:notifyContentInvalidated <- src/lib/core/filesystem/task-write.service.ts:37 in settleTaskWrite call
by src/lib/core/filesystem/note-change.service.ts:notifyContentInvalidated <- src/lib/core/trash/trash.service.ts:261 in indexRestoredNotes call
sym src/lib/core/filesystem/note-change.service.ts:198 fn applyNoteChange(change: NoteChange): Promise<void> L73 | THE one owner of "a note's bytes changed".
by src/lib/core/filesystem/note-change.service.ts:applyNoteChange <- src/lib/app/lifecycle/index-updater.service.ts:34 in updateIndexesForFile call
by src/lib/core/filesystem/note-change.service.ts:applyNoteChange <- src/lib/app/lifecycle/watcher-handler.service.ts:115 in incrementalUpdateFiles call
by src/lib/core/filesystem/note-change.service.ts:applyNoteChange <- src/lib/core/editor/editor.hooks.ts:81 in notifyAfterSave call
by src/lib/core/filesystem/note-change.service.ts:applyNoteChange <- src/lib/core/filesystem/fs.service.ts:216 in createFile call
by src/lib/core/filesystem/note-change.service.ts:applyNoteChange <- src/lib/core/filesystem/link-updater.service.ts:71 in updateLinksAfterRename call
by src/lib/core/filesystem/note-change.service.ts:applyNoteChange <- src/lib/core/filesystem/path-change.service.ts:118 in forgetNote call
by src/lib/core/filesystem/note-change.service.ts:applyNoteChange <- src/lib/core/filesystem/task-write.service.ts:30 in settleTaskWrite call
by src/lib/core/filesystem/note-change.service.ts:applyNoteChange <- src/lib/core/note-creator/note-creator.service.ts:119 in openOrCreateNote call
more by 5 not shown: src/lib/core/trash(1) src/lib/features/file-icons(1) src/lib/features/todoist-sync(1) src/lib/features/type-definitions(1) src/lib/plugins/mods(1): q importers src/lib/core/filesystem/note-change.service.ts:applyNoteChange
## locals
local src/lib/core/filesystem/note-change.service.ts:165 fn yieldToEventLoop(): Promise<void> L1
local src/lib/core/filesystem/note-change.service.ts:168 fn fanOut(action: 'upsert' | 'remove', path: string, content: string): void L13
local src/lib/core/filesystem/note-change.service.ts:279 fn ftsKey(vaultPath: string | undefined, path: string): string | null L8
## calls
call src/lib/core/filesystem/note-change.service.ts:111 in registerNoteChangeConsumer -> src/lib/utils/debug.ts:debug call +1
call src/lib/core/filesystem/note-change.service.ts:159 in notifyContentInvalidated -> src/lib/utils/debug.ts:error call
call src/lib/core/filesystem/note-change.service.ts:177 in fanOut -> src/lib/utils/debug.ts:error call
call src/lib/core/filesystem/note-change.service.ts:205 in applyNoteChange -> src/lib/utils/index-dedupe.ts:clearIndexedEntry call
call src/lib/core/filesystem/note-change.service.ts:206 in applyNoteChange -> src/lib/core/filesystem/note-change.service.ts:fanOut call +1
call src/lib/core/filesystem/note-change.service.ts:207 in applyNoteChange -> src/lib/contracts/ipc.ts:call call +5
call src/lib/core/filesystem/note-change.service.ts:208 in applyNoteChange -> src/lib/utils/debug.ts:error call +4
call src/lib/core/filesystem/note-change.service.ts:210 in applyNoteChange -> src/lib/core/filesystem/note-change.service.ts:ftsKey call +1
call src/lib/core/filesystem/note-change.service.ts:230 in applyNoteChange -> src/lib/utils/index-dedupe.ts:isAlreadyIndexed call
call src/lib/core/filesystem/note-change.service.ts:234 in applyNoteChange -> src/lib/utils/index-dedupe.ts:markIndexed call
call src/lib/core/filesystem/note-change.service.ts:258 in applyNoteChange -> src/lib/utils/debug.ts:debug call
call src/lib/core/filesystem/note-change.service.ts:265 in applyNoteChange -> src/lib/core/filesystem/note-change.service.ts:yieldToEventLoop call
call src/lib/core/filesystem/note-change.service.ts:281 in ftsKey -> src/lib/utils/path.ts:vaultRelativeKey call
call src/lib/core/filesystem/note-change.service.ts:283 in ftsKey -> src/lib/utils/debug.ts:debug call
## effects
fx src/lib/core/filesystem/note-change.service.ts:165 timer.setTimeout delay=0 in yieldToEventLoop
ipc-call src/lib/core/filesystem/note-change.service.ts:207 in applyNoteChange -> ipc:remove_note_from_index -> src-tauri/src/commands/vault.rs:1242
ipc-call src/lib/core/filesystem/note-change.service.ts:214 in applyNoteChange -> ipc:remove_from_search_index -> src-tauri/src/commands/search_index.rs:239
ipc-call src/lib/core/filesystem/note-change.service.ts:222 in applyNoteChange -> ipc:remove_semantic_file -> src-tauri/src/commands/semantic.rs:1282
ipc-call src/lib/core/filesystem/note-change.service.ts:240 in applyNoteChange -> ipc:update_note_in_index -> src-tauri/src/commands/vault.rs:358
ipc-call src/lib/core/filesystem/note-change.service.ts:252 in applyNoteChange -> ipc:update_search_index_file -> src-tauri/src/commands/search_index.rs:203
ipc-call src/lib/core/filesystem/note-change.service.ts:257 in applyNoteChange -> ipc:update_semantic_file -> src-tauri/src/commands/semantic.rs:1305
