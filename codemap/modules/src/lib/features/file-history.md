# module card src/lib/features/file-history
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/features/file-history ' codemap/modules
module src/lib/features/file-history features files 7 in-modules 2 out-modules 7 pub 5/24 ipc 4/0 card ~1.2k
## neighbors
dep src/lib/app -> src/lib/features/file-history 4
dep src/lib/features/properties -> src/lib/features/file-history 1
dep src/lib/features/file-history -> src/lib/components 4
dep src/lib/features/file-history -> src/lib/contracts 2
dep src/lib/features/file-history -> src/lib/core/editor 3
dep src/lib/features/file-history -> src/lib/core/filesystem 1
dep src/lib/features/file-history -> src/lib/core/settings 1
dep src/lib/features/file-history -> src/lib/core/vault 2
dep src/lib/features/file-history -> src/lib/utils 2
in2 src/lib/features/file-history 1 modules: src/routes(3)
out2 src/lib/features/file-history 2 modules: src/lib/core/markdown-editor(1) src/lib/core/trash(1)
## entry files
entry src/lib/features/file-history/file-history.service.ts ext-in3 src/lib/app/commands.ts src/lib/app/global-keybindings.ts src/lib/app/lifecycle/app-lifecycle.service.ts
entry src/lib/features/file-history/FileHistoryDialog.svelte ext-in1 src/lib/app/AppOverlays.svelte
entry src/lib/features/file-history/file-history.logic.ts ext-in1 src/lib/features/properties/note-info.logic.ts
## files
file src/lib/features/file-history/DiffViewer.svelte component L56 module src/lib/features/file-history in1 t0
file src/lib/features/file-history/FileHistoryDialog.svelte component L102 module src/lib/features/file-history in1 t1
file src/lib/features/file-history/SnapshotList.svelte component L68 module src/lib/features/file-history in1 t0
file src/lib/features/file-history/file-history.logic.ts logic L178 module src/lib/features/file-history in4 t2
file src/lib/features/file-history/file-history.service.ts service L197 module src/lib/features/file-history in4 t6
file src/lib/features/file-history/file-history.store.svelte.ts store L61 module src/lib/features/file-history in2 t3
file src/lib/features/file-history/file-history.types.ts types L11 module src/lib/features/file-history in6 t0
## public
sym src/lib/features/file-history/FileHistoryDialog.svelte:1 component FileHistoryDialog L102
sym src/lib/features/file-history/file-history.logic.ts:56 fn formatFileSize(bytes: number): string L5 | Formats a byte count as a human-readable file size. e.g., 512 → "512 B", 1536 → "1.5 KB", 1048576 → "1.0 MB"
sym src/lib/features/file-history/file-history.service.ts:17 fn openFileHistory(absoluteFilePath: string): Promise<void> L35 | Opens the file history dialog for a given file.
sym src/lib/features/file-history/file-history.service.ts:181 fn closeFileHistory(): void L3 | Closes the file history dialog and resets all state.
sym src/lib/features/file-history/file-history.service.ts:190 fn registerFileHistoryHook(): () => void L8 | Registers the file history after-save hook.
## stores
store src/lib/features/file-history/file-history.store.svelte.ts:28 fileHistoryStore esc:0
## effects
fx-count tauri-dialog.ask 1
fx-count tauri-fs.exists 2
fx-count tauri-fs.mkdir 1
fx-count tauri-fs.readDir 1
fx-count tauri-fs.readTextFile 1
fx-count tauri-fs.writeTextFile 1
ipc-count ipc:compute_diff 1
ipc-count ipc:get_file_history 1
ipc-count ipc:get_snapshot_content 2
ipc-count ipc:save_snapshot 1
## debt
-
