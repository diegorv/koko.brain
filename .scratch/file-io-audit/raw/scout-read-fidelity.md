# Scout report: read fidelity (slice "read-fidelity")

Read-only map. No repo files edited; no cargo, pnpm, vitest or build run. Labels: **READ** = seen in code or fetched source; **INFER** = reasoning from READ facts; **HYP** = hypothesis, not reproduced.

Third-party sources fetched (GitHub raw, tag `fs-v2.7.1` matching `pnpm-lock.yaml` / `Cargo.lock` 2.7.1, and the `v2` branch head for cross-check):
- `tauri-apps/plugins-workspace` `plugins/fs/guest-js/index.ts` (readTextFile, writeTextFile)
- `tauri-apps/plugins-workspace` `plugins/fs/src/commands.rs` (read_text_file, write_file_inner, OpenOptions)
- `codemirror/state` `src/text.ts`, `src/state.ts`, `src/change.ts` (line split regex, lineSeparator facet, DefaultSplit)
- MDN: `TextDecoder` constructor (ignoreBOM, fatal defaults); `Regular_expressions/Wildcard` (dot excludes line terminators)

---

## 1. Entry points and call chains (reads)

### 1a. Open a note in the editor (main read path)
1. UI click / command / link → `openFileInEditor(filePath)`. Callers: `FilesNavigator.svelte:109,211`, `commands.ts:87,109,120`, `note-creator.service.ts:128`, `kb-api.ts:428`, `BacklinksPanel.svelte:100`, others (READ, grep).
2. `editor.service.ts:98` → binary gate `isBinaryFile` (`editor.service.ts:108-112`, list at `fs.logic.ts:79-88`, predicate `fs.logic.ts:95-97`). Denylist of extensions only.
3. Existing tab → `setActiveIndex` and return (`editor.service.ts:114-120`).
4. Else `await readTextFile(filePath)` (`editor.service.ts:124`) → `@tauri-apps/plugin-fs` → IPC `plugin:fs|read_text_file` → Rust `read_file_inner` → `read_to_end` raw bytes (fetched 2.7.1 `commands.rs`). **Decoding is in JS**: `new TextDecoder('utf-8').decode(bytes)` with no `fatal`, no `ignoreBOM` (fetched 2.7.1 `guest-js/index.ts`).
5. Re-check after await (`editor.service.ts:128-133`), then `addTab({ path, name, content, savedContent: content, fileType })` (`editor.service.ts:140`). `content === savedContent`, so the tab is clean.
6. Error: `catch` logs and toasts (`editor.service.ts:144-147`). No vault-generation check: a read in flight across a vault switch can `addTab` after `resetEditor` (INFER from absence of guard).

### 1b. CodeMirror mount and tab switch
- `MarkdownEditor.svelte:107-108` `EditorState.create({ doc: tab.content, ... })`. No `dispatch` on creation, so `updateListener` does not fire.
- Tab-switch effect `MarkdownEditor.svelte:170-275`: doc replace `view.dispatch({changes: full, annotations: addToHistory(false)})` at `:230-235`, wrapped by `isTabSwitching` (`:225-237`). The listener checks the flag (`editor-extensions.ts:171`), so no `onDocChanged`.
- External content sync `MarkdownEditor.svelte:311-337`: `lastSeenSignal` skips the first run; dispatch at `:329-333` wrapped by `isExternalEdit`.
- Keystrokes: `editor-extensions.ts:170-190`, `onDocChanged(update.state.doc.toString(), fmChanged)` at `:188` → `onContentChange` (`editor.service.ts:224-227`) → `editorStore.updateContent` (`editor.store.svelte.ts:84-88`, writes `tabs[activeIndex]`, not by path).

### 1c. Watcher-driven reload of clean tabs
1. Rust `watcher.rs` debounce 500 ms (`run_debounce_loop` `watcher.rs:152-230`, `DEBOUNCE_MS` `:34`); no event-kind filter (`watcher.rs:253-264`); ancestor collapse `filter_ancestor_paths` `:88-99`; hidden-dir filter `is_inside_hidden_dir` `:71-79`.
2. `fs.watcher.ts:198-200` `on('vault-files-changed')` → `handleChangedPaths` (`fs.watcher.ts:122-187`) (tree refresh; notifies listeners).
3. `onFileChange` listener → `pendingWatcherPaths` → 300 ms debounce → `runWatcherBatch` (`app-lifecycle.service.ts:481-493`, `serializeWithRerun` from `utils/inflight.ts`).
4. `reloadExternallyChangedTabs(paths)` (`app-lifecycle.service.ts:486`, body `editor.service.ts:375-404`): eligibility check for clean tabs (`:380`), parallel `readTextFile` (`:386`, `allSettled`), then apply: skip if tab gone or `diskContent === savedContent` (`:398`), else `syncExternalContentToEditor(path, disk, true, 'none')` (`:401`).
5. Then `rebuildAllIndexes(paths)` (`app-lifecycle.service.ts:487`, `watcher-handler.service.ts:30-79`).

### 1d. Index / search reads (same bytes, different decoder)
- `read_files_batch` (`commands/files.rs:24-84`): `canonicalize` (`:37`), `starts_with(vault_root)` (`:49`), `fs::read_to_string` (`:63`). Strict UTF-8; BOM kept (`read_to_string` keeps U+FEFF); per-file error becomes `content: None`.
- Consumers: watcher incremental path `watcher-handler.service.ts:86-116` (see Lead L6), search `search.service.ts:28`.
- Full scan `collect_v2_entries` `commands/vault.rs:182-190` uses `read_to_string`; failure logged and skipped. Cached scan `vault.rs:1302` (re-read, keep cached) and `:1320` (new file, skip).
- Task scans `vault.rs:632` (skip on error). Type-rename scan `vault.rs:357`.
- `index.rs:164` `read_to_string` (index rebuild candidate read, not traced further).

### 1e. Other read-then-use sites (not the editor)
- `trash.service.ts:248` restore index read (no write; `indexRestoredNotes` `:236-256`).
- `file-history.service.ts:28` reads current bytes for diff (no write here).
- `deep-link-actions.ts:54,134`, `deep-link.service.ts:257,276`: read existing then write (read-modify-write; not traced to the write path).
- `event-calendar.service.ts:993` `tab ? tab.content : readTextFile(path)`; `frontmatter-icon.service.ts:75` same pattern; `link-updater.service.ts:35` same pattern.
- `note-creator.service.ts:55` template read (falls back to inline on error, `:52-58`).
- `settings.service.ts:44` settings read; `auto-move.service.ts:49`; `file-icons.service.ts:50`; `bookmark-migration.service.ts:54`: JSON/text read, parse, act.
- `canvas-image.service.ts:35` `readFile` (binary, blob URL; no write).
- `FileNode.svelte:41` canvas file node text read.
- `editor-host.ts:68-70` `readNote` → `readTextFile` (CodeMirror host; no write).
- Kanban / canvas / collection views receive `editorStore.activeTab.content` raw (`EditorView.svelte:79-83`).

### 1f. Read gate summary
- Only `isBinaryFile` (denylist, `fs.logic.ts:79-88`) gates the editor. No size limit anywhere in the read path (READ: `editor.service.ts:98-148`, `files.rs:24-84`).

---

## 2. Disk writes, deletes and renames in this slice

All write sites below were located by grep, with the bodies read where the slice touches them.

| # | Site | Mechanism | Preconditions | Error handling | State on success / failure |
|---|---|---|---|---|---|
| W1 | `saveFileByPath` `editor.service.ts:161-178` (`writeTextFile` `:168`) | plugin-fs `write_text_file`: `OpenOptions truncate:true, create:true`, `write_all` in place, **no temp file, no rename** (fetched 2.7.1 `commands.rs`) | tab exists, not virtual, `isTabDirty` (`editor.logic.ts:44-46`) | catch: `error` + toast, return false (`:173-176`) | success: `markSavedByPath` (`editor.store.svelte.ts:91-96`), `notifyAfterSave` (`:170`). failure: `savedContent` unchanged, tab stays dirty; retry via `saveDirtyTabs` in 5 s (`:192`). A partially written file is left on disk (INFER from truncate-then-write). Writing to a path deleted externally recreates it (INFER from `create:true`). |
| W2 | `saveDirtyTabs` `:183-194` | calls W1 per dirty tab in `Promise.all`; retry `setTimeout` `:192` | at least one dirty tab | any failure schedules retry | retry timer is not cleared by `resetEditor` (`:412-417` cancels only the two debounced timers) |
| W3 | `saveAllDirtyTabs` `:234-247` | cancels debounced timers, then W1 for every dirty tab | none | returns failed paths | does **not** await an autosave already in flight (`saveDirtyTabs` is not awaited here). Callers: `vault.service.ts:19`, `app-lifecycle.service.ts:180`, `tauri-listeners.service.ts:55` (READ, grep). |
| W4 | `syncExternalContentToEditor` `:70-91` | **in-memory only** (`updateTabContentByPath` sets `content` and `savedContent`, `editor.store.svelte.ts:130-136`) | called after an external write or read | none | makes tab clean; sets `savedContent` to whatever was passed |
| W5 | `toggle_task_status_inner` `commands/vault.rs:664-690`: read `:669`, `write_atomic` `:683` (only when content changed) | Rust `write_atomic` (temp + rename, `utils/fs.rs:16-32`) | file read from **disk**, not from the editor | `Err` string to TS | TS `toggleTask` `tasks.service.ts:100-121`: on changed result calls `syncExternalContentToEditor(path, result.updatedContent, true, 'none')` at `:114` (overwrites tab `content` and `savedContent`) |
| W6 | `propagate_type_rename_inner` `vault.rs:342-380`: read `:357`, `write_atomic` `:370` | Rust `write_atomic` | disk content; no open-tab check | logs and continues | open tabs of those files are **not** synced here (TS caller not located in this slice) |
| W7 | `updateLinks`-style rewrite `link-updater.service.ts:33-49`: `writeTextFile` `:39`, sync `:47` | plugin-fs (non-atomic) | dirty tab: uses `openTab.content` (`:35`); clean/no tab: `readTextFile` (`:35`) | `allSettled`, logs | sync with `markSaved=true` `:47` |
| W8 | `commitChanges` (properties panel) `properties.service.ts:78-96`; `dispatchMetaBindUpdate` `widgets.ts:754-768` | **no disk write**; CodeMirror dispatch / store update; autosave later | unparseable guard only (`isFrontmatterUnparseable`, `properties.service.ts:82`, `widgets.ts:756-759`) | toast / refuse | 500 ms frontmatter autosave arms (`syncExternalContentToEditor(..., 'frontmatter')` `:95`) |
| W9 | `loadSettings` `settings.service.ts:166-175`: catch sets defaults and calls `saveSettings(vaultPath)` at `:172` | plugin-fs write | JSON parse of user file failed (`:54`) | inner catch logs | **overwrites the unparseable settings.json with defaults**; no backup seen |
| W10 | `auto-move.service.ts:54-62`: parse failure sets `DEFAULT_CONFIG` in memory only | none on load | parse failure | logs | next `saveAutoMoveConfig` (`:69`) would persist defaults over the broken file (INFER; `saveAutoMoveConfig` body not read in full) |
| W11 | `KanbanView.svelte:79-90` `applyChange` → `serializeKanbanBoard` → `onContentChange` | serialize whole board; editor autosave | any card mutation | none | rewrites whole file from parsed lanes (see L8) |
| W12 | `CanvasInner.svelte:104-108` `persistWithoutHistory` → `serializeCanvas` (`canvas.logic.ts:52-54`, `JSON.stringify(...,'\t')`) | editor autosave | node change, or nodes effect not suppressed (`:212-226`) | none | rewrites whole file from `canvasData` (derived from `parseCanvas`, `:36-49`, which returns empty on error) (see L9) |
| W13 | `CollectionView.svelte` `commitStructural` (`:263-272`) | `updateCollectionYaml` on raw `yamlContent` | user action | none | rewrites YAML (not traced further) |
| W14 | `create_note` `vault.rs:899` `write_atomic` | Rust atomic | `ensure_safe_write_path`, file must not exist | Err | outside editor save path |
| W15 | Trash, deep-link, event-calendar, file-icons, auto-move, bookmark migration writes | plugin-fs `writeTextFile` (non-atomic) | varies | varies | **not traced** beyond the read side in this slice |

Deletes and renames in this slice: none on disk. The watcher delete branch removes only index rows (`note-change.service.ts:197-220`: `remove_note_from_index`, `remove_from_search_index`, `remove_semantic_file`, `clearIndexedEntry`). `bookmark-migration.service.ts` header says the bookmarks file is deleted after successful writes; not traced.

Atomicity summary: the editor save path (W1), settings/auto-move/icons writes, and the TS link-updater write are **non-atomic** (READ, fetched source). Rust `write_atomic` (W5, W6, W14) is atomic per file (temp + rename, `utils/fs.rs:16-32`) but uses no per-path lock (INFER: two `write_atomic` calls to one path are last-rename-wins).

---

## 3. Concurrency

- **Autosave timers**: `debouncedSave` 2000 ms (`editor.service.ts:197`), `debouncedSaveFrontmatter` 500 ms (`:200`), mutually exclusive (`scheduleAutoSave` `:213-221`). Retry `setTimeout(saveDirtyTabs, 5000)` `:192`, not cancelled by `resetEditor`.
- **No per-path lock on saves.** `saveFileByPath` snapshots `tab.content` at call time (`:165`) and marks saved with that snapshot on completion (`:169`). Overlapping callers (timer + Cmd+S via `saveCurrentFile` `:151-155` + `saveAllDirtyTabs` `:234` + `tauri-listeners.service.ts:55`) can have two in-flight plugin-fs writes to one path. Completion order is not guaranteed by the code. Two truncating writes can interleave (INFER from `OpenOptions truncate`; not reproduced).
- **`saveAllDirtyTabs` does not wait for an autosave already in flight.** An in-flight `saveDirtyTabs` has not reached `markSavedByPath`, so the tab still looks dirty and is written again.
- **Watcher reload vs user typing**: `reloadExternallyChangedTabs` checks dirty state before the `await` (`:380`) but the apply step checks only identity and disk-vs-saved (`:398`). Keystrokes during the IPC round trip are overwritten (see L2). The watcher batch itself is serialized (`serializeWithRerun`, `app-lifecycle.service.ts:481`), but user edits are not.
- **Link updater**: dirty branch reads in memory, then `await writeTextFile` (`link-updater.service.ts:39`), then sync with `markSaved=true` (`:47`). Keystrokes in that window are overwritten (INFER).
- **Toggle task**: Rust reads disk at `vault.rs:669`; TS syncs the tab at `tasks.service.ts:114` with no dirty check (see L1).
- **Open race**: `openFileInEditor` dedupes after the await (`:128-133`), so double-open is safe; there is no vault-generation guard (see Lead L10).
- **CodeMirror dispatch** is synchronous; the `isTabSwitching` / `isExternalEdit` flags are set and cleared around the dispatch, so they are safe on a single thread.
- **`updateContent` keyed by `activeIndex`** (`editor.store.svelte.ts:84-88`). Keystrokes from the old doc would land on the new active tab only if an event fires between `activeIndex` change and the tab-switch effect. The effect runs on a microtask (INFER), so the window is very small (HYP, not a lead I can support).
- **Canvas** nodes effect guard `syncing` is reset in `queueMicrotask` (`CanvasInner.svelte:96,271,285`). Whether the watch effect re-runs after that microtask on mount is not verified (HYP, see L11).

---

## 4. Round-trip fidelity matrix

| Property | Read path | Editor (CodeMirror) | Save path | Index path (Rust) |
|---|---|---|---|---|
| UTF-8 | `TextDecoder` default: invalid bytes become U+FFFD, no error (READ fetched) | doc holds U+FFFD | `TextEncoder` writes U+FFFD as EF BF BD: **bytes changed** on save | `read_to_string` error: note treated as absent (see L6) |
| Non-UTF-8 (Latin-1 etc.) | same as above | shows replacement characters, no warning | permanent replacement on first edit + save (L4) | `read_files_batch` null → watcher deletes index rows (L6); `collect_v2_entries` skips |
| BOM (EF BB BF) | `TextDecoder` default strips it (MDN fetched) | no BOM in doc | save writes no BOM: **silent change on first edit** | `read_to_string` keeps U+FEFF; `frontmatter_range` (`parsing.rs:39-45`) needs literal `---` at byte 0, so BOM notes have no Rust frontmatter (L13) |
| CRLF | raw CRLF in `tab.content` / `savedContent` | `EditorState.create` splits on `/\r\n?\|\n/` (CM `change.ts` DefaultSplit fetched); no `lineSeparator` facet in repo (grep), so `toString()` joins with `\n` | the first doc change makes `tab.content` LF while `savedContent` is CRLF, so the save writes LF for the whole file (L12). Opening alone does not write. | Rust `rewrite_type_in_frontmatter` preserves endings (`parsing.rs:101-120`); `toggle_task_in_content` splits on `\n` and edits in place (`parsing.rs:1873+`), so CR survives there. Kanban parser fails on CRLF (L7). |
| Trailing newline | kept verbatim | CM keeps final empty line; `toString()` round-trips the trailing `\n` (INFER from split/join semantics) | kept | kept |
| NUL bytes | decoded as U+0000 | not checked in CM rendering (not traced) | written back as-is (INFER) | `read_to_string` accepts NUL (valid UTF-8) |
| Large files | no size limit (READ); whole file held as JS string, CM doc and Rust String | no virtualization check (not measured) | full rewrite on save | full read on every watcher event for changed paths (READ `reloadExternallyChangedTabs` reads every changed clean tab) |
| Binary in a tab | only `BINARY_FILE_EXTENSIONS` denylist (`fs.logic.ts:79-88`) blocks: `.png .jpg .jpeg .gif .svg .webp .bmp .ico .avif .heic .tiff .tif .mp3 .wav .ogg .m4a .flac .aac .opus .mp4 .webm .mov .mkv .avi .m4v .pdf .zip .tar .gz .7z .rar`. Not blocked: `.docx .xlsx .pptx .sqlite .db .psd .epub`, and any unlisted binary | decoded to replacement-filled text | save writes that text over the original bytes (L5) | `read_to_string` fails → delete path (L6) |
| JSON canvas / kanban / collection | raw text | parsed on render (`parseCanvas` returns empty on error, `canvas.logic.ts:36-49`) | re-serialized on any change (L8, L9) | not indexed |

---

## 5. Does opening a note (and doing nothing) write bytes?

**No write path on open, from the READ evidence:**
- `openFileInEditor` only reads and calls `addTab` with `savedContent = content` (`editor.service.ts:124-140`). `isTabDirty` is false (`editor.logic.ts:44-46`), so no save is scheduled.
- `MarkdownEditor` mount creates the state without dispatch (`:107-131`).
- `applyLanguageForTab` dispatches effects only (`MarkdownEditor.svelte:59-63`).
- External-sync effect skips the first run (`:310-317`).
- Every `view.dispatch({changes…})` in the repo was listed (grep). Each is user-driven or a flagged replace: callout type popover (`callout-field.ts:85`, mousedown), meta-bind (`widgets.ts:767`, user input), file-history restore (`file-history.service.ts:92`), replace paths (`MarkdownEditor.svelte:230,329`), wikilink completion, copy-block-link. None runs on open (INFER from call-site review, not from running the app).
- Kanban parse on mount (`KanbanView.svelte:75`) does not call `onContentChange`; only `applyChange` does (`:79-89`).
- Collection view `commitStructural` is user-driven (`CollectionView.svelte:263-272`).
- Watcher reload of an unchanged clean tab: `diskContent === savedContent` skips (`editor.service.ts:398`), so an mtime-only touch does not write.

**Possible exception (unverified, L11):** canvas mount may trigger `persistWithoutHistory` through the nodes watch effect (`CanvasInner.svelte:212-226`, guard `syncing` cleared in a microtask at `:96`). If it fires, a re-serialized `.canvas` (tab-indented, `canvas.logic.ts:53`) would arm an autosave and rewrite bytes on open. Needs a runtime check.

**CRLF caveat:** open does not write, but the first edit of a CRLF note makes the next save rewrite every line ending (L12). Undo does not restore CRLF, because the saved content is the LF string.

---

## 6. Leads

Ordered by severity to content, not by confidence. Confidence is in the claim, not in how often it happens.

**L1. Toggling a task overwrites unsaved edits of the same note** (high confidence in the code path; likelihood narrow: same note, within the autosave window or while autosave is failing)
- Steps: type in note N (dirty; 2000 ms autosave not yet fired or failing) → open the Tasks view → click a checkbox for a task in N.
- Path: `TasksView.svelte:67` → `toggleTask` (`tasks.service.ts:100`) → Rust `toggle_task_status_inner` reads **disk** (`vault.rs:669`), writes the toggled file (`:683`) → TS `syncExternalContentToEditor(path, result.updatedContent, true, 'none')` (`tasks.service.ts:114`) → `updateTabContentByPath` sets `content` and `savedContent` to the disk-based text (`editor.store.svelte.ts:130-136`). The unsaved text is gone and the tab is clean.
- The replace is `addToHistory(false)` (`MarkdownEditor.svelte:332`), so CodeMirror undo cannot restore it (READ annotation; INFER on undo behavior).
- Not in `.scratch` issues.

**L2. External reload and link rewrite overwrite keystrokes typed during an await** (high confidence in the code path; likelihood low, window is one IPC round trip)
- `reloadExternallyChangedTabs` checks dirty before `await readTextFile` (`editor.service.ts:380`, `:386`), then applies without re-checking dirty (`:398`) and calls `syncExternalContentToEditor(..., true, 'none')` (`:401`), which replaces content and savedContent (`editor.store.svelte.ts:130-136`).
- `link-updater.service.ts:33-47`: same class, with a write await (`:39`) between the dirty check and the sync.
- Partial overlap with Issue 54/63 (the view-parse-cache read race, resolved), which is a different cache.

**L3. Editor save is a non-atomic truncate-and-write; interrupted writes truncate the note; overlapping saves can interleave** (high confidence in the code path; likelihood low-to-medium)
- `saveFileByPath` calls plugin-fs `writeTextFile` (`editor.service.ts:168`). Fetched source: `OpenOptions truncate:true` then `write_all`, no temp file, no rename. A write that fails partway (disk full, process killed) leaves a truncated or partial note (INFER: the truncate happens before the write). The tab stays dirty (`:173-176`) and retries every 5 s (`:192`); if the app quits first, the disk copy stays partial.
- The Rust path already has the fix (`write_atomic`, `utils/fs.rs:16-32`); the editor save does not use it.
- Overlapping saves to one path have no lock (see Section 3). Two truncating writes can interleave and leave the longer content's tail (INFER; not reproduced).

**L4. Non-UTF-8 note is silently rewritten with U+FFFD on the first edit and save** (high confidence in the code path; likelihood medium for legacy vaults)
- `readTextFile` decodes with a non-fatal `TextDecoder` (fetched). Latin-1 or Windows-1252 bytes become U+FFFD with no error (`editor.service.ts:124`).
- After any keystroke the autosave writes the replacement text (`:168`, `TextEncoder` UTF-8). The original bytes are gone; recovery depends on file-history snapshots, which were not checked to capture pre-edit bytes.

**L5. Unlisted binary extensions open as text and are overwritten on save** (high confidence in the gate; reachability from the file tree not traced)
- `BINARY_FILE_EXTENSIONS` (`fs.logic.ts:79-88`) omits `.docx .xlsx .pptx .sqlite .db .psd .epub`, and any other unlisted binary. `openFileInEditor` opens them (`editor.service.ts:108`) and decodes them as text (`:124`). An accidental keystroke → autosave → the Word file is replaced by decoded text (L4 mechanism).
- Not traced: the tree-row click handler for non-markdown files (only `openFileInEditor` callers were listed).

**L6. Watcher treats an unreadable note as deleted and drops it from search and the index** (high confidence in the code path; likelihood medium, triggered by L4 files or permission errors)
- `read_files_batch` returns `content: None` for any read error (`files.rs:63-72`), including invalid UTF-8.
- `incrementalUpdateFiles` maps `content === null` to `kind: 'delete'` (`watcher-handler.service.ts:105-109`).
- The delete branch removes the Rust `VaultIndex` entry, the FTS5 row and the semantic chunks (`note-change.service.ts:197-220`).
- The file still exists and is still openable (L4). The full scan `collect_v2_entries` also skips it (`vault.rs:182-190`), so it stays out of backlinks, tags and search until a successful write.

**L7. Kanban boards with CRLF parse to an empty board; the next mutation writes the empty board over the file** (high confidence in the code path; the regex semantics are from fetched MDN; likelihood medium for Windows-origin files)
- `HEADING_RE = /^##\s+(.+)$/` (`kanban.logic.ts:4`) and `TASK_RE = /^-\s+\[([xX ])\]\s+(.*)$/` (`:5`): `.` does not match `\r` (MDN, fetched). `$` has no `m` flag, so a line ending in `\r` never matches. Lines are split on `\n` only (`:61`) and the raw CRLF content reaches the parser (`KanbanView.svelte:75`, `EditorView.svelte:79`).
- Result: no lanes, no cards. The view shows an empty board (visible). Any card action calls `applyChange` (`KanbanView.svelte:79-89`), which serializes the empty board and writes it over the file (W11). The file becomes LF-only and loses every lane and card.
- Contrast: `navigation.logic.ts:6` uses `\r?$` for the same problem in headings, so the codebase knows about it.
- Not in `.scratch` issues.

**L8. Kanban round trip drops any content it does not model** (high confidence in the code path; likelihood medium)
- `parseKanbanBoard` keeps only `## ` headings, task lines and `---` (`kanban.logic.ts:54-115`); every other line is ignored (`:67-113`). `serializeKanbanBoard` writes only lanes, cards, archive and settings (`:118-145`).
- Any intro text, `#`/`###` headings, notes, code blocks, nested bullets or links outside cards are deleted on the first card toggle, add or move (`KanbanView.svelte:79-89`), with no toast, backup or warning.

**L9. Corrupt `.canvas` JSON is silently replaced by an empty canvas on the first edit** (high confidence in the code path; likelihood low-to-medium)
- `parseCanvas` returns `createEmptyCanvas()` on any parse error (`canvas.logic.ts:36-49`), with no log or toast.
- `CanvasInner` derives `canvasData` from it (`CanvasInner.svelte:76-77` region) and creates the flow from it (`:85-96`). The next persist uses `flowToCanvas(..., canvasData)` → `serializeCanvas` → write (`:104-108`, `canvas.logic.ts:52-54`).
- Steps: a `.canvas` file with a git conflict marker or a trailing comma → open → double-click to add a text node → autosave writes a canvas containing only that node.

**L10. Settings file overwritten with defaults after a parse error** (high confidence in the code path; likelihood low-to-medium)
- `loadSettings` catch calls `saveSettings(vaultPath)` after setting defaults (`settings.service.ts:166-172`). The unparseable `settings.json` is replaced; no backup.
- Same shape in `auto-move.service.ts:54-62` (in-memory defaults on parse error); the next `saveAutoMoveConfig` (`:69`) would persist them (INFER; the save body was not read in full).

**L11. Frontmatter comments, anchors and nested keys are dropped on a properties-panel or meta-bind edit** (high confidence in the guard gap; overlaps Issues 41/42, which fixed only the unparseable and anchor-empty cases)
- Both writers rebuild the whole block from `parseFrontmatterProperties` + `rebuildContent` (`properties.service.ts:78-96`, `widgets.ts:754-768`). The only guard is `isFrontmatterUnparseable` (`properties.service.ts:82`, `widgets.ts:756-759`).
- `detectLossyFrontmatter` documents what the round trip loses: comments, anchors, nested mappings, duplicate keys (`properties.logic.ts:373` and the function at `:412`). It is called only by `auto-move` and `event-calendar` (grep).
- Steps: a note with `# comment` in frontmatter → toggle a checkbox property in the panel → the comment is gone; the 500 ms frontmatter autosave writes it (`properties.service.ts:95`).
- Partly known: Issue 41 (anchors) and Issue 42 (unparseable guard) are resolved. Comment and nested-key loss is not filed (confirmed by listing `.scratch/architecture-stability/issues`).

**L12. A CRLF note is rewritten as LF on the first edit and save** (high confidence in the code path; likelihood medium for Windows-origin or git-autocrlf vaults)
- CodeMirror normalizes on creation (`EditorState.create` split `DefaultSplit`, fetched). `onDocChanged` sends `doc.toString()` with `\n` (`editor-extensions.ts:188`). `tab.content` becomes LF while `savedContent` stays CRLF, so the save writes the whole file in LF (`editor.service.ts:168`).
- Bytes change without the user asking. Git shows every line as changed. Undo does not restore CRLF.

**L13. BOM handling differs between editor and index** (medium confidence; low severity)
- `TextDecoder` strips the BOM on read (MDN, fetched) and the editor saves without it, so a BOM is removed on the first save (silent change). `read_to_string` keeps U+FEFF, and Rust `frontmatter_range` requires a literal leading `---` (`parsing.rs:39-45`), so the index has no frontmatter for BOM notes while the editor shows it. No BOM handling found in `src-tauri/src` or `src/lib` (grep).

**L14. Canvas may rewrite the file on open** (HYP, unverified)
- The nodes watch effect (`CanvasInner.svelte:212-226`) relies on `syncing`, which is cleared by `queueMicrotask` (`:96`). If the effect re-runs after that microtask, a 300 ms persist fires on open (`:222`) and rewrites the bytes. Needs a runtime check: open a non-tab-indented `.canvas` and compare bytes and mtime.

**L15. Open read in flight across a vault switch adds a stale tab** (low; INFER)
- `openFileInEditor` has no vault-generation guard (`editor.service.ts:122-143`). A read started before `resetEditor` can `addTab` afterward. Writes still go to the old absolute path, so content is not misdirected, but the old vault's tab appears in the new vault.

---

## 7. Known or filed (checked against `.scratch/architecture-stability/issues/`)

- Issue 34 (save dirty tabs before vault switch): resolved. Adjacent: autosave is not in the write barrier (`write-barrier.service.ts:37-41`; `boot.ts:37` registers only event-calendar), so `saveAllDirtyTabs` does not drain autosave.
- Issue 41 (anchored wikilink empties frontmatter): resolved. Narrower than L11.
- Issue 42 (meta-bind writers parse guard): resolved for unparseable frontmatter only. L11 comment and nested-key loss is not covered.
- Issues 54 and 63 (view-parse-cache read races): resolved. Same class as L2, different cache.
- Issue 21 (app-lifetime ports): created the write barrier and content-invalidation signal; not a fix for L1–L3.
- No filed issue for L1–L10, L12–L14.

---

## 8. Not checked

- Runtime: nothing was run or reproduced. All leads are from reading code and fetched source. L14 needs a runtime check.
- Tree-row click handler for non-markdown files (L5 reachability).
- `src-tauri/capabilities` fs scope for TS `readTextFile`/`writeTextFile` (path safety, out of this slice).
- Whether file-history snapshots capture pre-edit bytes (affects recovery for L3–L5).
- CodeMirror rendering of NUL bytes and any large-file behavior (not measured).
- `saveAutoMoveConfig` body (L10 second half, INFER).
- Full read/write paths of deep-link, event-calendar, file-icons, trash, bookmark migration (only the read side of each was mapped).
- `FileHistoryDialog` modality (`restoreSnapshot` dispatches to the current view and saves the active tab, `file-history.service.ts:82-100`; not a lead unless the dialog is non-modal).
