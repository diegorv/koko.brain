# file card src/lib/core/filesystem/fs.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/filesystem/fs.logic.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls
file src/lib/core/filesystem/fs.logic.ts logic L631 module src/lib/core/filesystem in45 t14
## imports
imp src/lib/core/filesystem/fs.logic.ts:4 -> src/lib/utils/path.ts basename,relativePath
imp src/lib/core/filesystem/fs.logic.ts:6 -> src/lib/core/filesystem/fs.types.ts type:FileTreeNode,type:FolderOrderMap
## imported-by
imp src/lib/app/editor-host.ts:8 -> src/lib/core/filesystem/fs.logic.ts findNodeByPath
imp src/lib/app/lifecycle/app-lifecycle.service.ts:79 -> src/lib/core/filesystem/fs.logic.ts applyFolderOrder
imp src/lib/app/lifecycle/watcher-handler.service.ts:6 -> src/lib/core/filesystem/fs.logic.ts isViewFile
imp src/lib/core/editor/editor.service.ts:6 -> src/lib/core/filesystem/fs.logic.ts isViewFile,isCanvasFile,isKanbanFile,isBinaryFile
imp src/lib/core/filesystem/delete-note.service.ts:4 -> src/lib/core/filesystem/fs.logic.ts fileOperationErrorMessage,PreDeleteSaveError
imp src/lib/core/filesystem/fs.service.ts:6 -> src/lib/core/filesystem/fs.logic.ts getParentPath,getFileName,generateCopyName,generateUniqueName,applyFolderOrder,insertTreeNode,isMarkdownFile,renamedPath,type:TreeOrder
imp src/lib/core/filesystem/fs.watcher.ts:7 -> src/lib/core/filesystem/fs.logic.ts applyFolderOrder,findFileNode,resolveRescanParents
imp src/lib/core/filesystem/link-updater.service.ts:10 -> src/lib/core/filesystem/fs.logic.ts isMarkdownFile
imp src/lib/core/filesystem/path-change.service.ts:4 -> src/lib/core/filesystem/fs.logic.ts collectFilePathsUnder,findNodeByPath,getFileName,isMarkdownFile,moveTreeNode,PreDeleteSaveError,removeNodeByPath
imp src/lib/core/layout/layout.logic.ts:8 -> src/lib/core/filesystem/fs.logic.ts isCanvasFile,isKanbanFile,isViewFile
imp src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:3 -> src/lib/core/filesystem/fs.logic.ts isBinaryFile
imp src/lib/core/markdown-editor/highlight-styles.ts:11 -> src/lib/core/filesystem/fs.logic.ts getLanguageForFile
imp src/lib/core/note-creator/note-creator.service.ts:6 -> src/lib/core/filesystem/fs.logic.ts isMarkdownFile
imp src/lib/core/trash/trash.service.ts:14 -> src/lib/core/filesystem/fs.logic.ts collectFilePathsUnder,findNodeByPath,getRelativePath,isViewFile
imp src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:15 -> src/lib/core/filesystem/fs.logic.ts isMarkdownFile
imp src/lib/features/auto-organize/auto-organize.logic.ts:3 -> src/lib/core/filesystem/fs.logic.ts isMarkdownFile,isViewFile
imp src/lib/features/auto-organize/auto-organize.service.ts:3 -> src/lib/core/filesystem/fs.logic.ts isViewFile
imp src/lib/features/collection/collection.logic.ts:15 -> src/lib/core/filesystem/fs.logic.ts getFileExtension,getFileName
imp src/lib/features/collection/collection.service.ts:4 -> src/lib/core/filesystem/fs.logic.ts isMarkdownFile
imp src/lib/features/collection/toolbar/filter.logic.ts:4 -> src/lib/core/filesystem/fs.logic.ts isViewFile
imp src/lib/features/collection/toolbar/properties.logic.ts:1 -> src/lib/core/filesystem/fs.logic.ts isViewFile
imp src/lib/features/deep-link/deep-link.service.ts:13 -> src/lib/core/filesystem/fs.logic.ts isMarkdownFile
imp src/lib/features/event-calendar/event-calendar-form.logic.ts:11 -> src/lib/core/filesystem/fs.logic.ts generateUniqueName
imp src/lib/features/event-calendar/event-calendar.service.ts:20 -> src/lib/core/filesystem/fs.logic.ts generateUniqueName,getFileName,getParentPath,getRelativePath,renamedPath
imp src/lib/features/file-icons/file-icons.service.ts:4 -> src/lib/core/filesystem/fs.logic.ts isViewFile
imp src/lib/features/note-action-bar/note-action-bar.service.ts:5 -> src/lib/core/filesystem/fs.logic.ts getParentPath
imp src/lib/features/note-list/NoteRowMenu.svelte:18 -> src/lib/core/filesystem/fs.logic.ts fileOperationErrorMessage,getFileName,getRelativePath,isMarkdownFile,isViewFile,PreDeleteSaveError
imp src/lib/features/properties/bookmark-migration.service.ts:3 -> src/lib/core/filesystem/fs.logic.ts isMarkdownFile
imp src/lib/features/rail-shell/FilesNavigator.svelte:33 -> src/lib/core/filesystem/fs.logic.ts fileOperationErrorMessage,findNodeByPath,getFileName,getFileNameError,getRelativePath,PreDeleteSaveError,validateDragDrop
imp src/lib/features/rail-shell/RailNoteList.svelte:21 -> src/lib/core/filesystem/fs.logic.ts findNodeByPath
imp src/lib/features/rail-shell/TypesNavigator.svelte:20 -> src/lib/core/filesystem/fs.logic.ts getRelativePath,isViewFile
imp src/lib/features/rail-shell/lens.logic.ts:5 -> src/lib/core/filesystem/fs.logic.ts getFileExtension,getFileName,getRelativePath,isCanvasFile,isKanbanFile,isMarkdownFile,isViewFile,naturalCompare
imp src/lib/features/rail-shell/list-properties.logic.ts:1 -> src/lib/core/filesystem/fs.logic.ts naturalCompare
imp src/lib/features/rail-shell/list-sort-compare.logic.ts:1 -> src/lib/core/filesystem/fs.logic.ts naturalCompare
imp src/lib/features/search/search.logic.ts:2 -> src/lib/core/filesystem/fs.logic.ts isViewFile
imp src/lib/features/search/search.service.ts:5 -> src/lib/core/filesystem/fs.logic.ts isViewFile
imp src/lib/features/type-definitions/ViewDialog.svelte:6 -> src/lib/core/filesystem/fs.logic.ts fileOperationErrorMessage,getFileName
imp src/lib/features/type-definitions/type-definitions.logic.ts:2 -> src/lib/core/filesystem/fs.logic.ts getFileNameError,isValidFileName
imp src/lib/features/type-definitions/type-definitions.service.ts:15 -> src/lib/core/filesystem/fs.logic.ts generateUniqueName
imp src/lib/features/type-definitions/type-note-list.logic.ts:6 -> src/lib/core/filesystem/fs.logic.ts getFileNameError
more imported-by 5 not shown: src/lib/features/type-definitions(1) src/lib/plugins/graph-view(1) src/lib/plugins/mods(1) src/lib/plugins/one-on-one(1) src/lib/plugins/queryjs(1): q importers src/lib/core/filesystem/fs.logic.ts
## reach
in2 src/lib/core/filesystem/fs.logic.ts 97 files in 34 modules: src/lib/features/rail-shell(12) src/lib/features/event-calendar(10) src/lib/features/collection(9) src/lib/app(8) src/lib/core/markdown-editor(5) +29 modules: q impact src/lib/core/filesystem/fs.logic.ts --depth 2
out2 src/lib/core/filesystem/fs.logic.ts 1 files in 1 modules: src/lib/contracts(1)
## tests
test src/tests/lib/core/filesystem/fs.logic.test.ts imports src/lib/core/filesystem/fs.logic.ts mirror
test src/tests/lib/core/filesystem/delete-note.service.test.ts imports src/lib/core/filesystem/fs.logic.ts
test src/tests/lib/core/filesystem/f165-delete-dirty-tab.test.ts imports src/lib/core/filesystem/fs.logic.ts
test src/tests/lib/core/filesystem/fs.service.test.ts imports src/lib/core/filesystem/fs.logic.ts
test src/tests/lib/features/event-calendar/event-calendar-event.logic.test.ts imports src/lib/core/filesystem/fs.logic.ts
test src/tests/lib/features/event-calendar/event-calendar.model.test.ts imports src/lib/core/filesystem/fs.logic.ts
test src/tests/lib/features/event-calendar/event-calendar.service.test.ts imports src/lib/core/filesystem/fs.logic.ts
test src/tests/lib/features/note-list/NoteRowMenu.test.ts imports src/lib/core/filesystem/fs.logic.ts
test src/tests/lib/features/rail-shell/FilesNavigator.menu.test.ts imports src/lib/core/filesystem/fs.logic.ts
test src/tests/lib/features/rail-shell/TypesNavigator.test.ts imports src/lib/core/filesystem/fs.logic.ts
test src/tests/lib/features/type-definitions/create-view-folder.service.test.ts imports src/lib/core/filesystem/fs.logic.ts
test src/tests/lib/plugins/mods/mod-note-moved.test.ts imports src/lib/core/filesystem/fs.logic.ts
test src/tests/lib/plugins/mods/mod-vault-paths.test.ts imports src/lib/core/filesystem/fs.logic.ts
test src/tests/lib/plugins/mods/mod-vault.service.test.ts imports src/lib/core/filesystem/fs.logic.ts
## symbols
sym src/lib/core/filesystem/fs.logic.ts:9 fn findNodeByPath(nodes: FileTreeNode[], path: string): FileTreeNode | null L10 | Recursively searches the tree for a node matching the given path
by src/lib/core/filesystem/fs.logic.ts:findNodeByPath <- src/lib/app/editor-host.ts:185 in appEditorHost.openView call
by src/lib/core/filesystem/fs.logic.ts:findNodeByPath <- src/lib/core/filesystem/path-change.service.ts:164 in applyPathChange call
by src/lib/core/filesystem/fs.logic.ts:findNodeByPath <- src/lib/core/trash/trash.service.ts:166 in restoreItem call
by src/lib/core/filesystem/fs.logic.ts:findNodeByPath <- src/lib/features/rail-shell/FilesNavigator.svelte:285 in handleDrop call
by src/lib/core/filesystem/fs.logic.ts:findNodeByPath <- src/lib/features/rail-shell/RailNoteList.svelte:208 in viewInTree=$derived call
sym src/lib/core/filesystem/fs.logic.ts:25 fn findFileNode(tree: FileTreeNode[], vaultPath: string, path: string): FileTreeNode | null L15 | The file node at `path`, found by walking the path's segments down from the root (O(depth x siblings), not a whole-tree scan).
by src/lib/core/filesystem/fs.logic.ts:findFileNode <- src/lib/core/filesystem/fs.watcher.ts:185 in handleChangedPaths call
sym src/lib/core/filesystem/fs.logic.ts:42 fn getParentPath(filePath: string): string L5 | Returns the parent directory path (e.g. "/vault/docs/note.md" → "/vault/docs")
by src/lib/core/filesystem/fs.logic.ts:getParentPath <- src/lib/core/filesystem/fs.service.ts:347 in duplicateItem call
by src/lib/core/filesystem/fs.logic.ts:getParentPath <- src/lib/features/event-calendar/event-calendar.service.ts:693 in writeEvent call +1
by src/lib/core/filesystem/fs.logic.ts:getParentPath <- src/lib/features/note-action-bar/note-action-bar.service.ts:80 in createLinkedNote call
sym src/lib/core/filesystem/fs.logic.ts:49 fn renamedPath(oldPath: string, newName: string): string L3 | The path `renameItem` renames `oldPath` to: `newName` in `oldPath`'s folder (e.g. "/vault/a.md", "b.md" → "/vault/b.md")
by src/lib/core/filesystem/fs.logic.ts:renamedPath <- src/lib/core/filesystem/fs.service.ts:281 in renameItem call
by src/lib/core/filesystem/fs.logic.ts:renamedPath <- src/lib/features/event-calendar/event-calendar.service.ts:706 in writeEvent call
sym src/lib/core/filesystem/fs.logic.ts:54 fn getFileName(filePath: string): string L3 | Extracts the file name from a full path (e.g. "/vault/note.md" → "note.md")
by src/lib/core/filesystem/fs.logic.ts:getFileName <- src/lib/core/filesystem/fs.service.ts:163 in addToTree call +3
by src/lib/core/filesystem/fs.logic.ts:getFileName <- src/lib/core/filesystem/path-change.service.ts:201 in applyPathChange call
by src/lib/core/filesystem/fs.logic.ts:getFileName <- src/lib/features/collection/collection.logic.ts:29 in buildNoteRecord call
by src/lib/core/filesystem/fs.logic.ts:getFileName <- src/lib/features/event-calendar/event-calendar.service.ts:531 in fileBase call
by src/lib/core/filesystem/fs.logic.ts:getFileName <- src/lib/features/note-list/NoteRowMenu.svelte:80 in runOrToast call +1
by src/lib/core/filesystem/fs.logic.ts:getFileName <- src/lib/features/rail-shell/FilesNavigator.svelte:148 in startRename call +4
by src/lib/core/filesystem/fs.logic.ts:getFileName <- src/lib/features/rail-shell/lens.logic.ts:226 in pinnedRailItems call +2
by src/lib/core/filesystem/fs.logic.ts:getFileName <- src/lib/features/type-definitions/ViewDialog.svelte:80 in load call +1
sym src/lib/core/filesystem/fs.logic.ts:59 fn getFileExtension(fileName: string): string L4 | Returns the file extension including the dot (e.g. "note.md" → ".md")
by src/lib/core/filesystem/fs.logic.ts:getFileExtension <- src/lib/features/collection/collection.logic.ts:30 in buildNoteRecord call
by src/lib/core/filesystem/fs.logic.ts:getFileExtension <- src/lib/features/rail-shell/lens.logic.ts:918 in fileKind call
sym src/lib/core/filesystem/fs.logic.ts:65 fn isMarkdownFile(fileName: string): boolean L4 | Checks whether the file name has a markdown extension (.md or .markdown)
by src/lib/core/filesystem/fs.logic.ts:isMarkdownFile <- src/lib/core/filesystem/fs.service.ts:215 in createFile call
by src/lib/core/filesystem/fs.logic.ts:isMarkdownFile <- src/lib/core/filesystem/link-updater.service.ts:42 in updateLinksAfterRename call
by src/lib/core/filesystem/fs.logic.ts:isMarkdownFile <- src/lib/core/filesystem/path-change.service.ts:201 in applyPathChange call
by src/lib/core/filesystem/fs.logic.ts:isMarkdownFile <- src/lib/core/note-creator/note-creator.service.ts:118 in openOrCreateNote call
by src/lib/core/filesystem/fs.logic.ts:isMarkdownFile <- src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:165 in previewNote=$derived call
by src/lib/core/filesystem/fs.logic.ts:isMarkdownFile <- src/lib/features/auto-organize/auto-organize.logic.ts:325 in isValidCreatePath call +1
by src/lib/core/filesystem/fs.logic.ts:isMarkdownFile <- src/lib/features/collection/collection.service.ts:186 in registerCollectionNoteChangeConsumer call
by src/lib/core/filesystem/fs.logic.ts:isMarkdownFile <- src/lib/features/deep-link/deep-link.service.ts:324 in executeNewAction call
more by 4 not shown: src/lib/features/note-list(1) src/lib/features/properties(1) src/lib/features/rail-shell(1) src/lib/plugins/mods(1): q importers src/lib/core/filesystem/fs.logic.ts:isMarkdownFile
sym src/lib/core/filesystem/fs.logic.ts:71 fn isViewFile(fileName: string): boolean L3 | Checks whether the file name has a .view extension
by src/lib/core/filesystem/fs.logic.ts:isViewFile <- src/lib/app/lifecycle/watcher-handler.service.ts:64 in rebuildAllIndexes call +1
by src/lib/core/filesystem/fs.logic.ts:isViewFile <- src/lib/core/editor/editor.service.ts:186 in openFileInEditor call
by src/lib/core/filesystem/fs.logic.ts:isViewFile <- src/lib/core/layout/layout.logic.ts:27 in hidesRightSidebar call
by src/lib/core/filesystem/fs.logic.ts:isViewFile <- src/lib/core/trash/trash.service.ts:152 in restoreItem call +2
by src/lib/core/filesystem/fs.logic.ts:isViewFile <- src/lib/features/auto-organize/auto-organize.logic.ts:161 in countMatchingNotes call +1
by src/lib/core/filesystem/fs.logic.ts:isViewFile <- src/lib/features/auto-organize/auto-organize.service.ts:206 in registerAutoOrganizeHook call
by src/lib/core/filesystem/fs.logic.ts:isViewFile <- src/lib/features/collection/toolbar/filter.logic.ts:227 in getAllKnownProperties call +1
by src/lib/core/filesystem/fs.logic.ts:isViewFile <- src/lib/features/collection/toolbar/properties.logic.ts:24 in getAllAvailableColumns call
more by 10 not shown: src/lib/features/rail-shell(2) src/lib/features/search(2) src/lib/features/file-icons(1) src/lib/features/note-list(1) src/lib/features/type-definitions(1) src/lib/plugins/graph-view(1) src/lib/plugins/one-on-one(1) src/lib/plugins/queryjs(1): q importers src/lib/core/filesystem/fs.logic.ts:isViewFile
sym src/lib/core/filesystem/fs.logic.ts:76 fn isCanvasFile(fileName: string): boolean L3 | Checks whether the file name has a .canvas extension
by src/lib/core/filesystem/fs.logic.ts:isCanvasFile <- src/lib/core/editor/editor.service.ts:187 in openFileInEditor call
by src/lib/core/filesystem/fs.logic.ts:isCanvasFile <- src/lib/core/layout/layout.logic.ts:27 in hidesRightSidebar call
by src/lib/core/filesystem/fs.logic.ts:isCanvasFile <- src/lib/features/rail-shell/lens.logic.ts:915 in fileKind call
sym src/lib/core/filesystem/fs.logic.ts:81 fn isKanbanFile(fileName: string): boolean L3 | Checks whether the file name has a .kanban extension
by src/lib/core/filesystem/fs.logic.ts:isKanbanFile <- src/lib/core/editor/editor.service.ts:188 in openFileInEditor call
by src/lib/core/filesystem/fs.logic.ts:isKanbanFile <- src/lib/core/layout/layout.logic.ts:27 in hidesRightSidebar call
by src/lib/core/filesystem/fs.logic.ts:isKanbanFile <- src/lib/features/rail-shell/lens.logic.ts:916 in fileKind call
sym src/lib/core/filesystem/fs.logic.ts:111 fn isBinaryFile(fileName: string): boolean L3 | Checks whether the file's extension marks it as binary content that must never be opened in the markdown text editor.
by src/lib/core/filesystem/fs.logic.ts:isBinaryFile <- src/lib/core/editor/editor.service.ts:158 in openFileInEditor call
by src/lib/core/filesystem/fs.logic.ts:isBinaryFile <- src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:18 in followWikilink call
sym src/lib/core/filesystem/fs.logic.ts:120 fn getLanguageForFile(fileName: string): LanguageDescription | null L7 | Returns the CodeMirror LanguageDescription for the given file, or null if the file is markdown or the extension is unrecognized.
by src/lib/core/filesystem/fs.logic.ts:getLanguageForFile <- src/lib/core/markdown-editor/highlight-styles.ts:107 in getLanguageEffectsSync call +1
sym src/lib/core/filesystem/fs.logic.ts:133 fn getFileNameError(name: string): string | null L8 | Returns a user-facing message naming the rule a file name breaks, or null when the name is valid.
by src/lib/core/filesystem/fs.logic.ts:getFileNameError <- src/lib/features/rail-shell/FilesNavigator.svelte:174 in commitRename call
by src/lib/core/filesystem/fs.logic.ts:getFileNameError <- src/lib/features/type-definitions/type-definitions.logic.ts:189 in validateViewName call
by src/lib/core/filesystem/fs.logic.ts:getFileNameError <- src/lib/features/type-definitions/type-note-list.logic.ts:30 in buildRenameFileName call
sym src/lib/core/filesystem/fs.logic.ts:148 fn fileOperationErrorMessage(verb: string, name: string, err: unknown): string L5 | Builds the user-facing text for a failed file operation: `Could not <verb> "<name>": <reason>`.
by src/lib/core/filesystem/fs.logic.ts:fileOperationErrorMessage <- src/lib/core/filesystem/delete-note.service.ts:26 in deleteNoteWithConfirm call
by src/lib/core/filesystem/fs.logic.ts:fileOperationErrorMessage <- src/lib/features/note-list/NoteRowMenu.svelte:80 in runOrToast call +1
by src/lib/core/filesystem/fs.logic.ts:fileOperationErrorMessage <- src/lib/features/rail-shell/FilesNavigator.svelte:118 in runOrToast call
by src/lib/core/filesystem/fs.logic.ts:fileOperationErrorMessage <- src/lib/features/type-definitions/ViewDialog.svelte:87 in load call +3
sym src/lib/core/filesystem/fs.logic.ts:159 class PreDeleteSaveError extends Error L10 | Thrown by `applyPathChange` on a delete when saving a dirty tab at or under the deleted path failed: nothing was closed or moved.
by src/lib/core/filesystem/fs.logic.ts:PreDeleteSaveError <- src/lib/core/filesystem/delete-note.service.ts:25 in deleteNoteWithConfirm ref
by src/lib/core/filesystem/fs.logic.ts:PreDeleteSaveError <- src/lib/core/filesystem/path-change.service.ts:70 in saveDirtyTabsUnder new
by src/lib/core/filesystem/fs.logic.ts:PreDeleteSaveError <- src/lib/features/note-list/NoteRowMenu.svelte:79 in runOrToast ref
by src/lib/core/filesystem/fs.logic.ts:PreDeleteSaveError <- src/lib/features/rail-shell/FilesNavigator.svelte:118 in runOrToast ref
sym src/lib/core/filesystem/fs.logic.ts:171 fn isValidFileName(name: string): boolean L3 | Validates a file name — rejects empty names, dot-prefixed names, and OS-forbidden characters
by src/lib/core/filesystem/fs.logic.ts:isValidFileName <- src/lib/features/type-definitions/type-definitions.logic.ts:171 in validateTypeName call
sym src/lib/core/filesystem/fs.logic.ts:176 fn countFiles(node: FileTreeNode): number L12 | Recursively counts all files (non-directories) inside a tree node
sym src/lib/core/filesystem/fs.logic.ts:193 fn generateCopyName(name: string, isDirectory: boolean, existingSiblingNames: string[]): string L31 | Generates a unique copy name like "file copy.md", "file copy 2.md", etc. For directories, no extension splitting is done.
by src/lib/core/filesystem/fs.logic.ts:generateCopyName <- src/lib/core/filesystem/fs.service.ts:351 in duplicateItem call
sym src/lib/core/filesystem/fs.logic.ts:233 fn generateUniqueName(name: string, isDirectory: boolean, existingSiblingNames: string[]): string L30 | Generates a unique file/folder name by appending an incrementing number.
by src/lib/core/filesystem/fs.logic.ts:generateUniqueName <- src/lib/core/filesystem/fs.service.ts:202 in createFile call +1
by src/lib/core/filesystem/fs.logic.ts:generateUniqueName <- src/lib/features/event-calendar/event-calendar-form.logic.ts:215 in planTitleChange call
by src/lib/core/filesystem/fs.logic.ts:generateUniqueName <- src/lib/features/event-calendar/event-calendar.service.ts:1009 in duplicateEvent call
by src/lib/core/filesystem/fs.logic.ts:generateUniqueName <- src/lib/features/type-definitions/type-definitions.service.ts:74 in resolveTypedNoteTarget call
sym src/lib/core/filesystem/fs.logic.ts:265 fn getRelativePath(vaultPath: string, filePath: string): string L3 | Strips the vault root prefix from an absolute path to produce a vault-relative path
by src/lib/core/filesystem/fs.logic.ts:getRelativePath <- src/lib/core/trash/trash.service.ts:50 in moveToTrash call
by src/lib/core/filesystem/fs.logic.ts:getRelativePath <- src/lib/features/event-calendar/event-calendar.service.ts:1061 in deleteNow call +1
by src/lib/core/filesystem/fs.logic.ts:getRelativePath <- src/lib/features/note-list/NoteRowMenu.svelte:249 in (markup) markup +1
by src/lib/core/filesystem/fs.logic.ts:getRelativePath <- src/lib/features/rail-shell/FilesNavigator.svelte:211 in handleCopyRelativePath call +1
by src/lib/core/filesystem/fs.logic.ts:getRelativePath <- src/lib/features/rail-shell/TypesNavigator.svelte:328 in (markup) markup +1
by src/lib/core/filesystem/fs.logic.ts:getRelativePath <- src/lib/features/rail-shell/lens.logic.ts:1001 in resolveFolderLens call
sym src/lib/core/filesystem/fs.logic.ts:273 fn validateDragDrop(sourcePath: string, targetDirPath: string): string | null L11 | Validates whether a drag-and-drop move operation is allowed.
by src/lib/core/filesystem/fs.logic.ts:validateDragDrop <- src/lib/features/rail-shell/FilesNavigator.svelte:283 in handleDrop call
sym src/lib/core/filesystem/fs.logic.ts:286 fn collectAllDirPaths(nodes: FileTreeNode[]): Set<string> L14 | Recursively collects the paths of every directory in the tree into a flat Set
sym src/lib/core/filesystem/fs.logic.ts:311 fn resolveRescanParents(changedPaths: string[], vaultPath: string, tree: FileTreeNode[]): string[] L16 | Picks the directories to rescan for a batch of changed paths.
by src/lib/core/filesystem/fs.logic.ts:resolveRescanParents <- src/lib/core/filesystem/fs.watcher.ts:200 in handleChangedPaths call
sym src/lib/core/filesystem/fs.logic.ts:333 fn removeNodeByPath(nodes: FileTreeNode[], path: string): FileTreeNode[] L20 | Returns the tree without the node at `path` (and, for a folder, everything under it).
by src/lib/core/filesystem/fs.logic.ts:removeNodeByPath <- src/lib/core/filesystem/path-change.service.ts:184 in applyPathChange call
sym src/lib/core/filesystem/fs.logic.ts:365 fn collectFilePathsUnder(nodes: FileTreeNode[], dirPath: string): string[] L16 | Collects the absolute path of every FILE stored under `dirPath`, recursively.
by src/lib/core/filesystem/fs.logic.ts:collectFilePathsUnder <- src/lib/core/filesystem/path-change.service.ts:163 in applyPathChange call
by src/lib/core/filesystem/fs.logic.ts:collectFilePathsUnder <- src/lib/core/trash/trash.service.ts:169 in restoreItem call
sym src/lib/core/filesystem/fs.logic.ts:397 fn applyFolderOrder(nodes: FileTreeNode[], orderMap: FolderOrderMap, vaultPath: string, currentPath: string, contentOrder?: Map<string, nu… L13 | Recursively reorders directory nodes according to folder-order.json and _order frontmatter values.
by src/lib/core/filesystem/fs.logic.ts:applyFolderOrder <- src/lib/app/lifecycle/app-lifecycle.service.ts:389 in initializeVault call
by src/lib/core/filesystem/fs.logic.ts:applyFolderOrder <- src/lib/core/filesystem/fs.service.ts:113 in loadDirectoryTree call +1
by src/lib/core/filesystem/fs.logic.ts:applyFolderOrder <- src/lib/core/filesystem/fs.watcher.ts:231 in handleChangedPaths call
sym src/lib/core/filesystem/fs.logic.ts:510 fn naturalCompare(a: string, b: string): number L28 | Case-insensitive natural name order, a port of the Rust `natural_cmp` (`src-tauri/src/commands/vault.rs`) that orders `scan_vault` output: runs of ASCII digits…
by src/lib/core/filesystem/fs.logic.ts:naturalCompare <- src/lib/features/rail-shell/lens.logic.ts:237 in pinnedRailItems call +1
by src/lib/core/filesystem/fs.logic.ts:naturalCompare <- src/lib/features/rail-shell/list-properties.logic.ts:37 in availableListProperties ref
by src/lib/core/filesystem/fs.logic.ts:naturalCompare <- src/lib/features/rail-shell/list-sort-compare.logic.ts:91 in compareNotes call +1
by src/lib/core/filesystem/fs.logic.ts:naturalCompare <- src/lib/features/type-definitions/type-sidebar.logic.ts:332 in collectViewFiles call +1
sym src/lib/core/filesystem/fs.logic.ts:540 fn compareTreeNodes(a: FileTreeNode, b: FileTreeNode): number L4 | The `scan_vault` name sort for one level: directories first, then `naturalCompare`.
sym src/lib/core/filesystem/fs.logic.ts:546 interface TreeOrder L8 | The ordering inputs a full tree load applies, needed to place a node the way it would.
by src/lib/core/filesystem/fs.logic.ts:TreeOrder <- src/lib/core/filesystem/fs.service.ts:6 in (module) import
sym src/lib/core/filesystem/fs.logic.ts:573 fn insertTreeNode(tree: FileTreeNode[], node: FileTreeNode, order: TreeOrder, now: number): FileTreeNode[] L31 | Returns the tree with `node` added under its parent directory, at the position the next full load would give it.
by src/lib/core/filesystem/fs.logic.ts:insertTreeNode <- src/lib/core/filesystem/fs.service.ts:165 in addToTree call
sym src/lib/core/filesystem/fs.logic.ts:621 fn moveTreeNode(tree: FileTreeNode[], from: string, to: string, snapshot: FileTreeNode, order: TreeOrder, now: number): FileTreeNode[] L11 | Returns the tree after a rename or move: the node at `from` is removed and `snapshot` (the node as it was at `from`, timestamps kept) is inserted at `to` with …
by src/lib/core/filesystem/fs.logic.ts:moveTreeNode <- src/lib/core/filesystem/path-change.service.ts:211 in applyPathChange call
## locals
local src/lib/core/filesystem/fs.logic.ts:415 fn orderLevel(nodes: FileTreeNode[], orderMap: FolderOrderMap, vaultPath: string, currentPath: string, contentOrder?: Map<string, nu… L72
local src/lib/core/filesystem/fs.logic.ts:489 fn isAsciiDigit(c: string): boolean L3
local src/lib/core/filesystem/fs.logic.ts:494 fn compareCodePoints(a: string[], b: string[]): number L8
local src/lib/core/filesystem/fs.logic.ts:560 fn sortLevel(nodes: FileTreeNode[], order: TreeOrder, dirPath: string): FileTreeNode[] L3
local src/lib/core/filesystem/fs.logic.ts:606 fn rebaseNode(node: FileTreeNode, from: string, to: string, order: TreeOrder): FileTreeNode L6
## calls
call src/lib/core/filesystem/fs.logic.ts:13 in findNodeByPath -> src/lib/core/filesystem/fs.logic.ts:findNodeByPath call
call src/lib/core/filesystem/fs.logic.ts:50 in renamedPath -> src/lib/core/filesystem/fs.logic.ts:getParentPath call
call src/lib/core/filesystem/fs.logic.ts:55 in getFileName -> src/lib/utils/path.ts:basename call
call src/lib/core/filesystem/fs.logic.ts:66 in isMarkdownFile -> src/lib/core/filesystem/fs.logic.ts:getFileExtension call
call src/lib/core/filesystem/fs.logic.ts:72 in isViewFile -> src/lib/core/filesystem/fs.logic.ts:getFileExtension call
call src/lib/core/filesystem/fs.logic.ts:77 in isCanvasFile -> src/lib/core/filesystem/fs.logic.ts:getFileExtension call
call src/lib/core/filesystem/fs.logic.ts:82 in isKanbanFile -> src/lib/core/filesystem/fs.logic.ts:getFileExtension call
call src/lib/core/filesystem/fs.logic.ts:112 in isBinaryFile -> src/lib/core/filesystem/fs.logic.ts:getFileExtension call
call src/lib/core/filesystem/fs.logic.ts:121 in getLanguageForFile -> src/lib/core/filesystem/fs.logic.ts:isMarkdownFile call
call src/lib/core/filesystem/fs.logic.ts:122 in getLanguageForFile -> src/lib/core/filesystem/fs.logic.ts:isViewFile call
call src/lib/core/filesystem/fs.logic.ts:123 in getLanguageForFile -> src/lib/core/filesystem/fs.logic.ts:isCanvasFile call
call src/lib/core/filesystem/fs.logic.ts:124 in getLanguageForFile -> src/lib/core/filesystem/fs.logic.ts:isKanbanFile call
call src/lib/core/filesystem/fs.logic.ts:172 in isValidFileName -> src/lib/core/filesystem/fs.logic.ts:getFileNameError call
call src/lib/core/filesystem/fs.logic.ts:181 in countFiles -> src/lib/core/filesystem/fs.logic.ts:countFiles call
call src/lib/core/filesystem/fs.logic.ts:266 in getRelativePath -> src/lib/utils/path.ts:relativePath call
call src/lib/core/filesystem/fs.logic.ts:280 in validateDragDrop -> src/lib/core/filesystem/fs.logic.ts:getParentPath call
call src/lib/core/filesystem/fs.logic.ts:292 in collectAllDirPaths -> src/lib/core/filesystem/fs.logic.ts:collectAllDirPaths call
call src/lib/core/filesystem/fs.logic.ts:313 in resolveRescanParents -> src/lib/core/filesystem/fs.logic.ts:collectAllDirPaths call
call src/lib/core/filesystem/fs.logic.ts:316 in resolveRescanParents -> src/lib/core/filesystem/fs.logic.ts:getParentPath call +1
call src/lib/core/filesystem/fs.logic.ts:342 in removeNodeByPath -> src/lib/core/filesystem/fs.logic.ts:removeNodeByPath call
call src/lib/core/filesystem/fs.logic.ts:366 in collectFilePathsUnder -> src/lib/core/filesystem/fs.logic.ts:findNodeByPath call
call src/lib/core/filesystem/fs.logic.ts:404 in applyFolderOrder -> src/lib/core/filesystem/fs.logic.ts:orderLevel call
call src/lib/core/filesystem/fs.logic.ts:406 in applyFolderOrder -> src/lib/core/filesystem/fs.logic.ts:applyFolderOrder call
call src/lib/core/filesystem/fs.logic.ts:516 in naturalCompare -> src/lib/core/filesystem/fs.logic.ts:isAsciiDigit call +3
call src/lib/core/filesystem/fs.logic.ts:536 in naturalCompare -> src/lib/core/filesystem/fs.logic.ts:compareCodePoints call +1
call src/lib/core/filesystem/fs.logic.ts:542 in compareTreeNodes -> src/lib/core/filesystem/fs.logic.ts:naturalCompare call
call src/lib/core/filesystem/fs.logic.ts:561 in sortLevel -> src/lib/core/filesystem/fs.logic.ts:compareTreeNodes ref
call src/lib/core/filesystem/fs.logic.ts:561 in sortLevel -> src/lib/core/filesystem/fs.logic.ts:orderLevel call
call src/lib/core/filesystem/fs.logic.ts:583 in insertTreeNode -> src/lib/core/filesystem/fs.logic.ts:sortLevel call +1
call src/lib/core/filesystem/fs.logic.ts:608 in rebaseNode -> src/lib/core/filesystem/fs.logic.ts:getFileName call +1
call src/lib/core/filesystem/fs.logic.ts:609 in rebaseNode -> src/lib/core/filesystem/fs.logic.ts:rebaseNode call
call src/lib/core/filesystem/fs.logic.ts:609 in rebaseNode -> src/lib/core/filesystem/fs.logic.ts:sortLevel call
call src/lib/core/filesystem/fs.logic.ts:629 in moveTreeNode -> src/lib/core/filesystem/fs.logic.ts:removeNodeByPath call
call src/lib/core/filesystem/fs.logic.ts:630 in moveTreeNode -> src/lib/core/filesystem/fs.logic.ts:insertTreeNode call
call src/lib/core/filesystem/fs.logic.ts:630 in moveTreeNode -> src/lib/core/filesystem/fs.logic.ts:rebaseNode call
