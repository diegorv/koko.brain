# Scout 05: frontend use of @tauri-apps/plugin-fs

Scope: `src/` excluding `src/tests`. Read-only research. No build or test was run.
Paths below are repo-relative. Line numbers are from the working tree on `main` (2026-11-02).

## 1. Summary

- 27 source files import `@tauri-apps/plugin-fs` (`rg -n "plugin-fs" src --glob '!src/tests/**'`). About 140 call lines use it. Every one is a direct filesystem call on an absolute path built as `${vaultPath}/...`.
- Only 1 native-Rust command set covers part of this: `read_files_batch` (reads), `create_note` (create-only plus index), `create_folder` (recursive mkdir). Everything else (exists, rename, remove, copy, list dir, overwrite write, binary read) has no CommandMap equivalent. A new transport-neutral VaultFs needs about 6 new commands.
- Containment today is the Tauri ACL (`src-tauri/capabilities/default.json`), not code. ADR-0025 (line 80-84) explicitly kept disk rename in TS because moving it to Rust "bypass[es] the plugin-fs ACL". Rust commands that write (`create_note`, `create_folder`) only reject relative paths and `..` (`src-tauri/src/commands/vault.rs`, `ensure_safe_write_path`). A remote VaultFs must add real vault-root containment on the server.
- Two findings that affect any seam:
  1. The raw-write ratchet (`src/tests/lib/raw-write-ratchet.test.ts`) matches only the text `writeTextFile(`. Moving writes behind a `vaultFs.writeText` silently turns the ratchet green. The ratchet must change in the same commit.
  2. `readFile` (binary) is called by `src/lib/features/canvas/canvas-image.service.ts:35`, but `fs:allow-read-file` is not granted in `src-tauri/capabilities/default.json`. Unless another grant exists, canvas image embeds fail at runtime. UNVERIFIED at runtime (ACL read from source only).
- Test layer: 56 test files mock plugin-fs with per-file factories. Only `src/tests/fixtures/calendar-vault.fixture.ts` models a shared in-memory disk (including `create: false`). The E2E layer already aliases the whole module to an in-browser fake (`vite.config.js:50`, `e2e/mocks/tauri-fs.ts`, `e2e/mocks/virtual-fs.ts`). That is the best seed for a remote adapter test double.

## 2. Import inventory (27 files)

| Import line | Names imported |
|---|---|
| `src/lib/app/editor-host.ts:2` | readTextFile |
| `src/lib/app/deep-link-actions.ts:1` | exists, mkdir, readTextFile, writeTextFile |
| `src/lib/core/editor/editor.service.ts:1` | readTextFile, writeTextFile |
| `src/lib/core/filesystem/fs.service.ts:1` | readTextFile, writeTextFile, mkdir, remove, rename, exists, copyFile, readDir |
| `src/lib/core/filesystem/link-updater.service.ts:1` | readTextFile, writeTextFile |
| `src/lib/core/frontmatter/frontmatter-write.service.ts:1` | exists, readTextFile, writeTextFile |
| `src/lib/core/note-creator/note-creator.service.ts:2` | exists, readTextFile |
| `src/lib/core/settings/settings.service.ts:1` | readTextFile, writeTextFile, mkdir, exists |
| `src/lib/core/trash/trash.service.ts:1` | readTextFile, writeTextFile, mkdir, remove, rename, exists |
| `src/lib/core/vault/vault.service.ts:2` | exists |
| `src/lib/features/auto-move/auto-move.service.ts:1` | readTextFile, writeTextFile, mkdir, exists |
| `src/lib/features/canvas/FileNode.svelte:6` | readTextFile |
| `src/lib/features/canvas/canvas-image.service.ts:1` | readFile |
| `src/lib/features/deep-link/deep-link.service.ts:3` | exists, readTextFile, writeTextFile, mkdir |
| `src/lib/features/event-calendar/event-calendar.service.ts:13` | exists, readDir, readTextFile |
| `src/lib/features/file-history/file-history.service.ts:2` | readTextFile, writeTextFile, mkdir, exists, readDir |
| `src/lib/features/file-icons/file-icons.service.ts:1` | readTextFile, writeTextFile, mkdir, exists |
| `src/lib/features/file-icons/frontmatter-icon.service.ts:1` | readTextFile |
| `src/lib/features/properties/bookmark-migration.service.ts:1` | exists, readTextFile, remove |
| `src/lib/features/tasks/todoist.service.ts:1` | readTextFile, writeTextFile, exists, mkdir |
| `src/lib/features/type-definitions/type-definitions.service.ts:2` | readDir, readTextFile, writeTextFile |
| `src/lib/features/type-definitions/view-parse-cache.ts:1` | readTextFile |
| `src/lib/plugins/kanban/kanban.service.ts:1` | readTextFile |
| `src/lib/plugins/one-on-one/one-on-one.service.ts:2` | readDir, exists |
| `src/lib/plugins/queryjs/queryjs.service.ts:1` | readTextFile |
| `src/lib/plugins/templates/templates.service.ts:1` | readDir, exists, writeTextFile |
| `src/lib/utils/log.service.ts:1` | writeTextFile, mkdir, exists |

Non-call mentions (no runtime call): `src/lib/features/search/search.service.ts:93` (comment), `src/lib/plugins/quick-capture/quick-capture.service.ts:52` (comment), `src/lib/app/lifecycle/app-lifecycle.service.ts:378` (comment).

Fallthrough: `src/lib/core/filesystem/note-change.service.ts:30` has a method named `remove` on an interface, not a plugin-fs call.

## 3. Call sites

Replacement key:
- **R-read**: `read_files_batch` (existing, `src/lib/contracts/commands.ts:102`) can serve a text read inside the vault. It returns `{path, content, error}` and does not throw, so callers must unwrap.
- **R-mkdir**: `create_folder` (existing, `src-tauri/src/commands/vault.rs:922`, recursive).
- **R-create**: `create_note` (existing, `vault.rs:888`, create-only, indexes, emits event).
- **NEW-x**: no existing command. Name is the proposed one.
- **client**: stays on the client (never crosses to the vault host).

Path kinds: NOTE (vault .md), FOLDER, META (`.kokobrain/*.json`), TRASH (`.kokobrain/trash/**`), SNAP (`.kokobrain/snapshots-backup/**`), TMPL (vault folder of template notes), VIEW (`.view` YAML), IMG (binary vault asset), SCRIPT (vault `.js`), LOG (app log dir, outside vault), ROOT (vault root).

### 3.1 Core filesystem and trash

| Site (file:line) | Function | API | Path kind | Purpose | Replacement |
|---|---|---|---|---|---|
| `core/filesystem/fs.service.ts:38` | ensureKokobrainDir | mkdir recursive | META dir | create `.kokobrain` | R-mkdir |
| `fs.service.ts:45` | loadFolderOrder | exists | META | check folder-order.json | NEW-exists |
| `fs.service.ts:48` | loadFolderOrder | writeTextFile | META | write template | NEW-write |
| `fs.service.ts:52` | loadFolderOrder | readTextFile | META | read folder order | R-read |
| `fs.service.ts:121` | createFile | readDir(parent) | FOLDER | sibling names for unique name | NEW-list |
| `fs.service.ts:150` | createFolder | readDir(parent) | FOLDER | sibling names | NEW-list |
| `fs.service.ts:181` | deleteItem (no vault open fallback) | remove recursive | NOTE/FOLDER | permanent delete | NEW-remove |
| `fs.service.ts:205` | renameItem | exists(newPath) | NOTE/FOLDER | target-exists check | NEW-exists |
| `fs.service.ts:211` | renameItem diskOp | rename | NOTE/FOLDER | disk rename | NEW-rename (index half stays `rename_note`) |
| `fs.service.ts:233` | moveItem | exists(newPath) | NOTE/FOLDER | target-exists check | NEW-exists |
| `fs.service.ts:239` | moveItem diskOp | rename | NOTE/FOLDER | disk move | NEW-rename |
| `fs.service.ts:252` | copyDirectoryRecursive | mkdir (non-recursive) | FOLDER | dest dir | R-mkdir |
| `fs.service.ts:253` | copyDirectoryRecursive | readDir(src) | FOLDER | children | NEW-list |
| `fs.service.ts:260` | copyDirectoryRecursive | copyFile | NOTE/IMG | copy child | NEW-copy (binary-safe) |
| `fs.service.ts:269` | duplicateItem | readDir(parent) | FOLDER | sibling names | NEW-list |
| `fs.service.ts:278` | duplicateItem | copyFile | NOTE/IMG/FOLDER | copy | NEW-copy |
| `core/trash/trash.service.ts:28` | loadTrash | exists | TRASH | manifest present | NEW-exists |
| `trash.service.ts:33` | loadTrash | readTextFile | TRASH | manifest | R-read |
| `trash.service.ts:59,63` | moveToTrash | exists | TRASH | trash dirs | NEW-exists |
| `trash.service.ts:60,64,68` | moveToTrash | mkdir recursive | TRASH | trash dirs and item container | R-mkdir |
| `trash.service.ts:71` | moveToTrash | rename into trash | NOTE/FOLDER to TRASH | move (user's only copy) | NEW-rename |
| `trash.service.ts:92` | moveToTrash catch | remove recursive | TRASH | orphan cleanup | NEW-remove |
| `trash.service.ts:116` | restoreItem | exists(restorePath) | NOTE/FOLDER | occupied check | NEW-exists |
| `trash.service.ts:122-123` | restoreItem | exists + mkdir | FOLDER | parent dir | NEW-exists, R-mkdir |
| `trash.service.ts:126` | restoreItem | rename out of trash | TRASH to NOTE/FOLDER | restore | NEW-rename |
| `trash.service.ts:130` | restoreItem | remove container (non-fatal) | TRASH | cleanup | NEW-remove |
| `trash.service.ts:188` | deletePermanently | remove recursive | TRASH | purge | NEW-remove |
| `trash.service.ts:208-209` | emptyTrash | exists + remove | TRASH | purge all | NEW-exists, NEW-remove |
| `trash.service.ts:248` | indexRestoredNotes | readTextFile | NOTE | re-index read | R-read |
| `trash.service.ts:272-273` | saveManifest | exists + mkdir | TRASH | trash dir | NEW-exists, R-mkdir |
| `trash.service.ts:275` | saveManifest | writeTextFile | TRASH META | manifest | NEW-write |
| `trash.service.ts:289` | findUniqueRestorePath | exists | NOTE/FOLDER | candidate free | NEW-exists |

### 3.2 Editor, notes, frontmatter, links

| Site | Function | API | Path kind | Purpose | Replacement |
|---|---|---|---|---|---|
| `core/editor/editor.service.ts:124` | openFileInEditor (line 98) | readTextFile | NOTE | open tab content | R-read |
| `editor.service.ts:168` | saveFileByPath (line 161) | writeTextFile | NOTE | the editor save | NEW-write (must route through `notifyAfterSave`) |
| `editor.service.ts:386` | reloadExternallyChangedTabs (line 375) | readTextFile | NOTE | watcher reload | R-read |
| `core/filesystem/link-updater.service.ts:35` | updateLinksAfterRename | readTextFile | NOTE | backlink sources | R-read |
| `link-updater.service.ts:39` | updateLinksAfterRename | writeTextFile | NOTE | rewrite links | NEW-write |
| `core/frontmatter/frontmatter-write.service.ts:117` | attempt (line 107) | readTextFile | NOTE | base for frontmatter edit | R-read |
| `frontmatter-write.service.ts:139` | attempt | exists | NOTE | still there? | NEW-exists |
| `frontmatter-write.service.ts:149` | attempt | writeTextFile `{create:false}` | NOTE | write only if still present | NEW-write mode `must-exist` |
| `frontmatter-write.service.ts:151` | attempt catch | exists `.catch` | NOTE | distinguish missing | NEW-exists |
| `core/note-creator/note-creator.service.ts:55` | loadNoteTemplate (line ~47) | readTextFile | TMPL/NOTE | template body | R-read |
| `note-creator.service.ts:86` | openOrCreateNote (line 78) | exists(filePath) | NOTE | exists before create | NEW-exists |
| `app/editor-host.ts:69` | appEditorHost.readNote | readTextFile | NOTE | wikilink embed and completion (`live-preview/widgets.ts:570`, `wikilink/completion.ts:19`) | R-read |
| `app/editor-host.ts:73` | appEditorHost.assetUrl | convertFileSrc (not plugin-fs) | IMG | `asset://` URL for image embeds (`widgets.ts:159`, `:517`) | transport-specific (see 5.4) |
| `core/settings/settings.service.ts:34` | loadSettings (line 30) | exists | META | settings.json present | NEW-exists |
| `settings.service.ts:44` | loadSettings | readTextFile | META | settings.json | R-read |
| `settings.service.ts:189` | writeSettingsFile (line 185) | exists | META dir | `.kokobrain` | NEW-exists |
| `settings.service.ts:191` | writeSettingsFile | mkdir | META dir | `.kokobrain` | R-mkdir |
| `settings.service.ts:193` | writeSettingsFile | writeTextFile | META | settings.json | NEW-write |
| `core/vault/vault.service.ts:40` | openRecentVault (line 36) | exists(vault root) | ROOT | recent vault still exists | NEW-exists (server-side answer) |

### 3.3 Client-only (never crosses to the vault host)

| Site | Function | API | Path kind | Purpose | Replacement |
|---|---|---|---|---|---|
| `utils/log.service.ts:48,50` | initLogSession | exists + mkdir | LOG (appLogDir) | log dir | client (device-local) |
| `log.service.ts:69` | appendLog | writeTextFile `{append:true}` | LOG | session log line | client (device-local) |
| `log.service.ts:182,184` | openLogDir | exists + mkdir | LOG | open log dir | client |

Note: `appLogDir` comes from `@tauri-apps/api/path` (`log.service.ts:2`). It is on the device, so a remote build logs on the phone. This must not be sent through VaultFs.

### 3.4 App layer and deep links

| Site | Function | API | Path kind | Purpose | Replacement |
|---|---|---|---|---|---|
| `app/deep-link-actions.ts:51` | executeDailyAction (line 31) | exists | NOTE | daily note present | NEW-exists |
| `deep-link-actions.ts:54` | executeDailyAction | readTextFile | NOTE | append/prepend base | R-read |
| `deep-link-actions.ts:61` | executeDailyAction | writeTextFile | NOTE | write merged daily | NEW-write (then `notifyAfterSave`) |
| `deep-link-actions.ts:77,83` | resolveUniqueCapturePath (line 76) | exists | NOTE | unique capture name | NEW-exists |
| `deep-link-actions.ts:126` | executeCaptureAction (line 102) | mkdir | FOLDER | capture folder | R-mkdir |
| `deep-link-actions.ts:134` | executeCaptureAction | readTextFile | TMPL | capture template | R-read |
| `deep-link-actions.ts:173` | executeCaptureAction | writeTextFile | NOTE | new capture note | R-create (`create_note`) would fit: the path is unique and new |
| `features/deep-link/deep-link.service.ts:255,257,260` | executeNewAction prepend (line 243) | exists, readTextFile, writeTextFile | NOTE | prepend | as above |
| `deep-link.service.ts:274,276,279` | executeNewAction append | exists, readTextFile, writeTextFile | NOTE | append | as above |
| `deep-link.service.ts:294,296` | executeNewAction overwrite | mkdir, writeTextFile | NOTE | overwrite | R-mkdir, NEW-write |
| `deep-link.service.ts:310,311,313` | executeNewAction silent create | mkdir, writeTextFile | NOTE | create | R-mkdir, R-create (path may exist: needs NEW-write) |

Duplication: `deep-link-actions.ts` (daily and capture) and `deep-link.service.ts` (`new`) each implement exists/read/merge/write with their own `markRecentSave` ordering. A VaultFs seam would be the natural point to merge them.

### 3.5 Canvas, images, scripts, kanban

| Site | Function | API | Path kind | Purpose | Replacement |
|---|---|---|---|---|---|
| `features/canvas/canvas-image.service.ts:35` | resolveImageSrc (line 28) | readFile (binary) | IMG | image bytes to Blob URL | NEW-readBinary; ACL gap (see 5.3) |
| `features/canvas/FileNode.svelte:41` | canvas file node effect (line ~30-52) | readTextFile | NOTE | show note in canvas | R-read |
| `plugins/queryjs/queryjs.service.ts:5` | loadExternalScript | readTextFile | SCRIPT | `kb.view()` script body (`kb-api.ts:350-351`, path check `kb-api.ts:443-453`) | R-read |
| `plugins/kanban/kanban.service.ts:80` | loadLinkedFileContent (line 57) | readTextFile | NOTE | linked card body | R-read |

### 3.6 Feature metadata and folder scans

| Site | Function | API | Path kind | Purpose | Replacement |
|---|---|---|---|---|---|
| `features/file-history/file-history.service.ts:28` | openFileHistory (line 17) | readTextFile | NOTE | current content for diff | R-read |
| `file-history.service.ts:138,140` | saveSnapshotBackup (line 133) | exists + mkdir recursive | SNAP | backup dir | R-mkdir |
| `file-history.service.ts:143` | saveSnapshotBackup | writeTextFile | SNAP | backup `<ts>.md` | NEW-write |
| `file-history.service.ts:160` | loadBackupTimestamps (line 154) | exists | SNAP | dir present | NEW-exists |
| `file-history.service.ts:163` | loadBackupTimestamps | readDir | SNAP | timestamps | NEW-list |
| `features/auto-move/auto-move.service.ts:44` | loadAutoMoveConfig | exists | META | rules file | NEW-exists |
| `auto-move.service.ts:49` | loadAutoMoveConfig | readTextFile | META | auto-move-rules.json | R-read |
| `auto-move.service.ts:73,75` | saveAutoMoveConfig (line 69) | exists + mkdir | META dir | `.kokobrain` | R-mkdir |
| `auto-move.service.ts:81` | saveAutoMoveConfig | writeTextFile | META | rules file | NEW-write |
| `auto-move.service.ts:175,177` | evaluateAndMove (line 150) | exists + mkdir recursive | FOLDER | destination folder | R-mkdir |
| `features/file-icons/file-icons.service.ts:35,37` | ensureDir (line 33) | exists + mkdir | META dir | `.kokobrain` | R-mkdir |
| `file-icons.service.ts:45,50` | loadRecentIcons (line 42) | exists + readTextFile | META | recent-icons.json | R-read |
| `file-icons.service.ts:65` | saveRecentIcons (line 60) | writeTextFile | META | recent-icons.json | NEW-write |
| `file-icons.service.ts:95,98` | ensureFolderNote (line 90) | exists + writeTextFile | NOTE | folder-note placeholder (applyNoteChange follows) | NEW-write; `create_note` would fit |
| `file-icons.service.ts:158` | removeIconForPath (line ~150) | exists | NOTE | folder note present | NEW-exists |
| `features/file-icons/frontmatter-icon.service.ts:75` | removeFrontmatterIcon (line 70) | readTextFile | NOTE | check icon keys | R-read |
| `features/properties/bookmark-migration.service.ts:53,54` | migrateBookmarksToFavorites (line 52) | exists + readTextFile | META (legacy bookmarks.json) | legacy bookmarks | R-read (exists: NEW-exists) |
| `bookmark-migration.service.ts:73` | migrateBookmarksToFavorites | exists | NOTE | bookmark target present | NEW-exists |
| `bookmark-migration.service.ts:102` | migrateBookmarksToFavorites | remove | META | delete legacy file | NEW-remove |
| `features/tasks/todoist.service.ts:106` | loadSentTasks (line ~102) | exists | META | todoist-sent.json | NEW-exists |
| `todoist.service.ts:110` | loadSentTasks | readTextFile | META | sent tasks | R-read |
| `todoist.service.ts:126,127` | saveSentTasks (line ~123) | exists + mkdir | META dir | `.kokobrain` | R-mkdir |
| `todoist.service.ts:129` | saveSentTasks | writeTextFile | META | sent tasks | NEW-write |
| `features/type-definitions/type-definitions.service.ts:63` | resolveTypedNoteTarget (line ~50) | readDir | FOLDER | siblings for dedupe (failure = no siblings) | NEW-list |
| `type-definitions.service.ts:163` | createTypeDefinition (line ~150) | readDir(root) | ROOT | root siblings | NEW-list |
| `type-definitions.service.ts:218` | renameType (line ~200) | writeTextFile (open tabs) | NOTE | rewrite `_type` in tabs; `applyNoteChange` follows (line 220-224) | NEW-write |
| `type-definitions.service.ts:263` | createView (line ~250) | readDir(root) | ROOT | root siblings | NEW-list |
| `type-definitions.service.ts:290,291` | updateViewIcon (line 286) | readTextFile + writeTextFile | VIEW | icon YAML | R-read, NEW-write. No `applyNoteChange` call (see 5.6) |
| `type-definitions.service.ts:306,309` | updateViewQuery (line 303) | readTextFile + writeTextFile | VIEW | query YAML; then `refreshViewDefinition` | R-read, NEW-write |
| `features/type-definitions/view-parse-cache.ts:46` | refreshViewDefinition (line 44) | readTextFile | VIEW | parse cache | R-read |
| `plugins/one-on-one/one-on-one.service.ts:30,32` | loadPeopleFromFolder (line 22) | exists + readDir | FOLDER | people folder | NEW-exists, NEW-list |
| `plugins/templates/templates.service.ts:26,32` | loadTemplates (line 19) | exists + readDir | TMPL folder | template list (`.md` filter) | NEW-exists, NEW-list |
| `templates.service.ts:99,111` | ensureTemplatesFolder (line ~90) | exists | TMPL folder and files | scaffolding | NEW-exists |
| `templates.service.ts:116` | ensureTemplatesFolder | writeTextFile `''` | TMPL | empty placeholder (ratchet allows) | NEW-write; `create_note` fits (path is new) |

Note: `templates.service.ts` already uses `call('create_folder')` for its folder (line ~102-106). `note-creator.service.ts` uses `call('create_folder')` and `call('create_note')` (lines ~91-100). These are precedents for the migration pattern (ADR-0025 phases 8.6 to 8.8).

## 4. Proposed minimal VaultFs

Transport-neutral. Every path is an absolute server path (current convention, see CLAUDE.md "Absolute paths everywhere"), or a vault-relative path if the remote design chooses that. The choice is open; see 5.7.

```ts
export interface VaultFs {
  /** UTF-8 text. Vault-contained. Throws on missing file. */
  readText(path: string): Promise<string>;
  /** UTF-8 text write. mode 'overwrite' creates if missing; 'must-exist' refuses to create; 'create-only' refuses to overwrite. */
  writeText(path: string, content: string, mode?: 'overwrite' | 'must-exist' | 'create-only'): Promise<void>;
  /** Binary read (images). Returns bytes; transport decides framing. */
  readBinary(path: string): Promise<Uint8Array>;
  /** True when a file or folder is present on the vault host. */
  exists(path: string): Promise<boolean>;
  /** Recursive create. No-op when present. */
  mkdir(path: string): Promise<void>;
  /** One level, includes dot-entries (plugin-fs semantics). scan_vault is NOT a substitute: recursive, skips dot names and symlinks. */
  readDir(path: string): Promise<Array<{ name: string; isDirectory: boolean }>>;
  /** Removes a file or folder. Recursive flag. */
  remove(path: string, opts?: { recursive?: boolean }): Promise<void>;
  /** Disk rename or move. The index half stays in rename_note (ADR-0025). */
  rename(from: string, to: string): Promise<void>;
  /** Byte-exact copy, file or folder. */
  copy(from: string, to: string): Promise<void>;
}
```

Not in VaultFs (stays outside the seam):
- `appendLog` and `appLogDir` (client-only, 3.3).
- `assetUrl` (EditorHost, transport-specific, 5.4).
- Note indexing and events: stay on `applyNoteChange` and the CommandMap IPC.

Mapping to existing and new commands:

| VaultFs method | Existing command | New command needed |
|---|---|---|
| readText (notes, META, TMPL, SCRIPT, VIEW) | `read_files_batch` (`commands.ts:102`) | none for vault files; a single-file `read_text` is cleaner than unwrapping a batch |
| readText (outside any vault) | none | not needed (log is client-only) |
| writeText overwrite | none | `write_text` (wraps `utils::fs::write_atomic`, `src-tauri/src/utils/fs.rs:16`) |
| writeText create-only, notes | `create_note` (`vault.rs:888`, indexes) | none, but it does not overwrite and it needs the `.md` note index |
| writeText must-exist | none | a mode on `write_text` |
| readBinary | none (`read_file` ACL missing) | `read_binary` (or an HTTP GET for remote, see 5.4) |
| exists | none (`get_all_vault_entries_v2` covers indexed notes only, and lags by a throttled version bump) | `path_exists` |
| mkdir | `create_folder` (`vault.rs:922`) | none |
| readDir | none (`scan_vault` is recursive and hides dot-entries) | `list_dir` |
| remove | none | `remove_path` (recursive) |
| rename | none (`rename_note` is index-only, ADR-0025 lines 75-85) | `rename_path` (disk only) |
| copy | none | `copy_path` (file or recursive folder, byte-exact) |

Net: 7 new commands (`write_text`, `read_binary`, `path_exists`, `list_dir`, `remove_path`, `rename_path`, `copy_path`), plus an optional `read_text` if single-file reads should not unwrap a batch. Each needs a `CommandMap` entry and an `COMMAND_ARGS` line (`src/lib/contracts/commands.ts`, checked by `src/tests/lib/contracts/ipc-parity.test.ts`), plus `generate_handler!` in `src-tauri/src/lib.rs:293-351`, plus an entry in the E2E `HANDLERS` table (`e2e/mocks/tauri-core.ts:412-...`, typed exhaustively over `CommandMap`, so `pnpm check` fails until it is added).

Vault containment, required for every new Rust command: canonicalize the parent (or the path for read) and check `starts_with(vault_root)` as `read_files_batch` does (`src-tauri/src/commands/files.rs:31-50`). `ensure_safe_write_path` (`vault.rs`, around 867-880) only rejects relative paths and `..`, so it is not enough once the ACL no longer applies.

## 5. Features that break in a thin-client (remote) build if left direct

Model A (remote): the Mac host owns the vault. The phone sends IPC or HTTP and has no vault files.
Model B (local): Tauri iOS runs Rust locally. Plugin-fs works on device, but the ACL roots and iOS sandbox differ (5.3, 5.5).

### 5.1 Direct plugin-fs calls in a remote build

With no local vault on the phone, every direct call either fails or reads the phone's own sandbox at a path that only exists on the Mac. All 27 files fail. Broken features, grouped:

| Feature | Files | Breaks because |
|---|---|---|
| Open, save, autosave notes | `core/editor/editor.service.ts`, `app/editor-host.ts` | readText and writeText of notes |
| Frontmatter and properties edits (Event calendar, icons, lifecycle, bookmarks) | `core/frontmatter/frontmatter-write.service.ts`, `features/event-calendar`, `features/file-icons` | create:false write, exists |
| Wikilink embeds and previews | `app/editor-host.ts:69`, `widgets.ts:570`, `wikilink/completion.ts:19` | readNote |
| Image embeds and canvas images | `features/canvas/canvas-image.service.ts`, `live-preview/widgets.ts:159,517` | readFile, convertFileSrc |
| Folder explorer ops (create, rename, move, delete, duplicate) | `core/filesystem/fs.service.ts` | readDir, rename, remove, copyFile |
| Trash | `core/trash/trash.service.ts` | rename into `.kokobrain/trash` |
| Settings, folder order, auto-move, recent icons, todoist, bookmarks, file history backup | the META and SNAP rows | `.kokobrain/*` lives on the Mac |
| Templates and template scaffolding | `plugins/templates`, `core/note-creator` | readDir, writeTextFile |
| Type and view definitions | `features/type-definitions` | readDir, writeTextFile, readTextFile |
| Calendar (move, duplicate, undo) | `features/event-calendar` | readDir, exists, readTextFile |
| Deep links (daily, capture, new) | `app/deep-link-actions.ts`, `features/deep-link` | exists, writeTextFile |
| Queryjs scripts | `plugins/queryjs/queryjs.service.ts` | readTextFile of a vault `.js` |
| Kanban linked content | `plugins/kanban/kanban.service.ts` | readTextFile |
| One-on-one and people folders | `plugins/one-on-one` | readDir |
| Vault open and recent-vault check | `core/vault/vault.service.ts` | exists of a Mac path |
| Logging | `utils/log.service.ts` | Not a vault call. `appLogDir()` resolves on the device, so logs land on the phone. It must stay device-local and never go through VaultFs. |

Also outside plugin-fs but on the same boundary (not counted in 27): `convertFileSrc` (`app/editor-host.ts:73`) returns a local asset path; in a remote build the image must come over HTTP. `openUrl`, `revealItemInDir` (`core/filesystem/fs.service.ts:291`) and `plugin-dialog` `open({directory:true})` (`core/vault/vault.service.ts:13`) are desktop concepts. Dialog folder pick on iOS: UNVERIFIED.

### 5.2 Path strings

Callers build paths by string concatenation: `${vaultPath}/${KOKOBRAIN_DIR}/...` (`fs.service.ts:43`, `settings.service.ts:17`, `file-history.logic.ts:128-145`, `trash.logic.ts:4-32`). A remote VaultFs must either keep absolute server paths as opaque IDs (the phone must never join them into a local path) or move to vault-relative paths (touches ~20 files). The `resolveFilePath` deep-link guard (`src/lib/utils/path.ts:33-45`) assumes a local vault prefix.

### 5.3 ACL-driven containment (Model B and today's desktop)

- Read, write, mkdir, remove, rename, copy and exists scopes are `$DOCUMENT/kokobrain-vaults/**` and `$HOME/kokobrain-vaults/**` (plus `.kokobrain`) in `src-tauri/capabilities/default.json` (fs grants, roughly lines 37-230). `$APPLOG/**` is added for write, mkdir and exists.
- No runtime scope call exists (`rg "allowDirectory|forbidDirectory" src src-tauri/src` returns nothing). So a vault opened from the dialog (`core/vault/vault.service.ts:13-20`) outside those roots would fail every plugin-fs call. UNVERIFIED at runtime.
- The code comment at `features/properties/bookmark-migration.service.ts:73` says "The fs scope spans every vault". That contradicts the capability file. One of them is stale.
- `readFile`: `fs:allow-read-file` is not granted anywhere in `src-tauri/capabilities/` (only `default.json` and `composer.json`). The plugin's `read_file` command is governed by permission `allow-read-file` (`plugins/fs/permissions/autogenerated/commands/read_file.toml`, https://github.com/tauri-apps/plugins-workspace/blob/main/plugins/fs/permissions/autogenerated/commands/read_file.toml). Tauri lists `fs:allow-read-file` as a separate permission (https://v2.tauri.app/plugin/file-system/). So canvas image reads (`canvas-image.service.ts:35`) are probably denied. UNVERIFIED at runtime.
- Rust commands that write have no ACL. `create_note` and `create_folder` accept any absolute path without `..` (`vault.rs`, `ensure_safe_write_path`). ADR-0025 (lines 80-84) rejected moving rename into Rust for this reason. Whatever VaultFs does, the containment check moves into Rust and must cover create, rename and remove.

### 5.4 Binary and asset URLs

- `readFile` (IMG) and `convertFileSrc` (`app/editor-host.ts:73`, `widgets.ts:159`, `:517`) are the only image paths. A remote build needs an authenticated HTTP GET for `<img>` (`img` cannot send an Authorization header, so a short-lived URL or a cookie is needed). Model B on iOS needs `asset:` to work on mobile: UNVERIFIED.
- `FileNode.svelte:41` reads text only; the binary path is canvas-image.

### 5.5 iOS (Model B) specifics

- Tauri docs: "Access is restricted to Application folder by default" for iOS (https://v2.tauri.app/plugin/file-system/). So the ACL roots `$DOCUMENT/kokobrain-vaults` and `$HOME/kokobrain-vaults` are not valid vault locations on iOS. A vault in the Files app or iCloud Drive needs security-scoped access.
- The plugin exposes `start_accessing_security_scoped_resource` and `stop_accessing_security_scoped_resource` (`plugins/fs/src/commands.rs`, https://github.com/tauri-apps/plugins-workspace/blob/main/plugins/fs/src/commands.rs). The Tauri docs list them only as permission rows, with no explanation. iCloud is not mentioned. UNVERIFIED how they interact with `readDir` or `watch`.
- ADR-0019 (`docs/adr/0019-kokobrain-in-vault-data-dir.md`) keeps SQLite and the 542 MB model inside the vault. On iOS and iCloud this is the sync-conflict case the ADR already flags.

### 5.6 Observed but not an iOS blocker

- `features/type-definitions/type-definitions.service.ts:286-309` (`updateViewIcon`, `updateViewQuery`) writes `.view` files with no `applyNoteChange`. CLAUDE.md says every write path routes through the owner. The ratchet allows them as "YAML, not a note" (`raw-write-ratchet.test.ts:33-35`). The watcher catches the change later, so the index is briefly stale. Flag for review; out of scope here.
- `features/file-icons/icon-resolver.ts:47` comment says `.kokobrain/file-icons.json`. The code reads `recent-icons.json` (`file-icons.service.ts:24`). Stale comment.
- `app/deep-link-actions.ts` and `features/deep-link/deep-link.service.ts` duplicate the exists/read/merge/write pattern (daily, new). Two places to change for a VaultFs.

### 5.7 Open design decisions for the remote build

1. Absolute server paths as opaque IDs vs vault-relative paths. Vault-relative is simpler for a phone but touches ~20 files (5.2).
2. Where the containment check lives. It must be in Rust for every new command (4), because the ACL is not in effect on the remote host.
3. Whether `writeText` for notes keeps the Rust index loop (`applyNoteChange` owner, CLAUDE.md "Absolute paths everywhere") or moves that loop to the host. Keep the owner on the client; the host only writes bytes.
4. ratchet: the `writeTextFile(` regex in `raw-write-ratchet.test.ts:12` must be replaced with a `VaultFs.writeText` count, or the ratchet becomes a no-op after the seam lands.

## 6. Test layer

| Mock style | Where | Notes |
|---|---|---|
| Per-file `vi.mock('@tauri-apps/plugin-fs', () => ({ ... }))` | 56 test files, e.g. `src/tests/lib/core/filesystem/fs.service.test.ts:10-19` | Each factory lists only the functions that file needs. Example: `src/tests/lib/plugins/one-on-one/MyPeopleSection.test.ts:10` mocks only readDir, exists, readTextFile. A service that starts calling mkdir then fails with "not a function" in that test. |
| Helpers over `vi.mocked(exists)` | `src/tests/fixtures/tauri-fs.fixture.ts:17-66` | `mockJsonFile`, `mockTextFile`, `mockMultipleFiles`, `mockMissingFile`, `mockParseError`. Read-only; no writes. |
| In-memory disk | `src/tests/fixtures/calendar-vault.fixture.ts:1-140` | `disk` Map plus `writes` and `indexed` logs. `land()` models `options.create === false` (refuses a missing file). Mocks `invoke`, `renameItem`, the fs functions. Closest existing thing to a VaultFs test double. |
| Ratchet test | `src/tests/lib/raw-write-ratchet.test.ts:12,24-40,103` | Counts `writeTextFile(` text in `src/lib` and `src/routes`. Blind to any new write seam. |
| Global E2E alias | `vite.config.js:50` (`playwrightMocks`, applied when `PLAYWRIGHT` is set) | `@tauri-apps/plugin-fs` resolves to `e2e/mocks/tauri-fs.ts`. Backed by `e2e/mocks/virtual-fs.ts` (store Map, `FsEntry`, listeners). |
| E2E IPC table | `e2e/mocks/tauri-core.ts:1-12` and `:412-...` | `HANDLERS` is typed as an exhaustive map over `CommandMap`; `handleReadFilesBatch` (`:69`), `handleCreateNote` (`:73`), `handleCreateFolder` (`:88`). Adding a CommandMap entry fails `pnpm check` until a handler exists. |

Gaps in the E2E fake that a remote adapter test must not inherit:
- `writeTextFile` ignores `options` (`e2e/mocks/tauri-fs.ts:7-9`), so `create:false` is not enforced. `frontmatter-write.service.ts:149` relies on it.
- `remove` ignores `recursive` (`:15-17`).
- `readFile` encodes text with TextEncoder (`:35-38`), so binary bytes are not preserved.
- `mkdir` ignores `recursive` (`:11-13`).

Suggested seed: implement `RemoteVaultFs` against the `HANDLERS` table, then run the calendar-vault style disk fixture against it. The `calendar-vault.fixture.ts` header already documents which `plugin-fs` functions it expects (`:9-11`).

## 7. Method and what was not checked

- Call-site list: `rg -n "(?<![\w.])(readTextFile|writeTextFile|readFile|exists|mkdir|readDir|remove|rename|copyFile)\(" src --glob '!src/tests/**'`, mapped to enclosing functions by reading each file's ranges. Some one-line enclosing names were confirmed by hand. The count "about 140" is approximate.
- External: `https://v2.tauri.app/plugin/file-system/` (WebFetch, 2026-11-02); `https://github.com/tauri-apps/plugins-workspace` (default branch, fetched with `gh api`): `plugins/fs/guest-js/index.ts` (IPC names `plugin:fs|read_file`, `plugin:fs|write_text_file`, `plugin:fs|read_text_file`), `plugins/fs/src/commands.rs` (`default_create_value` returns true; `write_file_inner` maps `create` to OpenOptions), `plugins/fs/permissions/autogenerated/commands/read_file.toml` (`allow-read-file`).
- Not verified: runtime ACL behavior (canvas readFile denial, vaults outside the two kokobrain-vaults roots), iOS dialog folder pick, iCloud and security-scoped behavior, `asset:` protocol on mobile, whether `fs:default` is granted through any path other than `default.json`. All UNVERIFIED.
- Not run: no cargo, pnpm, vitest, playwright or build. Only read and grep.
- Not checked: `src/lib/features/rail-shell/*` and `src/routes/*` for plugin-fs (grep covered `src/`; none found beyond the list above).
