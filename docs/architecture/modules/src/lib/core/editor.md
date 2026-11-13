---
summary: "Editor tab state and the open, save, close and reload lifecycle of markdown tabs, with autosave timers, save observers and tab-close listeners."
---

## Responsibility

Owns the list of open editor tabs and the active tab (editorStore), the lifecycle of those tabs (open, save, close, pin, reload from disk, cleanup after a delete), the autosave timers, the tab-close listener registry, and the module-level observer lists for after-save and note-created events. editor.hooks.ts also tracks recently saved paths so the app's watcher handler can skip index rebuilds caused by the app's own writes, and forwards every save to applyNoteChange. openNoteAt places the caret by handing a position to the store. It reads and writes files with the Tauri fs plugin and has no Tauri command of its own. It does not render or edit document content (core/markdown-editor), does not own the index fan-out (core/filesystem), and does not create notes (core/note-creator).

## Key files

- `src/lib/core/editor/editor.store.svelte.ts`: Reactive tab state (tabs, active index, pending scroll position, live-preview flag, editor view reference, external content signal) behind editorStore getters and mutators.
- `src/lib/core/editor/editor.service.ts`: Lifecycle API: openFileInEditor, saveFileByPath, waitForTabSave, saveAllDirtyTabs, closeTab, closeTabsForDeletedPath, reloadExternallyChangedTabs, syncExternalContentToEditor, onContentChange, onContentChangeForPath, pinTabByPath, resetEditor, plus the autosave debounce timers and the tab-close listener registry.
- `src/lib/core/editor/editor.hooks.ts`: After-save and note-created observer lists, recent-save tracking (markRecentSave, areAllRecentSaves), notifyAfterSave, notifyNoteCreated and resetHooks.
- `src/lib/core/editor/editor.logic.ts`: Pure helpers: virtual tab paths and checks, dirty and pinned checks, pin reordering, frontmatter position and line-to-offset conversion.
- `src/lib/core/editor/open-note-at.service.ts`: openNoteAt: open a note if needed, convert a line or offset target, clamp it and set the pending scroll position.
- `src/lib/core/editor/editor.types.ts`: EditorTab shape.

## State

- editorStore module state in editor.store.svelte.ts: tabs, active index, pending scroll position, live-preview flag, the CodeMirror EditorView reference and the external content signal counter
- saveTails map of pending save promises per path in editor.service.ts
- Two module-level debounced autosave timers (body and frontmatter) in editor.service.ts
- Tab-close listener registry in editor.service.ts
- afterSaveObservers, noteCreatedObservers and the recentSaves map with its expiry timers in editor.hooks.ts
- Note files on disk, written with the Tauri fs plugin in editor.service.ts

## Collaborators

- `src/lib/core/filesystem`: notifyAfterSave calls applyNoteChange (save source, no vault path, so the Rust VaultIndex and the TS consumers) and notifyContentInvalidated from note-change.service.ts. editor.service.ts imports file-type predicates from fs.logic.ts. path-change.service.ts, link-updater.service.ts and task-write.service.ts call back into editor.service.ts, editor.hooks.ts and the tab store.
- `src/lib/core/markdown-editor`: editor.service.ts clears and deletes per-tab view state through tab-view-state.ts. MarkdownEditor.svelte and EditorTabs.svelte read editorStore and call onContentChange, switchTab, closeTab and togglePinTab.
- `src/lib/core/note-creator`: Calls openFileInEditor, markRecentSave and notifyNoteCreated when it creates a note.
- `src/lib/core/layout`: layout.logic.ts imports the virtual tab path constants and getFileName from editor.logic.ts, and layout.service.ts reads editorStore.activeTabPath.
- `src/lib/core/status-bar`: SaveStatus.svelte reads the active tab and uses isTabDirty and isVirtualTab.
- `src/lib/core/vault`: vault.service.ts and exit.service.ts call saveAllDirtyTabs before switching vault or quitting.
- `src/lib/core/trash`: trash.service.ts calls markRecentSave so the watcher handler skips restored paths.
- `src/lib/core/frontmatter`: frontmatter-write.service.ts patches open tabs through syncExternalContentToEditor and saveFileByPath, and calls notifyAfterSave after writing a closed note.
- `src/lib/app`: app-lifecycle.service.ts calls saveAllDirtyTabs, reloadExternallyChangedTabs, resetEditor and resetHooks. watcher-handler.service.ts calls areAllRecentSaves. EditorView.svelte, commands.ts, global-keybindings.ts, deep-link-actions.ts, rail-navigation.ts and editor-host.ts call the editor functions.
- `src/lib/features`: Many features open notes, sync content into tabs or place the caret. After-save observers are registered by auto-organize, file-history, search (including SemanticIndexStatus.svelte) and todoist-sync.
- `src/lib/plugins`: The queryjs ports register a tab-close listener, periodic-notes pins and unpins tabs by path, and the mods host registers after-save and note-created observers and calls editor functions.
- `src/lib/utils`: Uses debounce, the debug and perf helpers, appendLog, clamp, path helpers, and clearAllIndexed from index-dedupe.ts.

## Gotchas

- External content writes must go through syncExternalContentToEditor, which bumps externalContentSignal only for the active tab. The keystroke path must never bump it, because the bump makes MarkdownEditor replace the document. Background tabs are reconciled when the user switches to them.
- Saves of one path are chained through saveTails, so two writes of a file never race, and each save writes the tab content as it is when its turn comes. waitForTabSave waits on that chain.
- writeTab and openFileInEditor log, toast and return false or return early instead of rethrowing. Callers read the boolean from saveFileByPath or the failed-path list from saveAllDirtyTabs. openNoteAt re-checks the active tab after openFileInEditor for this reason.
- The body and frontmatter autosave timers are mutually exclusive: arming one cancels the other, and the 'none' schedule arms and cancels nothing. resetEditor cancels the timers without flushing, so callers must await saveAllDirtyTabs first.
- closeTab skips pinned tabs and asks before closing a dirty non-virtual tab. closeTabsForDeletedPath bypasses both checks and returns the removed tabs so the caller can restore them if the disk operation fails.
- Tabs whose path starts with the virtual prefix (Tasks, Graph, Tags, Calendar) are never saved and never count as dirty (isVirtualTab).
- notifyAfterSave marks the path as a recent save and calls applyNoteChange with the save source synchronously, before it fires the content-invalidation signal and the after-save observers. It passes no vault path, so the FTS5 and semantic rows of a saved note are refreshed by the search feature's after-save observer, not by applyNoteChange.
- A recent-save mark expires on a timer. Code that writes a note outside the save flow and wants the watcher handler to skip it must call markRecentSave itself.
- openNoteAt does not move the caret directly. It sets pendingScrollPosition, because openFileInEditor resolves before CodeMirror replaces its document in the next tab-switch effect.
- resetHooks clears both observer lists and the recent-save timers and also clears the shared index-dedupe map. It does not clear tab-close listeners.
