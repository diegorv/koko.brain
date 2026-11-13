# module card src/lib/core/trash
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/core/trash ' codemap/modules
module src/lib/core/trash core files 4 in-modules 4 out-modules 3 pub 9/17 ipc 0/0 card ~1.3k
## neighbors
dep src/lib/app -> src/lib/core/trash 1
dep src/lib/core/filesystem -> src/lib/core/trash 1
dep src/lib/core/settings -> src/lib/core/trash 4
dep src/lib/features/event-calendar -> src/lib/core/trash 3
dep src/lib/core/trash -> src/lib/core/editor 1
dep src/lib/core/trash -> src/lib/core/filesystem 4
dep src/lib/core/trash -> src/lib/utils 1
in2 src/lib/core/trash 17 modules: src/lib/features/rail-shell(4) src/lib/features/todoist-sync(2) src/lib/core/note-creator(1) src/lib/features/auto-organize(1) src/lib/features/canvas(1) +12 modules
out2 src/lib/core/trash 3 modules: src/lib/contracts(4) src/lib/core/settings(2) src/lib/core/vault(1)
## entry files
entry src/lib/core/trash/trash.service.ts ext-in4 src/lib/app/lifecycle/app-lifecycle.service.ts src/lib/core/filesystem/fs.service.ts src/lib/core/settings/sections/TrashSection.svelte src/lib/features/event-calendar/event-calendar.service.ts
entry src/lib/core/trash/trash.store.svelte.ts ext-in2 src/lib/core/settings/sections/TrashSection.svelte src/lib/features/event-calendar/event-calendar.service.ts
entry src/lib/core/trash/trash.types.ts ext-in2 src/lib/core/settings/sections/TrashSection.svelte src/lib/features/event-calendar/event-calendar.service.ts
entry src/lib/core/trash/trash.logic.ts ext-in1 src/lib/core/settings/sections/TrashSection.svelte
## files
file src/lib/core/trash/trash.logic.ts logic L105 module src/lib/core/trash in2 t1
file src/lib/core/trash/trash.service.ts service L309 module src/lib/core/trash in4 t14
file src/lib/core/trash/trash.store.svelte.ts store L34 module src/lib/core/trash in3 t13
file src/lib/core/trash/trash.types.ts types L13 module src/lib/core/trash in5 t0
## public
sym src/lib/core/trash/trash.logic.ts:78 fn formatTrashedDate(timestamp: number): string L15 | Formats a trash timestamp as a human-readable relative time string.
sym src/lib/core/trash/trash.service.ts:24 fn loadTrash(vaultPath: string): Promise<void> L20 | Loads the trash manifest from disk and updates the store.
sym src/lib/core/trash/trash.service.ts:49 fn moveToTrash(vaultPath: string, absolutePath: string, isDirectory: boolean): Promise<boolean> L49 | Moves a file or folder to the trash instead of permanently deleting it.
sym src/lib/core/trash/trash.service.ts:110 fn restoreItem(vaultPath: string, item: TrashItem): Promise<string> L73 | Restores a trashed item to its original location.
sym src/lib/core/trash/trash.service.ts:187 fn deletePermanently(vaultPath: string, item: TrashItem): Promise<boolean> L16 | Permanently deletes a single trashed item from disk and removes it from the manifest.
sym src/lib/core/trash/trash.service.ts:207 fn emptyTrash(vaultPath: string): Promise<boolean> L18 | Permanently deletes all items in the trash and clears the manifest.
sym src/lib/core/trash/trash.service.ts:230 fn resetTrash(): void L3 | Resets the trash store to its initial empty state.
sym src/lib/core/trash/trash.store.svelte.ts:14 store trashStore L21 | Central store for the trash system state.
sym src/lib/core/trash/trash.types.ts:2 interface TrashItem L12 | A single item in the trash, representing a deleted file or folder
## stores
store src/lib/core/trash/trash.store.svelte.ts:14 trashStore esc:0
## effects
fx-count tauri-fs.exists 8
fx-count tauri-fs.mkdir 5
fx-count tauri-fs.readTextFile 2
fx-count tauri-fs.remove 4
fx-count tauri-fs.rename 2
fx-count tauri-fs.writeTextFile 1
## debt
-
