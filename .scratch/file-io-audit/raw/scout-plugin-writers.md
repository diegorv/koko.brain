# Scout: plugin and feature writers (read/write/move/delete of notes)

Read-only map. No repo file was edited, no build or test was run. Line numbers are from `rg -n` / `cat -n` on the working tree at HEAD `e9065422`.

Legend: READ = read in code. INFER = reasoning from code, not executed. WEB = fetched from an official source (model-summarised where noted).

Slice files: `plugins/kanban/kanban.service.ts`, `features/canvas/canvas-image.service.ts`, `features/canvas/FileNode.svelte` (plus `CanvasInner.svelte`, `CanvasView.svelte`, `canvas.logic.ts`, `ImageNode.svelte` it depends on), `plugins/one-on-one/one-on-one.service.ts`, `plugins/templates/templates.service.ts`, `plugins/queryjs/queryjs.service.ts` (plus `kb-api.ts`), `features/auto-move/auto-move.service.ts` (plus `auto-move.logic.ts`, `type-lifecycle-rules.ts`).

---

## 1. Entry points and call chains

### 1a. Kanban
- New board: FilesNavigator / command palette -> `createKanbanFile` (`kanban.service.ts:17-19`) -> `createFile` (`core/filesystem/fs.service.ts:119-145`) -> `call('create_note')` (`fs.service.ts:129`, Rust `create_note`, `src-tauri/src/commands/vault.rs:888-914`) -> `markRecentSave` (`fs.service.ts:130`) -> `applyNoteChange` source `fs` (`fs.service.ts:137`) -> `refreshTree`.
- Edit a board: `KanbanView.svelte` `applyChange` (around lines 75-89) -> `serializeKanbanBoard` (`kanban.logic.ts:118`) -> `onContentChange` (prop, wired from `EditorView.svelte:79`) -> `editor.service.ts:224-227` `onContentChange` -> `editorStore.updateContent` (`editor.store.svelte.ts:84-88`, writes `tabs[activeIndex]`) -> body autosave timer 2000 ms (`editor.service.ts:197, 226`) -> `saveDirtyTabs` (`:183-194`) -> `saveFileByPath` (`:161-178`) -> plugin-fs `writeTextFile` (`:168`).
- Linked card preview: `KanbanCard.svelte:151` -> `loadLinkedFileContent` (`kanban.service.ts:57-89`), read-only (`readTextFile` at `:80`).
- Source mode for kanban: `EditorView.svelte:33, 79, 91` (toggle replaces KanbanView with MarkdownEditor).

### 1b. Canvas
- Node moves, text edits, edges, delete: `CanvasInner.svelte` `persistChanges` / `persistWithoutHistory` (`:104-115`) -> `flowToCanvas` (`canvas.logic.ts:290`) -> `serializeCanvas` (`canvas.logic.ts:52-54`, `JSON.stringify(..., '\t')`) -> `onJsonChange` (prop = `onContentChange`, wired at `EditorView.svelte:81`) -> same editor autosave chain as kanban.
- Text-node debounce: `CanvasInner.svelte:213-226` (`$effect` on `nodes`, 300 ms timer at `:221`), flush on destroy at `:230-233`.
- Content sync in (external or tab switch): `CanvasInner.svelte` sync `$effect` (about lines 84-100) -> `parseCanvas` (`canvas.logic.ts:36-50`).
- Create canvas: `canvas.service.ts:8-10` -> `createFile`.
- Add file node: `CanvasToolbar` / context menu -> `CanvasInner.svelte:669` `onSelect={handleFileSelected}` -> `handleFileSelected` (`:465-471`) -> `createFileNode` (`canvas.logic.ts:353`) -> `persistChanges`. The picker (`CanvasFilePicker.svelte:61`) passes `file.path`, which comes from `flattenFileTree` (`core/filesystem/file-entries.logic.ts:21`, `path: node.path`).
- Add image node: same, `handleImageSelected` (`CanvasInner.svelte:474-480`), `createImageNode` (`canvas.logic.ts:370`).
- File node render: `FileNode.svelte:40` builds `${vaultStore.path}/${data.file}`, then `readTextFile` at `:41`. Click: `FileNode.svelte:56` -> `openFileInEditor(data.file)` (`editor.service.ts:98`).
- Image node render: `ImageNode.svelte:26` -> `resolveImageSrc` (`canvas-image.service.ts:28-40`) -> prepends vault path at `:33-34`, `readFile` at `:35`, `URL.createObjectURL` at `:39`.

### 1c. One-on-one
- Person picker / action bar / file-tree: `OneOnOnePicker.svelte:30`, `MyPeopleSection.svelte:27`, action bar `one-on-one.service.ts:103-117` -> `createOneOnOneNote` (`:66-96`) -> `buildOneOnOnePath` (`one-on-one.logic.ts:25-41`) -> `openOrCreateNote` (`core/note-creator/note-creator.service.ts:78-134`) with `buildContent: ensureFrontmatterLink(...)` (`one-on-one.service.ts:94`).
- `openOrCreateNote` (READ): `exists` at `note-creator.service.ts:86`; if absent, `call('create_folder')` at `:98`, `loadNoteTemplate` `:100`, `buildContent` `:101`, `call('create_note')` `:103`, `markRecentSave` `:107`, `applyNoteChange` source `create` `:118`, `refreshTree` `:120`, `openFileInEditor` `:128`. If the file exists it only opens it (no overwrite).
- People list: `loadPeople` (`:41-57`), read-only (`readDir`, `exists`).

### 1d. Templates
- Template picker: `TemplatePicker.svelte` `confirmCreate` (name = `fileName.trim()`, no other sanitisation) -> `createFileFromTemplate` (`templates.service.ts:54-67`): `fullFileName` (`:58`), `filePath = ${vaultPath}/${fullFileName}` (`:60`) -> `openOrCreateNote` (`:62`).
- Startup: `app-lifecycle.service.ts:384` -> `ensureTemplatesFolder` (`templates.service.ts:73-127`): `create_folder` (`:105`), `writeTextFile(absPath, '')` for each missing template path (`:116`), `refreshTree` (`:122`).
- Template list: `loadTemplates` (`:19-47`), read-only.

### 1e. queryjs
- `queryjs.service.ts:4-6` `loadExternalScript` = `readTextFile(absolutePath)`, read-only. Used as `loadScript` at `queryjs-block-widget.ts:194`.
- Block execution: `kb-api.ts` `runView` (`:348-368`), `new Function('kb','dv','input', wrappedCode)` at `:360`. `runQueryjsBlock` (`:469`) `new Function('kb','dv', ...)`.
- Script path resolution: `resolveScriptPath` (`kb-api.ts:443-455`): appends `.js`, prefixes vault path, rejects only the literal substring `..`.
- The KBAPI class exposes no write method (READ: public methods at `kb-api.ts:67-341`: pages, page, current, ui, date, fileLink, view, awaitAllPending, render helpers). The user script is not sandboxed (see lead L6).

### 1f. Auto-move
- Save -> `editor.service.ts:170` `notifyAfterSave(path, content)` -> observers (`editor.hooks.ts:85-91`) -> `registerAutoMoveHook` callback (`auto-move.service.ts:95-124`): checks enabled flag (`:96`), rules exist (`:98-100`), vault (`:102`), excluded folders (`:105`), then `setTimeout(evaluateAndMove(filePath, content, vaultPath), settingsStore.autoMove.debounceMs)` (`:114-121`). Default `debounceMs: 3000` (`settings.store.svelte.ts:104`).
- `evaluateAndMove` (`:150-213`): `buildNoteRecord(filePath, content, ...)` (`:152`, stale snapshot) -> `findMatchingRule` (`:157`, first match wins, `auto-move.logic.ts:17-35`) with lifecycle rules appended (`:154-155`, `type-lifecycle-rules.ts:20-60`) -> `resolveDestination` (`:165`, `auto-move.logic.ts:102-130`) -> `isAlreadyInDestination` (`:166`) -> `exists(destPath)` / `mkdir(destPath, {recursive:true})` (`:175-177`) -> `moveItem(filePath, destPath)` (`:188`) -> `setIconForPath(vaultPath, targetPath, ...)` (`:207`) when the rule has an icon, after `detectLossyFrontmatter(content)` on the stale snapshot (`:201`).
- `moveItem` (`fs.service.ts:228-248`): `exists(newPath)` (`:233`) -> `applyPathChange` (`path-change.service.ts:117-171`) -> `rename` (`fs.service.ts:239` via `diskOp`), `updateTabAfterRenameOrMove` (`path-change.service.ts:132`, `link-updater.service.ts:73-86`), consumers (`:135-141`), `updateLinksAfterRename` (`:149`, returns early when the note name is unchanged, `link-updater.service.ts:25`; an auto-move never renames, so inert), `refreshTree` (`:153`), `call('rename_note')` (`:159`), `forgetNote(from)` (`:169` -> `note-change.service.ts:200-220` delete branch).
- Icon write: `setIconForPath` (`file-icons.service.ts:113-140`) -> `setFrontmatterIcon` (`frontmatter-icon.service.ts:50-65`) -> `updateNoteFrontmatter` (`frontmatter-write.service.ts:95-159`), see section 2.
- Lifecycle rules: `generateLifecycleRules` (`type-lifecycle-rules.ts:20-60`) emits `[Type] Archive` (destination `archiveTo`) and, only for `{folder}/<segment>`, `[Type] Unarchive` with destination `{parent}` (`:48-55`).
- Teardown: `resetAutoMove` (`:216-229`) unsubscribes and clears timers.

---

## 2. Disk writes, deletes and renames in the slice

| # | Where | Operation | Atomic? | Preconditions | Error handling | Store/state on success / failure |
|---|---|---|---|---|---|---|
| W1 | `fs.service.ts:129` (kanban/canvas/template new file via `createFile`) | Rust `create_note` | Yes: `write_atomic` tmp + `rename` (`src-tauri/src/utils/fs.rs:16-32`); no fsync | Absolute path, no `..` (`vault.rs:862-874`), target must not exist (`vault.rs:896`) | Rejects -> `createFile` logs and rethrows (`fs.service.ts:141-143`) | Success: `markRecentSave`, `applyNoteChange` (create, no Rust IPC), `refreshTree`. Failure: no state change. |
| W2 | `editor.service.ts:168` `writeTextFile(path, content)` | Save of every dirty tab (kanban, canvas, collection, markdown) and auto-move target | No. plugin-fs `write_text_file` opens the target with truncate and `write_all` (WEB, see section 4) | Tab dirty (`:163`) | Catch -> toast, returns false; `saveDirtyTabs` retries after 5 s (`:191-193`) | Success: `markSavedByPath` (`:169`), `notifyAfterSave` (`:170`). Failure: tab stays dirty. |
| W3 | `path-change.service.ts:127` -> `fs.service.ts:239` `rename(from,to)` (moveItem, auto-move) | Rename | Single syscall (`std::fs::rename`, WEB). Overwrites an existing target on POSIX (INFER from std behaviour). | `exists(newPath)` check `fs.service.ts:233`, not atomic with the rename (TOCTOU) | `diskOp` rejection propagates; `applyPathChange` does not catch it | Success: tab path updated (`:132`), consumers, `rename_note`, `forgetNote(from)`. Failure: nothing updated, `moveItem` rethrows (`:244-246`). |
| W4 | `auto-move.service.ts:175-177` `mkdir(destPath, {recursive:true})` | Dest folder create | n/a | `exists` check | Catch -> log, `return` (`:180-183`) | None |
| W5 | `frontmatter-write.service.ts:128-129` (open tab icon write) | Patch tab content, then `saveFileByPath` (W2) | No (W2) | Uses tab content including unsaved body (`:115`) | `save-failed` thrown (`:131-134`) | Tab restored to base if content unchanged (`:133`) |
| W6 | `frontmatter-write.service.ts:149` `writeTextFile(path, next, {create:false})` (closed note icon write) | Read-modify-write, no lock | No. `create:false` prevents recreating a deleted note (`:147-148`) | Read at `:117`, `exists` at `:139`, `assertVault` (`:140`, `:154`) | `missing` / rethrow (`:150-153`) | Success: `syncExternalContentToEditor` (`:156`), `notifyAfterSave` (`:157`). |
| W7 | `link-updater.service.ts:39` `writeTextFile(filePath, updatedContent)` | Wikilink rewrite in other notes | No | Only when the note name changed; never on auto-move (`link-updater.service.ts:25`) | `allSettled`, logged (`:56-60`) | Tab synced with `savedContent` (`:47`) |
| W8 | `templates.service.ts:116` `writeTextFile(absPath, '')` | Empty placeholder for missing template paths | No (only creates missing files) | `exists` check `:111` (TOCTOU, negligible) | Whole block caught (`:124-126`) | `refreshTree` only if created (`:121-123`) |
| W9 | `templates.service.ts:105` `create_folder` (Rust, recursive) | Folder create | n/a | Rust `ensure_safe_write_path` (`vault.rs:922-926`) | Caught by outer try (`:124`) | None |
| W10 | `auto-move.service.ts:81` `writeTextFile(config)` in `saveAutoMoveConfig`, `:75` `mkdir` (non-recursive) | Config write `.kokobrain/auto-move-rules.json` | No | Dir exists check | Logs and rethrows (`:83-86`) | None in slice |
| W11 | `file-icons.service.ts:98` `writeTextFile(placeholder)` in `ensureFolderNote` (directories only, not on the markdown path used by auto-move) | Folder-note creation | No | `exists` check (TOCTOU) | Not caught in this function | Upserts index (`:102`) |

Deletes: none in this slice. `deleteItem` / trash is not called by any slice file (`fs.service.ts:167`, not in scope).

Renames: only W3 (auto-move via `moveItem`, and user renames/moves through the same owner).

Rust side for the record: `rename_note` (`src-tauri/src/commands/vault.rs:1045-1063`) re-keys the index, emits `vault-index-updated`. `ensure_safe_write_path` (`vault.rs:862-874`) rejects relative paths and `..` for `create_note` / `create_folder` only, not for TS plugin-fs writes or renames (those are guarded by the capability scope, section 4).

---

## 3. Concurrency

Timers in the slice:
- Auto-move per-path debounce: `debounceTimers` Map (`auto-move.service.ts:21`), set at `:110-123`, cleared on re-save of the same path (`:111-112`), cleared in `resetAutoMove` (`:223-226`). The closure captures `filePath` and `content` at save time (`:95-96`, `:117`), not the live tab state. Fires `debounceMs` (3000 default) later.
- Editor autosave: body 2000 ms (`editor.service.ts:197`), frontmatter 500 ms (`:200`), mutually exclusive via `scheduleAutoSave` (`:213-221`); `saveAllDirtyTabs` cancels both (`:235-236`); retry 5 s on failure (`:192`).
- Canvas persist debounce: 300 ms (`CanvasInner.svelte:221`), flushed in `onDestroy` (`:230-233`) when `pendingPersist` (set at `:219`, reset only in the timer callback at `:223`).
- `markRecentSave` 15 s self-save window (`editor.hooks.ts:24-43`).
- Canvas undo/redo sets `syncing` and resets via microtask (`CanvasInner.svelte` keydown handler).

In-flight and interleavings that matter:
- `evaluateAndMove` awaits between `exists`, `mkdir`, `moveItem`, `setIconForPath`. Nothing serialises it against user saves, user renames, or the editor's `saveFileByPath`. A user rename or delete during the 3 s window makes the stale `filePath` point at nothing, or at a different file (lead L5a).
- `saveFileByPath(path)` captures `path` (`editor.service.ts:161-169`) before `await writeTextFile`. If `applyPathChange` renames the file during that await, the write recreates `path` (plugin-fs opens with create, WEB) and `markSavedByPath(path)` finds no tab (tab moved). Result: ghost note at the old path and the moved tab still dirty (lead L5b). Window is one write.
- `applyPathChange` ordering is documented as load-bearing (`path-change.service.ts:95-116`): tabs updated synchronously after `diskOp` before any await (`:132`). This protects the autosave timer only if the timer reads `tab.path` when it fires (it does, `saveDirtyTabs` at `:183-189`).
- `updateNoteFrontmatter` comment says callers must serialise writes per path (`frontmatter-write.service.ts:91-93`). Auto-move's icon write is not serialised with other icon writers (for example the picker) on the same closed note (INFER: low).
- Canvas `pendingPersist` is never cleared when the nodes effect re-runs from an external sync: the effect cleanup clears the timer (`CanvasInner.svelte:221-222` cleanup) while the flag stays true (lead L1b).
- KanbanView: `applyChange` sets `selfUpdate` latch (`KanbanView.svelte` ~ lines 83-89); the parse effect consumes it (`:66-72`). An external content change arriving while the board has unsaved local state re-parses and regenerates all lane and item IDs (`kanban.logic.ts:76-91`, `generateKanbanId`), so pending `editingItemId` state refers to vanished IDs (lead L9).

No locks or queues exist in the slice. The only serialisation is the `saveDirtyTabs` Promise.all and the per-path timer map.

---

## 4. Third-party behaviour checked

- WEB (fetched raw source, `https://raw.githubusercontent.com/tauri-apps/plugins-workspace/v2/plugins/fs/src/commands.rs`, summarised by a model because the page was chunked): `write_text_file` delegates to `write_file_inner`, opens the target with `OpenOptions` (defaults `write`, `truncate`, `create` all true when no options are given), then `write_all`. No temp file, no rename, no `sync_all`. `rename` calls `std::fs::rename` after `resolve_path` on both paths. `remove` is recursive only when `recursive: true`, using `remove_dir_all`. `resolve_path` resolves symlinks to a real path, denies on failure, and checks the scope against both the given path and the real path, allow only when `is_allowed(real_path)`.
- INSTALLED JS (READ): `node_modules/@tauri-apps/plugin-fs/dist-js/index.js` is v2.7.1 (`writeTextFile` at `:777-789` -> `invoke('plugin:fs|write_text_file')`; `remove` `:592-600`; `rename` `:619-630`). `node_modules/@tauri-apps/api/core.js:341` is `window.__TAURI_INTERNALS__.invoke` (v2.12.4).
- WEB (MDN RegExp dotAll, fetched): without the `s` flag, `.` does not match LF, CR, U+2028 or U+2029. `$` without `m` matches only at end of input (the second part is from general JS knowledge, the MDN page did not state it).
- From memory, not fetched: `std::fs::rename` overwrites an existing destination file on Unix.
- Capability file (READ): `src-tauri/capabilities/default.json`: `fs:allow-write-text-file`, `fs:allow-remove`, `fs:allow-rename`, `fs:allow-copy-file`, `fs:allow-mkdir` scoped to `$DOCUMENT/kokobrain-vaults/**` and `$HOME/kokobrain-vaults/**` (plus `.kokobrain/**`, and `$APPLOG/**` for write). The scope covers every vault under those folders, not only the open vault.
- CSP (READ): `src-tauri/tauri.conf.json:29` `script-src 'self' 'unsafe-eval'`, so `new Function` runs. `connect-src` limits network to listed hosts.
- Not checked: whether the app's own Rust commands (`create_note`, `rename_note`, `remove_note_from_index`) are restricted by a Tauri `AppManifest` in `build.rs`. `src-tauri/build.rs` only calls `tauri_build::build()` and has no `AppManifest` (READ), so Tauri's default (app commands allowed for the main webview) is the likely behaviour. Not verified against the Tauri docs.

---

## 5. Leads (hypotheses, ordered by data-loss impact)

Confidence: H = high in the code path, M = medium, L = low. None were reproduced (the task forbids builds and test runs). Known-issue matches are marked in section 6.

### L1 (H code path, M likelihood): canvas JSON written into the next tab when a canvas is left within 300 ms of an edit
- Chain: node change -> `$effect` at `CanvasInner.svelte:213-226` sets `pendingPersist = true` (`:219`) and a 300 ms timer (`:221`). The user clicks a markdown note or a FileNode header (`FileNode.svelte:56` -> `openFileInEditor` -> `addTab`/`setActiveIndex`, `editor.service.ts:116, 140`), or switches tab (`switchTab`, `editor.service.ts:250-252`). `activeIndex` changes synchronously. Svelte removes CanvasView and runs `onDestroy` (`CanvasInner.svelte:230-233`): `pendingPersist` is still true because the timer callback (which resets it at `:223`) never ran, so `persistChanges` runs -> `onJsonChange` -> `onContentChange` (`editor.service.ts:224-227`) -> `editorStore.updateContent` (`editor.store.svelte.ts:84-88`) writes `tabs[activeIndex]`, which is now the markdown note. The body autosave (`:226`, 2 s) writes the canvas JSON into the `.md` file.
- Scenario: drag a canvas node, then within 300 ms click the file header of another canvas node that opens a `.md`. The note on disk is replaced by canvas JSON about 2 s later.
- Recovery: depends on `file-history` snapshots (not checked). Editor content for that tab is overwritten in memory.
- Also L1b (M, lower impact): `CanvasInner.svelte:84-100` sync effect sets `nodes` to another canvas's flow state. The nodes effect cleanup (`:221-222`) clears the pending timer, so the last edit (up to 300 ms old) is dropped and never written to the first canvas. `pendingPersist` stays true, so a later destroy can flush the wrong canvas state (same mis-targeting risk as L1 for an unrelated later tab switch).
- Not covered by `.scratch/architecture-stability/issues/`.

### L2 (H code path, L-M likelihood): an unparseable `.canvas` file is replaced by an empty canvas on the first edit
- `parseCanvas` returns `createEmptyCanvas()` on JSON error (`canvas.logic.ts:40, 46-47`). `CanvasInner.svelte:71` derives `canvasData` from it. Opening the file shows a blank canvas without any error.
- Any edit calls `persistChanges` (for example `handleFileSelected` `:465-471`, or drag at `:157`). `flowToCanvas(nodes, edges, canvasData)` (`canvas.logic.ts:290`) builds the output from the empty original. `serializeCanvas` -> `onContentChange` -> autosave -> `writeTextFile` (`editor.service.ts:168`, truncating). The original bytes are gone unless file-history kept them.
- Scenario: a `.canvas` file with merge conflict markers, a truncated sync copy, or a hand-edit with a trailing comma. Open it, add one node, the file now has one node and nothing else.
- Source mode (`EditorView.svelte` `canvasSourceMode`) would show the raw text, but the default view does not signal the parse failure.

### L3 (H code path, M likelihood): kanban board edits silently delete every line the parser does not recognise
- `parseKanbanBoard` keeps only lines matching `HEADING_RE` (`kanban.logic.ts:4`, `^##\s+(.+)$`), `TASK_RE` (`:5`, `^-\s+\[([xX ])\]\s+(.*)$`) and the archive separator (`:6`). Everything else is dropped by the loop (lines ~76-111). Tasks before the first heading are dropped (`else if (currentLane)` at `:105`).
- `serializeKanbanBoard` (`:118`) writes only lanes, items, archive and settings. The first `applyChange` (KanbanView) writes that output to the tab and autosaves (`editor.service.ts:197, 226`).
- Dropped examples: paragraphs, `# Title`, `### Sub`, `* [ ]` or indented task bullets, `- [/]` / `- [-]` status checkboxes, `- [ ]` with no text after the bracket (`\s+` needs a character), tasks above the first heading.
- Scenario: the user adds a note paragraph under a lane in source mode, then drags a card on the board. The paragraph is gone 2 s later.
- L3b (H code semantics per MDN, L-M likelihood): CRLF files. `\r` ends each `split('\n')` line. `.` does not match `\r` (WEB), and `$` without `m` only matches end of input, so `HEADING_RE` and `TASK_RE` never match a line ending in `\r`. The parse returns zero lanes and zero items. The first board mutation (for example "add lane") then writes a board containing only the new lane over the file.
- Tests: `src/tests/lib/plugins/kanban/kanban.logic.test.ts` has round-trip tests (`:284`) but none for unrecognised lines or CRLF (grep, READ).

### L4 (H code path, M likelihood of the bug existing for picker-created nodes): canvas file and image nodes created from the picker store absolute paths, and the renderers prepend the vault path again
- `CanvasFilePicker.svelte:61` passes `file.path`. `file.path` is absolute: `FileNode.path` is documented "Absolute path on disk" (`src-tauri/src/commands/vault.rs:59`), and the fixture uses `/vault/note.md` (`src/tests/fixtures/tauri-api.fixture.ts:12`).
- `FileNode.svelte:40` builds `${vaultPath}/${filePath}`, and `canvas-image.service.ts:33-34` does the same. For an absolute `file`, the path becomes `/vault//vault/note.md`, so the preview shows "Could not load file" and the image fails.
- The unit tests assume vault-relative paths: `canvas-image.service.test.ts:136` (`'assets/pic.png'` -> `/vault/assets/pic.png`), `canvas.logic.test.ts:97, 375` (`'notes/test.md'`). No test covers the picker path. `FileNode.handleClick` (`:56`) would also pass the absolute path to `openFileInEditor`, which accepts absolute paths, so the click works while the preview does not.
- Display bug, no data loss. Confirm with one manual step (add a file node from the picker, look at the preview).

### L5 (M, mixed likelihood): auto-move acts on stale state and can move the wrong file
- L5a: `registerAutoMoveHook` captures `filePath` and `content` at save time (`auto-move.service.ts:95-96, 114-117`). Within the 3 s window, a user rename makes `moveItem(oldPath)` fail (`rename` ENOENT, rethrown at `fs.service.ts:244-246`, caught silently at `auto-move.service.ts:189-191`, no toast). If the user then creates a new note with the old name, the timer evaluates the stale record and moves the new file. Low likelihood.
- L5a2: the rule is evaluated on the save-time snapshot (`:152`), so an edit that removes the matching property within the window still moves the note. The on-disk content is not changed by a move, so no bytes are lost.
- L5b (M code, low likelihood): save races the move. `saveFileByPath` captures `path` before `await writeTextFile` (`editor.service.ts:161-168`). A rename landing inside that await recreates the old path (plugin-fs opens with create, WEB), and `markSavedByPath(path)` (`:169`) finds no tab, so the moved tab stays dirty. Result: a duplicate note at the old path with the same bytes, and the watcher indexes it as a new note.
- L5c (M, low likelihood): root-level unarchive produces a double-slash path. For a note at vault root in `archive/`, `{parent}` resolves to `''` (`auto-move.logic.ts:102-130`, slash stripping at `:129`). `destPath` becomes `${vaultPath}/` (`auto-move.service.ts:173`), `moveItem` builds `${vaultPath}//name` (`fs.service.ts:230`), and `rename`, `updateTabAfterRenameOrMove` and `rename_note` all receive the non-canonical path. Tabs and the Rust index may then hold a path that does not match the watcher's `vault/name` form (duplicate entries, stale tabs). INFER from string handling, not run.
- L5d (L): flip-flop between a user rule and the lifecycle unarchive rule. Each save moves the note back and forth (moves do not trigger saves, so no loop in one pass). Churn, no loss.
- L5e (L): the icon step's lossy-frontmatter check uses the stale `content` (`auto-move.service.ts:201`), so a note whose frontmatter became lossy after the save gets a toast from the writer instead of a silent skip. No loss.
- L5f (info): when the destination already holds that name, `moveItem` throws (`fs.service.ts:233`), auto-move swallows it (`:189-191`), no toast, the note stays put and every later save retries silently.

### L6 (M, path-safety and trust): queryjs user scripts can call plugin-fs IPC directly, and run automatically by default
- Scripts run with `new Function` (`kb-api.ts:360, 469`) in the main webview. The CSP allows `'unsafe-eval'` (`tauri.conf.json:29`). `window.__TAURI_INTERNALS__.invoke` is a global (`node_modules/@tauri-apps/api/core.js:341`), so a script can call `plugin:fs|remove` (recursive delete, bypasses trash), `plugin:fs|write_text_file`, or `plugin:fs|rename` on any path in the `$HOME/kokobrain-vaults/**` scope (capability file, `default.json`). This is outside the KBAPI surface, which has no write method (`kb-api.ts:67-341`).
- Default policy is `first-open` (`settings.store.svelte.ts:136`): a note with a queryjs block runs on first open per session without a click (`queryjs-block-widget.ts:106` policy switch).
- Scenario: a vault or note from an untrusted source with a queryjs block that calls `__TAURI_INTERNALS__.invoke('plugin:fs|remove', {path, options:{recursive:true}})` on the vault folder. Deletes happen on open, not through `moveToTrash`.
- The KBAPI `view()` path (`kb-api.ts:443-455`) only rejects a literal `..` and prefixes the vault, so script files stay under the vault string. Symlinks are resolved by the fs plugin scope check (WEB), so a symlink pointing outside the scope is denied.
- Whether app-defined commands such as `create_note` are callable from the script depends on Tauri's default (see section 4): not verified.
- This is a trust-model question for the owner, not a bug in the KBAPI contract.

### L7 (H code, M likelihood of the impact): non-atomic writes on the save path
- Every editor save (`editor.service.ts:168`), frontmatter closed-note write (`frontmatter-write.service.ts:149`), auto-move config (`auto-move.service.ts:81`), and template placeholder (`templates.service.ts:116`) uses plugin-fs `writeTextFile`, which truncates the target and writes in place (WEB, model summary of the upstream source). A crash, kill or power loss between truncate and write leaves a truncated note. Only `create_note` (W1) uses the temp-plus-rename helper (`utils/fs.rs:16-32`), and that helper does not fsync either.
- The canvas and kanban files are JSON or markdown saved by the same path, so the same truncation risk applies to every `.canvas` and `.kanban` save.

### L8 (L): kanban card preview cache keyed by card text
- `loadLinkedFileContent` caches by card text (`kanban.service.ts:44-50, 57-89`). A rename or move of the linked note is not a content invalidation, so the preview keeps the old body until a content change fires `clearLinkedContentCache` (registered at `boot.ts:36`). Stale preview only.

### L9 (L): external content change regenerates board IDs and replaces in-progress local state
- `KanbanView.svelte` parse effect (~ lines 66-72) replaces `board` on every external content change (except its own latch), and `generateKanbanId` gives new IDs (`kanban.logic.ts:15-17`). An open card edit keyed by the old `editingItemId` loses focus and any uncommitted text. Low confidence this loses saved data (the text was not committed); it is typed text lost silently.

### L10 (L, path-safety): auto-move rule destinations are not validated
- `resolveDestination` strips a leading slash (`auto-move.logic.ts:129`) but keeps `..`. A rule destination such as `../OtherVault` gives `destPath = ${vault}/../OtherVault` (`auto-move.service.ts:173`), `mkdir` recursive (`:177`) and `moveItem` (`fs.service.ts:228-248`). The scope check resolves the real path (WEB) and `$HOME/kokobrain-vaults/**` still matches the sibling vault, so a note can be moved into another vault folder. Requires the user to write such a rule (or an `archiveTo` in a type definition). Rust `ensure_safe_write_path` (`vault.rs:862-874`) is not on this path (`rename` and `mkdir` go through plugin-fs).

### Checked and not leads
- Templates name input: `..` is refused by Rust `ensure_safe_write_path` (`vault.rs:862-874`) on create. `openOrCreateNote` never overwrites an existing file (`note-creator.service.ts:86-89`).
- One-on-one: `openOrCreateNote` checks existence first and Rust `create_note` refuses existing paths (`vault.rs:896-898`), so no overwrite. `buildContent` throwing writes nothing (`note-creator.service.ts:101` runs before `create_note`).
- Canvas nodes round-trip unknown fields and unknown node types: `flowNodeToCanvasNode` spreads the original node (`canvas.logic.ts:186-215`).
- Kanban file creation uses unique names through `createFile`.
- `ensureTemplatesFolder` only creates missing files (`templates.service.ts:111-119`).

---

## 6. Known-issue matches (`.scratch/architecture-stability/issues/*.md`)

- Issue 34 (save dirty tabs before vault switch): resolved, related to `saveAllDirtyTabs` (`editor.service.ts:234-247`), which this slice calls indirectly. Not a lead here.
- Issue 20 (`AutoMoveSettings` moved to `core/settings/settings.types.ts`): resolved, structural only.
- Issue 38 (type disappears after edit, auto-move `{type}` casing): resolved, touches `buildNoteRecord`. Not a lead here.
- Issue 06 (pure-logic guard): lists `canvas-image` and xyflow allowlist, resolved (renamed to `.service.ts`).
- No filed issue covers L1, L2, L3, L4, L5, L6, L7 or L10. These are new in this audit.

---

## 7. Not verified (risk the reviewer must know)

- No test or app run. Every "H code path" lead is from reading, not reproduction. L1 and L3 each need a 2-minute manual or unit repro.
- The WEB summary of plugin-fs `commands.rs` is a model summary of a chunked page, not a verbatim quote. The write-in-place and no-fsync claims match the code paths I read in `rename`/`remove` but should be confirmed against the source before filing.
- Whether `file-history` keeps snapshots that could recover L1, L2 or L3 was not checked (outside this slice).
- Svelte 5 effect teardown ordering in L1b and the `onDestroy`-versus-`activeIndex` ordering in L1 are inferred from Svelte 5 semantics, not run.
- Tauri default for app commands callable from a webview (L6) not checked against docs.
- Watcher behaviour on `.canvas` / `.kanban` files, and the trash path, are outside this slice.
