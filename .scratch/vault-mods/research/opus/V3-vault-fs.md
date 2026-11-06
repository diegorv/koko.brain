# V3: Vault storage, filesystem API, watcher and loading (validator report)

Theme: where mods live in the vault, how JS reads and writes vault files, how the watcher reports changes, how a `.js` file can be loaded, and where the vault lifecycle lets mods load and unload.

Scout status: only S15 (`haiku/S15-vault-lifecycle.md`) exists. S11, S12, S13 and S14 never wrote a report, so this validator answered their questions from the code. S05 (`haiku/S05-csp-webview.md`, another validator's theme) was read as background only. Facts taken from it are marked "per S05" where I did not check them myself.

All paths are relative to the repo root. Nothing was built or run.

---

## 1. Verified facts (file:line)

### 1.1 Per-vault system storage (S11)

- `.kokobrain/` is the app's hidden per-vault metadata folder. The frontend uses it for:
  - settings: `settings.service.ts:13-24` (`.kokobrain/settings.json`)
  - folder order: `fs.service.ts:24-39`
  - trash: `trash.logic.ts:4`
  - auto-move rules: `auto-move.service.ts:18`
  - Todoist state: `todoist.service.ts:12`
  - bookmarks: `bookmark-migration.service.ts:11`
  - snapshot backups: `file-history.logic.ts:121`
  - file icons: `file-icons.service.ts:22`
  - logs: `settings.types.ts:387-389`
- Rust also writes there: the SQLite DB at `src-tauri/src/db/mod.rs:29-42` (`.kokobrain/kokobrain.db`) and the index cache at `src-tauri/src/vault/index_cache.rs:46-49` (`.kokobrain/vault-index.msgpack`).
- There is a second, visible system folder. `settings.store.svelte.ts:94-97` sets the defaults `templates.folder = '_system/templates'` and `templates.systemFolder = '_system'`. Its doc comment (`settings.types.ts:172-177`) says it is excluded from the type sidebar only: note list, nav counts and the inbox dock badge.
- That exclusion runs only in the UI or the query layer. `excludeSystemFolder` (`type-sidebar.logic.ts:53-63`) filters by path prefix. It is applied in the rail, QueryJS, the calendar and the event calendar (grep hits: `Rail.svelte:42`, `kb-api.ts:472`, `day-lens.logic.ts:48`, `event-calendar-event.logic.ts:243`). No Rust indexer skips `_system/`.
- What the Rust walks skip:
  - Every walk skips dot-prefixed names at any depth and skips symlinks: `utils/fs.rs:175`, `:189`, `:228`, `:239`, `:284`, `:295`.
  - The tree scan does the same: `commands/vault.rs:146`, `:163`.
  - The `VaultIndex` scan passes no excluded folders: `commands/vault.rs:225` and `:1431`, both `&[]`.
  - The FTS5 build also passes none: `commands/search_index.rs:62` (`&[]`).
  - Only the semantic build excludes a folder, and the name is hard-coded: `semantic.rs:1479` `EXCLUDED_FOLDERS = &["_templates"]` (note: not `_system/templates`), used at `semantic.rs:525`.
- Which file types each index takes:
  - The `VaultIndex` and the tree-walk indexers accept only `.md`, `.markdown` and `.view` (`utils/fs.rs:140-143`).
  - FTS5 and semantic accept `.md` and `.markdown` only (`utils/fs.rs:152-154`).
  - `update_note_in_index` returns early for any other file type (`commands/vault.rs:325`).
  - So a `.js` file is never indexed. A `.md` file inside a mods folder (for example a README) is indexed by `VaultIndex` and FTS5 unless the folder is hidden.
- The file tree (`scan_vault`, `commands/vault.rs:134-199`) lists every non-hidden file of any extension. A visible `_system/mods/foo.js` shows up in the file explorer.
- A `.js` file opens in the editor as text, because only binary files are rejected (`editor.service.ts:109-113`).

### 1.2 Filesystem API and path confinement (S12)

**Two parallel write and read surfaces:**

1. **`@tauri-apps/plugin-fs`**, used directly by about 28 frontend modules (grep of `src/lib`). The note editor reads and saves with it (`editor.service.ts:1`, `:125`), as do settings, trash, the file service and others. The ACL is `src-tauri/capabilities/default.json`:
   - `read-dir` at :36-64
   - `read-text-file` at :65-81
   - `write-text-file` at :82-101
   - `mkdir`, `remove`, `rename`, `copy-file` and `exists` at :102-222

   Each grant is scoped to `$DOCUMENT/kokobrain-vaults/**` and `$HOME/kokobrain-vaults/**`, plus explicit `/**/.kokobrain/**` entries (and `$APPLOG` for some). The scope covers every vault under those roots, not only the open one.
2. **App `#[tauri::command]`s in Rust**, which call `std::fs` directly and so are outside the plugin-fs ACL. The registry is `lib.rs:325-389`. What each one checks:
   - `read_files_batch` (`commands/files.rs:23-84`): canonicalizes each path and requires `canonical.starts_with(vault_root)` (:37-60). But `vault_root` comes from the caller's `vault_path` argument (:25, :31), and `validate_vault_path` (`utils/fs.rs:59-67`) only canonicalizes it and checks `is_dir()`. JS that passes `vaultPath: "/"` can read any file the process can read. The check stops a trusted frontend from making relative-path mistakes. It does not stop hostile JS.
   - `scan_vault(path)` (`commands/vault.rs:115-132`): accepts any directory (only `validate_vault_path`), so it lists any directory tree on disk.
   - `create_note` and `create_folder` (`commands/vault.rs:984-1022`): only `ensure_safe_write_path` (:958-970), which requires an absolute path with no `..` component. There is no vault-containment check. `create_note` refuses an existing file (:992-994). `create_folder` is `create_dir_all` anywhere.
   - `toggle_task_status_inner` (`commands/vault.rs:760-781`): reads and atomically rewrites any `path` it is given, with no path validation.
- JS outside the bundle can reach every app command. `@tauri-apps/api/core.js:341` calls `window.__TAURI_INTERNALS__.invoke`, which is a page global. `withGlobalTauri` is not set in `tauri.conf.json` (default `false` per the Tauri 2 config reference), so `window.__TAURI__` is absent, but `__TAURI_INTERNALS__` is always there. Per S05 (not re-verified by me), app commands get no ACL check because `build.rs` sets no app manifest. `build.rs:22` is a bare `tauri_build::build()`, which I confirmed.
- No runtime scope extension was found. A grep of `src-tauri/src` for `allow_directory`, `FsExt`, `fs_scope` and `asset_protocol_scope` returned nothing. The vault picker is `open({ directory: true, multiple: false })` (`vault.service.ts:31`). The picker page tells users the allowed locations are `~/Documents/kokobrain-vaults/` and `~/kokobrain-vaults/` (`src/routes/(app)/+page.svelte:44`). So the product expects vaults under the two plugin-fs roots. S05 says the dialog plugin adds the picked folder to the fs scope at runtime. I did not verify that, because the plugin source is outside the repo. Even if true, it would not survive a relaunch through Recent Vaults, since no persisted-scope plugin is registered (`lib.rs:310-318`).
- The asset-protocol scope does not match the fs scope (`tauri.conf.json:30-44`). It lists `$HOME/kokobrain-vault/**` (singular), while the fs scope uses `$HOME/kokobrain-vaults` (plural). `$DOCUMENT/**` covers `~/Documents/kokobrain-vaults`. So a vault under `~/kokobrain-vaults/` has plugin-fs access but no asset-protocol access. This matters only if mods are ever loaded through `asset:`.
- Hidden-folder matching: the Tauri 2 config reference says FsScope `requireLiteralLeadingDot` defaults to `true` on Unix, so `*` and `**` do not match dot segments (https://v2.tauri.app/reference/config/, read 2026-11-05). That is why every grant names `.kokobrain` literally. INFERRED from that default: plugin-fs denies any other hidden folder such as `.mods/` or `.kokobrain-mods/`, while `read_files_batch` (Rust) would read it.

### 1.3 Watcher (S13)

- Rust side: `notify::recommended_watcher` with `RecursiveMode::Recursive` on the vault root (`vault/watcher.rs:269-285`).
  - It reports every file type. The only filters are `is_inside_hidden_dir` (any dot segment at any depth, :71-79) and `is_write_atomic_temp` (:85-95), applied at :211.
  - The debounce is 500 ms from the last real event (:34, :203-244), and ancestor paths are collapsed (:104-115).
  - It emits `vault-files-changed` with `{ paths }` (`commands/watcher.rs:17-21`).
  - `replace_watcher` joins the old bridge thread before starting a new one, so no event from the old vault arrives after a switch (`vault/watcher.rs:306-330`).
- The frontend consumer is `core/filesystem/fs.watcher.ts`, not `app/tauri-listeners.service.ts` as S13's question assumed.
  - `startWatching` subscribes before it invokes `start_vault_watcher` (:268-288).
  - `handleChangedPaths` patches the tree, then calls `notifyListeners` (:143-255).
  - `onFileChange(listener)` returns an unsubscribe and is a plain module-level list (:52, :67-72). `stopWatching` does not clear it (:291-304).
  - `tauri-listeners.service.ts` handles menu, close, exit and `vault-index-updated` (:25, :48, :77, :121).
- The lifecycle consumer is a second, 300 ms debounce plus `serializeWithRerun` (`app-lifecycle.service.ts:486-503`). It calls `reloadExternallyChangedTabs`, then `rebuildAllIndexes` (`watcher-handler.service.ts:33-82`).
- A watcher batch that contains a `.js` file but no Markdown runs the FULL rebuild. `filePaths` keeps any basename with a dot (:36-39). `mdPaths` is empty (:52), so the incremental branch is skipped (:56), and the batch runs `rebuildIndex()`, `buildPropertyIndex()` and `buildFrontmatterIconIndex()` (:71-73). `docs/agents/indexing-watcher-rules.md` rule 4 says the same: "a batch with no Markdown takes the full rebuild".
  - The self-save skip (:44) applies only when the editor marked the path with `markRecentSave`.
  - So every external save of a mod `.js` in a visible folder costs a full `scan_vault_v2_cached` walk plus two TS bulk builders. I did not measure that cost.
- Hidden folders (`.kokobrain/` included) never produce events (`watcher.rs:211`; rule 5). A mod in `.kokobrain/mods/` cannot hot-reload through the existing watcher.

### 1.4 Loading a `.js` file as code (S14)

- CSP (`tauri.conf.json:29`) is `default-src 'self'; script-src 'self' 'unsafe-eval'`. It has no `worker-src`, `child-src` or `frame-src`, so those fall back to `default-src 'self'` (standard CSP fallback, from memory, not re-checked).
  - `asset:` and `http://asset.localhost` appear only in `img-src`.
  - Static or dynamic `import()` of an `asset://` URL (`convertFileSrc`), a `blob:` URL or a `data:` URL is therefore not allowed by `script-src`. INFERRED from the CSP text, not tested in the webview.
- `'unsafe-eval'` allows `new Function` and `eval`. The existing precedent is QueryJS:
  - It reads a vault `.js` through plugin-fs `readTextFile` (`queryjs.service.ts:1-5`).
  - It resolves the script path under the vault root and rejects `..` (`kb-api.ts:526-538`).
  - It runs the code with `new Function('kb', 'dv', 'input', code)` (`kb-api.ts:409-414`) and `new Function('kb','dv', ...)` for blocks (`kb-api.ts:551-555`).
  - Code run this way cannot use static `import`/`export` syntax. A mod format built on it must be a function body or a CommonJS-like wrapper, not an ES module. INFERRED from JS semantics.
- `convertFileSrc` is used only for image and asset URLs (`app/editor-host.ts:112-114`). Nothing in the app loads code from `asset:`.
- Tauri rewrites the CSP at compile time, injecting nonce and hash sources for the app's own scripts and styles. When `devCsp` is unset, as here, the same `csp` applies in dev. Source: Tauri 2 config reference, SecurityConfig `csp`, `devCsp` and `dangerousDisableAssetCspModification` (read 2026-11-05). So dev and release block the same loading routes.
- Constraint from CI: `.github/workflows/privacy.yml:36-57` scans `src/**/*.ts`, `.svelte` and `.js` and fails on `new\s+Worker\s*\(`, `iframe\.src\s*=`, `script\.src\s*=`, `fetch\s*\(`, `@tauri-apps/plugin-http` and any `https?://`, unless the line is known or carries `privacy-ok`.
  - A Worker or iframe sandbox for mods will trip this gate, and so will a host HTTP bridge.
  - Mod code that lives in the vault is not scanned.
- `PRIVACY.md` is stale here. It says Chart.js loads from a CDN in `dv-ui.ts`. `dv-ui.ts` does not exist, and Chart.js is a bundled dynamic import (`kb-ui.ts:917-919`). This is unrelated to mods but is a stale doc.

### 1.5 Vault lifecycle (S15)

S15's citations were checked line by line and hold:
- `vault.service.ts:22-53`
- `vault.store.svelte.ts:79-92`
- `+layout.svelte:74-90`
- `app-lifecycle.service.ts`: init entry resets :134-169, re-init teardown :173-190, settings :196-211, DB :230-241, vault-lifetime list :247-264, index :316-357, watcher :486-506, deep link :508, step 9 :520-528, `teardownVault` :538-653 with `resetHooks()` at :621
- `boot.ts:25-41` and :84-97
- `editor.hooks.ts:10`, :52, :67, :95
- `note-change.service.ts:17`, :104, :139
- `path-change.service.ts:73`
- `fs.watcher.ts:67`
- `editor.service.ts:28` and :99
- `write-barrier.service.ts:23` and :37
- `exit.service.ts:15`

Additions:
- `vaultStore.close()` (`vault.store.svelte.ts:89-92`) has no production caller (grep of `src/lib` and `src/routes`). The vault picker page renders only when no vault is open (`AppShell.svelte:184-185`). The only in-session vault switch is a deep link (`deep-link.service.ts:172` calls `switchVault`). "Vault closed" in practice means app exit or switch, and the switch runs `teardownVault` from inside `initializeVault` (:189).
- At app start no vault is open, so the layout effect calls `teardownVault()` once with nothing loaded (`+layout.svelte:80-87`). A mod unloader must be a no-op when nothing is loaded.
- `resetHooks()` at teardown (`app-lifecycle.service.ts:621`; `editor.hooks.ts:95`) clears every after-save observer, including ones registered outside the lifecycle. A mod after-save observer is cleared on every vault switch whether the mod wanted that or not.
- `railRegistryStore.reset()` exists, but `teardownVault` never calls it (grep found no caller outside tests). Rail registrations are released only by each registrant's own unregister in `unregisterNoteChangeConsumers`, as `registerCalendarRail()` at :263 is.
- `registerAppPorts()` is called once, synchronously, from `src/routes/(app)/+layout.svelte:28`.

---

## 2. Refuted or corrected claims

S15 is the only scout report. Its claims, corrected:

1. **"Arbitrary HTTP from the webview is blocked by CSP"** (S15:71). Partly right. Webview `fetch` and XHR are limited by `connect-src` (`tauri.conf.json:29`). `@tauri-apps/plugin-http` requests run over IPC and are limited by the capability URL scopes (`default.json:223-266`), not by CSP. Rust `reqwest` exists (`Cargo.toml:65`; `semantic/model.rs:149`) and neither CSP nor capabilities apply to it. Any HTTP the mods need goes through one of those last two channels, and so does the trust decision.
2. **"Vault file reads and writes should go through the existing Rust IPC (`read_files_batch`, write-side commands) so they stay inside the canonicalize check"** (S15:84). This overstates the protection:
   - `read_files_batch` trusts the caller's `vault_path` (`files.rs:25,31`).
   - There is no Rust write-side command with a containment check: `create_note` and `create_folder` check only "absolute, no `..`" (`vault.rs:958-970`), and `toggle_task_status` checks nothing (`vault.rs:760-781`).
   - The note editor saves through plugin-fs `writeTextFile` (`editor.service.ts:1`), not through Rust.
   - Neither surface confines writes to the open vault. Plugin-fs confines them to all vaults under the two roots, and Rust commands confine them to nothing.
3. **"Rail registry ... cleared by `reset()`. The registry comment says plugins register here at vault open and unregister at teardown"** (S15:66). The comment is accurate (`rail-registry.store.svelte.ts:3-6`), but `reset()` is never called in production. Cleanup depends on each registrant's own unregister being in the vault-lifetime list.
4. **"Unregister at `initializeVault` entry (138-161), because the double-switch path skips the re-init teardown"** (S15:79). Correct. Note also that `resetHooks()` runs only in `teardownVault`, so on the skipped-teardown path the after-save observers registered outside `unsubscribeFileHistory` and `unsubscribeSearchIndex` survive. A mod's after-save observer needs its own entry-time unregister, like those two.
5. **"`fs:allow-read-text-file` ... scoped to ... (and `.kokobrain`)"** (S15:73). Correct. S15 then said it is "NOT verified" whether vaults outside those roots break plugin-fs. Partly answered: the product tells users vaults must sit under the two roots (`+page.svelte:44`), and the code adds no scope at runtime (grep of `src-tauri/src`). See 1.2 for the unverified dialog-plugin behaviour.
6. **"Watcher ignores dot-directories ... rule 5"** (S15:75). Confirmed in code at `vault/watcher.rs:71-79` and :211, at any depth, not only at the vault root.
7. **S13's premise that the watcher notifies via `app/tauri-listeners.service.ts`** is wrong. The consumer is `core/filesystem/fs.watcher.ts:268-288`.
8. **S14's premise that `convertFileSrc` or the asset protocol could load a module.** The asset scope exists (`tauri.conf.json:30-44`), but `script-src` does not list `asset:` (:29), so it is not a code path without a CSP change.

---

## 3. Answers to the scouts' open questions

- **Where should `mods/` live?** Two options, each with a cost:
  - **Visible `_system/mods/`**, following the `_system/templates` default (`settings.store.svelte.ts:95-96`).
    - Gains: watcher events, so hot reload through `onFileChange`; covered by the plugin-fs `**` grants; shown in the file tree, where the user can edit it.
    - Costs: every external `.js` save triggers a full index rebuild (`watcher-handler.service.ts:52-73`); `.js` files clutter the tree (`vault.rs:134-199`).
    - Accidental indexing: any `.md` file in the folder enters `VaultIndex` and FTS5, because `_system` is excluded only in the UI (`type-sidebar.logic.ts:53-63`); semantic search excludes only `_templates`.
  - **Hidden `.kokobrain/mods/`**.
    - Gains: never indexed, never in the tree, never in watcher events; plugin-fs already grants `.kokobrain/**` (`default.json:46-49`, :72, :89).
    - Costs: no hot reload without new work, and users cannot see or edit the files in-app.
    - Any other dot-folder name is denied by plugin-fs (INFERRED from `requireLiteralLeadingDot`).
- **Can the watcher drive hot reload?** Yes for a visible folder. A loader can call `onFileChange` and filter paths under the mods prefix (`fs.watcher.ts:67-72`). Events come after the 500 ms Rust debounce. The loader should not share the lifecycle's extra 300 ms debounce, because that one feeds `rebuildAllIndexes`. For a hidden folder there are three options: a "Reload mods" action, a separate narrow Rust watcher, or an exception in `is_inside_hidden_dir`. The exception changes an invariant in Indexing rule 5, and its events would then also reach `rebuildAllIndexes`, which would full-rebuild unless filtered.
- **Can JS read arbitrary absolute paths?** Through plugin-fs, no: it is limited to the two vault roots and `$APPLOG`. Through app commands, yes in practice: `read_files_batch` with a caller-chosen `vaultPath`, and `scan_vault` on any directory. Same-realm mod code can call both through `window.__TAURI_INTERNALS__.invoke`.
- **Does the Rust side constrain paths to the vault?** Only `read_files_batch`, and only against a root the caller supplies (`files.rs:31-60`). Writes check only absolute plus no `..` (`vault.rs:958-970`), or nothing (`vault.rs:760-781`). No Rust state records "the open vault" for path checks. The DB is per vault (`crate::db::is_open()`, `lib.rs:45`), but the file commands do not consult it.
- **Can a `.js` file load as an ES module?** Not under the current CSP: `script-src 'self' 'unsafe-eval'` rules out `asset:`, `blob:` and `data:` imports (INFERRED, not run). What works today is `readTextFile` plus `new Function` (the QueryJS pattern), with no `import`/`export` syntax. An ES-module path needs a CSP change, such as adding `blob:` or a custom scheme to `script-src`, and that is a security decision.
- **Where to discover, load and unload mods?**
  - Load inside `initializeVault` after Step 1 (`app-lifecycle.service.ts:199-211`; settings are loaded, so a per-vault enable list can be read), behind the same `initVersion` check.
  - Register the unregister handle in `unregisterNoteChangeConsumers` (:247-264), or in a dedicated slot that is released both at init entry (:160-169) and in `teardownVault` (:571-574).
  - Mod UI that must exist before a vault opens (an app-lifetime rail button) goes in `registerAppPorts` (`boot.ts:34`), and the action must read vault state per call.
- **Is there a note-opened or vault-opened hook?** No. `openFileInEditor` (`editor.service.ts:99`) calls no observer. The only vault-open trigger is the layout `$effect` (`+layout.svelte:74-90`).

---

## 4. Remaining gaps

- Whether the dialog plugin's runtime fs-scope grant (per S05, in `tauri-plugin-dialog-2.8.4/src/commands.rs`) is recursive, and whether plugin-fs 2.7.1 honours it. Not read, because the source is outside the repo. Product docs say vaults belong under the two roots anyway.
- The CSP fallback for `worker-src` and `frame-src`, and the claim that `import()` of `blob:` or `asset:` is blocked, are inferred from the CSP text. They were not tested in the WKWebView, and the Tauri-injected nonces and hashes were not inspected in a build.
- The cost of the full rebuild that a non-Markdown watcher batch causes (`watcher-handler.service.ts:71-73`) on the owner's vault was not measured.
- Whether `reloadExternallyChangedTabs` (`editor.service.ts:423`) behaves correctly for a `.js` open in a tab when it changes on disk. Not read.
- Whether the macOS app runs under the App Sandbox, which would bound what `read_files_batch` with `vaultPath: "/"` can reach. Entitlements were not checked.
- `open_vault_db`'s path handling and the history commands' paths: not read (S05 covers them).

---

## 5. Constraints the vault-mods design must respect

1. **Same-realm JS has full app power.** Code run in the main webview (`new Function`, the QueryJS model) can invoke every app command through `window.__TAURI_INTERNALS__.invoke` (`@tauri-apps/api/core.js:341`):
   - read any readable file (`read_files_batch` with any `vaultPath`, `files.rs:25-60`);
   - list any directory (`scan_vault`, `vault.rs:115-132`);
   - create files and folders anywhere (`vault.rs:958-1022`);
   - edit task lines in any file (`vault.rs:760-781`);
   - read, write and delete across every vault under the plugin-fs roots (`default.json`).

   A host-provided `api` object does not limit any of this. The PRD must either accept "mods are trusted user code" or design isolation, plus Rust-side containment and an app ACL.
2. **CSP shapes the mod format.** With `script-src 'self' 'unsafe-eval'` (`tauri.conf.json:29`), the only loading route that works without a config change is text plus `new Function`, which has no ES `import`/`export`. Changing CSP or the asset scope is a security-sensitive edit (`PRIVACY.md:34`) and also affects dev, because no `devCsp` is set.
3. **The privacy CI gate** (`.github/workflows/privacy.yml:36-57`) rejects host code that adds `new Worker(`, `iframe.src =`, `fetch(`, `@tauri-apps/plugin-http` or URLs, unless the line is annotated `privacy-ok` and listed in `PRIVACY.md`. Host-side HTTP or MCP bridges and Worker or iframe sandboxes must plan for that approval.
4. **Placement trade-off.** `.kokobrain/mods/` is the only hidden folder plugin-fs already allows. It is invisible to the watcher, the tree and the indexes, so it has no hot reload. A visible `_system/mods/` gets watcher events, but every external `.js` save triggers a full index rebuild (`watcher-handler.service.ts:52-73`). Its `.md` files are indexed by `VaultIndex` and FTS5, and its `.js` files show in the tree. If a visible folder is chosen, `rebuildAllIndexes` should get a mods-path filter so it skips the rebuild, and that change is an Indexing-rules edit.
5. **Indexing rule 5 stays.** Do not widen `is_inside_hidden_dir` (`vault/watcher.rs:71-79`) to make hidden mods reload. It is an invariant shared with the scan (`utils/fs.rs:175`). Use a separate mechanism instead.
6. **Two lifetimes and two unregister points.**
   - Vault-scoped mod registrations must be released both at `initializeVault` entry (:160-169) and in `teardownVault` (:571-574), and checked against `initVersion` after every await.
   - Unload must be a no-op at boot (`+layout.svelte:86` runs teardown with no vault).
   - `resetHooks()` (:621) wipes after-save observers on every switch.
   - App-lifetime entry points go through `registerAppPorts` (`boot.ts:34`).
7. **Absolute paths everywhere** (Indexing rule 9). Any mod file API should take or return absolute paths, or translate at one host boundary. Mod writes to notes must go through `applyNoteChange` and `applyPathChange` (Indexing rule 6), never through a second owner. Writes that bypass them leave the indexes stale until the watcher catches up, and the watcher skips self-saves (`editor.hooks.ts:37-47`).
8. **Vault location.** Mods can rely only on plugin-fs paths under `~/Documents/kokobrain-vaults/` or `~/kokobrain-vaults/` (`default.json`; `+page.svelte:44`). The asset protocol does not cover `~/kokobrain-vaults/` (`tauri.conf.json:37` says `kokobrain-vault`), so no mod mechanism should depend on `asset:` URLs.
