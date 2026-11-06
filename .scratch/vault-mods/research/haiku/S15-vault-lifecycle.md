# S15: Vault open, switch, close and the hooks a mod could use

Read-only research. Paths are relative to the repo root `/Users/diegorv/Dev/pet-projects/koko/brain`. I also read `docs/agents/indexing-watcher-rules.md` because the repo rules point there for watcher and lifecycle code.

## Answer

Opening a vault is a store write. `switchVault`, `openRecentVault` and `openVaultDialog` (`src/lib/core/vault/vault.service.ts`) save dirty tabs, drain write barriers, then call `vaultStore.open(path)`. The lifecycle itself runs from one Svelte `$effect` in `src/routes/(app)/+layout.svelte:74-90`: when `vaultStore.path` changes, it calls `initializeVault(path)`, or `teardownVault()` when the vault closes. There is no exported "vault opened" or "vault closed" event bus. The only places to attach vault-scoped work are inside `initializeVault` and `teardownVault` in `src/lib/app/lifecycle/app-lifecycle.service.ts`, or through the registries the lifecycle already uses.

Vault-lifetime registrations are unwound in `teardownVault` and at the entry of `initializeVault`. App-lifetime ports are wired once by `registerAppPorts()` in `src/lib/app/boot.ts`. A mod loader needs one of those two lifetimes, and it must be unregistered in both places a vault can leave.

Hooks that exist today: after-save observers, the note-change consumer registry, the path-change registry, the content-invalidation signal, the raw watcher listener, tab-close listeners, deep-link actions, keybindings, and the rail navigator registry. Missing: a note-opened hook, a vault-opened/closed event, and a generic command-palette registry.

## Evidence

### Vault open and switch
- `src/lib/core/vault/vault.service.ts:22-27` `switchVault`: `saveAllDirtyTabs()` plus discard prompt (23), `drainPendingWrites()` (24), then `vaultStore.open(path)` (25). Comment at 11-21 says the drain must finish while the path is still the old vault.
- `vault.service.ts:30-34` `openVaultDialog` (native directory picker, then `switchVault`).
- `vault.service.ts:40-53` `openRecentVault`: checks the path exists, removes stale recents, then `switchVault`.
- Callers: `src/routes/(app)/+page.svelte:13,17`; deep links `src/lib/features/deep-link/deep-link.service.ts:172`.
- `src/lib/core/vault/vault.store.svelte.ts:79-86` `open(path)`: sets `vaultPath` and `vaultName`, updates and persists recents to localStorage. It does not call init or teardown.
- `vault.store.svelte.ts:89-92` `close()`: nulls path and name only. Teardown is not called from here. The layout effect does it.
- `src/routes/(app)/+layout.svelte:74-90`: `$effect` reads `vaultStore.isOpen` and `vaultStore.path`. Inside `untrack`, it calls `initializeVault(path)` when open, else `teardownVault()` (line 86).
- `src/lib/core/vault/exit.service.ts:15-23` `prepareForExit`: saves dirty tabs, drains barriers, flushes settings. Used by `src/lib/core/settings/sections/UpdateSection.svelte:221` and `src/lib/app/tauri-listeners.service.ts:9`.

### initializeVault (app-lifecycle.service.ts:134)
- Entry resets, before any await (138-161): `resetIndexReady`, `invalidateVaultEntries`, `resetEventCalendar`, `stopSettingsPersistence`, `disableSentry`, unregister `unregisterNoteChangeConsumers`, and unsubscribe the file-history and search after-save hooks. The comment at 152-159 explains that skipping this leaks consumers and observers on a double switch.
- Re-init teardown (171-190): if `unsubscribeFileChange` is set, it saves dirty tabs, drains calendar writes, and calls `teardownVault()` (189).
- Step 1, settings (196-211): `loadSettings(vaultPath)`, then `startSettingsPersistence(vaultPath)` (211).
- Step 2, DB (232-241): `open_vault_db` IPC, and a `initVersion` staleness check after each await.
- Vault-lifetime consumer registrations (247-264): collection, file icons, event calendar, files/types/collection/neighbourhood navigators, one-on-one, kanban, calendar rail. Daily-note opener at 267. These are the closest existing pattern for a per-vault registry.
- File history hook (269-274), settings-gated. Search after-save hook (430). Auto-move hook (432-434).
- Step 3, user data in parallel (286-298): migrate bookmarks, recent icons, trash, auto-move config.
- Step 4, index build (316-318): `buildIndex` and `loadDirectoryTree` in parallel. `markIndexReady()` at 332 if the scan succeeded. `invalidateVaultEntries()` at 352. `indexedVaultPath` set at 357 (this is the key for the cache save at teardown).
- Step 5b, secondary builders via `setTimeout(0)` (408-420): tags, properties, frontmatter icons. Gated on `indexBuilt`.
- Step 6 (425-478): FTS build (async), search hook, auto-move hook, semantic init deferred 3 s (`SEMANTIC_INIT_DEFER_MS`, line 93).
- Step 7, watcher (486-506): `serializeWithRerun` batch, 300 ms debounce, `onFileChange` at 499, `startWatching(vaultPath)` at 504. Comment at 481-482 says it is registered last on purpose.
- Step 8 (508): `executePendingAction()` for deep links.
- Step 9 (520-528): `autoOpenDailyNote` and `maybeAutoCheckForUpdates` after one macrotask, guarded by `initVersion`.

### teardownVault (app-lifecycle.service.ts:538)
- `initVersion++` and clear pending timers and watcher paths (541-551).
- Unsubscribe file change, file history, search index hooks (553-570). Unregister `unregisterNoteChangeConsumers` (571-572) and the daily-note opener (573-574).
- Stop settings persistence (580), `stopWatching()` (581), semantic listener, Tauri debug listener, log session, Sentry (582-585).
- `save_vault_cache` for `indexedVaultPath` (591-596), `shutdown_semantic` (602), `close_vault_db` (606), `closeFileHistory()` (609).
- `resetHooks()` (621), then a long list of store resets through `resetDeepLink` (646), `resetTrash` (648), `typeDefinitionsStore.reset()` (651), and others to about line 652.

### Write barriers and app-lifetime ports
- `src/lib/core/vault/write-barrier.service.ts:23-31` `registerWriteBarrier`. Comment at 14-16: registered for the app lifetime, because `initializeVault` unregisters its vault-lifetime list before it drains. `drainPendingWrites` at 37-41.
- `src/lib/app/boot.ts:34-83` `registerAppPorts()`. Comment at 29-33: call it synchronously at shell load, never from a vault-scoped effect. Idempotent (35). `unregisterAppPorts` at 89-92. HMR dispose at 97.

### Note save, change and path hooks
- `src/lib/core/editor/editor.hooks.ts:52-60` `addAfterSaveObserver`, returns unsubscribe. The observer type (10-11) receives `(filePath, content)` and is fire-and-forget.
- `editor.hooks.ts:67` `notifyAfterSave`: `markRecentSave`, `applyNoteChange({source:'save'})` (synchronous for save), `notifyContentInvalidated()`, then the observer loop with errors caught and logged.
- `editor.hooks.ts:95-101` `resetHooks` clears observers and the recent-save map.
- Existing observers: `search.service.ts:301-303`, `auto-move.service.ts:94-96`, `file-history.service.ts:190-192`, `SemanticIndexStatus.svelte:23`.
- `src/lib/core/filesystem/note-change.service.ts:104` `registerNoteChangeConsumer(consumer)` with `upsert` and `remove`, both documented as synchronous. Sources and policy: `SOURCE_POLICY` at line 86, sources `save | edit | watcher | create | fs | restore` (type declared in the module header, exact line not re-read). `note-change.service.ts:139` `registerContentInvalidationListener`.
- `src/lib/core/filesystem/path-change.service.ts:73` `registerPathChangeConsumer`.
- `src/lib/core/filesystem/fs.watcher.ts:67` `onFileChange(listener)`: raw paths after the Rust watcher filter.
- `src/lib/core/editor/editor.service.ts:28` `registerTabCloseListener(name, closed)`.
- Note open: `src/lib/core/editor/editor.service.ts:99` `openFileInEditor` has no observer or listener call. Searched `src/lib` for `onTabOpen`, `onFileOpen`, `onNoteOpen`: not found. Note-opened hook: not found.

### Commands, keys, deep links, rail
- `src/lib/app/commands.ts:93` `getBuiltInCommands()`: static list. Rail "Go to" commands come from `railItems` (`src/lib/features/rail-shell/rail-items.logic.ts`). No generic `registerCommand` found in `src/lib` (grep of `export function register` returns only the entries listed in this report).
- `src/lib/utils/keybindings.ts:57` `registerKeybinding(binding)`, used by `src/lib/app/global-keybindings.ts:222-224`.
- `src/lib/features/deep-link/deep-link.service.ts:56` `registerDeepLinkAction(type, handler)`: handler receives the action and vault path. Used from `src/lib/app/deep-link-actions.ts:227`.
- Rail: `src/lib/features/rail-shell/rail-registry.store.svelte.ts` has `registerNavigator`, `registerLensProvider`, `registerTodaySection`, `registerFolderCreator`, each returning an unregister and cleared by `reset()`. The registry comment says plugins register here at vault open and unregister at teardown.
- `src/lib/features/rail-shell/rail-shell.types.ts:175-186` `RailNavigator` needs `icon: Component` and `component: Component` (Svelte components), plus `lens`. A plain JS mod cannot supply these without a host-provided generic component (INFERRED from the type, not from a running build).
- `src/lib/features/rail-shell/Rail.svelte` builds its buttons from `railItems(...)` (line 63) and `railRegistryStore` (line 22).

### Security and platform constraints (relevant to "call an HTTP API" and "read/write files")
- `src-tauri/tauri.conf.json:29` CSP: `script-src 'self' 'unsafe-eval'`, `connect-src` allows only `ipc:`, `huggingface.co`, `github.com`, `objects.githubusercontent.com`, `api.todoist.com`, and Sentry hosts. Arbitrary HTTP from the webview is blocked by CSP.
- `src-tauri/capabilities/default.json`: `http:allow-fetch*` only for `https://api.todoist.com/**` and `https://raw.githubusercontent.com/diegorv/koko.brain-themes/**`. Other hosts need a capability change or a Rust command.
- Same file: `fs:allow-read-text-file`, `fs:allow-write-text-file`, `fs:allow-remove`, etc. are scoped to `$DOCUMENT/kokobrain-vaults/**` and `$HOME/kokobrain-vaults/**` (and `.kokobrain`). The vault picker (`openVaultDialog`) accepts any folder. Whether vaults outside those roots break plugin-fs reads is NOT verified. The app mostly reads through Rust IPC (`read_files_batch` canonicalizes and checks the vault, per `indexing-watcher-rules.md` rule 9 and `indexing-watcher-rules.md` rule 4).
- Precedent for vault-authored code: `src/lib/plugins/queryjs/kb-api.ts:413` and `:552` run note-authored JS through `new Function('kb', 'dv', ...)`. The `'unsafe-eval'` CSP allows this. The `kb` object is the only API handed in, but the code runs in the same webview realm (INFERRED: it could reach `window.__TAURI__` or `invoke` directly, which matters for a mod sandbox).
- Watcher ignores dot-directories: `docs/agents/indexing-watcher-rules.md` rule 5 (`is_inside_hidden_dir`, watcher Rust side). A mod stored in `.kokobrain/` or another hidden folder will not trigger a reload through the watcher.

## Implications for vault mods

1. **Discovery point.** Load mods in `initializeVault` after Step 1 settings (needs the vault path and settings) and before Step 7 watcher, or after Step 9. Unload in `teardownVault` (line 538) and in the re-init branch that runs `teardownVault` (line 189). Also unregister at `initializeVault` entry (138-161), because the double-switch path skips the re-init teardown.
2. **Lifetime.** Mod registrations that touch vault state belong in the vault-lifetime list (the `unregisterNoteChangeConsumers` pattern). Mod entry points that must survive vault switches (for example a rail button that opens a picker) belong in `registerAppPorts`, but then the modal must read vault state per call.
3. **Hooks available now.** Save: `addAfterSaveObserver`. Content changes: `registerNoteChangeConsumer` and `registerContentInvalidationListener`. Renames and deletes: `registerPathChangeConsumer`. Raw watcher: `onFileChange`. Tab closes: `registerTabCloseListener`. Shortcuts: `registerKeybinding`. Deep links: `registerDeepLinkAction`.
4. **Hooks missing.** A vault-opened/closed event (the layout effect is the only trigger). A note-opened event (`openFileInEditor` has no observer). A command registry for the palette. A rail entry point that takes plain JS (`RailNavigator` needs Svelte components). Each would be a new host-side registry, following the existing `register*` pattern.
5. **Entry-point button.** The rail button is a `RailNavigator` or a new registry entry. A rail navigator that opens a modal needs a host-provided Svelte component that accepts a mod-supplied action list. Not designed yet.
6. **Network and file access.** Calling arbitrary HTTP APIs and an MCP server needs a Rust-side command (or a capability/CSP change), not a plain `fetch` from mod JS. Vault file reads and writes should go through the existing Rust IPC (`read_files_batch`, `write`-side commands) so they stay inside the canonicalize check. This is a product and security decision to write into the PRD.
7. **Sandbox.** Mod JS would run in the same realm as the app, with `'unsafe-eval'` allowed. Any sandbox (Worker, iframe, or host-mediated API object) is a new design choice. The queryjs precedent offers no isolation.

## Open questions

- Where mods live: a visible vault folder (watcher-reloadable) or a hidden `.kokobrain/` folder (not watcher-reloadable, per rule 5). Affects hot reload.
- Does vault-open need a new event bus, or can mods be wired directly into `initializeVault` steps? Not decided in this research.
- Behavior of plugin-fs for vaults outside `$DOCUMENT/kokobrain-vaults` or `$HOME/kokobrain-vaults`: not tested. Check before relying on plugin-fs for mod files.
- Whether the Rust side has an LLM client or an agent runner. Not searched (out of S15 scope).
- Whether a Svelte modal host can take a JSON-described action form. Not searched beyond the rail types.
- Verified: nothing was built, run or tested. All line numbers come from reading the files above; the CSP and capability facts were read from `src-tauri/tauri.conf.json` and `src-tauri/capabilities/default.json`.
