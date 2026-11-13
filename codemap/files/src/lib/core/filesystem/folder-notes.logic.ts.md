# file card src/lib/core/filesystem/folder-notes.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/filesystem/folder-notes.logic.ts ' codemap/files
file src/lib/core/filesystem/folder-notes.logic.ts logic L65 module src/lib/core/filesystem in3 t1
## imports
imp src/lib/core/filesystem/folder-notes.logic.ts:1 -> src/lib/core/filesystem/fs.types.ts type:FileTreeNode
imp src/lib/core/filesystem/folder-notes.logic.ts:2 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
## imported-by
imp src/lib/app/lifecycle/app-lifecycle.service.ts:78 -> src/lib/core/filesystem/folder-notes.logic.ts buildContentOrderMap
imp src/lib/app/tauri-listeners.service.ts:16 -> src/lib/core/filesystem/folder-notes.logic.ts buildContentOrderMap,patchContentOrderMap
imp src/lib/features/rail-shell/FilesNavigator.svelte:52 -> src/lib/core/filesystem/folder-notes.logic.ts findFolderNote
## reach
in2 src/lib/core/filesystem/folder-notes.logic.ts 2 files in 2 modules: src/lib/app(1) src/routes(1)
out2 src/lib/core/filesystem/folder-notes.logic.ts 1 files in 1 modules: src/lib/contracts(1)
## tests
test src/tests/lib/core/filesystem/folder-notes.logic.test.ts imports src/lib/core/filesystem/folder-notes.logic.ts mirror
## symbols
sym src/lib/core/filesystem/folder-notes.logic.ts:9 fn findFolderNote(folderName: string, children: FileTreeNode[]): string | null L5 | Finds a folder note inside a directory.
by src/lib/core/filesystem/folder-notes.logic.ts:findFolderNote <- src/lib/features/rail-shell/FilesNavigator.svelte:243 in pickFolder call
sym src/lib/core/filesystem/folder-notes.logic.ts:19 fn buildContentOrderMap(entries: NoteEntryV2[]): Map<string, number> L5 | Builds a path -> numeric order map from vault entries' _order frontmatter.
by src/lib/core/filesystem/folder-notes.logic.ts:buildContentOrderMap <- src/lib/app/lifecycle/app-lifecycle.service.ts:386 in initializeVault call
by src/lib/core/filesystem/folder-notes.logic.ts:buildContentOrderMap <- src/lib/app/tauri-listeners.service.ts:215 in registerVaultIndexUpdatedListener call +1
sym src/lib/core/filesystem/folder-notes.logic.ts:31 fn patchContentOrderMap(current: Map<string, number>, touchedPaths: Iterable<string>, upserted: NoteEntryV2[]): Map<string, number> L14 | Returns a copy of `current` with the order of every `touchedPaths` note recomputed: its keys (the note, and its directory for a folder note) are dropped, then …
by src/lib/core/filesystem/folder-notes.logic.ts:patchContentOrderMap <- src/lib/app/tauri-listeners.service.ts:252 in registerVaultIndexUpdatedListener call
## locals
local src/lib/core/filesystem/folder-notes.logic.ts:47 fn addContentOrder(map: Map<string, number>, entry: NoteEntryV2): void L10
local src/lib/core/filesystem/folder-notes.logic.ts:59 fn folderNoteDir(path: string): string | null L7
## calls
call src/lib/core/filesystem/folder-notes.logic.ts:21 in buildContentOrderMap -> src/lib/core/filesystem/folder-notes.logic.ts:addContentOrder call
call src/lib/core/filesystem/folder-notes.logic.ts:39 in patchContentOrderMap -> src/lib/core/filesystem/folder-notes.logic.ts:folderNoteDir call
call src/lib/core/filesystem/folder-notes.logic.ts:42 in patchContentOrderMap -> src/lib/core/filesystem/folder-notes.logic.ts:addContentOrder call
call src/lib/core/filesystem/folder-notes.logic.ts:54 in addContentOrder -> src/lib/core/filesystem/folder-notes.logic.ts:folderNoteDir call
