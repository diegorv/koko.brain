<!-- Recovered from the agent return value (agent a19bb756cdbc92e60); the scout did not write this file itself. -->

Summary (the output file was not written: the system rules bar report .md files, so the full table is below):

- 21 features and 10 plugins inventoried. Most feature reads go through typed `call()` IPC (src/lib/contracts/ipc.ts), but 16 feature/plugin files import `@tauri-apps/plugin-fs` directly, and core services (fs.service.ts, editor.service.ts, vault.service.ts, app/editor-host.ts, utils/log.service.ts) carry most remaining desktop coupling.
- Clear iOS blockers in the features: quick-capture (Rust global shortcut, clipboard watcher, macOS frontmost-app detection), reveal-in-Finder actions, dock badge, and semantic/ONNX search.
- Vault selection is the main iOS risk. Tauri docs say the file-system plugin is restricted to the app folder by default on iOS, and the dialog folder picker is unsupported on iOS (see Source notes). Under model A (remote host) the client needs no fs at all; under model B a different vault-picking and security-scope path is required (UNVERIFIED).
- Must-have set for iOS v1: backlinks, outgoing links, tags, tasks (native), text search, properties, quick switcher, periodic notes, templates, note list, note action bar (minus reveal), calendar nav.
- Desktop-only status of global-shortcut and updater is inferred from `cfg(desktop)` setup snippets, not from a quoted platform statement.

## Inventory (all paths under src/lib/)

| Folder | Purpose | Desktop-only dependency (direct; transitive noted) | Backend commands (direct, call site) | iOS tier |
|---|---|---|---|---|
| features/auto-move | Moves notes to folders by type/lifecycle rule, sets icon | plugin-fs direct: rules file `.kokobrain/auto-move-rules.json` (auto-move.service.ts:1,17,33-34,41-81) | none (moves via core fs.service) | v1-nice |
| features/backlinks | Backlinks, relationship backlinks, unlinked mentions | none | scan_vault_v2_cached (backlinks.service.ts:93), get_backlinks_v2 (:153), get_relationship_backlinks_v2 (:179), get_unlinked_mentions_v2 (:212) | v1-must |
| features/canvas | Infinite .canvas board: text, file, image, link nodes | plugin-fs readFile for images (canvas-image.service.ts:1,28-38); readTextFile (FileNode.svelte:6,41); plugin-opener openUrl (LinkNode.svelte:6,83) | none (createFile via core fs.service, canvas.service.ts:1,9) | v1-nice (iPad); later (iPhone) |
| features/collection | .collection database views (table, calendar, linear calendar), filters, formulas | none direct | get_all_property_records (collection.service.ts:83) | v1-nice |
| features/command-palette | Cmd+K command list; recents in localStorage (command-palette.store.svelte.ts:9,18) | none (keyboard-first UI) | none | v1-nice |
| features/copy-block-link | Copy block reference link | Web clipboard API, not Tauri (copy-block-link.service.ts:36,58) | none | v1-nice |
| features/deep-link | kokobrain:// actions (open, new note, capture); clipboard text read | plugin-deep-link onOpenUrl/getCurrent (deep-link.service.ts:1,87,99); plugin-clipboard-manager readText (:2,217); plugin-fs read/write (:3,257-313) | none | v1-nice (custom scheme is supported on iOS, see Source notes) |
| features/dock-badge | Count badge on app icon | window `setBadgeCount` (dock-badge.service.ts:1,17), needs core:window permission | none | later (cosmetic) |
| features/event-calendar | Calendar tab over dated notes and tasks; event CRUD; daily-note button | plugin-fs readDir/readTextFile (event-calendar.service.ts:13,687,993,1003); trash restore | get_all_tasks_v2 (event-calendar.service.ts:119) | v1-nice (iPad); later (iPhone) |
| features/file-history | Local snapshot history, diff, restore | plugin-fs (file-history.service.ts:2) | get_file_history (:31), get_snapshot_content (:62,85), compute_diff (:65), save_snapshot (:117); snapshots in per-vault DB (ADR-0019) | v1-nice |
| features/file-icons | Per-note/folder icon and color; recent-icons file | plugin-fs (file-icons.service.ts:1; `.kokobrain` recent file :19-29,60-65); frontmatter-icon.service.ts:1,75 | get_all_vault_entries_v2 (file-icons.service.ts:177) | v1-nice |
| features/note-action-bar | Per-note actions: trash (confirm), copy path, reveal | plugin-dialog ask (note-action-bar.service.ts:1,21); plugin-opener revealItemInDir (:2) (reveal is desktop-only); clipboard (:51) | none | v1-must (minus reveal, which is drop-on-iOS) |
| features/note-list | Note rows and row context menu in rail | plugin-dialog ask (NoteRowMenu.svelte:3); reveal items in menu | none | v1-must |
| features/outgoing-links | Outgoing links and outgoing unlinked mentions | none | get_outgoing_links_v2 (outgoing-links.service.ts:74), get_outgoing_unlinked_mentions_v2 (:75) | v1-must |
| features/properties | Frontmatter properties view, lifecycle filter, favorites | plugin-fs only in one-time bookmark migration (bookmark-migration.service.ts:1,11,50-102) | get_all_vault_entries_v2 (lifecycle-filter.service.ts:8) | v1-must |
| features/quick-switcher | Cmd+O file switcher; recents in localStorage (quick-switcher.store.svelte.ts:9,18) | none | none direct (vault entries via core) | v1-must |
| features/rail-shell | Left rail: Files and Types navigators, lenses, new-note, neighbourhood | plugin-dialog ask (FilesNavigator.svelte:2,179 for clipboard path); clipboard (TypesNavigator.svelte:274); reveal via core (fs.service.ts:2,289) | create_folder (new-note.service.ts:27) | v1-must (shell needs iPhone/iPad layout; drop reveal) |
| features/search, text | FTS5 text search and results | none in TS | build_search_index (search.service.ts:287), search_fts (:200), update_search_index_file (:321), read_files_batch (:28), get_all_vault_entries_v2 (:26,45) | v1-must |
| features/search, semantic | Semantic and hybrid search, reranker, model download, progress events | Rust ONNX (ort) and model files in `.kokobrain/models` (ADR-0019); model download UI (SearchSection.svelte:28-73) | init_semantic_search (search.service.ts:346), build_semantic_index (:387), search_semantic (:250), search_hybrid (:151), update_semantic_file (:327), get_semantic_stats (:349), get_semantic_file_status (SemanticIndexStatus.svelte:44); event semantic-index-progress (search.service.ts:86) | drop-on-iOS (per brief; text search covers v1) |
| features/tags | Tag pane | none | get_all_tags_v2 (tags.service.ts:26) | v1-must |
| features/tasks, native | Task list across vault, toggle status | none | get_all_tasks_v2 (tasks.service.ts:61), get_tasks_in_section_v2 (:60), toggle_task_status (:102) | v1-must |
| features/tasks, Todoist | Push tasks to Todoist, sent-state tracking | plugin-http (tasks/tauri-fetch-adapter.ts:1); plugin-fs (todoist.service.ts:1,110,125-129, `.kokobrain/todoist-sent.json`); token in settings | none | later |
| features/type-definitions | Type notes and .view files; type rename propagation; inbox logic | plugin-fs readDir/readTextFile/writeTextFile (type-definitions.service.ts:2,63,163,218,290-309); view-parse-cache.ts:1 | get_all_vault_entries_v2 (:23), create_folder (:120), propagate_type_rename (:226) | v1-nice (candidate for must, since types are the target workflow per memory) |
| plugins/calendar | Calendar navigator that opens periodic notes by date | none direct (imports periodic-notes, calendar.service.ts:2) | none | v1-must (tied to daily notes) |
| plugins/graph-view | d3-force link graph | none (d3 in GraphView.svelte:13-16) | get_all_vault_entries_v2 (graph-view.service.ts:14) | v1-nice (iPad); later (iPhone) |
| plugins/kanban | Markdown kanban boards, lanes, wikilink cards | plugin-fs readTextFile (kanban.service.ts:1,80); createFile via core (:3) | none | v1-nice |
| plugins/one-on-one | People folders, one-on-one notes | plugin-fs readDir/exists (one-on-one.service.ts:2,30-32) | none | later |
| plugins/periodic-notes | Daily and periodic note create/open | none direct (note-creator core, periodic-notes.service.ts:5) | none | v1-must |
| plugins/queryjs | Code blocks run user JS against a `kb` API | plugin-fs readTextFile (queryjs.service.ts:1,5); `new Function` (kb-api.ts:360,469) | entries snapshot via core vault-entries.service (get_all_vault_entries_v2) | later |
| plugins/quick-capture | Global hotkeys, clipboard capture, composer popover | Rust global-shortcut (src-tauri/src/lib.rs:15-16,271); clipboard plugin (lib.rs:284); macOS frontmost-app objc2 (src-tauri/src/quick_capture/source.rs:67-157); NSWindow Space behaviour (lib.rs:106-120); TS listener (quick-capture.service.ts:55) | capture_clipboard_now, open_composer, dismiss_composer, submit_composer_capture (lib.rs:348-351) | drop-on-iOS |
| plugins/table-of-contents | Heading outline panel | none (pure: toc.logic.ts:1-2) | none | v1-nice |
| plugins/templates | Create notes from templates folder | plugin-fs readDir/exists/writeTextFile (templates.service.ts:1,32,105,116) | create_folder (templates.service.ts:105) | v1-must |
| plugins/word-count | Word count in status bar | none (pure) | none | v1-nice |

Rows split for search and tasks, so 23 feature rows plus 10 plugin rows.

## Cross-cutting findings

- Commands used by features: about 40 distinct commands in the 64-command CommandMap (src/lib/contracts/commands.ts). Semantic commands are the only large ONNX-bound group.
- Feature fs writes route through core/filesystem/fs.service.ts (createFile, moveItem, deleteItem, revealInSystemExplorer at :289). Replacing fs.service is the single seam for features' fs writes.
- Core/app desktop coupling beyond features: vault.service.ts:1-2 (dialog open, plugin-fs exists), editor.service.ts:1-2 (plugin-fs, dialog ask), app/editor-host.ts:1-3 (convertFileSrc, readTextFile, openUrl), utils/log.service.ts:1-3 (appLogDir, openPath), core/zoom/zoom.service.ts:1 (webview window), app/tauri-listeners.service.ts:1-2 (window, dialog ask).
- Per-vault data sits in `.kokobrain/` (ADR-0019, docs/adr/0019-kokobrain-in-vault-data-dir.md): auto-move rules, recent icons, todoist-sent, bookmarks, and the SQLite DB with FTS5, history and semantic tables. Any remote or sync model must carry these files.
- Features that need a native-side replacement rather than a port: quick-capture, dock badge, reveal, semantic search, the Todoist HTTP path (already goes through plugin-http, which is cross-platform per docs).

## Source notes (Tauri docs fetched this session)

- File system plugin: iOS access "restricted to Application folder by default"; path scope is required, and a security-scoped-resource command set exists. https://v2.tauri.app/plugin/file-system/
- Dialog plugin: "Does not support folder picker" on Android and iOS; iOS returns `file://` URIs. https://v2.tauri.app/plugin/dialog/
- Opener plugin: on iOS and Android it "Only allows to open URLs via `open`", so revealItemInDir is desktop-only. https://v2.tauri.app/plugin/opener/
- Deep-link plugin: iOS custom schemes supported via `"appLink": false`; dynamic registration not supported. https://v2.tauri.app/plugin/deep-linking/
- Clipboard manager: iOS "Only plain-text content support". https://v2.tauri.app/plugin/clipboard/
- Window setBadgeCount: Windows unsupported; macOS, iOS and Linux not named explicitly in the extracted page. https://v2.tauri.app/reference/javascript/api/namespacewindow/
- Global-shortcut and updater: platform table not extracted; desktop-only is inferred from `cfg(desktop)` and desktop-target snippets. https://v2.tauri.app/plugin/global-shortcut/ and https://v2.tauri.app/plugin/updater/
- HTTP client: iOS listed in the platform table; notes not extracted. https://v2.tauri.app/plugin/http-client/
- iOS prerequisites: Xcode required, macOS only. https://v2.tauri.app/start/prerequisites/

## UNVERIFIED

- Whether ort (ONNX Runtime) and tokenizers ship iOS binaries; semantic drop is taken from the brief, not checked.
- Whether notify (Rust watcher) behaves correctly in the iOS sandbox.
- How plugin-fs scope and security-scoped bookmarks combine for a vault outside the app container on iOS.
- Exact mobile support notes for global-shortcut, updater and http-client.
- The Rust core compiling for aarch64-apple-ios (not checked; no build run per rules).

Not checked: no compile or test was run, per the rules. Dependency claims are from static grep of src/lib and src-tauri/src only.