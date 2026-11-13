# module card src/lib/core/filesystem
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/core/filesystem ' codemap/modules
sections: neighbors, entry files, files, public, stores, effects, debt
module src/lib/core/filesystem core files 14 in-modules 29 out-modules 7 pub 57/88 ipc 14/0 card ~6.8k
## neighbors
dep src/lib/app -> src/lib/core/filesystem 22
dep src/lib/core/editor -> src/lib/core/filesystem 2
dep src/lib/core/layout -> src/lib/core/filesystem 1
dep src/lib/core/markdown-editor -> src/lib/core/filesystem 6
dep src/lib/core/note-creator -> src/lib/core/filesystem 3
dep src/lib/core/trash -> src/lib/core/filesystem 4
dep src/lib/features/auto-organize -> src/lib/core/filesystem 4
dep src/lib/features/canvas -> src/lib/core/filesystem 3
dep src/lib/features/collection -> src/lib/core/filesystem 8
dep src/lib/features/deep-link -> src/lib/core/filesystem 2
dep src/lib/features/event-calendar -> src/lib/core/filesystem 5
dep src/lib/features/file-history -> src/lib/core/filesystem 1
dep src/lib/features/file-icons -> src/lib/core/filesystem 2
dep src/lib/features/note-action-bar -> src/lib/core/filesystem 3
dep src/lib/features/note-list -> src/lib/core/filesystem 5
dep src/lib/features/properties -> src/lib/core/filesystem 7
dep src/lib/features/quick-switcher -> src/lib/core/filesystem 3
dep src/lib/features/rail-shell -> src/lib/core/filesystem 22
dep src/lib/features/search -> src/lib/core/filesystem 2
dep src/lib/features/tasks -> src/lib/core/filesystem 1
dep src/lib/features/todoist-sync -> src/lib/core/filesystem 4
dep src/lib/features/type-definitions -> src/lib/core/filesystem 8
dep src/lib/plugins/graph-view -> src/lib/core/filesystem 2
dep src/lib/plugins/kanban -> src/lib/core/filesystem 7
dep src/lib/plugins/mods -> src/lib/core/filesystem 5
dep src/lib/plugins/one-on-one -> src/lib/core/filesystem 1
dep src/lib/plugins/queryjs -> src/lib/core/filesystem 4
dep src/lib/plugins/quick-capture -> src/lib/core/filesystem 2
dep src/lib/plugins/templates -> src/lib/core/filesystem 1
dep src/lib/core/filesystem -> src/lib/contracts 8
dep src/lib/core/filesystem -> src/lib/core/editor 10
dep src/lib/core/filesystem -> src/lib/core/markdown-editor 1
dep src/lib/core/filesystem -> src/lib/core/trash 1
dep src/lib/core/filesystem -> src/lib/core/vault 4
dep src/lib/core/filesystem -> src/lib/types 1
dep src/lib/core/filesystem -> src/lib/utils 12
in2 src/lib/core/filesystem 9 modules: src/routes(8) src/lib/plugins/calendar(5) src/lib/core/frontmatter(2) src/lib/core/vault(2) src/lib/features/backlinks(2) +4 modules
out2 src/lib/core/filesystem 1 modules: src/lib/core/settings(2)
## entry files
entry src/lib/core/filesystem/fs.logic.ts ext-in40 src/lib/app/editor-host.ts src/lib/app/lifecycle/app-lifecycle.service.ts src/lib/app/lifecycle/watcher-handler.service.ts src/lib/core/editor/editor.service.ts src/lib/core/layout/layout.logic.ts more importers 35 not shown: src/lib/features/rail-shell(6) src/lib/features/type-definitions(5) src/lib/features/collection(4) +15 modules: q importers src/lib/core/filesystem/fs.logic.ts
entry src/lib/core/filesystem/fs.service.ts ext-in24 src/lib/app/commands.ts src/lib/app/deep-link-actions.ts src/lib/app/lifecycle/app-lifecycle.service.ts src/lib/app/tauri-listeners.service.ts src/lib/core/note-creator/note-creator.service.ts more importers 19 not shown: src/lib/features/rail-shell(3) src/lib/features/todoist-sync(2) src/lib/core/trash(1) +13 modules: q importers src/lib/core/filesystem/fs.service.ts
entry src/lib/core/filesystem/fs.store.svelte.ts ext-in18 src/lib/app/AppShell.svelte src/lib/app/commands.ts src/lib/app/editor-host.ts src/lib/app/lifecycle/app-lifecycle.service.ts src/lib/app/tauri-listeners.service.ts more importers 13 not shown: src/lib/features/rail-shell(3) src/lib/features/note-list(2) src/lib/features/properties(2) +5 modules: q importers src/lib/core/filesystem/fs.store.svelte.ts
entry src/lib/core/filesystem/wikilink-resolution.logic.ts ext-in14 src/lib/app/editor-host.ts src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts src/lib/core/markdown-editor/extensions/wikilink/completion.ts src/lib/features/collection/collection.logic.ts src/lib/features/note-list/NoteRow.svelte more importers 9 not shown: src/lib/features/properties(2) src/lib/plugins/kanban(2) src/lib/plugins/queryjs(2) +3 modules: q importers src/lib/core/filesystem/wikilink-resolution.logic.ts
entry src/lib/core/filesystem/note-change.service.ts ext-in12 src/lib/app/boot.ts src/lib/app/lifecycle/index-updater.service.ts src/lib/app/lifecycle/watcher-handler.service.ts src/lib/core/editor/editor.hooks.ts src/lib/core/note-creator/note-creator.service.ts more importers 7 not shown: src/lib/core/trash(1) src/lib/features/collection(1) src/lib/features/file-icons(1) +4 modules: q importers src/lib/core/filesystem/note-change.service.ts
entry src/lib/core/filesystem/file-entries.logic.ts ext-in11 src/lib/app/editor-host.ts src/lib/core/markdown-editor/editor-host.ts src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts src/lib/features/canvas/CanvasFilePicker.svelte src/lib/features/properties/PropertiesView.svelte more importers 6 not shown: src/lib/plugins/kanban(2) src/lib/features/properties(1) src/lib/features/quick-switcher(1) +2 modules: q importers src/lib/core/filesystem/file-entries.logic.ts
entry src/lib/core/filesystem/path-change.service.ts ext-in7 src/lib/app/boot.ts src/lib/features/collection/collection.service.ts src/lib/features/event-calendar/event-calendar.service.ts src/lib/features/rail-shell/files-navigator.service.ts src/lib/features/rail-shell/neighbourhood.service.ts more importers 2 not shown: src/lib/features/rail-shell(1) src/lib/plugins/mods(1): q importers src/lib/core/filesystem/path-change.service.ts
entry src/lib/core/filesystem/fs.types.ts ext-in5 src/lib/app/editor-host.ts src/lib/features/rail-shell/FilesNavigator.svelte src/lib/features/rail-shell/lens.logic.ts src/lib/features/rail-shell/rail-shell.types.ts src/lib/features/type-definitions/type-sidebar.logic.ts
entry src/lib/core/filesystem/folder-notes.logic.ts ext-in3 src/lib/app/lifecycle/app-lifecycle.service.ts src/lib/app/tauri-listeners.service.ts src/lib/features/rail-shell/FilesNavigator.svelte
entry src/lib/core/filesystem/delete-note.service.ts ext-in2 src/lib/features/note-action-bar/NoteActionBar.svelte src/lib/features/rail-shell/TypesNavigator.svelte
entry src/lib/core/filesystem/fs.watcher.ts ext-in2 src/lib/app/lifecycle/app-lifecycle.service.ts src/lib/plugins/mods/mods-host.service.ts
entry src/lib/core/filesystem/task-write.service.ts ext-in2 src/lib/features/tasks/tasks.service.ts src/lib/features/todoist-sync/closed-note-writer.service.ts
## files
file src/lib/core/filesystem/delete-note.service.ts service L28 module src/lib/core/filesystem in2 t1
file src/lib/core/filesystem/file-entries.logic.ts logic L77 module src/lib/core/filesystem in12 t3
file src/lib/core/filesystem/folder-notes.logic.ts logic L65 module src/lib/core/filesystem in3 t1
file src/lib/core/filesystem/fs.logic.ts logic L631 module src/lib/core/filesystem in45 t14
file src/lib/core/filesystem/fs.service.ts service L379 module src/lib/core/filesystem in27 t45
file src/lib/core/filesystem/fs.store.svelte.ts store L48 module src/lib/core/filesystem in22 t57
file src/lib/core/filesystem/fs.types.ts types L16 module src/lib/core/filesystem in11 t0
file src/lib/core/filesystem/fs.watcher.ts other L304 module src/lib/core/filesystem in2 t5
file src/lib/core/filesystem/link-updater.logic.ts logic L119 module src/lib/core/filesystem in1 t1
file src/lib/core/filesystem/link-updater.service.ts service L109 module src/lib/core/filesystem in1 t4
file src/lib/core/filesystem/note-change.service.ts service L286 module src/lib/core/filesystem in16 t12
file src/lib/core/filesystem/path-change.service.ts service L258 module src/lib/core/filesystem in8 t2
file src/lib/core/filesystem/task-write.service.ts service L38 module src/lib/core/filesystem in2 t1
file src/lib/core/filesystem/wikilink-resolution.logic.ts logic L184 module src/lib/core/filesystem in15 t8
## public
sym src/lib/core/filesystem/delete-note.service.ts:12 fn deleteNoteWithConfirm(path: string): Promise<void> L17 | Asks the same "Move to Trash" confirmation as the file explorer, then moves the note to the trash.
sym src/lib/core/filesystem/file-entries.logic.ts:4 interface FileEntry L5
sym src/lib/core/filesystem/file-entries.logic.ts:10 fn flattenFileTree(nodes: FileTreeNode[]): FileEntry[] L17
sym src/lib/core/filesystem/file-entries.logic.ts:31 fn filterAndRank(query: string, files: FileEntry[], recentPaths: string[]): FileEntry[] L47
sym src/lib/core/filesystem/folder-notes.logic.ts:9 fn findFolderNote(folderName: string, children: FileTreeNode[]): string | null L5 | Finds a folder note inside a directory.
sym src/lib/core/filesystem/folder-notes.logic.ts:19 fn buildContentOrderMap(entries: NoteEntryV2[]): Map<string, number> L5 | Builds a path -> numeric order map from vault entries' _order frontmatter.
sym src/lib/core/filesystem/folder-notes.logic.ts:31 fn patchContentOrderMap(current: Map<string, number>, touchedPaths: Iterable<string>, upserted: NoteEntryV2[]): Map<string, number> L14 | Returns a copy of `current` with the order of every `touchedPaths` note recomputed: its keys (the note, and its directory for a folder note) are dropped, then …
sym src/lib/core/filesystem/fs.logic.ts:9 fn findNodeByPath(nodes: FileTreeNode[], path: string): FileTreeNode | null L10 | Recursively searches the tree for a node matching the given path
sym src/lib/core/filesystem/fs.logic.ts:42 fn getParentPath(filePath: string): string L5 | Returns the parent directory path (e.g. "/vault/docs/note.md" → "/vault/docs")
sym src/lib/core/filesystem/fs.logic.ts:49 fn renamedPath(oldPath: string, newName: string): string L3 | The path `renameItem` renames `oldPath` to: `newName` in `oldPath`'s folder (e.g. "/vault/a.md", "b.md" → "/vault/b.md")
sym src/lib/core/filesystem/fs.logic.ts:54 fn getFileName(filePath: string): string L3 | Extracts the file name from a full path (e.g. "/vault/note.md" → "note.md")
sym src/lib/core/filesystem/fs.logic.ts:59 fn getFileExtension(fileName: string): string L4 | Returns the file extension including the dot (e.g. "note.md" → ".md")
sym src/lib/core/filesystem/fs.logic.ts:65 fn isMarkdownFile(fileName: string): boolean L4 | Checks whether the file name has a markdown extension (.md or .markdown)
sym src/lib/core/filesystem/fs.logic.ts:71 fn isViewFile(fileName: string): boolean L3 | Checks whether the file name has a .view extension
sym src/lib/core/filesystem/fs.logic.ts:76 fn isCanvasFile(fileName: string): boolean L3 | Checks whether the file name has a .canvas extension
sym src/lib/core/filesystem/fs.logic.ts:81 fn isKanbanFile(fileName: string): boolean L3 | Checks whether the file name has a .kanban extension
sym src/lib/core/filesystem/fs.logic.ts:111 fn isBinaryFile(fileName: string): boolean L3 | Checks whether the file's extension marks it as binary content that must never be opened in the markdown text editor.
sym src/lib/core/filesystem/fs.logic.ts:120 fn getLanguageForFile(fileName: string): LanguageDescription | null L7 | Returns the CodeMirror LanguageDescription for the given file, or null if the file is markdown or the extension is unrecognized.
sym src/lib/core/filesystem/fs.logic.ts:133 fn getFileNameError(name: string): string | null L8 | Returns a user-facing message naming the rule a file name breaks, or null when the name is valid.
sym src/lib/core/filesystem/fs.logic.ts:148 fn fileOperationErrorMessage(verb: string, name: string, err: unknown): string L5 | Builds the user-facing text for a failed file operation: `Could not <verb> "<name>": <reason>`.
sym src/lib/core/filesystem/fs.logic.ts:159 class PreDeleteSaveError extends Error L10 | Thrown by `applyPathChange` on a delete when saving a dirty tab at or under the deleted path failed: nothing was closed or moved.
sym src/lib/core/filesystem/fs.logic.ts:171 fn isValidFileName(name: string): boolean L3 | Validates a file name — rejects empty names, dot-prefixed names, and OS-forbidden characters
sym src/lib/core/filesystem/fs.logic.ts:233 fn generateUniqueName(name: string, isDirectory: boolean, existingSiblingNames: string[]): string L30 | Generates a unique file/folder name by appending an incrementing number.
sym src/lib/core/filesystem/fs.logic.ts:265 fn getRelativePath(vaultPath: string, filePath: string): string L3 | Strips the vault root prefix from an absolute path to produce a vault-relative path
sym src/lib/core/filesystem/fs.logic.ts:273 fn validateDragDrop(sourcePath: string, targetDirPath: string): string | null L11 | Validates whether a drag-and-drop move operation is allowed.
sym src/lib/core/filesystem/fs.logic.ts:365 fn collectFilePathsUnder(nodes: FileTreeNode[], dirPath: string): string[] L16 | Collects the absolute path of every FILE stored under `dirPath`, recursively.
sym src/lib/core/filesystem/fs.logic.ts:397 fn applyFolderOrder(nodes: FileTreeNode[], orderMap: FolderOrderMap, vaultPath: string, currentPath: string, contentOrder?: Map<string, nu… L13 | Recursively reorders directory nodes according to folder-order.json and _order frontmatter values.
sym src/lib/core/filesystem/fs.logic.ts:510 fn naturalCompare(a: string, b: string): number L28 | Case-insensitive natural name order, a port of the Rust `natural_cmp` (`src-tauri/src/commands/vault.rs`) that orders `scan_vault` output: runs of ASCII digits…
sym src/lib/core/filesystem/fs.service.ts:88 fn loadDirectoryTree(vaultPath: string) L39 | Builds the full file tree for a vault and updates the store.
sym src/lib/core/filesystem/fs.service.ts:158 fn addToTree(path: string, isDirectory = false, children: FileTreeNode[] = []): void L14 | Adds a node the app just created on disk to the file tree, in the position the next full load gives it, instead of rescanning the vault.
sym src/lib/core/filesystem/fs.service.ts:179 fn addScannedToTree(path: string, isDirectory: boolean): Promise<void> L11 | `addToTree` for an item that arrived on disk with content (a copied or restored folder): a folder's subtree comes from `scan_vault` on that folder alone.
sym src/lib/core/filesystem/fs.service.ts:198 fn createFile(parentPath: string, fileName: string, content: string = ''): Promise<string> L27 | Creates a file on disk with the given initial content (empty by default) and adds it to the tree.
sym src/lib/core/filesystem/fs.service.ts:227 fn createFolder(parentPath: string, folderName: string): Promise<string> L17 | Creates a directory on disk and adds it to the tree.
sym src/lib/core/filesystem/fs.service.ts:246 fn deleteItem(itemPath: string, isDirectory: boolean = false): Promise<void> L24 | Moves a file or folder to trash (soft delete), closes open tabs, and removes it from the tree.
sym src/lib/core/filesystem/fs.service.ts:280 fn renameItem(oldPath: string, newName: string): Promise<string> L20 | Renames a file or folder and returns the new path.
sym src/lib/core/filesystem/fs.service.ts:307 fn moveItem(sourcePath: string, targetDirPath: string): Promise<string | null> L21 | Moves a file or folder into a different directory.
sym src/lib/core/filesystem/fs.service.ts:345 fn duplicateItem(itemPath: string, isDirectory: boolean): Promise<string> L21 | Duplicates a file or folder, generating a unique "copy" name.
sym src/lib/core/filesystem/fs.service.ts:368 fn revealInSystemExplorer(itemPath: string): Promise<void> L7 | Opens the system file explorer with the given item selected
sym src/lib/core/filesystem/fs.service.ts:377 fn resetFileSystem() L3 | Resets all file system state (e.g. when switching vaults)
sym src/lib/core/filesystem/fs.store.svelte.ts:25 store fsStore L24 | Central store for the file system / file explorer state.
sym src/lib/core/filesystem/fs.types.ts:6 type FileTreeNode L4 | A file or folder in the vault's file tree: the `scan_vault` wire shape.
sym src/lib/core/filesystem/fs.watcher.ts:67 fn onFileChange(listener: (paths: string[]) => void): () => void L6 | Registers a callback that fires whenever the vault's files change.
sym src/lib/core/filesystem/fs.watcher.ts:268 fn startWatching(vaultPath: string) L21 | Starts the Rust-native vault watcher and subscribes to its events.
sym src/lib/core/filesystem/fs.watcher.ts:291 fn stopWatching() L14 | Stops the Rust-native vault watcher and detaches the event listener.
sym src/lib/core/filesystem/note-change.service.ts:109 fn registerNoteChangeConsumer(consumer: NoteChangeConsumer): () => void L9 | Registers a per-file index to follow every note change.
sym src/lib/core/filesystem/note-change.service.ts:144 fn registerContentInvalidationListener(name: string, invalidate: () => void): () => void L8 | Registers a listener for the vault-wide "note content changed" signal.
sym src/lib/core/filesystem/note-change.service.ts:154 fn notifyContentInvalidated(): void L9 | Fires every content-invalidation listener, isolating and logging failures.
sym src/lib/core/filesystem/note-change.service.ts:198 fn applyNoteChange(change: NoteChange): Promise<void> L73 | THE one owner of "a note's bytes changed".
sym src/lib/core/filesystem/path-change.service.ts:85 fn registerPathChangeConsumer(consumer: PathChangeConsumer): () => void L8 | Registers a consumer to follow every path change.
sym src/lib/core/filesystem/task-write.service.ts:24 fn settleTaskWrite(path: string, updatedContent: string): void L15 | Settles a note a Rust task command (`toggle_task_status`, `write_task_lines`, `write_task_text`) already wrote to disk and indexed in `VaultIndex`.
sym src/lib/core/filesystem/wikilink-resolution.logic.ts:4 fn getNoteName(filePath: string): string L5 | Returns the file name without its last extension (`a/b.md` -> `b`); a dotfile keeps its name.
sym src/lib/core/filesystem/wikilink-resolution.logic.ts:15 fn isLinkTargetFile(filePath: string): boolean L4 | Whether a wikilink can resolve to `filePath`: false for a `.view` (any casing), true for every other file.
sym src/lib/core/filesystem/wikilink-resolution.logic.ts:64 fn resolveWikilink(target: string, allFilePaths: string[], vaultRoot?: string | null): string | null L33 | Resolves a wikilink target to a file path; null when nothing matches.
sym src/lib/core/filesystem/wikilink-resolution.logic.ts:103 type WikilinkResolutionCache L4 | Pre-computed lookup table for O(1) wikilink resolution: the map itself is lowercase note name → file path, and `byFileName` serves the exact-file step for a ta…
sym src/lib/core/filesystem/wikilink-resolution.logic.ts:109 fn buildResolutionCache(allFilePaths: string[]): WikilinkResolutionCache L17 | Builds a resolution cache from file paths.
sym src/lib/core/filesystem/wikilink-resolution.logic.ts:128 fn resolveWikilinkCached(target: string, cache: WikilinkResolutionCache, vaultRoot?: string | null): string | null L22 | O(1) wikilink resolution using a pre-built cache.
sym src/lib/core/filesystem/wikilink-resolution.logic.ts:154 fn parseWikilinks(content: string): WikiLink[] L31 | Lists every `[[target|alias#heading]]` wikilink in `content`, in order, with its offset.
## stores
store src/lib/core/filesystem/fs.store.svelte.ts:25 fsStore esc:0
## effects
fx-count tauri-dialog.ask 1
fx-count tauri-fs.copyFile 2
fx-count tauri-fs.exists 4
fx-count tauri-fs.mkdir 2
fx-count tauri-fs.readDir 4
fx-count tauri-fs.readTextFile 2
fx-count tauri-fs.remove 1
fx-count tauri-fs.rename 2
fx-count tauri-fs.writeTextFile 2
fx-count tauri-opener.revealItemInDir 1
fx-count timer.setTimeout 1
ipc-count ipc:create_folder 1
ipc-count ipc:create_note 1
ipc-count ipc:get_backlinks_v2 1
ipc-count ipc:remove_from_search_index 1
ipc-count ipc:remove_note_from_index 1
ipc-count ipc:remove_semantic_file 1
ipc-count ipc:rename_in_search_index 1
ipc-count ipc:rename_note 1
ipc-count ipc:scan_vault 3
ipc-count ipc:start_vault_watcher 1
ipc-count ipc:stop_vault_watcher 1
ipc-count ipc:update_note_in_index 1
ipc-count ipc:update_search_index_file 1
ipc-count ipc:update_semantic_file 1
## debt
-
