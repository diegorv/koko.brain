---
summary: "Frontend composition root: registers ports, orders vault open and close, subscribes to Tauri events and global shortcuts, and mounts the application shell."
---

## Responsibility

Owns the wiring that connects the layers at app level. That covers the one-time port registrations (boot.ts), the vault open and close orchestration and the file-watcher and per-file index handlers (lifecycle/), the Tauri app event and window listeners (tauri-listeners.service.ts), the global keyboard shortcuts (global-keybindings.ts), the built-in command palette list (commands.ts), rail navigation (rail-navigation.ts), the deep-link actions that need a plugin (deep-link-actions.ts), the EditorHost, fenced-block renderers and block-link actions that EditorView hands to core/markdown-editor (editor-host.ts), and the Svelte shell (AppShell.svelte with the rail, navigators, editor and side panels, EditorView.svelte, AppOverlays.svelte with the settings panel, pickers and dialogs, SettingsPanel.svelte, LabsSection.svelte). It is the only folder exempt from the outbound layer rules, so it can import core, features and plugins together. It does not own domain stores or the Rust index: it calls the owning modules and decides the order between them. It exposes no Tauri command and has no Rust counterpart.

## Key files

- `src/lib/app/boot.ts`: registerAppPorts and unregisterAppPorts: install feature and plugin implementations into core ports once for the app lifetime; idempotent, with an HMR dispose hook.
- `src/lib/app/lifecycle/app-lifecycle.service.ts`: initializeVault and teardownVault: ordered vault open (settings, database, note-change consumers and hooks, user data, indexes and file tree, search, watcher, pending deep link, deferred post-open work) and close, guarded by a version counter.
- `src/lib/app/tauri-listeners.service.ts`: Registers the menu:settings, app:exit-requested and vault-index-updated listeners and the window close and focus handlers; throttles the vault index refresh and patches it into stores.
- `src/lib/app/lifecycle/watcher-handler.service.ts`: rebuildAllIndexes: handles a file-watcher batch with an incremental per-file update for small markdown batches and a full rebuild otherwise; skips directory-only and all-self-save batches and drops mod code.
- `src/lib/app/lifecycle/index-updater.service.ts`: updateIndexesForFile: per-file index update for the active tab's content, called by the (app) layout's debounced effect and delegating to applyNoteChange.
- `src/lib/app/editor-host.ts`: appEditorHost constant implementing the EditorHost port, plus appFencedBlockRenderers and appBlockLinks.
- `src/lib/app/global-keybindings.ts`: GLOBAL_KEYBINDINGS table, registerGlobalKeybindings and shortcutFor, which commands.ts uses for palette shortcut labels.
- `src/lib/app/AppShell.svelte`: Main layout: renders the route's child page while no vault is open, and otherwise the rail, navigators, note list, editor view, side panels and status bar; also syncs the dock badge.

## State

- boot.ts module state: the list of unregister handles for live port registrations (empty when no ports are live).
- app-lifecycle.service.ts module state: the init version counter, the indexed vault path, the deferred semantic-init and secondary-builder timers, the unsubscribe handles for the watcher, file history, search index, note-change consumers and calendar daily-note opener, the debounced file-change handler and the pending watcher path queue.
- index-updater.service.ts module state: an update version counter that discards stale in-flight updates.
- tauri-listeners.service.ts: throttle and refresh state lives in the closure of each registration; the module level holds only constants.
- editor-host.ts module state: a tags memo keyed by vault path and index version, and a WeakMap cache of link indexes per file tree.
- No Svelte store is declared in this folder; it reads and writes stores owned by core, features and plugins.

## Collaborators

- `src/routes`: src/routes/(app)/+layout.svelte is the only importer of app code outside this folder and the tests. It calls registerAppPorts, runs the listeners, keybindings and vault init and teardown from $effects, and renders AppShell and AppOverlays.
- `src/lib/core`: Editor, filesystem, vault, settings, trash, layout, zoom, status-bar, markdown-editor, note-creator and frontmatter. Ports are filled here and core state is read and written here.
- `src/lib/features`: Backlinks, collection, search, deep-link, rail-shell, type-definitions, properties, tags, tasks, event-calendar, todoist-sync, file-history, command-palette, dock-badge and others; each is registered into a core port, called during vault open and close, or mounted by the shell.
- `src/lib/plugins`: Periodic notes, quick-capture, templates, mods, queryjs, kanban, calendar, graph-view, one-on-one, table-of-contents and word-count are composed here because core and features must not import plugins.
- `src/lib/contracts`: call() for IPC in lifecycle, listeners, editor host and deep-link actions; on() with EVENT_NAMES in tauri-listeners.service.ts.
- `src/lib/utils`: debug, error and log helpers, keybinding registration, path helpers, debounce, serializeWithRerun from inflight.ts, and the index-dedupe check in the index updater.
- `src/lib/components/ui`: AppShell and LabsSection use shadcn-svelte primitives (resizable, scroll-area, switch).
- `IPC:open_vault_db`: initializeVault opens the vault database.
- `IPC:close_vault_db`: teardownVault closes the vault database.
- `IPC:save_vault_cache`: teardownVault saves the Rust index cache for the vault the index holds.
- `IPC:shutdown_semantic`: teardownVault releases the semantic models and search cache.
- `IPC:cleanup_history`: initializeVault purges old file-history snapshots using the configured retention, unless settings.json was not loaded.
- `IPC:get_all_vault_entries_v2`: initializeVault reads the full snapshot to build the content order.
- `IPC:get_index_delta`: The vault-index-updated listener reads only the changed paths for the incremental refresh.
- `IPC:get_all_tags_v2`: Feeds the editor host's tag completion list.
- `IPC:read_files_batch`: The watcher handler reads changed files from disk for the incremental update.
- `IPC:import_staged_shot`: The capture deep-link action moves a staged clipboard image into the capture folder.
- `IPC:confirm_exit`: The exit-request listener lets Rust finish a quit after prepareForExit flushed dirty tabs.
- `event:vault-index-updated`: Listened to by registerVaultIndexUpdatedListener to refresh stores.
- `event:menu:settings`: Listened to by registerMenuSettingsListener to toggle the settings panel.
- `event:app:exit-requested`: Listened to by registerExitRequestListener to flush and then confirm the exit.

## Subfolders

- `src/lib/app/lifecycle`: Vault lifecycle services: initializeVault and teardownVault orchestration, watcher batch handling and the per-file index updater.

## Gotchas

- registerAppPorts must be called synchronously when the shell loads, never from a vault-scoped effect. initializeVault unregisters its vault-lifetime registrations at entry, so a port registered there would be lost on each vault switch (boot.ts doc, src/routes/(app)/+layout.svelte).
- initializeVault checks a version counter after each await and teardownVault increments it, so a superseded or torn-down init returns without error, as does a failed database open. Callers cannot treat a resolved promise as success (app-lifecycle.service.ts).
- teardownVault saves the index cache under the tracked indexed vault path, not vaultStore.path, because during a vault switch the store already points at the new vault (app-lifecycle.service.ts).
- Settings persistence and Sentry are stopped at the start of initializeVault, before loadSettings, so one vault's settings are never written to another vault (app-lifecycle.service.ts).
- When the index scan does not complete, readiness stays suppressed for that vault session and the init-time readers of the Rust index are skipped; the vault-index-updated listener still refills stores (app-lifecycle.service.ts).
- applyNoteChange is a silent no-op for consumers that are not registered, so initializeVault registers the per-file note-change consumers before anything can write a note (app-lifecycle.service.ts).
- The vault-index-updated listener survives vault switches and is throttled; vaultStore.requestPromptIndexRefresh() makes the next refresh run at once (tauri-listeners.service.ts, src/lib/core/vault/vault.store.svelte.ts).
- Watcher batches drop mod code under _system/mods/ and skip the rebuild when every changed path is a directory or a recent self-save (watcher-handler.service.ts).
- The daily and capture deep-link actions live here because a feature must not import a plugin (deep-link-actions.ts header).
- appEditorHost is one constant installed once per editor and never reconfigured (editor-host.ts).
- shortcutFor throws when no global binding names the command, so a palette shortcut label cannot silently disappear (global-keybindings.ts).
- No file under src/lib outside this folder may import it: the app-inbound rule in scripts/import-graph.mjs, run by src/tests/lib/architecture/layer-rules.test.ts, flags any such import. src/routes is not scanned, which is why it may import app.
