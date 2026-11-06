# S05: CSP and webview capabilities today

## Answer

The webview runs a strict-ish CSP, but the real boundary is Tauri IPC. Three things matter for vault mods:

1. **Custom app commands are not ACL-checked for local pages.** Because `build.rs` sets no app manifest, any JS in the main or composer webview can invoke every `#[tauri::command]` in `generate_handler!`. The capability files only gate plugin commands.
2. **Plugin grants are narrow but real.** The main window can read and write markdown under `~/Documents/kokobrain-vaults` and `~/kokobrain-vaults` (plus `.kokobrain`), make HTTP requests to two hosts, open http/https/mailto URLs, and call the updater and process restart. There is no shell plugin.
3. **CSP `connect-src` is not the network boundary for plugin HTTP.** Requests made through `tauri-plugin-http` and Rust `reqwest` run outside the webview, so CSP does not restrict them. Only `fetch()` or XHR from the webview is limited by CSP, and no such call was found in `src/`.

Nothing in the config enables `freezePrototype`, an isolation pattern, or `withGlobalTauri`. None of those are needed for the current design, but none of them protect a mod sandbox either.

## Evidence

**Security config and CSP**
- `src-tauri/tauri.conf.json:28-29`: CSP is `default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' asset: http://asset.localhost data: https:; font-src 'self' data:; connect-src ipc: http://ipc.localhost https://api.todoist.com https://huggingface.co https://github.com https://objects.githubusercontent.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io`.
- `tauri.conf.json:29`: `script-src` allows `'unsafe-eval'`, so eval-based code is permitted in the page.
- `tauri.conf.json:30-43`: `assetProtocol` is enabled with a scope covering `$DOCUMENT/**`, `$HOME/MyFiles/**`, `$HOME/kokobrain-vault/**`, `$DESKTOP/**`, `$PICTURE/**`, `$DOWNLOAD/**`, and the app cache. This is a separate read-only channel from the fs plugin.
- `tauri.conf.json`: no `freezePrototype`, `pattern` (isolation), `withGlobalTauri`, `dangerousRemoteDomainIpcAccess`, or `devCsp` keys. Tauri's `SecurityConfig` default has `freeze_prototype: false` and `with_global_tauri: false` (`tauri-utils-2.8.2/src/config.rs:4113`, `:4122`).
- `tauri.conf.json:14-26`: single window `main`, `dragDropEnabled: false`.
- `tauri.conf.json:47-58`: plugins `deep-link` (scheme `kokobrain`, lines 48-51) and `updater` (GitHub endpoint and pubkey, lines 53-57).

**Capabilities**
- `src-tauri/capabilities/default.json:5-6`: applies to window `main` only.
- `default.json:8-23`: `core:default`, window create/close/focus/destroy/badge, `core:webview:allow-create-webview-window`, `core:webview:allow-set-webview-zoom`, `deep-link:default`, `clipboard-manager:allow-read-text`, global-shortcut register/unregister, `opener:default`, `dialog:default`, `updater:default`, `process:allow-restart`.
- `default.json:24-34`: `opener:allow-open-path` scoped to `$APPLOG`.
- `default.json:37-64`: `fs:allow-read-dir` scoped to `$DOCUMENT/kokobrain-vaults` and `$HOME/kokobrain-vaults` (with `.kokobrain` subpaths).
- `default.json:65-101`: `fs:allow-read-text-file` and `fs:allow-write-text-file` scoped to the same two vault roots. Write also allows `$APPLOG/**`.
- `default.json:102-222`: `fs:allow-mkdir`, `allow-remove`, `allow-rename`, `allow-copy-file`, `allow-exists`, same vault roots (plus `$APPLOG` for mkdir and exists).
- `default.json:223-266`: `http:allow-fetch`, `allow-fetch-send`, `allow-fetch-read-body`, `allow-fetch-cancel-body`, each scoped to only `https://api.todoist.com/**` and `https://raw.githubusercontent.com/diegorv/koko.brain-themes/**`.
- `default.json:267-268`: `updater:default` and `process:allow-restart`.
- Not granted in `default.json`: `fs:allow-read-file` (binary read), `fs:default`, `shell:*`, `http:default`, `dialog` file scopes beyond default, `clipboard write`.
- `src-tauri/capabilities/composer.json:5-9`: window `composer` gets only `core:default`, `core:window:allow-hide`, `core:window:allow-set-focus`. Its description (line 4) says it needs no fs, clipboard, or other IPC.
- Generated ACL copy: `src-tauri/gen/schemas/capabilities.json` (not read in detail).

**No app ACL manifest, so app commands are open**
- `src-tauri/build.rs:23`: `tauri_build::build()` with no `Attributes` or `app_manifest`. The tauri-build docs show `AppManifest` as opt-in (`tauri-build-2.7.4/src/lib.rs:48`).
- `tauri-2.12.5/src/webview/mod.rs:2076-2084`: the ACL check runs only when the command is a plugin command, the app has an ACL manifest (`has_app_acl_manifest`), or the origin is remote. Local app commands are otherwise not checked.
- `src-tauri/src/lib.rs:325-388`: about 60 app commands in `generate_handler!`. Notable ones: `open_vault_db(vault_path)` (`commands/db.rs:7`), `read_files_batch` (`commands/files.rs:31-63`), `save_snapshot(file_path, content)` (`commands/history.rs:61`), `create_folder(path)` (`commands/vault.rs:1018`), `download_semantic_model` and `download_reranker_model` (`commands/semantic.rs`), `import_staged_shot` (`quick_capture/commands.rs:211-247`), `configure_sentry`, `list_system_fonts`, `check_for_update_on_channel`.
- Path validation is inconsistent. `utils/fs.rs:59-67` (`validate_vault_path`) only canonicalizes and checks `is_dir()`. It does not check the path is inside a vault root. `commands/files.rs:36-49` adds a containment check (`starts_with(vault_root)`). `commands/db.rs:7-10` (`open_vault_db`) uses only `validate_vault_path`. `commands/vault.rs:958` has `ensure_safe_write_path`, which is not yet read.

**Windows and webviews**
- `src-tauri/src/lib.rs:135-154`: the composer window is built at startup with `WebviewUrl::App("/composer")`, using the same frontend bundle. It is hidden, frameless, and transparent (`lib.rs:141-149`).
- `lib.rs:297`: `build_composer_window` runs in setup. Because it is the same app, it can call every app command (see above) even though its capability is minimal.
- `lib.rs:300`: global shortcuts registered after the composer window is built.
- `lib.rs:310-318`: plugins registered: opener, fs, dialog, http, deep-link, clipboard-manager, global-shortcut, updater, process. **No `tauri_plugin_shell`** in `Cargo.toml` (`src-tauri/Cargo.toml:22-72`) or in `lib.rs`.

**Rust-side HTTP (bypasses CSP and capability HTTP scopes)**
- `src-tauri/src/semantic/model.rs:26-51`: hard-coded Hugging Face model URLs.
- `model.rs:149`: `reqwest::Client::new()`, with a comment saying hosts are checked at the call site.
- `src-tauri/src/commands/update_channel.rs:26,32`: GitHub update JSON URLs.
- `src-tauri/src/quick_capture/source.rs:244`: `std::process::Command::new("osascript")` runs on the Rust side. The JS side cannot call it directly, but any app command that reaches it is callable from JS.
- `src-tauri/Cargo.toml:68`: `tauri-plugin-http` (plugin fetch, scoped via capabilities). `Cargo.toml:65`: `reqwest` 0.13 with `stream`.

**Frontend network and plugin use**
- `src/lib/core/settings/theme-catalog.service.ts:1,9`: `tauriFetch` from `@tauri-apps/plugin-http` to `raw.githubusercontent.com/diegorv/koko.brain-themes/main/index.json`.
- `src/lib/features/tasks/tauri-fetch-adapter.ts:1` and `todoist.service.ts`: Todoist calls through the same plugin.
- `src/lib/core/settings/sentry.service.ts:58`: `Sentry.init` in the webview. Its transport uses webview `fetch`, so CSP `*.ingest.sentry.io` applies. The DSN is user-entered (`src/lib/core/settings/sections/SentrySection.svelte:68`), so a custom DSN host would be blocked by CSP.
- `grep "fetch("` over `src/` (non-test) returned no direct webview `fetch` calls.
- `src/lib/core/vault/vault.service.ts:1,31`: `open({ directory: true })` from plugin-dialog.
- `src/lib/core/settings/sections/UpdateSection.svelte:7`, `src/lib/features/canvas/LinkNode.svelte:6`, `src/lib/core/editor/...`: `openUrl` / `revealItemInDir` from plugin-opener.
- `src/lib/app/deep-link-actions.ts:1`: deep-link handlers write files through plugin-fs (`writeTextFile`, `mkdir`), so `kokobrain://` URLs can trigger vault writes.
- `src/lib/features/canvas/canvas-image.service.ts:1`: calls `readFile` from plugin-fs. No `fs:allow-read-file` is in `default.json`.

**Plugin scope behavior for dialog-picked folders**
- `tauri-plugin-dialog-2.8.4/src/commands.rs:152-180`: a folder chosen through the dialog is added to the runtime fs scope (`window.try_fs_scope()` and `tauri_scope.allow_directory`). So a user-picked folder becomes readable and writable through plugin-fs with the permissions the capability grants. The capability's allow lists still apply on top of this.

**Locked versions** (`src-tauri/Cargo.lock`): `tauri` 2.12.5, `tauri-plugin-fs` 2.7.1, `tauri-plugin-http` 2.8.3, `tauri-plugin-dialog` 2.8.4, `tauri-plugin-opener` 2.7.2.
- `opener` default permission set (`tauri-plugin-opener-2.7.2/permissions/default.toml`): open http, https, mailto, tel URLs, reveal in directory, default URLs. `default.json` grants `opener:default` (line 23), so any JS in `main` can open an external URL in the default browser with no scope.

## Implications for vault mods

- **A mod with JS in the webview can reach every app command.** Unless the mod JS is isolated somehow, it can call `open_vault_db`, `save_snapshot`, `create_folder`, `import_staged_shot`, and so on. Mod permissions cannot rely on capabilities alone. The fix is an app ACL manifest (`tauri_build::AppManifest::new().commands(...)`, which turns on checks for app commands) or a mediation layer in Rust.
- **Mods that run in the main webview inherit fs access** to the two vault roots: read, write, mkdir, rename, remove, copy, exists, read-dir. Any mod can delete vault files if it has JS in `main`. Read-only mods still get write access unless they use a separate mechanism.
- **HTTP for mods needs a new scope.** The current `http:allow-fetch` list has two hosts. A generic "call an HTTP API" mod would need either a broader allow list (a wider trust grant) or Rust-side proxying with per-mod host allow lists.
- **CSP does not constrain plugin HTTP.** A mod that uses `tauri-plugin-http` is limited only by the HTTP plugin scope. A mod that uses webview `fetch()` is limited by CSP `connect-src`, which would block arbitrary MCP or API hosts. Both paths need deliberate design.
- **`'unsafe-eval'` in `script-src`** means mod code loaded as a string or via `new Function` will run. Mod loading should not assume CSP will block it.
- **No shell plugin** is registered, so mods cannot spawn processes from JS. Spawning an MCP stdio server would need a new Rust command, which is a new trust boundary.
- **The composer window** is a second webview with the full app bundle and all app commands. A mod-facing UI in another window would inherit the same exposure.
- **Dialog-chosen folders** become fs-scoped at runtime, which may widen what mods can touch if the vault root is picked outside the two default roots (see open questions).
- **Deep links** can trigger file writes through `deep-link-actions.ts`. A mod entry point triggered by a deep link would need its own confirmation.
- **Sentry and update endpoints** are fixed by CSP and updater config. They are not mod-visible today.

## Open questions

1. Does `tauri-plugin-fs` 2.7.1 consult the runtime scope added by the dialog (`tauri_scope.allow_directory`), so that a vault picked outside `~/Documents/kokobrain-vaults` or `~/kokobrain-vaults` becomes writable? INFERRED from the dialog code path, not verified in the fs plugin source.
2. `canvas-image.service.ts:1` calls `readFile`, which has no matching `fs:allow-read-file` grant in `default.json`. Does this fail at runtime, or is the permission granted elsewhere (`gen/schemas/capabilities.json` was not checked)? Not verified.
3. The UI at `src/routes/(app)/+page.svelte:44` says vaults must sit under `~/Documents/kokobrain-vaults/` or `~/kokobrain-vaults/`. Does `vault.service.ts:31` enforce that, or does a folder picked outside those roots get accepted? Not read in full.
4. `commands/vault.rs:958` (`ensure_safe_write_path`) was not read. It may already contain containment checks for writes from app commands.
5. Whether a `[[Vault]]`-level command surface beyond the listed ones exists outside `generate_handler!` (for example, commands in `quick_capture/commands.rs` registered elsewhere). Not checked.
6. Whether `withGlobalTauri` is off at runtime (default false per `tauri-utils-2.8.2`, but the config version in `Cargo.lock` is `tauri-utils` 2.10.2 or 2.8.2 depending on the resolved entry; not confirmed).
