# Review: feature-writers (kanban, canvas, one-on-one, templates, queryjs, auto-move, deep links, quick capture, todoist, type-definitions)

Senior review of `scout-plugin-writers.md` and `scout-deep-link.md`. Read-only: no repo file edited except this one, no cargo/pnpm/vitest/playwright run. Line numbers are from the working tree at `e9065422`.

Legend: READ = read in code. INFER = reasoning from code, not run. FETCHED = official upstream source fetched by URL.

## Third-party sources fetched

- FETCHED `https://raw.githubusercontent.com/tauri-apps/plugins-workspace/v2/plugins/fs/src/commands.rs`: `write_text_file` forwards to `write_file_inner`. With no options it opens with `write: true, truncate: true, create: true`, then `write_all`. No temp file, no rename, no `sync_all`. Every `writeTextFile` below truncates in place.
- FETCHED `https://raw.githubusercontent.com/tauri-apps/plugins-workspace/v2/plugins/deep-link/src/lib.rs`: on macOS `RunEvent::Opened` emits `deep-link://new-url` and then stores the URLs for `get_current`. No dedupe guidance.
- READ (installed, in repo) `node_modules/@xyflow/svelte` 1.7.0: `store/index.js:39-76` `updateNodeInternals` assigns a new `store.nodes` array after measuring; `:162` `addSelectedNodes` assigns a new `store.nodes` array; `components/NodeWrapper/NodeWrapper.svelte:174-181,277` selects a node from the wrapper's `onclick`.

---

## Findings (most severe first)

### F1. Canvas `onDestroy` flush writes canvas JSON into the tab that just became active [corruption / data-loss, high confidence in the chain]

READ chain:
- `CanvasInner.svelte:212-226`: every change to `nodes` with `syncing` false sets `pendingPersist = true` and arms a 300 ms timer. `pendingPersist` is reset only inside the timer callback (`:223`).
- `CanvasInner.svelte:230-234`: `onDestroy` runs `persistChanges(nodes, edges)` when `pendingPersist` is set.
- `persistChanges` -> `persistWithoutHistory` (`:104-109`) -> `onJsonChange(json)`. The prop is `onContentChange` (`EditorView.svelte:81`).
- `editor.service.ts:224-227` `onContentChange` -> `editorStore.updateContent(content)` + `scheduleAutoSave('body')`.
- `editor.store.svelte.ts:84-88` `updateContent` writes `tabs[activeIndex].content`. There is no path check.
- `CanvasView` is mounted only while `isCanvasTab` is true (`EditorView.svelte:36,80-81`). The component is destroyed BECAUSE `activeIndex` moved to a non-canvas tab, so by the time `onDestroy` runs, `tabs[activeIndex]` is the other note.
- That tab is now dirty (`content` is canvas JSON, `savedContent` is the note). 2 s later `saveDirtyTabs` -> `saveFileByPath` -> `writeTextFile(path, json)` (`editor.service.ts:183-194,161-178`) replaces the note on disk.

What sets `pendingPersist` (READ in xyflow): selecting a node (`addSelectedNodes` always assigns a new array), the post-mount measurement pass (`updateNodeInternals`), dragging, and text edits. `bind:nodes` (`CanvasInner.svelte:580`) carries each of these into the effect.

Most likely user path (INFER from the READ handlers): on a canvas, click the header button of a file node that is not selected yet, when the target note is not already open.
- `FileNode.svelte:66` `onclick={handleClick}` -> `openFileInEditor(data.file)` (`FileNode.svelte:55-57`). It suspends at `await readTextFile` (`editor.service.ts:124`).
- The click bubbles to the xyflow node wrapper `onclick` -> `handleNodeSelection` -> new `nodes` array -> the effect sets `pendingPersist = true`.
- The read resolves -> `addTab` (`editor.service.ts:140`) -> canvas destroyed -> `onDestroy` puts the canvas JSON into the newly opened note's tab -> autosave writes it over the note.

Other triggers inside the 300 ms window: Ctrl+Tab from a canvas to a markdown or kanban tab right after opening the canvas (measurement pass), or closing the canvas tab (`removeTab` moves `activeIndex` to a neighbour, `editor.store.svelte.ts:71-81`). If the newly active tab is virtual, the JSON lands in a tab that is never saved, so nothing is harmed.

Related lost edit (READ): switching from canvas A to canvas B keeps the same component. The sync effect (`:85-98`) assigns `nodes`, and the nodes effect cleanup (`:225`) clears A's pending timer while `pendingPersist` stays true. A text edit made in A within the last 300 ms is never written.

Recovery: file history snapshots only the content of each save (`file-history.service.ts:190-197`, after-save observer). The note's earlier bytes can be recovered only if the app saved that note within the 7-day retention (`settings.store.svelte.ts:94-97`). A note last written by another tool has no snapshot.

Known issue: none (the destroy flush came from `c3ab02d4 fix(canvas): flush pending persist on component destroy`). Not reproduced.

### F2. A deep link to another vault is always dropped when a vault is already open [data-loss of URL content, high confidence]

READ chain:
- `deep-link.service.ts:163-166`: `deepLinkStore.setPendingAction(action)`, then `await switchVault(resolvedPath)`.
- `vault.service.ts:18-22`: `switchVault` -> `vaultStore.open(path)`.
- `+layout.svelte:65-78`: an `$effect` on `vaultStore.path` calls `initializeVault(path)`.
- `app-lifecycle.service.ts:172-188`: when the previous vault finished init (`unsubscribeFileChange` was set at `:494`), `initializeVault` awaits saves and then calls `teardownVault()`.
- `teardownVault` -> `resetDeepLink()` (`app-lifecycle.service.ts:641`) -> `deepLinkStore.reset()` sets `pendingAction = null` (`deep-link.store.svelte.ts:33-35`).
- Step 8 `executePendingAction()` (`app-lifecycle.service.ts:503`) -> `consumePendingAction()` returns null -> silent return (`deep-link.service.ts:329-331`).

Scenario: vault "Personal" is open. A Shortcut or web clipper fires `kokobrain://new?vault=Work&name=Inbox&append=true&content=<clip>`. The app switches to Work, the clip is never written, and no toast is shown. When the content came only from the URL, it is gone. Only a cold start (no fully initialized previous vault) keeps the slot.

Tests: `deep-link.service.race-audit.test.ts:91-99` and `deep-link.service.test.ts:1281-1290` call `executePendingAction` directly after `setPendingAction`. Neither runs `initializeVault`, so they miss the reset. Known issue: none (34 covers dirty tabs on a switch, not this).

### F3. Silent `new` without a mode flag overwrites an existing note, including with empty content [data-loss, high confidence]

READ:
- `deep-link.service.ts:309-315`: the `silent` create branch does `mkdir` + `writeTextFile(fullPath, content)` with no `exists` check.
- The non-silent branch goes through `openOrCreateNote`, which never overwrites (`note-creator.service.ts:86-89`). The types document `overwrite` as the flag that replaces an existing file (`deep-link.types.ts:35`) and `silent` only as "without opening" (`:29`).
- `resolveContent` returns `''` when there is no `content` and the clipboard is empty or non-text (`deep-link.service.ts:214-224`). `writeTextFile(path, '')` truncates the note to zero bytes (FETCHED truncate).
- This branch does no editor sync. A clean open tab is reloaded by the watcher. A dirty open tab writes its old buffer back on the next autosave, which loses the URL content instead.

Scenario: `kokobrain://new?vault=Work&name=Journal&silent=true&clipboard=true` with an image on the clipboard. `Journal.md` becomes empty. `notifyAfterSave` (`:314`) snapshots the empty content, not the old one.

Known issue: none.

### F4. Append / prepend / overwrite / daily deep links throw away unsaved typing in the open tab [data-loss, high confidence]

READ:
- The merge base is read from disk, not from the tab: `deep-link.service.ts:257,276`, `deep-link-actions.ts:54`.
- After the write, `syncExternalContentToEditor(path, newContent, true, 'none')` (`deep-link.service.ts:262,281,298`, `deep-link-actions.ts:63`) -> `updateTabContentByPath` sets both `content` and `savedContent` (`editor.store.svelte.ts:130-136`). The tab turns clean, holding the disk-derived text.
- `executeDailyAction` first calls `openOrCreateDailyNote()` (`deep-link-actions.ts:37`), so the daily note is usually the open, focused tab.

Scenario: the user is typing in today's daily note. Within the 2 s autosave window, a Shortcut runs `kokobrain://daily?vault=Work&append=true&clipboard=true`. The typed text disappears from the editor and is never written.

The race-audit test header (`deep-link.service.race-audit.test.ts:1-8`, "Bug 3.5") fixed the opposite direction (a stale tab clobbering the deep-link write). This direction is not covered. Known issue: none.

### F5. Any kanban board action deletes every line the parser does not recognise [data-loss, high confidence in code, medium likelihood]

READ:
- `kanban.logic.ts:61-109` keeps only these:
  - `## heading` lines (`HEADING_RE`, `:4`)
  - `- [ ]` / `- [x]` lines under a lane (`TASK_RE`, `:5`)
  - the first `---` (`:6,69`)
  - the settings block (`:7`)
- `serializeKanbanBoard` (`:118-145`) writes only those back.
- `KanbanView.svelte:79-90` `applyChange` sends the serialized board to `onContentChange` on every card or lane action. Autosave writes it 2 s later.

What a board action deletes:
- Paragraphs, `#`/`###` headings and indented or continuation lines.
- `- [/]` and `* [ ]` items.
- Tasks above the first lane.
- CRLF files: `.` and `$` (no `m` flag) do not match before `\r`, so every heading and task line fails and the board parses empty. The first action then writes a board with only the new change.
- A YAML frontmatter `---` at line 1 switches the parser to archive mode (`:69-72`). Every lane heading is skipped (`:78-82`) and all items become archive, so one action flattens the board into the archive and drops the frontmatter.

Nothing is written on open: there is no write in the parse effect (`KanbanView.svelte:69-76`). Loss needs one board action after a source-mode or external edit. Recovery: a source-mode edit saved by the app has a history snapshot, an externally written file does not. Known issue: none.

### F6. An unparseable `.canvas` opens as an empty canvas, and the first edit overwrites the file [data-loss, high confidence in code, low likelihood]

READ:
- `canvas.logic.ts:36-49` returns `createEmptyCanvas()` on any JSON error or non-object, with no signal to the UI.
- `CanvasInner.svelte:71` derives `canvasData` from it. Adding a node (`:465-471`, `:542-567`) calls `persistChanges` -> `flowToCanvas(..., canvasData)` -> JSON with only the new node -> autosave -> truncating write.

Scenario: a canvas with a sync-conflict marker or a trailing comma. The user sees a blank canvas, adds a card, and the original nodes are gone. A pure open writes nothing (no nodes, so no measurement pass, INFER from xyflow `updateNodeInternals`). Known issue: none.

### F7. Composer text is discarded when the main window cannot write it [data-loss, high confidence, low-medium likelihood]

READ:
- `routes/composer/+page.svelte:27-50` `handleSave` calls `submit_composer_capture`. On success or IPC error alike it then calls `dismiss()`, and `resetForShow` clears `text` on the next show (`:52-58`).
- Rust `submit_composer_capture` (`src-tauri/src/quick_capture/commands.rs:349-365`) only emits `qc:capture-detected`. There is no acknowledgment.
- The main window drops the payload when no vault is open (`quick-capture.service.ts:85-91`) or when the write throws (`deep-link.service.ts:203-206`). Both only toast in the main window, which may be hidden.

Scenario: compose a note with no vault open (or the write fails). "Saved" flashes, the popover closes, and the note never exists. The text was the only copy. Known issue: none.

### F8. Root-level lifecycle unarchive moves the note to a `vault//name.md` path [stale-state, high confidence in the string, medium on the downstream effect]

READ:
- `type-lifecycle-rules.ts:48-55` emits an unarchive rule with destination `{parent}`.
- For a note archived from the vault root (`vault/_archive/x.md`), `resolveDestination` sets `parent = ''` (`auto-move.logic.ts:113-114`) and returns `''` (`:129`).
- `isAlreadyInDestination` is false (`'_archive' !== ''`, `:68-80`).
- `destPath = vault + '/'` (`auto-move.service.ts:173`). `moveItem` builds `${targetDirPath}/${fileName}` = `vault//x.md` (`fs.service.ts:228-230`).
- `applyPathChange` (`path-change.service.ts:117-171`) passes that string unchanged to `updateTabAfterRenameOrMove` and `call('rename_note')`. Rust re-keys by exact string (`commands/vault.rs:1001-1019`).

INFER effects:
- The open tab and the Rust `VaultIndex` key are `vault//x.md`, while the file tree and the watcher use `vault/x.md`.
- A later tree rename or delete of `vault/x.md` will not match the tab (`findTabIndex` compares strings). The tab keeps the old path, and its next autosave recreates `vault//x.md` = `vault/x.md` at the old name: a ghost duplicate after a rename, a resurrected note after a delete.
- The watcher's incremental upsert of `vault/x.md` can add a second index entry for the same file (duplicate backlinks or query rows) until a full rescan.

Trigger: any type with `archiveTo: {folder}/<seg>` whose members live at the vault root, with `_archived` set back to false. Known issue: none.

### F9. Deep-link `overwrite` can replace any file in the vault, including `.kokobrain` app data and binaries, without confirmation [security, high confidence on the write]

READ:
- `deep-link.service.ts:292-306` writes unconditionally.
- `resolveFilePath` adds `.md` only when the last segment has no dot (`utils/path.ts:46-50`). So `name=.kokobrain/todoist-sent.json&overwrite=true&content=[]`, or `name=attachments/a.png&overwrite=true`, replaces the file.
- No confirmation exists anywhere in `handleDeepLinkUrl` / `resolveAndDispatch` (`:118-169`). Any local process, or a web page once the browser has been allowed to open `kokobrain://`, can truncate any note it can name.

`overwrite` is a documented feature (`deep-link.types.ts:35`). The finding is the missing confirmation and the reach beyond notes. Owner's call. Known issue: none.

### F10. A deep-link name that normalizes to the vault root writes a sibling `.md` outside the vault [path-safety, high confidence in code, low impact]

READ: `utils/path.ts:41-43` accepts `normalized === base`. Then `:46-50` appends `.md` to the vault folder name.

Scenario: `name=.` (or `name=..%2FWork` for vault `Work`) with `silent` or `overwrite` writes `<parent>/Work.md`. The plugin-fs scope `$HOME/kokobrain-vaults/**` (`src-tauri/capabilities/default.json`) still matches it. The `open` action resolves the same way (read-only). Known issue: none.

### F11. Canvas file and image nodes from the picker or a drop store absolute paths, which the renderers prefix with the vault again [minor, display only, medium-high confidence]

READ:
- `CanvasFilePicker.svelte:61` passes `file.path`, which is absolute (`file-entries.logic.ts:21`). The same goes for drag text (`CanvasInner.svelte:545`).
- `FileNode.svelte:40` and `canvas-image.service.ts:33-34` build `${vault}/${path}` = `/vault//vault/x.md`. The preview shows "Could not load file" and the image fails.
- The click still opens the note (absolute path), but that click is also the F1 trigger.

No data loss. The `.canvas` file also loses portability (absolute paths). Known issue: none.

### F12. The Todoist sent-task store is overwritten with a partial list after any failed read [minor / corruption of app data, medium confidence]

READ:
- `todoist.service.ts:103-118` `loadSentTasks` returns `[]` on any read or parse error.
- `initTodoist` (`:238-244`) stores it.
- `sendTaskToTodoist` (`:223-224`) and `syncTodoistTasks` (`:288`) then `saveSentTasks` the store list with a truncating write (`:123-131`, FETCHED).

A torn JSON file (from an earlier interrupted in-place write) therefore loses every older record. `isSent` then returns false, and those tasks can be sent twice. Not note content. Known issue: none.

### F13. The quick-capture clipboard dedupe anchor advances before the capture is written [minor, high confidence, no content lost]

READ: `quick_capture/commands.rs:85-95` sets `*last_signature` while it builds the payload. The frontend drops it with no vault (`quick-capture.service.ts:85-91`) or on a write error. Pressing the shortcut again on the same clipboard returns an empty batch (`commands.rs:86-88`).

The text is still on the clipboard, but it cannot be captured until the clipboard changes. Known issue: none.

### F14. queryjs scripts run unsandboxed with direct plugin-fs access, and auto-run on first open [security / trust model, known by design]

READ:
- `kb-api.ts:360` uses `new Function` in the main webview, which the CSP allows (`'unsafe-eval'`, `tauri.conf.json:29`).
- `window.__TAURI_INTERNALS__.invoke` is global, and the capability grants `fs:allow-remove` / write / rename over `$HOME/kokobrain-vaults/**`.
- The default policy is `first-open` (`settings.store.svelte.ts:136`).

A note from an untrusted vault can delete files on open, bypassing Trash. ADR 0010 (`docs/adr/0010-queryjs-kb-api-caching.md:57,70`) rejected a Worker sandbox, so this is a known trade-off. It is listed here so the owner sees the reach; not filed.

### F15. `renameType` can drop keystrokes typed during its per-tab write [minor, medium confidence, ms window]

READ: `type-definitions.service.ts:215-225` computes `updated` from `tab.content`, awaits `writeTextFile`, then calls `syncExternalContentToEditor(..., true, 'none')`. That replaces the tab content (`editor.store.svelte.ts:130-136`), so keystrokes typed during the IPC round trip are lost. A throw midway leaves later tabs and the Rust propagation undone. The toast says so (`:227-231`). Known issue: none.

---

## Scout leads not kept as findings

- Auto-move stale-path L5a (rename, then a new note with the old name within 3 s): the chain is real, but it needs an unlikely sequence. The common case (a user moves the note within 3 s) only makes `moveItem` fail with ENOENT, which is swallowed (`auto-move.service.ts:187-192`). No loss.
- Auto-move save/move race L5b: needs a save to land in the same few ms as the move's `rename`. Outcome is a duplicate, not a loss. Not kept.
- Auto-move icon loop: `updateNoteFrontmatter` returns early when nothing changes (`frontmatter-write.service.ts:121-122`), so the per-save icon write does not loop.
- Auto-move `..` in a user-authored destination, or a `{status}`/`{type}` value with `../` from note frontmatter: the string reaches `mkdir`/`rename` unvalidated (`auto-move.logic.ts:117-130`). Whether the plugin-fs scope check normalizes or rejects `..` for a not-yet-existing path was not verified, so this is not filed. It needs a rule that uses those variables.
- Cold-start double delivery (deep-link L7): FETCHED confirms that macOS both emits and stores the URL. At true cold start the emit precedes JS listener registration (INFER). `getCurrent` would re-deliver the last URL only if the `(app)` layout re-mounted (webview reload). Not reproduced, not kept.
- `.view` read-modify-write overlap (deep-link L14): `RailNoteList.svelte` was not read in full. Not kept.

## Paths checked and found safe

- `openOrCreateNote` never overwrites: `exists` at `note-creator.service.ts:86`, and Rust `create_note` refuses an existing path (`commands/vault.rs:895-898`) and `..` (`:862-874`). This covers one-on-one (`one-on-one.service.ts:66-96`), templates (`templates.service.ts:54-67`), the non-silent deep-link `new` (`deep-link.service.ts:316-322`) and the daily note creation.
- Template-picker names with `../`: refused by Rust `ensure_safe_write_path` through `create_folder` / `create_note`.
- `ensureTemplatesFolder` writes `''` only to missing paths (`templates.service.ts:111-119`). Errors are caught and logged (`:124-126`).
- Quick-capture writes never overwrite: `resolveUniqueCapturePath` (`deep-link-actions.ts:76-88`) plus a millisecond filename.
- Deep-link writes reach the index owner: every branch calls `notifyAfterSave`, which calls `applyNoteChange({source:'save'})` (`editor.hooks.ts:67-81`). Same for the daily action and capture (`deep-link-actions.ts:64,174`). `renameType` calls `applyNoteChange` directly (`type-definitions.service.ts:224`).
- Deep-link path traversal outside the vault (beyond the F10 root-sibling case): rejected by `utils/path.ts:41-44`.
- Deep-link URL-vs-URL read-modify-write is serialized by `dispatchQueue` (`deep-link.service.ts:23-33`).
- Auto-move collisions: `moveItem` refuses an existing target (`fs.service.ts:233`). Auto-move swallows the error (`auto-move.service.ts:187-192`), so nothing is overwritten.
- Auto-move timers are cleared on vault teardown (`auto-move.service.ts:216-229`), so no move runs against the next vault.
- Auto-move icon write on an open tab keeps unsaved body edits and restores on failure (`frontmatter-write.service.ts:124-133`). On a closed note it uses `create:false` (`:147-149`).
- Kanban creation goes through `createFile` -> `create_note` (`kanban.service.ts:17-19`). Kanban writes nothing on open (`KanbanView.svelte:69-76`), and the no-op latch guard is in `:87`.
- KBAPI exposes no write method (`kb-api.ts` public surface, scout-verified). `resolveScriptPath` rejects `..`.
- `applyPathChange` updates the tab before any await, so a pending autosave writes to the new path (`path-change.service.ts:127-130`).

## Known-issue cross-check

`.scratch/architecture-stability/issues/` was checked by keyword (deep-link, pending, canvas, kanban, auto-move, todoist, composer, capture). Matches:
- 34 is related to F2's switch path but covers dirty tabs, not the pending slot.
- 67 added E2E deep-link specs for open/new/daily/capture in the same vault only.
- 54 and 63 (view cache) are resolved and unrelated to F1-F15.

No issue covers F1-F13 or F15. F14 is a known trade-off per ADR 0010.

## Not verified

- No repro was run (builds and tests are forbidden here). F1 depends on Svelte 5 running `onDestroy` after the `activeIndex` change. That order is forced, because the change is what destroys the branch, but it was not observed at runtime.
- Whether the MarkdownEditor shows the JSON in F1 depends on the mount-vs-destroy order. The disk write does not depend on it.
- F8's duplicate index entry depends on watcher self-save handling in another slice.
- plugin-fs scope handling of `..` in not-yet-existing paths.
