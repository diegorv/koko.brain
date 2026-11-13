# file card src/lib/core/filesystem/task-write.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/filesystem/task-write.service.ts ' codemap/files
file src/lib/core/filesystem/task-write.service.ts service L38 module src/lib/core/filesystem in2 t1
## imports
imp src/lib/core/filesystem/task-write.service.ts:1 -> src/lib/core/editor/editor.service.ts syncExternalContentToEditor
imp src/lib/core/filesystem/task-write.service.ts:2 -> src/lib/core/editor/editor.hooks.ts markRecentSave
imp src/lib/core/filesystem/task-write.service.ts:3 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/core/filesystem/task-write.service.ts:4 -> src/lib/core/filesystem/note-change.service.ts applyNoteChange,notifyContentInvalidated
## imported-by
imp src/lib/features/tasks/tasks.service.ts:6 -> src/lib/core/filesystem/task-write.service.ts settleTaskWrite
imp src/lib/features/todoist-sync/closed-note-writer.service.ts:7 -> src/lib/core/filesystem/task-write.service.ts settleTaskWrite
## reach
in2 src/lib/core/filesystem/task-write.service.ts 8 files in 3 modules: src/lib/app(3) src/lib/features/tasks(3) src/lib/features/todoist-sync(2)
out2 src/lib/core/filesystem/task-write.service.ts 12 files in 6 modules: src/lib/utils(5) src/lib/core/editor(3) src/lib/contracts(1) src/lib/core/filesystem(1) src/lib/core/markdown-editor(1) +1 modules
## tests
test src/tests/lib/core/filesystem/task-write.service.test.ts imports src/lib/core/filesystem/task-write.service.ts mirror
## symbols
sym src/lib/core/filesystem/task-write.service.ts:24 fn settleTaskWrite(path: string, updatedContent: string): void L15 | Settles a note a Rust task command (`toggle_task_status`, `write_task_lines`, `write_task_text`) already wrote to disk and indexed in `VaultIndex`.
by src/lib/core/filesystem/task-write.service.ts:settleTaskWrite <- src/lib/features/tasks/tasks.service.ts:514 in afterTaskWrite call
by src/lib/core/filesystem/task-write.service.ts:settleTaskWrite <- src/lib/features/todoist-sync/closed-note-writer.service.ts:50 in writeTaskLinesToClosedNote call
## calls
call src/lib/core/filesystem/task-write.service.ts:28 in settleTaskWrite -> src/lib/core/editor/editor.service.ts:syncExternalContentToEditor call
call src/lib/core/filesystem/task-write.service.ts:29 in settleTaskWrite -> src/lib/core/editor/editor.hooks.ts:markRecentSave call
call src/lib/core/filesystem/task-write.service.ts:30 in settleTaskWrite -> src/lib/core/filesystem/note-change.service.ts:applyNoteChange call
call src/lib/core/filesystem/task-write.service.ts:37 in settleTaskWrite -> src/lib/core/filesystem/note-change.service.ts:notifyContentInvalidated call
