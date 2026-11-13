# file card src/lib/features/todoist-sync/note-writer.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/todoist-sync/note-writer.service.ts ' codemap/files
file src/lib/features/todoist-sync/note-writer.service.ts service L104 module src/lib/features/todoist-sync in2 t1
## imports
imp src/lib/features/todoist-sync/note-writer.service.ts:2 -> pkg:@tauri-apps/plugin-fs readTextFile
imp src/lib/features/todoist-sync/note-writer.service.ts:3 -> src/lib/contracts/index.ts type:TaskLineEdits,type:TaskLinesStale
imp src/lib/features/todoist-sync/note-writer.service.ts:4 -> src/lib/core/editor/editor.service.ts syncExternalContentToEditor
imp src/lib/features/todoist-sync/note-writer.service.ts:5 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/todoist-sync/note-writer.service.ts:6 -> src/lib/core/markdown-editor/doc-diff.logic.ts docDiff
imp src/lib/features/todoist-sync/note-writer.service.ts:7 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/todoist-sync/note-writer.service.ts:8 -> src/lib/utils/debug.ts error
imp src/lib/features/todoist-sync/note-writer.service.ts:9 -> src/lib/features/todoist-sync/closed-note-writer.service.ts writeTaskLinesToClosedNote
imp src/lib/features/todoist-sync/note-writer.service.ts:10 -> src/lib/features/todoist-sync/task-line-edits.logic.ts applyTaskLineEdits
## imported-by
imp src/lib/features/todoist-sync/sync-now.service.ts:50 -> src/lib/features/todoist-sync/note-writer.service.ts readNoteContent,writeTaskLinesToNote
imp src/lib/features/todoist-sync/vault-scan.service.ts:5 -> src/lib/features/todoist-sync/note-writer.service.ts readNoteContent
## reach
in2 src/lib/features/todoist-sync/note-writer.service.ts 1 files in 1 modules: src/lib/features/todoist-sync(1)
out2 src/lib/features/todoist-sync/note-writer.service.ts 68 files in 8 modules: src/lib/contracts(54) src/lib/core/filesystem(4) src/lib/core/editor(3) src/lib/core/settings(2) src/lib/utils(2) +3 modules
## tests
test src/tests/lib/features/todoist-sync/note-writer.service.test.ts imports src/lib/features/todoist-sync/note-writer.service.ts mirror
## symbols
sym src/lib/features/todoist-sync/note-writer.service.ts:13 type NoteWriteResult L7 | What writeTaskLinesToNote did.
sym src/lib/features/todoist-sync/note-writer.service.ts:41 fn writeTaskLinesToNote(vaultRoot: string, relPath: string, edits: TaskLineEdits): Promise<NoteWriteResult> L19 | Applies `edits` to a note, guarded by anchor and expected line, all or nothing (todoist-bisync design rule 12).
by src/lib/features/todoist-sync/note-writer.service.ts:writeTaskLinesToNote <- src/lib/features/todoist-sync/sync-now.service.ts:1123 in writeBatches call +1
sym src/lib/features/todoist-sync/note-writer.service.ts:94 fn readNoteContent(vaultRoot: string, relPath: string): Promise<string> L11 | The current text of a note for the sync's diff: the open tab's content (unsaved edits included) when the note has a tab, else the file on disk.
by src/lib/features/todoist-sync/note-writer.service.ts:readNoteContent <- src/lib/features/todoist-sync/sync-now.service.ts:875 in readLineNotes call +1
by src/lib/features/todoist-sync/note-writer.service.ts:readNoteContent <- src/lib/features/todoist-sync/vault-scan.service.ts:86 in scanVault call
## locals
local src/lib/features/todoist-sync/note-writer.service.ts:62 fn writeToOpenTab(vaultRoot: string, path: string, edits: TaskLineEdits): NoteWriteResult L24
## calls
call src/lib/features/todoist-sync/note-writer.service.ts:48 in writeTaskLinesToNote -> src/lib/features/todoist-sync/closed-note-writer.service.ts:writeTaskLinesToClosedNote call
call src/lib/features/todoist-sync/note-writer.service.ts:54 in writeTaskLinesToNote -> src/lib/features/todoist-sync/note-writer.service.ts:writeToOpenTab call
call src/lib/features/todoist-sync/note-writer.service.ts:56 in writeTaskLinesToNote -> src/lib/utils/debug.ts:error call
call src/lib/features/todoist-sync/note-writer.service.ts:72 in writeToOpenTab -> src/lib/features/todoist-sync/task-line-edits.logic.ts:applyTaskLineEdits call
call src/lib/features/todoist-sync/note-writer.service.ts:78 in writeToOpenTab -> src/lib/core/markdown-editor/doc-diff.logic.ts:docDiff call
call src/lib/features/todoist-sync/note-writer.service.ts:83 in writeToOpenTab -> src/lib/core/editor/editor.service.ts:syncExternalContentToEditor call
call src/lib/features/todoist-sync/note-writer.service.ts:101 in readNoteContent -> src/lib/utils/debug.ts:error call
## effects
fx src/lib/features/todoist-sync/note-writer.service.ts:99 tauri-fs.readTextFile in readNoteContent
