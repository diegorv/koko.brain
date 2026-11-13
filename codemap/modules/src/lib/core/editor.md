# module card src/lib/core/editor
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/core/editor ' codemap/modules
sections: neighbors, entry files, files, public, stores, effects, debt
module src/lib/core/editor core files 6 in-modules 37 out-modules 3 pub 44/52 ipc 0/0 card ~4.3k
## neighbors
dep src/lib/app -> src/lib/core/editor 18
dep src/lib/core/filesystem -> src/lib/core/editor 10
dep src/lib/core/frontmatter -> src/lib/core/editor 3
dep src/lib/core/layout -> src/lib/core/editor 2
dep src/lib/core/markdown-editor -> src/lib/core/editor 7
dep src/lib/core/note-creator -> src/lib/core/editor 2
dep src/lib/core/status-bar -> src/lib/core/editor 2
dep src/lib/core/trash -> src/lib/core/editor 1
dep src/lib/core/vault -> src/lib/core/editor 2
dep src/lib/features/auto-organize -> src/lib/core/editor 4
dep src/lib/features/backlinks -> src/lib/core/editor 4
dep src/lib/features/canvas -> src/lib/core/editor 2
dep src/lib/features/collection -> src/lib/core/editor 2
dep src/lib/features/copy-block-link -> src/lib/core/editor 1
dep src/lib/features/deep-link -> src/lib/core/editor 2
dep src/lib/features/event-calendar -> src/lib/core/editor 8
dep src/lib/features/file-history -> src/lib/core/editor 3
dep src/lib/features/file-icons -> src/lib/core/editor 1
dep src/lib/features/note-action-bar -> src/lib/core/editor 3
dep src/lib/features/note-list -> src/lib/core/editor 2
dep src/lib/features/outgoing-links -> src/lib/core/editor 3
dep src/lib/features/properties -> src/lib/core/editor 7
dep src/lib/features/quick-switcher -> src/lib/core/editor 2
dep src/lib/features/rail-shell -> src/lib/core/editor 9
dep src/lib/features/search -> src/lib/core/editor 6
dep src/lib/features/tags -> src/lib/core/editor 2
dep src/lib/features/tasks -> src/lib/core/editor 5
dep src/lib/features/todoist-sync -> src/lib/core/editor 8
dep src/lib/features/type-definitions -> src/lib/core/editor 4
dep src/lib/plugins/graph-view -> src/lib/core/editor 3
dep src/lib/plugins/mods -> src/lib/core/editor 8
dep src/lib/plugins/one-on-one -> src/lib/core/editor 2
dep src/lib/plugins/periodic-notes -> src/lib/core/editor 1
dep src/lib/plugins/queryjs -> src/lib/core/editor 3
dep src/lib/plugins/table-of-contents -> src/lib/core/editor 2
dep src/lib/plugins/word-count -> src/lib/core/editor 2
dep src/routes -> src/lib/core/editor 2
dep src/lib/core/editor -> src/lib/core/filesystem 2
dep src/lib/core/editor -> src/lib/core/markdown-editor 1
dep src/lib/core/editor -> src/lib/utils 7
in2 src/lib/core/editor 5 modules: src/lib/core/settings(2) src/lib/plugins/calendar(2) src/lib/plugins/quick-capture(2) src/lib/plugins/templates(2) src/lib/plugins/kanban(1)
out2 src/lib/core/editor 2 modules: src/lib/contracts(4) src/lib/core/settings(2)
## entry files
entry src/lib/core/editor/editor.service.ts ext-in54 src/lib/app/EditorView.svelte src/lib/app/commands.ts src/lib/app/deep-link-actions.ts src/lib/app/editor-host.ts src/lib/app/global-keybindings.ts more importers 49 not shown: src/lib/features/event-calendar(5) src/lib/features/rail-shell(4) src/lib/core/filesystem(3) +24 modules: q importers src/lib/core/editor/editor.service.ts
entry src/lib/core/editor/editor.store.svelte.ts ext-in46 src/lib/app/AppShell.svelte src/lib/app/EditorView.svelte src/lib/app/commands.ts src/lib/app/editor-host.ts src/lib/app/global-keybindings.ts more importers 41 not shown: src/lib/features/properties(4) src/lib/features/todoist-sync(4) src/lib/features/rail-shell(3) +24 modules: q importers src/lib/core/editor/editor.store.svelte.ts
entry src/lib/core/editor/editor.hooks.ts ext-in22 src/lib/app/commands.ts src/lib/app/deep-link-actions.ts src/lib/app/lifecycle/app-lifecycle.service.ts src/lib/app/lifecycle/watcher-handler.service.ts src/lib/core/filesystem/fs.service.ts more importers 17 not shown: src/lib/features/rail-shell(2) src/lib/features/search(2) src/lib/features/todoist-sync(2) +10 modules: q importers src/lib/core/editor/editor.hooks.ts
entry src/lib/core/editor/editor.logic.ts ext-in18 src/lib/app/EditorView.svelte src/lib/core/filesystem/link-updater.service.ts src/lib/core/filesystem/path-change.service.ts src/lib/core/layout/layout.logic.ts src/lib/core/markdown-editor/EditorTabs.svelte more importers 13 not shown: src/lib/core/markdown-editor(1) src/lib/core/status-bar(1) src/lib/features/auto-organize(1) +10 modules: q importers src/lib/core/editor/editor.logic.ts
entry src/lib/core/editor/open-note-at.service.ts ext-in5 src/lib/features/event-calendar/EventTaskChip.svelte src/lib/features/search/SearchResult.svelte src/lib/features/tasks/TasksView.svelte src/lib/plugins/mods/mod-app.service.ts src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte
entry src/lib/core/editor/editor.types.ts ext-in3 src/lib/app/EditorView.svelte src/lib/core/filesystem/path-change.service.ts src/lib/core/markdown-editor/EditorTabs.svelte
## files
file src/lib/core/editor/editor.hooks.ts other L137 module src/lib/core/editor in23 t49
file src/lib/core/editor/editor.logic.ts logic L140 module src/lib/core/editor in21 t18
file src/lib/core/editor/editor.service.ts service L527 module src/lib/core/editor in55 t97
file src/lib/core/editor/editor.store.svelte.ts store L173 module src/lib/core/editor in48 t107
file src/lib/core/editor/editor.types.ts types L15 module src/lib/core/editor in6 t0
file src/lib/core/editor/open-note-at.service.ts service L49 module src/lib/core/editor in5 t3
## public
sym src/lib/core/editor/editor.hooks.ts:37 fn markRecentSave(path: string): void L8 | Marks a file path as recently saved/created by the editor.
sym src/lib/core/editor/editor.hooks.ts:47 fn areAllRecentSaves(paths: string[]): boolean L3 | Returns true if ALL given paths were recently saved by the editor.
sym src/lib/core/editor/editor.hooks.ts:52 fn addAfterSaveObserver(observer: AfterSaveObserver): () => void L9 | Adds an after-save observer.
sym src/lib/core/editor/editor.hooks.ts:67 fn notifyAfterSave(filePath: string, content: string): void L26 | Notifies all after-save observers.
sym src/lib/core/editor/editor.hooks.ts:104 fn addNoteCreatedObserver(observer: NoteCreatedObserver): () => void L7 | Adds a note-created observer.
sym src/lib/core/editor/editor.hooks.ts:119 fn notifyNoteCreated(filePath: string): void L9 | Notifies the note-created observers.
sym src/lib/core/editor/editor.hooks.ts:130 fn resetHooks(): void L8 | Removes all hooks and observers.
sym src/lib/core/editor/editor.logic.ts:6 const TASKS_VIRTUAL_PATH L1 | Virtual path used for the singleton Tasks tab
sym src/lib/core/editor/editor.logic.ts:9 const GRAPH_VIRTUAL_PATH L1 | Virtual path used for the singleton Graph View tab
sym src/lib/core/editor/editor.logic.ts:12 const TAGS_VIRTUAL_PATH L1 | Virtual path used for the singleton Tags tab
sym src/lib/core/editor/editor.logic.ts:15 const EVENT_CALENDAR_VIRTUAL_PATH L1 | Virtual path used for the singleton Calendar tab
sym src/lib/core/editor/editor.logic.ts:18 fn isVirtualTab(tab: Pick<EditorTab, 'path'>): boolean L3 | Returns true if the tab represents a virtual (non-file) view
sym src/lib/core/editor/editor.logic.ts:28 fn isMarkdownNoteTab(tab: Pick<EditorTab, 'path' | 'fileType'>): boolean L5 | Returns true for a tab showing a markdown note file: not virtual, rendered as markdown (no special `fileType`), and named `*.md`, which leaves out other text f…
sym src/lib/core/editor/editor.logic.ts:35 fn getFileName(path: string): string L3 | Extracts the file name from a full path (e.g. "/docs/note.md" → "note.md")
sym src/lib/core/editor/editor.logic.ts:40 fn findTabIndex(tabs: Pick<EditorTab, 'path'>[], path: string): number L3 | Returns the index of an already-open tab by its file path, or -1 if not found
sym src/lib/core/editor/editor.logic.ts:45 fn isTabDirty(tab: Pick<EditorTab, 'content' | 'savedContent'>): boolean L3 | Checks whether a tab has unsaved changes by comparing current content to the last saved snapshot
sym src/lib/core/editor/editor.logic.ts:50 fn isTabPinned(tab: Pick<EditorTab, 'pinned'>): boolean L3 | Returns whether a tab is pinned
sym src/lib/core/editor/editor.logic.ts:110 fn getPositionAfterFrontmatter(content: string): number L14 | Returns the document position of the first line after a YAML frontmatter block.
sym src/lib/core/editor/editor.service.ts:28 fn registerTabCloseListener(name: string, closed: (path: string) => void): () => void L8 | Registers `closed` to run with the path of each tab `closeTab` or `closeTabsForDeletedPath` removes.
sym src/lib/core/editor/editor.service.ts:62 fn registerPendingEditFlusher(path: string, flush: () => void): () => void L14 | Registers `flush` to run when `closeTab` closes the tab of `path`, before it saves, so an edit a view still holds in a debounce reaches the file.
sym src/lib/core/editor/editor.service.ts:120 fn syncExternalContentToEditor(path: string, content: string, markSaved: boolean, schedule: AutoSaveSchedule): void L22 | Single owner of "external content → CodeMirror" sync (Phase 5 of the perf refactor).
sym src/lib/core/editor/editor.service.ts:148 fn openFileInEditor(filePath: string) L51 | Opens a file in the editor.
sym src/lib/core/editor/editor.service.ts:201 fn saveCurrentFile() L5 | Writes the active tab's content to disk if it has unsaved changes
sym src/lib/core/editor/editor.service.ts:220 fn saveFileByPath(path: string): Promise<boolean> L9 | Writes a specific tab's content to disk if it has unsaved changes.
sym src/lib/core/editor/editor.service.ts:231 fn waitForTabSave(path: string): Promise<void> L3 | Resolves once the save pending on `path`, if any, has settled; it never rejects.
sym src/lib/core/editor/editor.service.ts:303 fn onContentChange(content: string, frontmatterChanged = false) L4 | Called on every editor keystroke — updates store content and schedules an auto-save
sym src/lib/core/editor/editor.service.ts:314 fn onContentChangeForPath(path: string, content: string) L4 | Writes `content` into the tab at `path` and schedules a body auto-save.
sym src/lib/core/editor/editor.service.ts:324 fn saveAllDirtyTabs(): Promise<string[]> L14 | Saves all dirty tabs immediately, awaiting completion.
sym src/lib/core/editor/editor.service.ts:340 fn switchTab(index: number) L6 | Switches to a specific tab by index
sym src/lib/core/editor/editor.service.ts:362 fn closeTab(index: number) L33 | Closes a tab by index.
sym src/lib/core/editor/editor.service.ts:397 fn closeActiveTab() L5 | Convenience: closes whichever tab is currently focused
sym src/lib/core/editor/editor.service.ts:404 fn switchToNextTab() L5 | Cycles to the next tab (wraps around)
sym src/lib/core/editor/editor.service.ts:411 fn switchToPreviousTab() L5 | Cycles to the previous tab (wraps around)
sym src/lib/core/editor/editor.service.ts:418 fn togglePinTab(index: number) L3 | Toggles the pinned state of the tab at the given index
sym src/lib/core/editor/editor.service.ts:423 fn togglePinActiveTab() L5 | Toggles the pinned state of the currently active tab
sym src/lib/core/editor/editor.service.ts:437 fn toggleSourceMode() L3 | Toggles between live preview and source mode.
sym src/lib/core/editor/editor.service.ts:442 fn pinTabByPath(filePath: string) L6 | Pins a tab identified by file path (used for auto-pin features like daily notes)
sym src/lib/core/editor/editor.service.ts:450 fn unpinTabByPath(filePath: string) L6 | Unpins a tab identified by file path (used when rotating auto-pinned daily notes)
sym src/lib/core/editor/editor.service.ts:463 fn closeTabsForDeletedPath(deletedPath: string): EditorTab[] L14 | Force-closes all tabs whose path matches or is a child of the given path.
sym src/lib/core/editor/editor.service.ts:485 fn reloadExternallyChangedTabs(changedPaths: string[]): Promise<void> L30 | Reloads content from disk for open tabs whose files were externally modified.
sym src/lib/core/editor/editor.service.ts:522 fn resetEditor() L6 | Cancels any pending auto-saves and resets all editor state.
sym src/lib/core/editor/editor.store.svelte.ts:33 store editorStore L141 | Central store for all editor tab state.
sym src/lib/core/editor/editor.types.ts:2 interface EditorTab L14 | Represents a single open file tab in the editor
sym src/lib/core/editor/open-note-at.service.ts:35 fn openNoteAt(path: string | null, target: NoteTarget): Promise<void> L15 | Single owner of "open this note and put the caret at this position".
## stores
store src/lib/core/editor/editor.store.svelte.ts:33 editorStore esc:1
## effects
fx-count tauri-dialog.ask 1
fx-count tauri-fs.readTextFile 2
fx-count tauri-fs.writeTextFile 1
fx-count timer-wrap.debounce 2
fx-count timer.setTimeout 2
## debt
-
