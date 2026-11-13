# file card src/lib/features/todoist-sync/closed-note-writer.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/todoist-sync/closed-note-writer.service.ts ' codemap/files
file src/lib/features/todoist-sync/closed-note-writer.service.ts service L81 module src/lib/features/todoist-sync in2 t1
## imports
imp src/lib/features/todoist-sync/closed-note-writer.service.ts:1 -> src/lib/contracts/ipc.ts call
imp src/lib/features/todoist-sync/closed-note-writer.service.ts:2 -> src/lib/contracts/index.ts type:TaskLineEdits,type:TaskLinesStale
imp src/lib/features/todoist-sync/closed-note-writer.service.ts:3 -> src/lib/core/editor/editor.hooks.ts markRecentSave
imp src/lib/features/todoist-sync/closed-note-writer.service.ts:4 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/todoist-sync/closed-note-writer.service.ts:5 -> src/lib/core/filesystem/fs.service.ts addToTree
imp src/lib/features/todoist-sync/closed-note-writer.service.ts:6 -> src/lib/core/filesystem/note-change.service.ts applyNoteChange
imp src/lib/features/todoist-sync/closed-note-writer.service.ts:7 -> src/lib/core/filesystem/task-write.service.ts settleTaskWrite
imp src/lib/features/todoist-sync/closed-note-writer.service.ts:8 -> src/lib/utils/debug.ts error
## imported-by
imp src/lib/features/todoist-sync/note-writer.service.ts:9 -> src/lib/features/todoist-sync/closed-note-writer.service.ts writeTaskLinesToClosedNote
imp src/lib/features/todoist-sync/sync-now.service.ts:28 -> src/lib/features/todoist-sync/closed-note-writer.service.ts createNoteFile
## reach
in2 src/lib/features/todoist-sync/closed-note-writer.service.ts 2 files in 1 modules: src/lib/features/todoist-sync(2)
out2 src/lib/features/todoist-sync/closed-note-writer.service.ts 68 files in 7 modules: src/lib/contracts(54) src/lib/core/filesystem(4) src/lib/core/editor(3) src/lib/utils(3) src/lib/core/settings(2) +2 modules
## tests
test src/tests/lib/features/todoist-sync/closed-note-writer.service.test.ts imports src/lib/features/todoist-sync/closed-note-writer.service.ts mirror
## symbols
sym src/lib/features/todoist-sync/closed-note-writer.service.ts:11 type ClosedNoteWriteResult L9 | What writeTaskLinesToClosedNote did.
sym src/lib/features/todoist-sync/closed-note-writer.service.ts:35 fn writeTaskLinesToClosedNote(vaultRoot: string, relPath: string, edits: TaskLineEdits): Promise<ClosedNoteWriteResult> L30 | Applies `edits` to a note that has no open tab, through the Rust guarded writer `write_task_lines` (located by anchor and expected line, all or nothing; todois…
by src/lib/features/todoist-sync/closed-note-writer.service.ts:writeTaskLinesToClosedNote <- src/lib/features/todoist-sync/note-writer.service.ts:48 in writeTaskLinesToNote call
sym src/lib/features/todoist-sync/closed-note-writer.service.ts:74 fn createNoteFile(vaultRoot: string, path: string, content: string): Promise<void> L8 | Creates a note holding `content` the way the note creator does, minus opening it: parent folders, `create_note` (which fails when the file exists), then the `c…
by src/lib/features/todoist-sync/closed-note-writer.service.ts:createNoteFile <- src/lib/features/todoist-sync/sync-now.service.ts:526 in cycle call
## calls
call src/lib/features/todoist-sync/closed-note-writer.service.ts:43 in writeTaskLinesToClosedNote -> src/lib/contracts/ipc.ts:call call +1
call src/lib/features/todoist-sync/closed-note-writer.service.ts:45 in writeTaskLinesToClosedNote -> src/lib/features/todoist-sync/closed-note-writer.service.ts:createNoteFile call
call src/lib/features/todoist-sync/closed-note-writer.service.ts:50 in writeTaskLinesToClosedNote -> src/lib/core/filesystem/task-write.service.ts:settleTaskWrite call
call src/lib/features/todoist-sync/closed-note-writer.service.ts:61 in writeTaskLinesToClosedNote -> src/lib/utils/debug.ts:error call
call src/lib/features/todoist-sync/closed-note-writer.service.ts:75 in createNoteFile -> src/lib/contracts/ipc.ts:call call +1
call src/lib/features/todoist-sync/closed-note-writer.service.ts:77 in createNoteFile -> src/lib/core/editor/editor.hooks.ts:markRecentSave call
call src/lib/features/todoist-sync/closed-note-writer.service.ts:79 in createNoteFile -> src/lib/core/filesystem/note-change.service.ts:applyNoteChange call
call src/lib/features/todoist-sync/closed-note-writer.service.ts:80 in createNoteFile -> src/lib/core/filesystem/fs.service.ts:addToTree call
## effects
ipc-call src/lib/features/todoist-sync/closed-note-writer.service.ts:43 in writeTaskLinesToClosedNote -> ipc:write_task_lines -> src-tauri/src/commands/vault.rs:858
ipc-call src/lib/features/todoist-sync/closed-note-writer.service.ts:46 in writeTaskLinesToClosedNote -> ipc:write_task_lines -> src-tauri/src/commands/vault.rs:858
ipc-call src/lib/features/todoist-sync/closed-note-writer.service.ts:75 in createNoteFile -> ipc:create_folder -> src-tauri/src/commands/vault.rs:1179
ipc-call src/lib/features/todoist-sync/closed-note-writer.service.ts:76 in createNoteFile -> ipc:create_note -> src-tauri/src/commands/vault.rs:1145
