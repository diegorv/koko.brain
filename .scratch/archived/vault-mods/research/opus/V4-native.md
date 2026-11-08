# V4: Native capabilities (processes, terminal, HTTP, secrets, settings)

Adversarial validation of scouts S16 to S20. S16 (processes), S17 (HTTP) and S20 (Rust commands) never wrote a report (absent from `.scratch/vault-mods/research/haiku/`), so this report answers their questions from the code. S18 and S19 were checked claim by claim.

Read-only. Nothing was built, run or tested. "INFERRED" marks conclusions drawn from reading code, not observed behavior. "From memory" marks Tauri facts that were not checked against a primary source this session.

## Verified facts (file:line)

### Processes and terminal (S16, answered here)

- No process-spawning plugin. `src-tauri/Cargo.toml:21-72` lists opener, fs, dialog, deep-link, clipboard-manager, global-shortcut, http (68), updater (69) and process (70). There is no `tauri-plugin-shell` and no `portable-pty`. `package.json:47-55` has no `@tauri-apps/plugin-shell`.
- `tauri-plugin-process` is registered (`src-tauri/src/lib.rs:318`), but the capability grants only `process:allow-restart` (`src-tauri/capabilities/default.json:268`). Its only frontend use is `relaunch` in `src/lib/core/settings/sections/UpdateSection.svelte:6`. It restarts or exits the app and cannot spawn anything.
- The terminal is gone. ADR-0022 is `status: superseded` (`docs/adr/0022-terminal-portable-pty.md:5`, `docs/adr/README.md:129`). Commit `f5cc43cf2` is titled "refactor: remove terminal plugin entirely". No file under `src/lib` mentions "terminal" in `.ts` or `.svelte` code.
- The only runtime `std::process::Command` is `run_osascript` in `src-tauri/src/quick_capture/source.rs:243-259`. It hard-codes `osascript -e <script>` to read a browser's active tab, and no Tauri command lets the caller supply the program or its arguments. The other two calls are in `src-tauri/build.rs:13` (git) and `:38` (cc), and they run only at build time.
- **Answer:** webview JS cannot spawn an external process today. A mod cannot run the `claude` CLI or start a stdio MCP server without new Rust code.

### HTTP (S17, answered here)

- Webview CSP (`src-tauri/tauri.conf.json:29`): `connect-src ipc: http://ipc.localhost https://api.todoist.com https://huggingface.co https://github.com https://objects.githubusercontent.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io`. `script-src 'self' 'unsafe-eval'` is what lets QueryJS's `new Function` run.
- The plugin-http scope in `src-tauri/capabilities/default.json:223-266` is the same for `http:allow-fetch`, `allow-fetch-send`, `allow-fetch-read-body` and `allow-fetch-cancel-body`: `https://api.todoist.com/**` and `https://raw.githubusercontent.com/diegorv/koko.brain-themes/**`. `http:allow-fetch-cancel` is not granted. No `deny` entries exist.
- Frontend `@tauri-apps/plugin-http` users (excluding tests):
  - Todoist: `src/lib/features/tasks/tauri-fetch-adapter.ts:1,16`. Its comment at `:7` says it "bypasses CORS".
  - Theme catalog: `src/lib/core/settings/theme-catalog.service.ts:1,9,39`. Its comment at `:16` says the webview CSP would not allow the request.
- No frontend code calls the browser's own `fetch(`. The search found none outside tests.
- Rust-side HTTP needs no capability. HuggingFace model downloads use `reqwest::Client` in `src-tauri/src/semantic/model.rs:149`, with URLs hard-coded at `:26,30,47,51`. The updater (`src-tauri/src/commands/update_channel.rs:88-113`) builds its endpoint from `endpoint_for_channel(&channel)`, not from a caller URL. The Rust Sentry client is configured through `configure_sentry(enabled, dsn, release)` (`src-tauri/src/commands/sentry.rs:7-13`).
- Frontend Sentry is `@sentry/browser` (`package.json:46`, `src/lib/core/settings/sentry.service.ts:58-84`, with `beforeSend: removeSensitiveEventData` at `:84`). It is the reason for the `*.ingest.sentry.io` entries in `connect-src`. INFERRED: the `huggingface.co`, `github.com` and `objects.githubusercontent.com` entries in `connect-src` serve no current webview caller, because those downloads run in Rust.
- Versions: `tauri 2.12.5` and `tauri-plugin-http 2.8.3` (`src-tauri/Cargo.lock:5373,5598`).
- **Answer:** today a mod can call Todoist and the theme repo through plugin-http, and nothing else. Calls to `api.anthropic.com` or an HTTP MCP endpoint are blocked twice: browser `fetch` by `connect-src`, and plugin-http by its scope.

### Tauri command surface (S20, answered here)

All 63 commands come from `tauri::generate_handler!` at `src-tauri/src/lib.rs:325-389`. `build.rs:23` calls a plain `tauri_build::build()` with no `AppManifest`, and `src-tauri/permissions/` does not exist. From memory: under those conditions Tauri 2 does not ACL-gate app commands, so every window, the composer included, can invoke every command. Commands that would be dangerous to expose to mod code:

| Command | Signature (file:line) | Why dangerous |
|---|---|---|
| `create_note` | `path, content` (`commands/vault.rs:984-1011`) | Writes a new file at **any absolute path**. Its only guard, `ensure_safe_write_path` (`vault.rs:958-970`), checks that the path is absolute and has no `..`. There is no vault containment, and the doc comment at `:981-982` admits `std::fs` is outside the plugin-fs ACL. A mod could create `~/Library/LaunchAgents/x.plist` (INFERRED). |
| `create_folder` | `path` (`vault.rs:1018-1022`) | `create_dir_all` at any absolute path, with the same guard. |
| `toggle_task_status` | `path, line_number` (`vault.rs:804-829`, inner `:760-787`) | `std::fs::read_to_string(path)` on **any path**. On a no-op toggle it returns `updated_content: original` (`:768-776`), so it is an arbitrary file read (INFERRED: `line_number` past EOF returns the whole file). When a checkbox line exists it rewrites the file outside the vault. |
| `read_files_batch` | `vault_path, paths` (`commands/files.rs:24-80`) | Containment is checked against a **caller-supplied** root. `validate_vault_path` (`utils/fs.rs:59-67`) accepts any existing directory, so `vault_path="/"` reads any file (INFERRED). The comment at `files.rs:19-20` claims protection "if the frontend is compromised", and this bypass voids that claim. |
| `scan_vault`, `scan_vault_v2`, `scan_vault_v2_cached` | `path, ...` (`vault.rs:115`, `1233`, `1320`) | Walk any directory that `validate_vault_path` accepts. The v2 variants **replace** the managed `VaultIndex`. |
| `open_vault_db` / `close_vault_db` | `vault_path` (`commands/db.rs:7-18`) | Swap or close the per-vault SQLite DB (history, FTS). `open_vault_db` creates `.kokobrain` data in any directory. |
| `start_vault_watcher` / `stop_vault_watcher` | `path` (`commands/watcher.rs:12-30`) | Replace or kill the vault watcher. |
| `propagate_type_rename` | `old_type, new_type` (`vault.rs:446`, inner `392-430`) | Bulk-rewrites the frontmatter of every note of a type. |
| `update_note_in_index`, `remove_note_from_index`, `rename_note`, `save_vault_cache` | `vault.rs:353`, `1034`, `1184`, `1556` | Corrupt the index or cache without touching disk, which leaves the panels showing the wrong state. |
| `save_snapshot`, `cleanup_history` | `commands/history.rs:61`, `153` | Forge history or delete it (`retention_days: 0`). |
| `build_search_index`, `build_semantic_index`, `update_semantic_file`, `remove_*`, `shutdown_semantic`, `download_*_model` | `commands/search_index.rs:39-265`, `commands/semantic.rs:371-1305` | Heavy CPU work or a 550 MB download into a caller-chosen `vault_path` (`semantic.rs:422,452`). |
| `configure_sentry` | `enabled, dsn, release` (`commands/sentry.rs:7-13`) | Points Rust error reporting at an attacker-chosen DSN (INFERRED exfil of panic and error data). |
| `confirm_exit` | (`commands/app_exit.rs:61-64`) | Marks the exit flush done and exits, skipping the frontend's `prepareForExit` flush. |
| `submit_composer_capture`, `import_staged_shot`, `capture_clipboard_now` | `quick_capture/commands.rs:469`, `173`, `348` | `import_staged_shot` is properly guarded (source must be a `qc-shot-*` file in the temp dir and the destination is canonicalized inside the vault, `:186-215`). The others write captures into the vault and read the clipboard. |
| `set_tauri_debug_mode`, `set_main_thread_heartbeat` | `commands/debug.rs:12-27` | Low risk, but they can flood the log. |

Read-only and low risk: the `get_*_v2` queries, `search_fts`, `search_semantic`, `search_hybrid`, `compute_diff`, `get_file_history`, `get_snapshot_content`, `get_semantic_stats`, `get_process_memory`, `list_system_fonts`, `check_for_update_on_channel`. Caveat: `get_file_history` and `get_snapshot_content` return past content of any note, including notes the user deleted.

### Plugin capabilities a mod would inherit (main window)

- **plugin-fs:** read, write, remove, rename, copy, mkdir and exists on `$DOCUMENT/kokobrain-vaults/**` and `$HOME/kokobrain-vaults/**`, `.kokobrain/**` included (`default.json:36-222`). A mod could therefore rewrite `.kokobrain/settings.json` (and so the Todoist token or Sentry DSN) and delete any note.
- **Other plugin permissions:** `opener:default` plus `opener:allow-open-path` on `$APPLOG` (`:23-34`), `clipboard-manager:allow-read-text` (`:19`), global-shortcut register and unregister (`:20-22`), `core:webview:allow-create-webview-window` (`:16`), `updater:default` (`:267`).
- **Composer window:** its capability is narrow (`src-tauri/capabilities/composer.json:1-11`), but see the command note above.

### Secrets (S18, checked)

- Confirmed. `TodoistSettings.apiToken: string` (`settings.types.ts:243-248`). `parseSettings` spreads `parsed.todoist` (`settings.service.ts:~159-162`), and `saveSettings` writes the whole store with `JSON.stringify` (`:269-273`). Readers: `todoist.service.ts:138,160,189,251`. `SentrySettings.dsn` sits in the same file (`settings.types.ts:250-256`).
- Confirmed. Cargo has no keyring, stronghold, store or security-framework crate (`Cargo.toml:21-76`).
- Confirmed. ADR-0019 (`docs/adr/0019-kokobrain-in-vault-data-dir.md:61`) says keys must not be written to the vault. The same file at `:58` says users should exclude `.kokobrain/` from cloud sync.
- Confirmed. ADR-0013 is superseded (`docs/adr/0013-encrypted-notes-aes-gcm-keyring.md:5-8`).

### Settings and plugins (S19, checked)

All of these were spot-checked and hold:
- `SettingsSection` union (`settings.types.ts:331`), 18 members.
- `sectionIcons` and `sectionComponents` (`SettingsPanel.svelte:42`, `:68`), active section (`:99`).
- `SETTINGS_SECTION_GROUPS` (`settings.logic.ts:217`), with an `Integrations` group at `:253`.
- `parseSettings` builds `merged` field by field and never spreads `parsed` (`settings.service.ts:82-196`).
- 500 ms persist debounce (`settings-persistence.svelte.ts:10`).
- Unconditional plugin registration (`app-lifecycle.service.ts:247-264`), gated history (`:269-274`) and auto-move (`:432-437`).
- `RailItem` (`rail-items.logic.ts:8-19`), `RailNavigator` requires `component` (`rail-shell.types.ts:175-186`), and `onSelect(item.key)` at `Rail.svelte:126`.
- `new Function` at `kb-api.ts:413,552`.
- `localStorage` for recent vaults (`vault.store.svelte.ts:3,43-55`).

## Refuted or corrected claims

1. **S18 Implication 3 ("each new host is a change to `default.json`") is incomplete.** The scope can be added at runtime: `Manager::add_capability(&self, capability: impl RuntimeCapability)` exists behind the `dynamic-acl` feature, and `dynamic-acl` is in tauri's `default` feature set (docs.rs tauri 2.12.5 `Manager` page and crate features page, checked 2026-11-05). `Cargo.toml:22` does not disable default features, so INFERRED: it is available. There is a second route that skips the ACL entirely: a Rust command that calls `reqwest` (already a dependency, `Cargo.toml:65`), the way `model.rs:149` does.
2. **S18 Implication 2 understates the exposure.** S18 says a mod "could read `settingsStore.todoist.apiToken` and call Todoist". It could do far more, because mod JS in the main webview could reach the IPC bridge. INFERRED, from memory: Tauri 2 injects `window.__TAURI_INTERNALS__` whatever `withGlobalTauri` is set to, and `tauri.conf.json` sets neither `withGlobalTauri` nor an isolation `pattern`. Through that bridge a mod could:
   - read any file on disk (`toggle_task_status`, `read_files_batch` with `vault_path="/"`);
   - create files anywhere (`create_note`);
   - rewrite `settings.json` through plugin-fs.
3. **S18 citation nits.**
   - ADR-0013 is dated 2026-04-22 and was superseded on 2026-05-19. S18 conflated the two dates.
   - S18 gives the HTTP scope as `default.json:224-244`. That range covers only two of the four permissions; the full block is `:223-266`.
4. **S19 Answer, "no trust concept in app code".** True for trust prompts. But the Rust layer has its own trust model: "the frontend may be compromised" (`files.rs:19-20`, `vault.rs:981-982`). Its implementation is incomplete, because `validate_vault_path` accepts any directory (`utils/fs.rs:59-67`). The PRD must not assume the Rust layer contains a hostile webview.
5. **The scout brief named "GitHub, HuggingFace" as `fetch()` users.** Corrected: no webview code fetches them. HuggingFace downloads run in Rust (`model.rs:149`) and the updater is Rust (`update_channel.rs:88-113`). Only Todoist and the theme catalog use plugin-http, and only `@sentry/browser` uses webview networking.
6. **ADR-0022 as the terminal source.** The ADR is superseded and the code is removed (commit `f5cc43cf2`). There is no PTY to reuse.

## Answers to scouts' open questions

- **Can a mod run `claude` or a stdio MCP server?** Not today. There are two paths:
  - `tauri-plugin-shell`. Per v2.tauri.app/plugin/shell (checked 2026-11-05), it is denied by default. JS calls `Command.create(name, args)` against capability entries `{name, cmd, args:[literal | {validator: regex}], sidecar}`, and the plugin has `allow-spawn`, `allow-execute`, `allow-kill` and `allow-stdin-write`. The page also warns that `sh -c` with a loose validator is effectively a shell.
  - A custom Rust command around `std::process::Command`, like `run_osascript`, with streamed stdio over Tauri events. This is the shape a stdio MCP client needs (long-lived, stdin write, stdout lines).

  INFERRED and unverified: a macOS GUI app launched from the Finder inherits a minimal PATH, so `claude` or `npx` installed under `~/.local/bin` or nvm may not resolve unless the app resolves it through a login shell or the user gives an absolute path.
- **Can a mod call an arbitrary API?**
  - Browser `fetch`: no, blocked by `connect-src` (`tauri.conf.json:29`).
  - plugin-http: no, blocked by its scope (`default.json:223-266`). plugin-http requests run in Rust, so CORS does not apply. The adapter comment at `tauri-fetch-adapter.ts:7` says so, and the plugin docs say only that the Rust side re-exports `reqwest`. The docs also say forbidden request headers are dropped unless the `unsafe-headers` feature is enabled (v2.tauri.app/plugin/http-client, checked 2026-11-05).
- **Where would an Anthropic key or MCP token go?** There is no home today. The constraints: ADR-0019:61 rules out the vault, and the Rust commands are the only place a secret could stay out of webview reach (INFERRED). A per-machine OS keychain, or an app-data file outside the vault, is the candidate, and it needs a new crate or plugin. Crate choice was not verified.
- **Is `settings.json` reloaded on external edit?** Not checked (outside this theme).
- **Is the Todoist token sent to Sentry or the logs?** `sentry.service.ts:84` uses `beforeSend: removeSensitiveEventData`. Its contents were not read, so the question stays open.

## Remaining gaps

- The `__TAURI_INTERNALS__` availability and the "no AppManifest means every command is allowed for every window" behavior are from memory. Check them against the Tauri 2.12 source or docs before the PRD cites them.
- The arbitrary-read and arbitrary-write findings come from code reading only. No exploit was run. Whether `opener:default` lets JS open arbitrary `https://` URLs (an exfil channel) was not checked.
- Not checked whether `fs:allow-*` scopes cover vaults outside `kokobrain-vaults` (they do not appear to), or how vaults elsewhere are opened (the asset scope in `tauri.conf.json:32-43` lists other roots).
- `removeSensitiveEventData` was not read.
- The `keyring` crate and `tauri-plugin-stronghold` status was not verified.
- Not checked: `@tauri-apps/plugin-shell` streaming events (the docs page shows only buffered `execute()`), and the `@modelcontextprotocol` SDK's browser and stdio transports.

## Constraints the vault-mods design must respect

1. **Running mod code in the main webview means full access.** QueryJS's model (`new Function` in the same realm, `kb-api.ts:413,552`) would give a mod every main-window capability plus every Rust command, including the arbitrary read and write paths above. Isolation needs a separate realm with no IPC bridge: a sandboxed iframe or a Worker without `__TAURI_INTERNALS__` (INFERRED that a Worker lacks it), talking to a narrow host API over `postMessage`. Alternatively, accept "trusted code only" explicitly and gate it with a per-machine trust grant.
2. **Fix or account for the unconfined Rust commands before mods ship.** The Rust commands do not contain a hostile webview today. Affected: `create_note` and `create_folder` (`vault.rs:958-1022`), `toggle_task_status` (`:760-787`), and every `validate_vault_path` caller (`utils/fs.rs:59-67`). This is pre-existing debt that mods would turn into a real risk.
3. **Process spawning is new native surface.** Any `claude` or stdio-MCP action needs new Rust, either `tauri-plugin-shell` with a fixed allow-list or a custom command. It must never be a generic `run(cmd, args)` exposed to mod code. Long-lived MCP sessions need spawn, stdin write, streamed stdout and kill on vault close, and the removed terminal shows that lifecycle work is real (ADR-0022 consequences).
4. **Network egress needs a per-mod host allow-list** enforced outside mod code. The options are a runtime capability (`add_capability`, `dynamic-acl`) or a Rust proxy command with its own allow-list. Widening the static `default.json` scope would give every mod every host.
5. **Secrets cannot live in the vault** (ADR-0019:61, and `.kokobrain/` should be unsynced, `:58`). They need a per-machine store, and mods should get capability handles ("call Anthropic with my key") rather than raw key strings. The Todoist token and Sentry DSN already break this rule. Migrating them is a separate change.
6. **Enable and trust state.** The per-machine trust grant cannot travel with the vault. Per-vault enable state in `settings.json` needs a `parseSettings` merge line, or the value is silently dropped (`settings.service.ts:82-196`). The alternative is a per-feature `.kokobrain/*.json` file (auto-move precedent).
7. **A rail entry point needs a new item kind.** `RailNavigator` requires a panel `component` (`rail-shell.types.ts:175-186`). Register it in `initializeVault` and unregister it in teardown, following `registerCalendarRail()` (`app-lifecycle.service.ts:247-264`).
8. **The CSP keeps `'unsafe-eval'`** (`tauri.conf.json:29`) for QueryJS. A mod host that evaluates code needs either that or a separate document with its own CSP.
