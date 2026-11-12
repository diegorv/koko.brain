## Shape of the system

Kokobrain is a Tauri 2 desktop app. A SvelteKit and Svelte 5 frontend runs in the webview and a Rust crate (`kokobrain_lib`, in `src-tauri/src`) holds the heavy state. See [ADR-0001](../adr/0001-tauri-svelte-sveltekit-stack.md). The frontend under `src/lib` is split into layers whose import directions are enforced by `src/tests/lib/architecture/layer-rules.test.ts` ([ADR-0003](../adr/0003-four-layer-source-taxonomy.md)).

- `src/lib/utils` and `src/lib/contracts` sit at the bottom. `utils` holds pure helpers plus a few logging and dedupe modules. `contracts` is the typed boundary to Rust.
- `src/lib/core` holds what the app cannot run without: editor tabs, the file tree and the change fan-out, frontmatter, vault open state, settings, Trash and the CodeMirror editor.
- `src/lib/features` holds always-loaded features.
- `src/lib/plugins` holds optional modules.
- `src/lib/app` is the composition root.
- `src/routes` holds the two webview entry points: the main window and the quick-capture composer.

Core may not import features or plugins, and features may not import plugins. Where a lower layer needs something from a higher one, it exposes a registry and the higher layer registers into it. Existing registries:

- Note-change consumers and path-change consumers in `src/lib/core/filesystem`.
- Content-invalidation listeners in `src/lib/core/filesystem`.
- After-save observers, note-created observers and tab-close listeners in `src/lib/core/editor`.
- Write barriers in `src/lib/core/vault`.
- Rule actions in `src/lib/core/rule-actions`.
- The fenced block renderer facet and the editor host facet in `src/lib/core/markdown-editor`.
- The rail registry, the note action bar registry and the daily-note opener in `src/lib/features`.

`src/lib/app` is the only place that may import every layer, and only `src/routes` may import it. It fills these registries, orders vault open and close, subscribes to Tauri events and mounts the shell. Most modules follow the same split. `.logic.ts` files hold pure logic, `.store.svelte.ts` files hold reactive state behind getters ([ADR-0034](../adr/0034-derived-allowed-behind-store-getters.md)), and `.service.ts` files do side effects. Services called from effects are wrapped in `untrack()` ([ADR-0006](../adr/0006-effect-untrack-pattern.md)).

The Rust crate is the source of truth for vault metadata ([ADR-0025](../adr/0025-rust-vault-index.md)).

- **Crate root.** `src-tauri/src` registers the Tauri plugins and managed state, builds the app menu, the global shortcuts and the composer window, runs the exit flow, and holds the canonical event names in `events.rs`.
- **IPC layer.** `src-tauri/src/commands` is the IPC layer. It checks arguments and hands the work to the domain modules.
- **Vault.** `src-tauri/src/vault` holds note parsing, the in-memory `VaultIndex` with its reverse indexes, task-line edits, the index snapshot cache and the file watcher.
- **Database.** `src-tauri/src/db` holds the vault SQLite connections, the schema and the per-domain repositories ([ADR-0011](../adr/0011-sqlite-fts5-wal-local-search.md)).
- **Search.** `src-tauri/src/search` holds pure retrieval logic. `src-tauri/src/semantic` holds chunking, the ONNX embedder and reranker, model files and result filtering ([ADR-0012](../adr/0012-onnx-semantic-search-content-hash-skip.md)).
- **Quick capture and utils.** `src-tauri/src/quick_capture` holds clipboard capture and the composer commands ([ADR-0028](../adr/0028-quick-capture-merge-into-kokobrain.md)). `src-tauri/src/utils` holds atomic writes, vault path validation, debug logging and resource sampling ([ADR-0020](../adr/0020-path-security-absolute-canonicalize.md)).

The frontend never calls `invoke` for app commands. It uses `call()` and `on()` from `src/lib/contracts/ipc.ts`, typed by `CommandMap` and `EventMap`. DTOs are exported from Rust with ts-rs into `src/lib/contracts/generated`. The command and event maps mirror `generate_handler!` in `src-tauri/src/lib.rs` and `src-tauri/src/events.rs`, and parity tests in `src/tests/lib/contracts` compare them. Plugin commands such as the updater are the only raw `invoke` calls. App data lives inside the vault under `.kokobrain/` ([ADR-0019](../adr/0019-kokobrain-in-vault-data-dir.md)).

## Main flows

### 1. App boot and vault open

1. `src/routes/(app)/+layout.svelte` calls `registerAppPorts` from `src/lib/app/boot.ts` synchronously. It registers the app-lifetime ports: content-invalidation listeners, the event-calendar write barrier, path-change consumers, the view row-set port and the type icon lookup.
2. The same layout registers the global keybindings, menu, close, exit, focus, deep-link, quick-capture and `vault-index-updated` listeners (`src/lib/app/tauri-listeners.service.ts`). A `$effect` on `vaultStore.isOpen` and `vaultStore.path` calls `initializeVault` or `teardownVault` from `src/lib/app/lifecycle/app-lifecycle.service.ts`.
3. A vault switch starts earlier. `switchVault` in `src/lib/core/vault` saves dirty tabs through `src/lib/core/editor`, drains the write barriers, then calls `vaultStore.open`.
4. `initializeVault` first unregisters the previous vault's registrations, stops the mods host and auto sync, saves dirty tabs and drains the barriers again.
5. It loads settings (`src/lib/core/settings`), configures Sentry, starts settings persistence, starts the log session and calls `open_vault_db`.
6. It registers the vault-lifetime note-change and path-change consumers and the file-history hook. Features and plugins register here, so core never imports them.
7. It loads user data in parallel: bookmark migration, recent icons, Trash and the Auto Organize config.
8. It builds the Rust `VaultIndex` (`features/backlinks` calls `scan_vault_v2_cached`) in parallel with `loadDirectoryTree` (`src/lib/core/filesystem`, which calls `scan_vault`). It then marks the index ready, drops the vault-entries memo and builds the folder content order from `get_all_vault_entries_v2`.
9. It ensures the templates folder exists. It then defers the tag, property and frontmatter-icon index builds by one macrotask. It also starts the FTS5 build, registers the search after-save hook and the Auto Organize hook if enabled, and schedules the semantic search init.
10. It subscribes to `onFileChange` and starts the Rust watcher (`start_vault_watcher`), then runs any pending deep-link action.
11. One macrotask later it opens the daily note, checks for updates, starts the mods host and starts Todoist auto sync. Each step checks a version counter, so a superseded init stops early.
12. Teardown reverses this and calls `save_vault_cache`, `shutdown_semantic` and `close_vault_db`.

On quit, Rust holds the exit back in `on_exit_requested` and emits `app:exit-requested`. The frontend runs `prepareForExit` in `src/lib/core/vault`: it saves dirty tabs, drains the write barriers and flushes settings. It then calls `confirm_exit` in `src-tauri/src/commands/app_exit.rs`.

### 2. Note save to index

1. Typing reaches `onContentChange` in `src/lib/core/editor`. It schedules an autosave timer, with a shorter delay for frontmatter-only edits than for body edits. Separately, the layout effect in `src/routes/(app)/+layout.svelte` calls `updateIndexesForFile` (`src/lib/app/lifecycle/index-updater.service.ts`) after a debounce. That path uses the `edit` source, which applies the debounced Rust and consumer updates.
2. `saveFileByPath` queues behind any save of the same path, then writes with the Tauri fs plugin, marks the tab saved and calls `notifyAfterSave` (`src/lib/core/editor/editor.hooks.ts`).
3. `notifyAfterSave` marks the path as a recent self-save, then calls `applyNoteChange` with the `save` source (`src/lib/core/filesystem/note-change.service.ts`). Its per-source policy table decides which legs run. For `save`, it fires `update_note_in_index` in Rust and the registered TS consumers (collection and file-icons, wired in `app/lifecycle`), unless the content signature is already indexed.
4. It then fires the content-invalidation signal. This clears the unlinked-mentions flag, the queryjs cache and the kanban linked-content cache.
5. Finally it runs the after-save observers. Search calls `update_search_index_file` and `update_semantic_file`. File history calls `save_snapshot`. Auto Organize, Todoist sync and mods also observe saves.
6. Rust emits `vault-index-updated` when the index changed. The listener in `src/lib/app/tauri-listeners.service.ts` throttles it, bumps `vaultStore.vaultIndexVersion` and patches the property index, the cached entries snapshot, type definitions and the content order from `get_index_delta`. Panels such as backlinks, outgoing links, tags and tasks refetch through an effect on that version.

Writes that do not go through the editor route through the same owner with other sources. Examples are note creation (`src/lib/core/note-creator`), Trash restore, and Rust task writes settled by `settleTaskWrite`. Do not add a second owner for note changes. See `docs/agents/indexing-watcher-rules.md`.

### 3. External file change (watcher)

1. `src-tauri/src/vault/watcher.rs` watches the vault. It drops events under dot-directories and the temp files of atomic writes, collapses ancestor paths and debounces.
2. `src-tauri/src/commands/watcher.rs` emits one `vault-files-changed` event per burst ([ADR-0031](../adr/0031-native-rust-vault-watcher.md)).
3. `src/lib/core/filesystem/fs.watcher.ts` receives it. It leaves the tree alone for modify-only batches, rescans a few parent folders with `scan_vault`, or does a full tree refresh. It then notifies its listeners.
4. The lifecycle listener in `src/lib/app/lifecycle/app-lifecycle.service.ts` debounces and serializes batches. It calls `reloadExternallyChangedTabs` (`src/lib/core/editor`), then `rebuildAllIndexes` (`src/lib/app/lifecycle/watcher-handler.service.ts`).
5. `rebuildAllIndexes` skips directory-only batches and batches that are all recent self-saves (`areAllRecentSaves`). For a small set of Markdown files it reads them with `read_files_batch` and applies `applyNoteChange` with the `watcher` source. Otherwise it rebuilds the Rust index through `rebuildIndex` and reruns the property and icon builders. It ends with the content-invalidation signal.
6. The mods host subscribes to the same `onFileChange` stream to reload changed mods.

### 4. Rename, move and delete

1. A file explorer or note-list action calls the filesystem service in `src/lib/core/filesystem`, which hands the disk operation to `applyPathChange` (`path-change.service.ts`) as a callback.
2. For a delete, it first saves and closes the affected tabs through `src/lib/core/editor`. The disk operation moves the item into the Trash (`src/lib/core/trash`).
3. After the disk operation it retargets open tabs and calls each registered path-change consumer synchronously. Consumers cover Collection, Event Calendar, the rail navigators, the quick switcher, the view parse cache and mods.
4. For renames and moves, `link-updater.service.ts` rewrites links in the notes found through `get_backlinks_v2`, and the tree re-keys the node.
5. It then awaits `rename_note` and `rename_in_search_index`, so index entries, FTS5 rows and semantic chunks follow the new path. A removal sweep through `applyNoteChange` follows, and each consumer's `settled` hook runs last.

### 5. Search

1. `features/search` drives all modes. At vault open, `buildSearchIndex` calls `build_search_index`. A deferred step loads the embedder with `init_semantic_search` and then calls `build_semantic_index`. `semantic-index-progress` events feed the status UI.
2. Incremental updates arrive from the after-save observer (flow 2) and from `applyNoteChange` for non-save sources.
3. For a query, `performSearch` calls `search_fts` (text mode), `search_semantic` (semantic mode) or `search_hybrid` (hybrid mode) through `src/lib/contracts`.
4. `src-tauri/src/commands/search_index.rs` runs the FTS5 query over `src-tauri/src/db` and `src-tauri/src/search`. If FTS5 is unavailable, the frontend falls back to an in-memory search over the entries snapshot.
5. `search_hybrid` in `src-tauri/src/commands/semantic.rs` runs the FTS leg and the embedder leg. It fuses the two with RRF (`src-tauri/src/search`), builds the rerank pool and reranks if the model is on disk. It finishes with `src-tauri/src/semantic/filtering.rs`. See `docs/SEARCH.md`.

### 6. Live preview render

1. `src/lib/app/EditorView.svelte` mounts `MarkdownEditor.svelte` (`src/lib/core/markdown-editor`) for Markdown tabs. It passes the app's `EditorHost` and fenced-block renderers from `src/lib/app/editor-host.ts`. The same view mounts other views for other tab types, such as Canvas, Kanban, Graph, Tasks, Tags and Collection.
2. `createExtensions` (`setup/editor-extensions.ts`) installs the host facet and the fenced-block-renderer facet outside any compartment. It puts the live-preview extensions in a compartment.
3. `livePreviewExtensions` (`extensions/live-preview/live-preview.ts`) composes the block decorators, the inline pipeline, the inline plugins, the click handler and the paste handlers. Each decorator can be switched off by name from Settings.
4. Block decorators are built with the `blockDecorator` factory in `extensions/live-preview/core`. It runs a full-document scan with finders from `extensions/live-preview/parsers` and shows a block as source when the reveal rule says so. Widgets reach the app through the host facet.
5. The `queryjs` and `collection` block fields look up a renderer by fence language in the facet. The renderers come from `src/lib/plugins/queryjs` and `src/lib/features/collection`, and `src/lib/app` passes them in. See [ADR-0008](../adr/0008-codemirror-live-preview-architecture.md), [ADR-0010](../adr/0010-queryjs-kb-api-caching.md) and `docs/LIVE-PREVIEW.md`.

### 7. Mods loading

1. After vault open, `startModsHost` (`src/lib/plugins/mods/mods-host.service.ts`) runs. It does nothing unless mods are enabled for this vault, a flag kept on this machine ([ADR-0036](../adr/0036-vault-mods-trust-loader-storage.md)).
2. It subscribes to `onFileChange` from `src/lib/core/filesystem`, then reads the folders under `_system/mods` with the fs plugin.
3. For each folder, `loadMod` reads `manifest.json` and `main.js`, parses the manifest and evaluates the source with `new Function` (`evaluateModSource` in `mods.logic.ts`). Each mod loads on its own, so one failure does not block the others.
4. `createModContext` builds the `ctx` the mod's `onload` receives. It wraps core services: after-save and note-created observers, path-change consumers, frontmatter writes, the vault entries snapshot, collection queries and the QueryJS `kb` API. It uses `read_mod_data` and `write_mod_data` for the mod's data.
5. A mod's registrations land in registries owned by lower layers: Auto Organize rule actions (`src/lib/core/rule-actions`), rail actions and menu items (`src/lib/features/rail-shell`), and command and picker stores in `src/lib/plugins/mods`. `src/lib/app` reads those stores for the command palette and overlays.
6. A change to a mod's files reloads that mod. `stopModsHost` runs on vault switch and teardown, and unloads every mod and detaches its listeners.

## Where to start

| Task | Folder to open first |
|------|----------------------|
| Change what happens at vault open or close | `src/lib/app/lifecycle` |
| Wire a feature or plugin into a core registry | `src/lib/app/boot.ts`, then `src/lib/app/lifecycle` |
| Add or change an IPC command or event | `src-tauri/src/commands`, then `src/lib/contracts` |
| Add or change a DTO shared with the frontend | `src-tauri/src/vault` or the domain module that owns the type, then `src/lib/contracts/generated` |
| Change how saves, tabs or autosave behave | `src/lib/core/editor` |
| Change how note edits reach the indexes | `src/lib/core/filesystem` (`note-change.service.ts`) |
| Change rename, move or delete behavior | `src/lib/core/filesystem` (`path-change.service.ts`) |
| Change file watching | `src-tauri/src/vault/watcher.rs`, then `src/lib/core/filesystem/fs.watcher.ts` and `src/lib/app/lifecycle` |
| Change frontmatter parsing or writing | `src/lib/core/frontmatter` |
| Change note parsing, links, tags or tasks in the index | `src-tauri/src/vault` |
| Change the SQLite schema or a repository | `src-tauri/src/db` |
| Change search ranking or semantic indexing | `src-tauri/src/search` and `src-tauri/src/semantic`, then `src-tauri/src/commands/semantic.rs` |
| Change the search UI or query orchestration | `src/lib/features/search` |
| Change live preview rendering | `src/lib/core/markdown-editor/extensions/live-preview` |
| Add a fenced block type | `src/lib/core/markdown-editor/extensions/live-preview/core`, then `src/lib/app/editor-host.ts` |
| Change settings or themes | `src/lib/core/settings` |
| Change the Trash | `src/lib/core/trash` |
| Change the left rail, lenses or the note list | `src/lib/features/rail-shell` |
| Change type definitions, `.view` files or lifecycle flags | `src/lib/features/type-definitions` and `src/lib/features/properties` |
| Change tables, collections or `.view` queries | `src/lib/features/collection` |
| Change QueryJS blocks or the `kb` API | `src/lib/plugins/queryjs` |
| Add or change a vault mod capability | `src/lib/plugins/mods` |
| Change Quick Capture | `src/lib/plugins/quick-capture` and `src-tauri/src/quick_capture` |
| Change app shell layout, commands or shortcuts | `src/lib/app` |
| Add a shared helper | `src/lib/utils` |
| Check which imports a layer allows | `docs/adr/0003-four-layer-source-taxonomy.md` and `src/tests/lib/architecture` |
