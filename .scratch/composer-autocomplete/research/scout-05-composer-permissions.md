# Scout 05: composer window permissions (Tauri 2 ACL)

Read-only research. Versions in use: tauri 2.12.5, tauri-build 2.7.4 (`src-tauri/Cargo.lock:5372-5373`, `:5424-5426`). Library claims below were verified by reading the matching sources in `~/.cargo/registry/src/*/` (tauri-2.12.5, tauri-build-2.7.4, tauri-utils-2.10.2).

## Short answer

1. The composer window can invoke every custom app command today, not only the composer ones. The app defines no ACL app manifest, so Tauri does not gate app commands by capability.
2. `get_all_tags_v2` and `get_all_vault_entries_v2` are zero-argument, read-only commands. The composer can already call both with no Rust change and no capability change.
3. What the composer cannot do is call plugin commands, so `plugin:fs|read_text_file` (the editor host's `readNote`) is denied for it.
4. A "composer-only" read command needs no permission edits. Locking commands down per window is possible but is a large, unrelated change.

## Findings

### F1. The two capability files and what composer.json grants

- `src-tauri/capabilities/composer.json:4-10`: windows `["composer"]`, permissions `core:default`, `core:window:allow-hide`, `core:window:allow-set-focus`. Nothing else.
- `src-tauri/capabilities/default.json:3-6`: window `main` only. It grants `core:default`, window create/drag/destroy/close, webview create, `deep-link`, `clipboard-manager:allow-read-text`, global-shortcut, opener, dialog, scoped `fs:*` on the vault dirs, scoped `http:*`, `updater:default` and `process:allow-restart` (`default.json:8-286`).
- The composer therefore has no `fs:*`, `dialog`, `http`, `clipboard` or `opener` permission.
- `core:default` expands to path, event, window, webview, app, image, resources, menu and tray defaults (`src-tauri/gen/schemas/acl-manifests.json`, key `core`, `default_permission`).
- `core:event:default` gives listen, unlisten, emit and emit-to. That is why the composer can `listen(...)` for `qc:open-composer` and `qc:composer-capture-result` (`src/routes/composer/+page.svelte:177-193`).
- `tauri.conf.json` has no `app.security.capabilities` list, so every file in `src-tauri/capabilities/` is auto-enabled (`tauri.conf.json:15-40` shows the whole `app.security` block, with only `csp` and `assetProtocol`). UNVERIFIED in the tauri-utils config source: I did not read the default for the missing field, but the generated `gen/schemas/capabilities.json` contains both `composer` and `default`, which confirms both are active.
- `src-tauri/gen/schemas` is gitignored (`src-tauri/.gitignore:7`, confirmed by `git check-ignore`). It is regenerated on build and is not a source of truth.

### F2. App commands are NOT ACL-gated in this app

- `src-tauri/build.rs:23` calls `tauri_build::build()`, which is `try_build(Attributes::default())` (`tauri-build-2.7.4/src/lib.rs:634-636`). It passes no `app_manifest(...)`.
- There is no `src-tauri/permissions/` directory (`ls` fails), and a grep of `src-tauri/{build.rs,src,Cargo.toml}` finds no `AppManifest`.
- In tauri-build, the app manifest is inserted into the ACL manifests only when it has a default permission, a permission set or a permission (`tauri-build-2.7.4/src/acl.rs:414-426`). `commands` empty and no `permissions/` dir means the `__app-acl__` key is absent.
- Confirmed in the generated `src-tauri/gen/schemas/acl-manifests.json`: keys are `clipboard-manager, core, core:app, ..., updater` and there is no `__app-acl__`.
- The runtime check is `tauri-2.12.5/src/webview/mod.rs:2077-2101`. The ACL is enforced only if `plugin_command.is_some() || has_app_acl_manifest || !is_local`, and the request is then rejected when `invoke.acl.is_none()`. For the composer, which loads `WebviewUrl::App("/composer")` (`src-tauri/src/lib.rs:139`) and so is a local origin, a custom (non-`plugin:`) command with no app manifest skips the check. Rust-side proof by usage: the composer already calls `dismiss_composer` and `submit_composer_capture` (`+page.svelte:77`, `:102`) and no capability or permission file names them.
- Consequence for the composer's own comment: `composer.json:4` says "no other IPC". That is only true for plugin and core IPC. In practice the composer webview can `invoke` `get_all_vault_entries_v2`, `create_note`, `rename_note`, `write_mod_data`, `confirm_exit` and the rest of the `generate_handler!` list (`src-tauri/src/lib.rs:325-396`). Not a regression from this feature, but worth knowing.

### F3. The data commands the editor host already uses are composer-callable as is

- `get_all_tags_v2(state)` at `src-tauri/src/commands/vault.rs:637-646` returns `Vec<TagAggregate>` from `idx.lookup_all_tags()`. No arguments, shared read lock.
- `get_all_vault_entries_v2(state)` at `vault.rs:562-573` returns a cloned, path-sorted `Vec<NoteEntry>`. No arguments, shared read lock.
- Both take `tauri::State<'_, VaultIndexState>`, which is app-global (`.manage(VaultIndexState::default())`, `lib.rs:318`), not per-window. A call from the composer webview reads the same index the main window uses.
- The main window's host uses exactly these: `vaultTags()` calls `call('get_all_tags_v2')` (`src/lib/app/editor-host.ts:96-111`), and the entries come from `getVaultEntries()` (`src/lib/core/vault/vault-entries.service.ts:26-28`).
- Both are already in the typed contract: `commands.ts:95` and `:103` (args `NoArgs`), arg-name table `:280`, `:284`. `call()` from `#lib/contracts/ipc.js` is plain `invoke` (`ipc.ts:21-29`), so the composer route can use it as it already does for `dismiss_composer`.

### F4. What the composer cannot reach

- `plugin:fs|*` commands are always ACL-checked (`webview/mod.rs:2080`, `plugin_command.is_some()`), and the composer has no `fs:*` permission. The editor host's `readNote` is `readTextFile` from `@tauri-apps/plugin-fs` (`src/lib/app/editor-host.ts:2`, `:135-137`). The wikilink completion source calls `host.readNote` and `host.resolveLink` only for heading and block completion (`wikilink/completion.ts:14-21`); the `[[` note-name path calls `listLinkCandidates` (`:68`). So a host built for the composer can omit heading and block completion, or the composer must get a note-reading command (see F6).
- `listLinkCandidates` returns `{ files, notes }`. `files` comes from the main window's `fsStore.fileTree` (`editor-host.ts:76-85`, `:129`). The composer has no `fsStore`. `notes` comes from the entries command and is composer-reachable. This is a data-source gap, not a permission gap (topic of another scout).

### F5. Composer window facts that touch permissions

- Window label `composer`, built in `lib.rs:135-153`; the label constant is in `quick_capture/commands.rs:29-30`.
- Qc events are broadcast with `app.emit(...)` (`quick_capture/commands.rs:359`, `:406`, `:484`, `:510`), not `emit_to`, so every window receives them. Nothing here needs a capability change.
- The composer is also covered by the app CSP in `tauri.conf.json:27` (`connect-src ipc: http://ipc.localhost ...`). Custom-command IPC is allowed by `ipc:`. No CSP change is needed.

### F6. What must change to add a new read-only command usable by the composer

Case A, reuse `get_all_tags_v2` / `get_all_vault_entries_v2`: nothing in Rust, `build.rs`, or the capabilities. Only frontend code in the composer route.

Case B, add a new Rust command (e.g. a note reader or a slimmer list command):
1. Add the `#[tauri::command]` fn and list it in `generate_handler![...]` (`lib.rs:325-396`).
2. Add the entry to `CommandMap` and the arg-name table in `src/lib/contracts/commands.ts` (header at `commands.ts:1-5`, table near `:280-330`). `src/tests/lib/contracts/ipc-parity.test.ts` checks names and types against the Rust signatures. The ts-rs output in `src/lib/contracts/generated/` is regenerated by `cargo test` if a new `#[ts(export)]` DTO is added (project rule 6).
3. Capabilities: no edit, because of F2.

Case C, genuinely restrict commands per window (not needed for the goal):
- Add `tauri_build::Attributes::new().app_manifest(AppManifest::new().commands(&[...all ~85 commands...]))` in `build.rs`. That generates `allow-<cmd>`/`deny-<cmd>` permissions (`tauri-build-2.7.4/src/acl.rs:269-294`, doc at `:102-107`).
- From then on `has_app_acl_manifest` is true (`tauri-utils-2.10.2/src/acl/mod.rs:352-354`, `resolved.rs:250`), so every app command needs an explicit `allow-*` in the window's capability. `default.json` would need all ~85 added and `composer.json` the composer ones.
- Any miss silently breaks the main app (the rejection shows only as an IPC error). I recommend against it for this feature: it is a cross-cutting change with a large blast radius and does not serve "tags and wikilinks autocomplete only".

### F7. Editor impact

Zero. None of the permission or capability files is an editor file. Case A needs no Rust or editor edits.

## Reuse opportunities

- `get_all_tags_v2` and `get_all_vault_entries_v2` are the exact same Rust commands behind the editor host's `listTags` and `listLinkCandidates.notes`. The composer can feed the editor's completion logic with the same data, with no new IPC surface.
- `call` / `CommandMap` (`src/lib/contracts/ipc.ts`, `commands.ts`) is already imported in `+page.svelte:5`.

## Risks

1. Stale or wrong-vault index. The Rust `VaultIndexState` is global, and while a vault is being opened it still holds the previous vault's index. The main window guards with `vaultStore.indexReady` (`editor-host.ts:96-99`, comment at `:98`). The composer cannot read `vaultStore`, so it cannot tell. Worst case is a suggestion list from the previous vault right after a vault switch. Recoverable and visible, so I would only note it. Whether the composer needs a readiness signal (an event or a command) is an open question.
2. The index may be empty or unbuilt when no vault is open. The command then returns an empty list (UNVERIFIED for the empty-state shape; I did not read `lookup_all_tags` or `entries()`). Completion should degrade to no suggestions.
3. Payload size. `get_all_vault_entries_v2` clones every entry in the vault (`vault.rs:570`). On a large vault this is a big IPC payload per call. The main window avoids repeats with a version-gated memo (`vault-entries.service.ts:26-28`), which the composer cannot reuse (it depends on `vaultStore.vaultIndexVersion`). Fetching once per summon (the route already has a `qc:open-composer` listener, `+page.svelte:177`) is the likely pattern. A leaner dedicated command would be new Rust surface (Case B) and is not needed unless measured.
4. The composer's "no other IPC" description (`composer.json:4`) is inaccurate for custom commands. If a new command or the doc comment is touched, do not claim ACL protection that does not exist.
5. Hidden composer lifetime. The composer window is created once and hidden/shown (`lib.rs:135-153`, `intercept_close_as_hide`), so fetched data lives across summons and must be refreshed on `qc:open-composer`.

## Open questions

- Does the composer need heading (`[[Note#`) and block (`[[Note^`) completion? Those paths call `host.readNote` and `host.resolveLink`, which in the main app go through `plugin:fs` (denied for the composer, F4). If wanted, it needs either a new read-only Rust command (Case B) or an `fs:allow-read-text-file` grant scoped to the vault paths in `composer.json`, which weakens the "no filesystem" stance stated at `composer.json:4`. The goal statement only says tags and wikilinks, so note-name-only completion may be the right scope.
- How does the composer learn the active vault is ready (see Risk 1)? UNVERIFIED whether an existing broadcast event already signals it; this scout did not trace `vault-index-updated` emitters.
- `isLinkTargetFile` and `files` for non-md targets (`editor-host.ts:129-131`) depend on `fsStore.fileTree`. Entries cover notes only, so non-note files would be absent from composer wikilink suggestions unless another source is added.
- UNVERIFIED by running anything: I did not start the app, per the rules. The F2 conclusion rests on the tauri source plus the fact that `submit_composer_capture` and `dismiss_composer` already work with no per-command permission.
