# Scout: inventory-ts (frontend disk writes, renames, deletes, mkdirs, copies)

Read-only map. No repo file edited, no build or test run. Labels: READ = seen in code at the cited line. INFERRED = my reasoning from READ facts. FETCHED = upstream source, see section 0.

## 0. Method and sources

- Grep over `src/lib` and `src/routes` (excluding tests and `contracts/generated`) for `writeTextFile`, `writeFile`, `remove(`, `rename(`, `copyFile`, `mkdir`, `exists`, every `call('<cmd>')` / `invoke('<cmd>')` name, and the `plugin-fs` import lines. Command list is complete: 40 distinct IPC names, the write-side subset is in section 2.
- READ: fs.service, note-change.service, path-change.service, link-updater.service, trash.service, trash.logic, editor.service, editor.store (setters), editor.hooks, frontmatter-write.service, note-creator.service, new-note.service, tasks.service (toggle), file-history.service, deep-link.service, deep-link-actions.ts, deep-link.logic (new-action parse), utils/path.ts (resolveFilePath), type-definitions.service (write sites), templates.service, file-icons.service, auto-move.service, bookmark-migration.service, todoist.service, settings.service, log.service, vault.service, app-lifecycle.service (save/cleanup/cache sites), tauri-listeners.service (close handler), note-action-bar.service, NoteRowMenu.svelte (delete/rename), FilesNavigator.svelte (grep lines), TasksView.svelte:67 (only toggleTask caller), FileHistoryDialog.svelte, global-keybindings.ts:170-176, commands.ts:305-312, deep-link.types.ts:20-36, capabilities/default.json (fs scopes).
- Rust (READ): commands/vault.rs (create_note 888-921, create_folder 922-926, ensure_safe_write_path 862-875, rename_note 1045-1066, toggle_task_status 708-736, toggle_task_status_inner 664-691, propagate_type_rename 396-420, propagate_type_rename_inner 342-380, save_vault_cache 1412-1431), utils/fs.rs (write_atomic 16-32), vault/index_cache.rs (write_snapshot_atomic 55-78, write_snapshot 95-105), commands/history.rs (save_snapshot 57-79, cleanup_history 143-161), quick_capture/commands.rs (submit_composer_capture 349-365). Line numbers for Rust are from grep/sed and are exact at the time of reading.
- FETCHED: `https://raw.githubusercontent.com/tauri-apps/plugins-workspace/v2/plugins/fs/src/commands.rs` via WebFetch. The fetch returned a model summary without line numbers (the line numbers quoted below are its estimates, treat as approximate). Claims taken from it: `write_text_file` goes through `write_file_inner`, opens with `truncate: !append`, `create: opts.create` (default true), writes with `write_all`, no temp file or rename. `rename` is `std::fs::rename`. `remove` with recursive uses `std::fs::remove_dir_all`, otherwise `remove_file` or `remove_dir`. I did not verify these against the pinned crate version in `Cargo.lock`; `Cargo.toml` says `tauri-plugin-fs = "2"`.
- NOT covered (other scouts or not read): `+layout.svelte` content-effect (the `edit` source, 1 s debounce), watcher-handler and `tauri-listeners` refresh, event-calendar internals (only its call sites to fs/frontmatter writers are listed), `settings-persistence.svelte.ts` (the 500 ms effect), quick-capture.service.ts dispatch body, `notify` crate, Rust `update_note_in_index` body (labelled index-only from its doc comment only).

## 1. Entry points and call chains

Line numbers are READ unless marked.

A. Create note from the explorer or a command
- `FilesNavigator.svelte:72` (`createFile(dir,'Untitled.md')`), `app/commands.ts:86`, `QuickSwitcher.svelte:47`, `kanban/collection/canvas.service` create-only wrappers.
- `fs.service.ts:119` `createFile` -> `readDir` sibling names (:121-123) -> `call('create_note')` (:129) -> `markRecentSave` (:130) -> `applyNoteChange({source:'fs'})` (:137) -> `refreshTree` (:138).
- Rust `create_note` (vault.rs:888) refuses an existing path (`Path::exists`, ~:892), writes via `write_atomic` (~:898), updates VaultIndex, emits `vault-index-updated`.

B. Open-or-create (wikilink click, deep link `open`/`new` non-silent, daily note)
- `note-creator.service.ts:78` `openOrCreateNote`: `exists` (:86) -> `create_folder` (:98) -> template (:100) -> `create_note` (:103) -> `markRecentSave` (:107) -> `applyNoteChange({source:'create'})` (:118) -> `refreshTree` (:120) -> `openFileInEditor` (:128).

C. Body save (autosave and explicit save)
- Keystroke: `editor.service.ts:224` `onContentChange` -> `scheduleAutoSave` (:213-221): 500 ms frontmatter timer (:200) or 2000 ms body timer (:197).
- `saveDirtyTabs` (:183) -> `saveFileByPath` (:161) -> `writeTextFile(path, tab.content)` (:168) -> `markSavedByPath` (:169) -> `notifyAfterSave` (:170).
- `editor.hooks.ts notifyAfterSave`: `markRecentSave`, `applyNoteChange({source:'save'})` (Rust `update_note_in_index` on every call, FTS5 and semantic legs when vaultPath known), `notifyContentInvalidated()`, after-save observers (file-history snapshot `file-history.service.ts:190-196`, auto-move debounce `auto-move.service.ts:93-124`).
- Explicit: `saveCurrentFile` (:151), `saveAllDirtyTabs` (:234) at quit, vault switch and init.

D. Delete (move to Trash)
- Entry points: `NoteRowMenu.svelte` `handleDelete` (ask, then `deleteItem`, :122-128), `FilesNavigator.svelte:170-174` (ask then `deleteItem(path,true)`), `note-action-bar.service.ts:19-30` (`deleteNoteWithConfirm`, ask :21, `deleteItem` :24), event calendar `event-calendar.service.ts:1037-1043` (`saveFileByPath` flush, then `deleteItem`).
- `fs.service.ts:167` `deleteItem` -> `applyPathChange({to:null})` (path-change.service.ts:117).
- path-change:125 `closeTabsForDeletedPath(from)` runs BEFORE the disk op. editor.service.ts:356-366 removes every matching tab with no dirty check and no save.
- path-change:127 `diskOp` -> `fs.service.ts:169-184` -> `moveToTrash` (trash.service.ts:49): mkdir container (:60-68), `rename(absolutePath, trashPath)` (:71), `saveManifest([item, ...trashStore.items])` (:79, error caught :80-82), `trashStore.addItem` (:83).
- path-change:131 `setFileTree(removeNodeByPath)`; :135-141 consumers; :153 `refreshTree`; :168-170 `forgetNote(from)` and child paths -> `applyNoteChange({kind:'delete'})` (note-change.service.ts:197-221): `clearIndexedEntry`, consumer remove, `remove_note_from_index` (:202), `remove_from_search_index` (:209), `remove_semantic_file` (:217).

E. Rename
- `fs.service.ts:201` `renameItem`: `renamedPath` (fs.logic:28), `exists(newPath)` (:205) -> `applyPathChange({to:newPath, diskOp: rename})` (:206-211).
- path-change:132 `updateTabAfterRenameOrMove` (editor tabs keep dirty content, path changes); :148-150 `updateLinksAfterRename` for markdown; :153 `refreshTree`; :159 `call('rename_note')` (index re-key only, vault.rs:1045-1066); :168-170 `forgetNote` for old paths.
- `updateLinksAfterRename` (link-updater.service.ts:21-61): `get_backlinks_v2` (:27), for each affected file use dirty tab content or `readTextFile` (:33-35), `replaceWikilinks`, `writeTextFile` if changed (:39), `syncExternalContentToEditor(..., true, 'none')` (:47), `applyNoteChange({source:'save'})` (:52). Failures in `Promise.allSettled` logged (:56-60).

F. Move (drag, auto-move)
- `fs.service.ts:228` `moveItem`, same shape as rename (`exists` :233, `rename` :239). Auto-move: `auto-move.service.ts:150-213` -> `mkdir(destPath)` (:177) -> `moveItem` (:188), errors swallowed (:189-192); icon via `setIconForPath` (:207).

G. Restore from Trash
- `trash.service.ts:110` `restoreItem`: `exists(restorePath)` (:116) else `findUniqueRestorePath` (:117, :283-291) -> `mkdir` parent (:123) -> `rename(trashPath, restorePath)` (:126) -> `remove` container, non-fatal (:130-132) -> `saveManifest` (:139, caught :140-142) -> `removeItem` (:143) -> `indexRestoredNotes` (:152, :243-259: `readTextFile`, `markRecentSave`, `applyNoteChange({source:'restore'})`, `notifyContentInvalidated` :258) -> `refreshTree`.

H. Empty and permanent delete
- `deletePermanently` (:185-200): `remove(itemDir)` (:188) THEN `saveManifest` (:191, not caught, throws), `removeItem` (:192).
- `emptyTrash` (:205-222): `remove(itemsDir)` (:209) THEN `saveManifest([])` (:213) THEN `clear` (:214).

I. Task checkbox toggle
- `TasksView.svelte:67` (only caller) -> `tasks.service.ts:100` `toggleTask` -> `call('toggle_task_status')` (:102) -> Rust reads DISK (`vault.rs:669` `std::fs::read_to_string`), toggles, `write_atomic` (~:682), returns updated disk content -> TS `syncExternalContentToEditor(filePath, updatedContent, true, 'none')` (:114) -> `buildTaskIndex` (:115). Errors: toast (:116-119).

J. Deep link `kokobrain://new`, `daily`, `capture`
- `deep-link.service.ts:87` `onOpenUrl` and cold start `getCurrent` (:99) -> `enqueueDeepLinkUrl` (:25-33, serialized queue) -> `handleDeepLinkUrl` (:118) -> `parseDeepLinkUri` (deep-link.logic.ts:82-99; no path guard) -> `resolveAndDispatch` (:150) -> `executeAction` (:175) -> `executeNewAction` (:243).
- `resolveFilePath` (utils/path.ts:33-53) blocks `..` escape only (:42-44); dot-prefixed folders such as `.kokobrain/` are allowed.
- `daily`: `executeDailyAction` (deep-link-actions.ts:31-65) via `registerDeepLinkAction` (:184).
- `capture`: `executeCaptureAction` (deep-link-actions.ts:102-178).
- Quick capture: Rust `submit_composer_capture` (quick_capture/commands.rs:349-365) only emits `qc:capture-detected`; TS `quick-capture.service.ts:100` -> `executeAction` -> capture path above.

K. Quit
- `tauri-listeners.service.ts:50-80` `onCloseRequested`: `preventDefault` (:54), `saveAllDirtyTabs()` (:55), discard prompt if failures (:56-63), `drainEventCalendarWrites` (:66, no try), `flushSettingsPersistence` (:70), `destroy` (:71).

L. Vault switch and init teardown
- `vault.service.ts:18` `switchVault`: `saveAllDirtyTabs()` (:19, RESULT IGNORED), `drainPendingWrites` (:20), `vaultStore.open` (:21).
- `app-lifecycle.service.ts:170-189`: safety-net `saveAllDirtyTabs()` (:180, RESULT IGNORED), `drainEventCalendarWrites` (:186), `teardownVault()` (:188). Teardown `save_vault_cache` fire-and-forget (:587), `cleanup_history` fire-and-forget on init (:275).

M. Frontmatter write (properties, icon picker, calendar fields, bookmark migration)
- `frontmatter-write.service.ts:95` `updateNoteFrontmatter` -> `attempt` (:107): open tab -> `syncExternalContentToEditor(path,next,false,'none')` (:128) + `saveFileByPath` (:129). Closed note -> `readTextFile` (:117), `exists` (:139), tab re-check (:144), `writeTextFile(path,next,{create:false})` (:149), `syncExternalContentToEditor(...,true,'none')` (:156), `notifyAfterSave` (:157).

N. Type rename and .view writes
- `type-definitions.service.ts:206` `renameType`: `renameItem` (:209), loop over ALL editor tabs writing rewritten content (:215-225, `writeTextFile` :218, `syncExternalContentToEditor` :220, `applyNoteChange` :224), then `call('propagate_type_rename')` (:226, Rust vault.rs:396 -> inner 342). Failures: toast (:227-231).
- `updateViewIcon` (:290-291) and `updateViewQuery` (:306-310): read, transform, `writeTextFile` with no applyNoteChange, no notifyAfterSave, no serialization.

O. History
- `file-history.service.ts:111` `saveSnapshotForFile` (after-save observer) -> `save_snapshot` (:117, DB row via history.rs:57-79, dedupe by hash) -> backup `.md` `mkdir` (:140) and `writeTextFile` (:143), errors logged (:145-147).
- `restoreSnapshot` (:82-105): `get_snapshot_content` (:85), `editorStore.editorView.dispatch` (:91-95, the ACTIVE view), `saveCurrentFile()` (:99, saves the ACTIVE tab). Called from `FileHistoryDialog.svelte:50`. Dialog file is `fileHistoryStore.filePath`, set from `activeTabPath` at `global-keybindings.ts:173-174` and `commands.ts:305-310`.

## 2. Inventory table (every frontend write, rename, delete, mkdir, copy)

Columns: site, operation, target, atomic, guard, routes applyNoteChange / notifyAfterSave, error handling. "Atomic" is FETCHED for plugin-fs (no temp file) and READ for Rust (`write_atomic`).

| # | file:line | operation | target | atomic? | guard before | index/notify route | error handling |
|---|---|---|---|---|---|---|---|
| 1 | src/lib/core/editor/editor.service.ts:168 | `writeTextFile(path, tab.content)` | note body (autosave, explicit, quit, switch) | NO (truncate+write) | tab exists and dirty (:163) | `notifyAfterSave` :170 (save source) | catch :173-177: `toast.error`, returns false; autosave retries every 5 s (:192) |
| 2 | src/lib/core/frontmatter/frontmatter-write.service.ts:149 | `writeTextFile(path,next,{create:false})` | closed note frontmatter | NO | `exists` :139, tab re-check :144, vault check :140 and :154 | `notifyAfterSave` :157; `syncExternalContentToEditor` :156 | catch :150-153: `missing` if gone, else rethrow |
| 3 | src/lib/core/frontmatter/frontmatter-write.service.ts:129 | `saveFileByPath` (open tab) | note | NO (as #1) | tab dirty | as #1 | returns `save-failed`, tab restored :131-134 |
| 4 | src/lib/core/filesystem/link-updater.service.ts:39 | `writeTextFile(filePath, updatedContent)` | every note with a wikilink to a renamed note | NO | `readTextFile` :35 (dirty tab content used instead, :33-35); no exists check | `syncExternalContentToEditor` :47 then `applyNoteChange(save)` :52 | `Promise.allSettled`, logged :56-60 |
| 5 | src/lib/core/filesystem/fs.service.ts:48 | `writeTextFile(.kokobrain/folder-order.json, template)` | app JSON, written on READ | NO | `exists` :45; `mkdir` :38 | none | catch :66-70: logs, returns `{}` |
| 6 | src/lib/core/filesystem/fs.service.ts:129 | `call('create_note')` via `createFile` | new note | Rust `write_atomic` (utils/fs.rs:16-32), no fsync | Rust refuses existing path (vault.rs ~892); TS unique name (:121-123) | `markRecentSave` :130; `applyNoteChange(fs)` :137 (no Rust IPC by policy, note-change.service.ts:91) | catch :141-144 logs and rethrows |
| 7 | src/lib/core/filesystem/fs.service.ts:156 | `call('create_folder')` | folder | `create_dir_all` (vault.rs:922-926) | `generateUniqueName` :152 | none (folders not indexed) | rethrow :160-163 |
| 8 | src/lib/core/filesystem/fs.service.ts:181 | `remove(itemPath,{recursive})`: PERMANENT delete, only when `vaultStore.path` is empty | note or folder | recursive remove, no trash | none; tabs already closed by path-change:125 | `forgetNote` via applyPathChange | rethrow :186-189 |
| 9 | src/lib/core/filesystem/fs.service.ts:211 (in applyPathChange diskOp) | `rename(oldPath,newPath)` | note or folder | `std::fs::rename` (FETCHED): replaces an existing file on POSIX | `exists(newPath)` :205 (TOCTOU) | path-change :159 `rename_note`; `forgetNote` old paths :168-170 | rethrow :216-219 |
| 10 | src/lib/core/filesystem/fs.service.ts:239 | `rename(sourcePath,newPath)` (moveItem) | note or folder | as #9 | `exists` :233 (TOCTOU) | as #9 | rethrow :244-247 |
| 11 | src/lib/core/filesystem/fs.service.ts:252,260 | `mkdir(destPath)` (not recursive), `copyFile` per child | folder duplicate | NO, no rollback | `generateCopyName` (:272) | NO applyNoteChange; relies on watcher | rethrow :282-285; partial copy left behind |
| 12 | src/lib/core/filesystem/fs.service.ts:278 | `copyFile(itemPath,newPath)` | note duplicate (copies DISK bytes, not dirty buffer) | NO | `generateCopyName` :272 | NO applyNoteChange; relies on watcher | rethrow :282-285 |
| 13 | src/lib/core/trash/trash.service.ts:60,64,68 | `mkdir` trash dirs and item container | `.kokobrain/trash/...` | NO (mkdir) | `exists` :59, :63 | none | container removed on failure only if not renamed (:91-93) |
| 14 | src/lib/core/trash/trash.service.ts:71 | `rename(absolutePath, trashPath)` | note or folder into trash | `rename` (FETCHED) | none beyond the caller's delete | `saveManifest` :79 (caught :80-82), `addItem` :83 | catch :87-96 logs, rethrows; container removed only if not renamed |
| 15 | src/lib/core/trash/trash.service.ts:126 | `rename(trashPath, restorePath)` | restore | `rename` | `exists` :116 then unique suffix :117 (TOCTOU) | `indexRestoredNotes` :152 (restore source) | catch :176-179 rethrows; post-rename failures logged :170-172 |
| 16 | src/lib/core/trash/trash.service.ts:123 | `mkdir(parentDir,{recursive})` | restore parent | NO | `exists` :122 | none | as above |
| 17 | src/lib/core/trash/trash.service.ts:130 | `remove(itemDir,{recursive})` container | trash container | recursive | none | none | `.catch` logs, non-fatal :130-132 |
| 18 | src/lib/core/trash/trash.service.ts:188 | `remove(itemDir,{recursive})` | permanent delete of one trashed item | recursive | none | none | THROWS: manifest save (:191) after remove is not caught; store not updated |
| 19 | src/lib/core/trash/trash.service.ts:209 | `remove(itemsDir,{recursive})` | empty trash (all items) | recursive | `exists` :208 | none | `saveManifest([])` :213 after remove; throws on error |
| 20 | src/lib/core/trash/trash.service.ts:275 | `writeTextFile(trash-manifest.json)` via `saveManifest` :269-276 | app JSON, manifest | NO | `exists(trashDir)` :272 | none | callers: moveToTrash caught :80-82; restore caught :140-142; deletePermanently and emptyTrash THROW |
| 21 | src/lib/core/settings/settings.service.ts:193 | `writeTextFile(.kokobrain/settings.json)` via `writeSettingsFile` :185-198 | app JSON, settings | NO | `exists` :189 + `mkdir` :191 | none | logs and rethrows :194-197 |
| 22 | src/lib/core/settings/settings.service.ts:39,172 | `saveSettings` as defaults write | app JSON | NO | none | none | `loadSettings` catch (:166-178) writes DEFAULT_SETTINGS over the file on ANY error in the try block (read :44, parse :54) |
| 23 | src/lib/features/deep-link/deep-link.service.ts:260 | `writeTextFile` prepend | existing note | NO | `exists` :255 (only prepend) | `markRecentSave` :259, `syncExternalContentToEditor(true,'none')` :262, `notifyAfterSave` :263 | rethrow to `executeAction` catch :203-206 (toast) |
| 24 | src/lib/features/deep-link/deep-link.service.ts:279 | `writeTextFile` append | existing note | NO | `exists` :274 | as #23 (:281-282) | as #23 |
| 25 | src/lib/features/deep-link/deep-link.service.ts:296 | `writeTextFile` overwrite (whole note) | existing or new note | NO | none (overwrite by design, deep-link.types.ts:35-36) | `markRecentSave` :295, `syncExternalContentToEditor(true,'none')` :298, `notifyAfterSave` :299, `refreshTreeInBackground` :301 | as #23 |
| 26 | src/lib/features/deep-link/deep-link.service.ts:313 | `writeTextFile` SILENT create | existing OR new note | NO | NONE: no `exists` before the write (:308-315) | `markRecentSave` :312, `notifyAfterSave` :314, no `syncExternalContentToEditor`, no `applyNoteChange` direct | as #23 |
| 27 | src/lib/app/deep-link-actions.ts:61 | `writeTextFile` daily append or prepend | today's daily note | NO | `exists` :51 (returns if missing); content from disk `readTextFile` :54 | `markRecentSave` :60, `syncExternalContentToEditor(true,'none')` :63, `notifyAfterSave` :64 | as #23 |
| 28 | src/lib/app/deep-link-actions.ts:173 | `writeTextFile` quick capture | new capture file | NO | `resolveUniqueCapturePath` :171 (exists-then-write, serialized per comment at :72-74) | `markRecentSave` :172, `notifyAfterSave` :174 | as #23 |
| 29 | src/lib/app/deep-link-actions.ts:126 | `mkdir(parent,{recursive})` | capture folder | NO | none | none | as #23 |
| 30 | src/lib/features/type-definitions/type-definitions.service.ts:218 | `writeTextFile(tab.path, updated)` for every open tab whose `_type` changes | open member notes, dirty or clean | NO | `rewriteTypeInFrontmatter` returns null to skip (:216-217) | `syncExternalContentToEditor(true,'none')` :220, `applyNoteChange(save)` :224 | throws out of the try, caught :227-231: toast, `propagate_type_rename` skipped |
| 31 | src/lib/features/type-definitions/type-definitions.service.ts:226 | `call('propagate_type_rename')` | member notes on disk (Rust) | `write_atomic` per note (vault.rs:368) | READ from disk per note | `update_note_in_index_inner` per note; emits once | per-note write failures `continue` silently (vault.rs:356-365); command returns Ok(count) |
| 32 | src/lib/features/type-definitions/type-definitions.service.ts:291 | `writeTextFile(.view, updateViewIconYaml)` | .view definition | NO | none | NONE (no applyNoteChange, no notifyAfterSave, no snapshot) | no catch; propagates |
| 33 | src/lib/features/type-definitions/type-definitions.service.ts:309 | `writeTextFile(.view, updateCollectionYaml)` | .view definition | NO | `updated === content` skip (:308) | NONE; then `refreshViewDefinition` (:310) | no catch; propagates |
| 34 | src/lib/features/type-definitions/type-definitions.service.ts:120,135,178,274 | `create_folder`, `createFile` | type note, type definition, view | as #6 and #7 | as #6 | as #6 | `create-failed` / toast paths :121-124, :136-138, :179-182, :275-277 |
| 35 | src/lib/plugins/templates/templates.service.ts:105,116 | `call('create_folder')`, `writeTextFile(absPath,'')` | template placeholders | NO | `exists(absPath)` :111 | none (refreshTree :122) | catch :124-126 logs |
| 36 | src/lib/features/file-icons/file-icons.service.ts:37,65 | `mkdir(.kokobrain)` (:37 guarded by `exists` :35), `writeTextFile` recent icons JSON | app JSON | NO | `exists` | none | catch :66-68 logs only, no rethrow |
| 37 | src/lib/features/file-icons/file-icons.service.ts:98 | `writeTextFile(folder note, '---\n---\n')` | new folder note | NO | `exists(notePath)` :95 | `applyNoteChange(save)` :102 | none; create-only |
| 38 | src/lib/features/auto-move/auto-move.service.ts:75,81 | `mkdir` (:74 guarded), `writeTextFile(config.json)` | app JSON | NO | `exists` :73 | none | catch :83-86 logs and rethrows |
| 39 | src/lib/features/auto-move/auto-move.service.ts:177,188 | `mkdir(destPath,{recursive})`, `moveItem` | note moved by rule | rename as #10 | `exists` :175; `moveItem` `exists` :233 | as #10 | caught silently :189-192 (logged by moveItem) |
| 40 | src/lib/features/tasks/todoist.service.ts:127,129 | `mkdir` (:126 guarded), `writeTextFile(sent-tasks JSON)` | app JSON | NO | `exists` :126 | none | no catch in `saveSentTasks`; propagates to caller |
| 41 | src/lib/features/file-history/file-history.service.ts:140,143 | `mkdir` (:138-139 guarded), `writeTextFile(backup .md)` | snapshot backup file | NO (new file) | `exists` :138 | none | catch :145-147 logs only (silent to user) |
| 42 | src/lib/utils/log.service.ts:50,69 | `mkdir` logs dir, `writeTextFile(line,{append:true})` | app log | append | `exists` :48 | none | `console.error` :70-72 |
| 43 | src/lib/features/properties/bookmark-migration.service.ts:102 | `remove(filePath)` legacy bookmarks file: PERMANENT | app JSON | none | only after no failed bookmarks (:93-99) and vault check (:109) | none | catch :103-106 toast |
| 44 | src/lib/core/note-creator/note-creator.service.ts:98,103 | `call('create_folder')`, `call('create_note')` | new note from template or deep link | as #6 | `exists` :86 | `markRecentSave` :107, `applyNoteChange(create)` :118 | rethrow :130-133 |
| 45 | src/lib/features/rail-shell/new-note.service.ts:27,28 | `call('create_folder')`, `createFile` | "+ New here" note | as #6, #7 | as #6 | as #6 | rethrow :32-35 |
| 46 | src/lib/features/event-calendar/event-calendar.service.ts:728 | `renameItem` | calendar rename | as #9 | as #9 | as #9 | as #9 |
| 47 | src/lib/features/event-calendar/event-calendar.service.ts:1008 | `createFile` | calendar duplicate | as #6 | as #6 | as #6 | as #6 |
| 48 | src/lib/features/event-calendar/event-calendar.service.ts:1037,1043 | `saveFileByPath` flush, then `deleteItem` | calendar delete | flush: as #1; delete: as #8/#14 | the calendar flushes BEFORE delete; the explorer and note-row paths do not (see lead L1) | as above | as above |
| 49 | src/lib/app/lifecycle/app-lifecycle.service.ts:275 | `call('cleanup_history')` | DB snapshot rows (not files) | DB transaction (history.rs:143-161) | none | none | `.catch` logs (:275-277) |
| 50 | src/lib/app/lifecycle/app-lifecycle.service.ts:587 | `call('save_vault_cache')` | index cache file | atomic + fsync (index_cache.rs:55-78) | none | none | `.catch` logs (:587-589), fire-and-forget |
| 51 | src/lib/features/file-history/file-history.service.ts:117 | `call('save_snapshot')` | DB snapshot row | DB insert (history.rs:57-79) | hash dedupe (Rust) | after-save observer | throws to observer caller; `registerFileHistoryHook` catch :193-195 |
| 52 | src/lib/features/tasks/tasks.service.ts:102 | `call('toggle_task_status')` | note line on disk (Rust) | `write_atomic` (vault.rs ~682) | Rust reads disk (vault.rs:669) | TS `syncExternalContentToEditor(true,'none')` :114 (see lead L9) | toast :116-119 |
| 53 | src/lib/core/filesystem/note-change.service.ts:202,209,217 | `call('remove_note_from_index')`, `remove_from_search_index`, `remove_semantic_file` | index/DB only | n/a | `vaultPath` (FTS key) | owner | `.catch` logs |
| 54 | src/lib/core/filesystem/note-change.service.ts:235 | `call('update_note_in_index')` | index only (per the owner's doc comment at :230-234; Rust body not read) | n/a | `isAlreadyIndexed` (:225-227) | owner | `.catch` logs |
| 55 | src/lib/core/filesystem/path-change.service.ts:159 | `call('rename_note')` | index re-key only (vault.rs:1045-1066; disk rename is TS-side) | n/a | none | owner | catch :160-162 logs |
| 56 | src/lib/features/search/search.service.ts:321,327 | `call('update_search_index_file')`, `call('update_semantic_file')` | FTS and semantic DB | n/a | none | n/a | `.catch` logs |
| 57 | src/lib/app/tauri-listeners.service.ts:55 (quit) | `saveAllDirtyTabs()` | note bodies | as #1 | dirty tabs | as #1 | failed paths shown in discard prompt (:56-63) |
| 58 | src/lib/core/vault/vault.service.ts:19; src/lib/app/lifecycle/app-lifecycle.service.ts:180 | `saveAllDirtyTabs()` on vault switch and init | note bodies | as #1 | dirty tabs | as #1 | RESULT IGNORED in both places (see lead L13 and Issue 34) |

Also: `editor.service.ts:356-366` `closeTabsForDeletedPath` and `editor.store.svelte.ts:130-136` `updateTabContentByPath` (sets BOTH content and savedContent, so the tab reads as clean) are the two in-memory operations that destroy unsaved buffer content on the write paths below.

## 3. Store and state effects, success and failure

- Body save success: `markSavedByPath` (editor.store:91-96) sets `savedContent`; `notifyAfterSave` runs. Failure: tab stays dirty, toast, autosave retry 5 s (editor.service:192). Quit: discard prompt (tauri-listeners:56-63). Vault switch: failures ignored (vault.service:19).
- Delete success: tab removed (closeTabsForDeletedPath :356-366, before the disk op), `fsStore.setFileTree(removeNodeByPath)` (path-change:131), trash manifest write and `trashStore.addItem` (trash.service:79-83). Delete failure after the disk op fails: tab already gone, buffer dropped (see L1).
- Rename success: tabs re-pathed (editor.store:updateTabPath), links rewritten, `rename_note`, `forgetNote` on old paths. Failure of `rename`: thrown before tabs change (path-change:127 throws out, :131-170 skipped), so tabs are unchanged. Failure of `rename_note` is logged only (path-change:160-162).
- Trash restore success: manifest saved and store item removed (trash.service:139-143), then index and tree (:148-172). Failure of the rename: item stays in trash, store unchanged.
- Permanent delete: item dir removed BEFORE manifest; if manifest write throws, store still lists the item, but the file is already gone (trash.service:188-192).
- Toggle: success: tab content and savedContent replaced with disk content (tasks.service:114). Failure: toast only.
- Deep-link prepend/append/overwrite/daily: success: tab content and savedContent replaced with the disk-based merged content (deep-link.service:262, :281, :298; deep-link-actions:63). Failure: toast via `executeAction` (deep-link.service:203-206).
- Settings: any load error (including a parse error on a truncated file) leads to DEFAULT_SETTINGS being written to `settings.json` (settings.service:166-178).

## 4. Concurrency (timers, promises, queues, what can interleave)

- Autosave timers: 2000 ms body and 500 ms frontmatter, mutually exclusive (editor.service:197-200, :213-221). `saveAllDirtyTabs` cancels both (:235-236). Failed autosave retry: `setTimeout(saveDirtyTabs, 5000)` (:192) without cancel. Retry can run after a tab is closed, but it re-filters dirty tabs so it only saves tabs still open.
- Single write per tab is not serialised. `saveFileByPath` snapshots `tab.content` (:165) and awaits the IPC (:168). The rename/move path (path-change:127 diskOp) can run while a save is in flight for the same path; the order of the two IPCs is not enforced (INFERRED race, see L12).
- `closeTabsForDeletedPath` runs before `diskOp` (path-change:125), so the 2 s debounce cannot save a deleted path afterwards. It also means an in-flight save that already started is not cancelled.
- Deep-link dispatch is serialised by `dispatchQueue` (deep-link.service:23-33), which covers the read-modify-write on disk among deep links. It does NOT cover the editor buffer, which is what matters for L3.
- Quick capture dispatch is serialised per its comment (deep-link-actions:72-74), body not read.
- Event calendar writes are queued per path (event-calendar.service:500 `enqueue`). Only the call sites are in scope here.
- `frontmatter-write.service.ts:91-93` says callers must serialise per path; bookmark migration does (bookmark-migration:63-64). Type-definition `updateViewIcon`/`updateViewQuery` (type-definitions:290-310) and `updateViewQuery` callers are NOT serialised (see L22).
- Trash manifest: no queue. `moveToTrash` reads `trashStore.items` at :79 before the store is updated at :83, and the other manifest writers (:139, :191, :213) also read the store then write. Two overlapping trash operations can each write a manifest that omits the other's entry (see L5).
- Auto-move: per-file `setTimeout` debounce (auto-move:110-123), not cancelled on tab close; runs `moveItem` against disk.
- Index dedupe map, `recentSaves` (15 s TTL), `markRecentSave` (editor.hooks.ts) are not write locks; they only suppress watcher work.
- Quit: `saveAllDirtyTabs` (tauri-listeners:55) runs before `drainEventCalendarWrites` (:66) and `flushSettingsPersistence` (:70). A throw in drain prevents `destroy` (:71); the window stays open (not data loss).
- Log writes are serialised through `writeChain` (log.service:61-74).

## 5. Leads (hypotheses; confidence stated; code read, runtime not reproduced)

L1 - Delete drops the unsaved buffer. HIGH confidence in the code path, MEDIUM-HIGH that it happens in practice.
- Steps: type in note N and wait less than 2 s (before the autosave at editor.service:197) -> click Move to Trash (NoteRowMenu.svelte ~:122-128, FilesNavigator.svelte:170-174, or note-action-bar.service.ts:21-24) -> confirm.
- Why: `deleteItem` (fs.service:167) calls `applyPathChange`, which calls `closeTabsForDeletedPath` (path-change:125, editor.service:356-366) with no dirty check and no `saveFileByPath`, then moves the LAST SAVED bytes to trash (trash.service:71). The debounced save then finds no tab and writes nothing.
- Result: the trash copy and the disk lack the last 2 s of typing. No prompt. The event calendar delete does flush first (event-calendar.service:1037), so this is an inconsistency, not a designed rule.
- Second case: if `rename(absolutePath, trashPath)` or the container `mkdir` fails (trash.service:60-71), the tab is already closed (path-change:125) and the note is still on disk, but the unsaved buffer is gone.
- Not in the issue index.

L2 - Deep-link `new` with `silent=true` overwrites an existing note with no existence check. HIGH confidence (code); MEDIUM severity (requires an external caller of the URL scheme).
- Steps: `kokobrain://new?vault=V&name=Daily/2026-11-02&content=x&silent=true` where the note exists -> `executeNewAction` skips the `exists` check and takes the silent branch (deep-link.service:309-315) -> `writeTextFile` replaces the whole file. Previous content is in file history only if an earlier save recorded it; it is not in Trash.
- If that note is open and dirty, the buffer is not synced (no `syncExternalContentToEditor` in the silent branch), so the next autosave writes the old buffer back over the deep-link content. The external content silently disappears.
- The non-silent branch uses `openOrCreateNote`, which checks `exists` (note-creator:86) and does not overwrite.
- The `overwrite` flag (deep-link.service:291-306) is documented as overwriting (deep-link.types.ts:35-36). The silent branch is not documented as overwriting, which makes it look unintended.

L3 - Deep-link append, prepend and daily append/prepend replace unsaved editor text. HIGH confidence (code); plausibility MEDIUM.
- Steps: type in today's daily note (dirty, under 2 s) -> trigger `kokobrain://daily?...&append=true&clipboard=true` (or `new` with append/prepend on the open note) -> `executeDailyAction` reads the DISK file (deep-link-actions.ts:54), builds `existing + content`, writes it (:61), then `syncExternalContentToEditor(path, newContent, true, 'none')` (:63) which runs `updateTabContentByPath` (editor.store:130-136): sets `content` AND `savedContent` to the disk-based text.
- Result: the unsaved keystrokes are dropped silently and the tab reads as clean. Same in deep-link.service.ts:253-289.
- The dispatch queue (deep-link.service:23-33) prevents two deep links from racing each other, not this.

L4 - Trash manifest overwritten after a failed or corrupt read: items vanish from the Trash UI. MEDIUM confidence (needs a bad manifest or a read error); severity HIGH for recoverability.
- Steps: the manifest is corrupt or unreadable at load (possible from a crash during the non-atomic write at trash.service:275, or a transient read error) -> `loadTrash` catches and sets `items=[]` (trash.service:37-40) -> `parseTrashManifest` returns `[]` for invalid JSON (trash.logic.ts:58-66) -> the next delete writes `saveManifest([item])` (trash.service:79), replacing the manifest.
- Result: earlier trash containers remain under `.kokobrain/trash/items/` but are unlisted. `emptyTrash` would delete them. Nothing in the UI can restore them.
- Also: if the manifest write at :79 fails, the item is in the store (:83) but not on disk, and it disappears on the next app start while its file sits in `items/`.

L5 - Overlapping trash operations lose manifest entries. MEDIUM-LOW (depends on whether two trash ops can overlap; not verified in the UI).
- Two `moveToTrash` calls: A renames (:71), awaits `saveManifest([A, ...S])` (:79); B renames, awaits `saveManifest([B, ...S])` where S does not yet include A (A is added to the store only at :83). The last write wins, so one entry is lost (orphaned container, same result as L4).
- Same read-then-write pattern in `restoreItem` (:137-139) and `deletePermanently` (:191).

L6 - Non-atomic note-body write can truncate a note on crash or power loss. LOW probability, HIGH severity. Confidence in mechanism HIGH (FETCHED plugin-fs semantics).
- Every body save is `writeTextFile` (editor.service:168), which opens with truncate and writes in place (FETCHED). A crash between truncate and write_all leaves a truncated or empty note. The Rust path (`create_note`, `toggle_task_status`, `propagate_type_rename`) uses `write_atomic` (utils/fs.rs:16-32), which has no `sync_all`, while the index cache write does fsync (index_cache.rs:70). So the Rust path is atomic against process crash but not against power loss.
- Not in the issue index.

L7 - Settings overwritten with defaults on any load error. HIGH confidence (code); severity LOW-MEDIUM (app config, not notes).
- `loadSettings` catch (settings.service:166-178) writes DEFAULT_SETTINGS to `settings.json` after any error in the try (read :44, parse :54, merge). A truncated or hand-edited file with a syntax error is replaced by defaults on the next launch, with no backup.
- The write at :193 is non-atomic, so a crash mid-save can produce the truncated input this path then overwrites.

L8 - Silent partial failure in `propagate_type_rename`. MEDIUM confidence; severity MEDIUM (member notes keep the old `_type` and drop out of their type with no visible error).
- `propagate_type_rename_inner` (vault.rs:342-380) `continue`s on read or write failure (:356-365, :368-374) and logs to debug only. The command returns `Ok(count)`, so `renameType` (type-definitions:226) reports success and shows no toast.

L9 - Task checkbox toggle replaces the open note's unsaved text. HIGH confidence (code); plausibility MEDIUM.
- Steps: open note N and type (dirty, under 2 s) -> switch to the Tasks tab -> tick a task that lives in N -> `toggleTask` (tasks.service:100) -> Rust reads DISK (vault.rs:669) and writes the toggled disk content -> `syncExternalContentToEditor(filePath, updatedContent, true, 'none')` (tasks.service:114) overwrites N's buffer and savedContent with that disk text.
- Result: the typed text is removed from the editor and never reaches disk. The only caller is TasksView.svelte:67; the live-preview checkboxes do not call `toggleTask`.
- Contrast: `updateLinksAfterRename` (link-updater:33-35) and `renameType` (:216) use the dirty tab content, so this path is the odd one out.

L10 - `reloadExternallyChangedTabs` can overwrite typing made during the read. LOW-MEDIUM confidence (narrow window); severity MEDIUM.
- The clean check is before the await (editor.service:380), the read is `Promise.allSettled` over disk (:385-387), and the apply step (:397-401) re-checks only that the tab exists and `diskContent !== savedContent`, not `isTabDirty`. If the user typed during the read, `syncExternalContentToEditor(..., true, 'none')` sets both content and savedContent to disk text.

L11 - Restore from history writes into whichever editor is active. LOW-MEDIUM (needs the active tab to change while the dialog is open; not verified whether global shortcuts are blocked by the modal).
- `restoreSnapshot` (file-history.service:82-105) dispatches the snapshot into `editorStore.editorView` (:91-95, the ACTIVE view) and saves the ACTIVE tab (:99). The dialog is for `fileHistoryStore.filePath` (set from `activeTabPath` at open, global-keybindings.ts:173-174, commands.ts:305-310).
- If the active tab changed, the snapshot lands in the other note and is saved there.

L12 - In-flight save vs rename or delete. LOW probability; severity MEDIUM (duplicate or recreated file).
- `saveFileByPath` writes with no `create:false` (editor.service:168). If the file was renamed away (in app, path-change:127) or removed outside the app while a save was in flight, or a dirty tab survived an external rename or delete, the write recreates the old path. The frontmatter writer deliberately uses `create:false` (frontmatter-write.service:146-149), so the concern is known there but not here.

L13 - Failed save before vault switch or init is ignored, and the buffer is then dropped. KNOWN in part (Issue 34 comment).
- `switchVault` (vault.service:19) and the init safety net (app-lifecycle.service:180) ignore the failed list. Teardown then resets the editor (app-lifecycle:188), so the unsaved buffer is gone with only the earlier toast. Issue 34's comment (architecture-stability/issues/34-...) says: "whether to block the switch instead is the owner's call". Still open.

L14 - Path safety: `new` deep link can overwrite app metadata and any dot-named vault file. MEDIUM severity (needs a deep-link trigger); confidence HIGH on the code path, exposure to web or other apps not checked.
- `parseDeepLinkUri` (deep-link.logic.ts:82-99) passes `name`/`file` straight through. `resolveFilePath` (utils/path.ts:33-53) only blocks `..` escaping the vault, so `name=.kokobrain/trash/trash-manifest.json&silent=true&content=...` or `name=.kokobrain/settings.json&overwrite=true` reaches `writeTextFile` (deep-link.service:296 or :313). A name without a dot in its last segment gets `.md` appended (utils/path.ts:46-50), so only dotted leaf names are targets: `.env`, `.obsidian/*.json`, `.kokobrain/*.json`.
- Rust side: `ensure_safe_write_path` (vault.rs:862-875) only requires an absolute path and no `..`, so it does not confine writes to the vault for `create_note` or `create_folder`. Those are only called with vault-derived paths today.

L15 - Rename and move `exists` then `rename` (TOCTOU). LOW (needs a concurrent creator of the target name); severity LOW-MEDIUM.
- `renameItem` (fs.service:205) and `moveItem` (:233) check `exists` and then `rename` in `diskOp` (:211, :239). `std::fs::rename` replaces an existing file on POSIX (FETCHED), so a file created in between is overwritten silently. Same for `restoreItem` (trash.service:116 then :126).

L16 - Duplicate of a note copies disk bytes and leaves partial copies. LOW.
- `duplicateItem` (fs.service:266-286) copies the last-saved bytes (a dirty buffer is not included, NoteRowMenu.svelte:68), does no `applyNoteChange`, and on a copy failure leaves a partial directory (copyDirectoryRecursive :251-263, no cleanup).

L17 - `updateViewIcon` and `updateViewQuery` are unserialised read-modify-write with no index or history path. LOW-MEDIUM.
- type-definitions.service:290-291 and :306-309 read, transform, write, with no per-path queue and no `applyNoteChange`/`notifyAfterSave`. Two quick toolbar edits can drop one. If the `.view` is open and dirty, the next autosave overwrites the update. Not verified whether `.view` tabs are edited as text.

L18 - Legacy bookmarks file is deleted permanently. INTENDED per toast text; listed for completeness.
- bookmark-migration.service:102 `remove(filePath)` runs only after all bookmarks migrated or dropped, with an info toast for dropped ones (:110-114).

L19 - Quit can hang the window. LOW (not data loss).
- tauri-listeners.service:66 `drainEventCalendarWrites` has no try; a throw skips `destroy` (:71) and leaves the window open.

## 6. Known issues matched (.scratch/architecture-stability/issues)

- 34-save-dirty-tabs-before-vault-switch.md: status resolved (switchVault now awaits save). Residual "failed save still switches" is in its comment, matched to L13.
- 21-app-lifetime-ports-for-core.md: trash.service and editor.hooks import changes only. Not a behavior finding.
- Calendar race issues 45-49, 56, 58-61, 64: event-calendar write races. Not analyzed here beyond the call sites in table rows 46-48.
- No issue file mentions trash manifest, dirty buffer loss on delete, deep-link overwrite, the task-toggle sync, or settings reset. Those leads are NEW from this scan.

## 7. Not checked and risks

- Runtime not reproduced. Every lead is from reading code. Nothing was run.
- plugin-fs semantics come from a summarised fetch, not the pinned source. Recheck `write_text_file` options and `rename` behaviour against the crate version in `Cargo.lock` before relying on L6 and L15.
- Watcher handling of self-saves (`markRecentSave`) and external edits was not traced, so whether a deep-link overwrite is picked up by reloadExternallyChangedTabs is unverified.
- Whether any two trash operations can overlap in the UI (L5) was not traced.
- Whether global keybindings run while the file-history dialog is open (L11) was not checked.
- fs capability scopes (src-tauri/capabilities/default.json) limit plugin-fs writes to `$DOCUMENT/kokobrain-vaults/**` and `$HOME/kokobrain-vaults/**` (and `.kokobrain`). Vaults elsewhere may be denied, or may be granted by the dialog plugin; not verified.
- Event-calendar write queue internals, `+layout.svelte` edit-source effect, and watcher-handler were out of this slice.
