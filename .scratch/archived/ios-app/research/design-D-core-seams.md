# Design D: shared core seams for Kokobrain iOS (models A and B)

Scope: the refactors that both iOS models need, as small steps that each ship on their own and keep desktop green. Rust: Tauri-free core, `EventSink`, state injection, cfg gates. TS: Transport port, VaultFs port, Assets port, Platform capability flags.
Basis: the 17 scout files in this folder, spot-checked against the code at `main` 2a937e57 (2026-11-02). Every code claim is `path:line`. External claims carry a URL. Nothing was compiled or run. Effort figures are estimates, not measurements.
Sizes: S = under 1 day, M = 1 to 3 days, L = more than 3 days.

## 0. Verdict (short)

- **Most of the seam work is cheap, because the repo already has the seams halfway.** The Rust core dirs are Tauri-free and ratcheted (`src-tauri/tests/core_tauri_free_test.rs:9,24`). All IPC already goes through one typed `call`/`on` (`src/lib/contracts/ipc.ts:21-38`, enforced by `src/tests/lib/architecture/raw-invoke.test.ts:14-19` and `event-listen.test.ts:16-19`). The editor already reaches files through an injected `EditorHost` (`src/lib/core/markdown-editor/editor-host.ts:33-55`).
- **Pattern for every TS port: the default adapter is today's Tauri call.** The other adapters are installed at boot. The 68 test files that `vi.mock('@tauri-apps/api/core')` and the 56 that mock `@tauri-apps/plugin-fs` keep passing unchanged, because the default adapter still calls the mocked module. Call sites migrate by **swapping the import path only**: the port re-exports functions with the plugin's names and signatures. That keeps the `writeTextFile(` raw-write ratchet (`src/tests/lib/raw-write-ratchet.test.ts:21`) valid with no edit.
- **Desktop behaviour changes in only two steps:** R2 (vault-root containment in Rust, which closes real gaps such as `toggle_task_status` writing any path, `src-tauri/src/commands/vault.rs:664-683`) and T6 (canvas images move to the asset URL). Every other step is a pure seam.
- **Model B needs much less than model A.** The Rust core/sink/dispatcher work (R1, R3, R5) is needed only for A. B's critical path is R4 (iOS compile gates) plus the TS Platform caps (T3, T7, T8), plus the vault-location decision, which is outside this doc. The table in section 5 marks each step A, B or both.

## 1. Target architecture

```
                         ┌──────────────────────── one SvelteKit bundle (runtime-selected adapters) ───────────────────────┐
                         │ features / plugins / core services (unchanged call sites, import paths swapped)                │
                         │        │ call()/on()            │ readTextFile/... (vault-fs)   │ ask/openUrl/... (platform)    │
                         │        ▼                        ▼                               ▼                               │
                         │  contracts/ipc.ts         core/filesystem/vault-fs.ts     core/platform/*.ts  + caps           │
                         │  Transport port           VaultFs port                    Platform port (dialog, opener,       │
                         │  default: tauriTransport  default: pluginFsAdapter        window, clipboard, deep-link,        │
                         │                           alt: coreVaultFs (via call())   process, http, assetUrl)             │
                         │        ▲ setTransport()        ▲ setVaultFs()                 ▲ setPlatform()                  │
                         │        └──────────── app/platform-select.ts (composition root, runs first in (app)/+layout) ───│
                         └───────────┬───────────────────────────────┬──────────────────────────────────────────────────────┘
             Tauri invoke/listen     │ (desktop, iOS-local)          │ WS JSON-RPC + HTTP asset GET (remote, model A, later)
                                     ▼                               ▼
   ┌──────────── src-tauri (kokobrain shell) ─────────────┐   ┌──────── host server (design A, not here) ───────┐
   │ commands/*.rs  #[tauri::command] one-liners           │   │ axum: dispatch(method) -> api::*                 │
   │ lib.rs: plugins, cfg(desktop): menu, shortcuts,       │   │ WsSink (seq-numbered, bounded, non-blocking)     │
   │   updater, process, composer, quick_capture           │   └───────────────┬──────────────────────────────────┘
   │ TauriSink: impl EventSink for AppHandle               │                   │ same process (Mac app) or
   └───────────────┬───────────────────────────────────────┘                   │ separate bin (headless, R5)
                   ▼                                                           ▼
   ┌──────────── core (Tauri-free; module tree now, crate `kokobrain-core` in R5) ───────────────────────────────┐
   │ api/{vault,fs,search,history,semantic,db,debug}.rs  ← one fn per command: (&Core, args) -> Result<T,String>   │
   │ Core { index: VaultIndexState, watcher: VaultWatcherState, session: VaultSession, sink: FanoutSink }          │
   │ VaultSession/VaultScope: canonical root, resolve_read/resolve_write, .kokobrain deny-list                    │
   │ EventSink trait ← CoreEvent { IndexUpdated, FilesChanged, SemanticProgress, DebugLog }                       │
   │ vault/ db/ search/ utils/ (unchanged)   semantic/ (#[cfg(semantic)] for ONNX parts)                          │
   └──────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

Layer placement respects ADR-0003 with no amendment:
- `contracts/` is an open layer that anyone may import (`scripts/import-graph.mjs:148`, `:159`). It is a leaf that "imports nothing from `#lib`" (`src/lib/contracts/index.ts:1-4`). The Transport holder goes there next to `call`/`on`. The WS implementation lives in `app/` and is installed with `setTransport`.
- `core/platform/` and `core/filesystem/vault-fs.ts` are core units. `features` and `plugins` may import `core` (`import-graph.mjs:155-174`). `utils/` may not (`:165`), so `utils/log.service.ts` stays on plugin-fs and `api/path` directly. It is device-local in every model (scout 05 §3.3).
- Boot selection is `app/` (composition root, `import-graph.mjs:35-44`).

## 2. Rust track

### R1. `EventSink` + `FanoutSink`; the emitting commands call core fns (A: required, B: optional) [S]

Today there are 9 core-event emit sites: `commands/vault.rs:318, 410, 722, 907, 951, 1059, 1400`, `commands/watcher.rs:19`, `commands/semantic.rs:399`. There is also the log sink at `lib.rs:259-267`. The other emits (`lib.rs:78, 276`, `quick_capture/commands.rs:247, 294, 363`) are desktop shell events and stay as they are.

```rust
// src-tauri/src/api/sink.rs  (new dir `api/`, added to CORE_DIRS in core_tauri_free_test.rs:9)
pub enum CoreEvent<'a> {
    IndexUpdated(&'a UpdateResult),            // "vault-index-updated"
    FilesChanged(&'a VaultFilesChangedPayload),// "vault-files-changed"
    SemanticProgress(&'a SemanticProgress),    // "semantic-index-progress"
    DebugLog(&'a DebugLogPayload),             // "tauri-debug-log"
}
impl CoreEvent<'_> { pub fn name(&self) -> &'static str; pub fn payload(&self) -> serde_json::Value; }

pub trait EventSink: Send + Sync { fn emit(&self, ev: CoreEvent<'_>); }   // must not block, must not panic

#[derive(Default)]
pub struct FanoutSink(RwLock<Vec<Arc<dyn EventSink>>>);   // add(sink) -> SinkHandle; emit = for each
```

- Shell side: `struct TauriSink(AppHandle)` implements `EventSink` by calling `Emitter::emit(ev.name(), ev.payload())` and logging failures, as today's `debug_log("VAULT-V2", ...)` does. `.manage(FanoutSink::default())` runs at build time, and `setup` adds the `TauriSink`. The fan-out answers a design-A need: when the Mac app hosts the phone, an edit from the phone must also reach the desktop webview, and an edit on the desktop must also reach the phone. That works only if both sinks hang off the same emitter.
- The emitting command bodies move to `api/vault.rs` as `pub fn update_note(index: &VaultIndexState, sink: &dyn EventSink, path, content) -> Result<UpdateResult, String>` and siblings. The `#[tauri::command]` wrappers keep their exact signatures and become one-liners. That keeps `ipc-parity.test.ts` (it regex-parses wrappers in `commands/<x>.rs`, `:92-121`) and the generated bindings unchanged.
- Preserve the quirks: `create_note` always emits (`vault.rs:907`), the others emit only on `changed`, and the lock is dropped before emit (`vault.rs:311-317`).
- **Test** (`src-tauri/tests/api_sink_test.rs`): a `RecordingSink` asserts one `IndexUpdated` with the returned `UpdateResult` for `update_note` (changed), none when unchanged, and always one for `create_note`. A `LockProbeSink` calls `index.try_write()` inside `emit` and records `Ok`, which proves the lock was released before emit. `core_tauri_free_test` covers `api/`.
- **Risk:** low. Wrapper signatures stay the same. The only failure mode is a missed emit, and the recording tests catch it.

### R2. `VaultSession` / `VaultScope`: one containment policy for every path command (A: required, B: recommended) [M]

Gaps found in code (scout 01 §6, spot-checked):
- `toggle_task_status_inner` reads and writes any `path` (`vault.rs:664-683`).
- `create_note` and `create_folder` use only `ensure_safe_write_path` (absolute, no `..`, `vault.rs:862-874`).
- `save_vault_cache` and `start_vault_watcher` accept any directory.
- Only `read_files_batch` canonicalizes and runs `starts_with` (`commands/files.rs:31-49`, the ADR-0020 pattern).

```rust
// api/scope.rs
pub struct VaultScope { root: PathBuf /* canonical */ }
impl VaultScope {
    pub fn open(vault_path: &str) -> Result<Self, String>;            // = utils::fs::validate_vault_path
    pub fn resolve_read(&self, p: &str) -> Result<PathBuf, String>;    // canonicalize(p), starts_with(root)
    pub fn resolve_write(&self, p: &str) -> Result<PathBuf, String>;   // canonicalize(parent)+file_name, starts_with(root),
                                                                       // reject `..`, deny-list below
    pub fn root(&self) -> &Path;
}
pub type VaultSession = RwLock<Option<VaultScope>>;   // set by vault_session_open, replaced on next open, never cleared
```

- **Deny-list for writes and removes** (so a remote client cannot corrupt the DB): `.kokobrain/kokobrain.db*`, `.kokobrain/models/**`, `.kokobrain/vault-index.msgpack`. JSON metadata under `.kokobrain/` stays writable. Settings, trash and the history backup need it (scout 05 §3).
- **New command** `vault_session_open(vaultPath)`. `initializeVault` calls it first, before `loadSettings` (`app-lifecycle.service.ts:198`). Under the T5 adapter, `loadSettings` reads through Rust, so the scope must exist by then. `open_vault_db` (`:233`) then requires `vaultPath == session root`. The scope is never cleared on `close_vault_db`. Teardown fires `save_vault_cache` and `close_vault_db` without awaiting them (`:587, :601`), so clearing on close could reject the cache save. The next open replaces the scope. One vault (owner scope) makes this enough.
- Apply to: `scan_vault`, `scan_vault_v2*`, `save_vault_cache`, `start_vault_watcher`, `create_note`, `create_folder`, `toggle_task_status`, `update_note_in_index` (index pollution), `rename_note`, `read_files_batch` (rewired onto `VaultScope`), and the search, history and semantic commands that take `vaultPath`/`filePath`. The paths those commands take are vault-relative keys (scout 02 §4a), so they need a `starts_with` check only where they are joined to the root.
- **Test (first):** `src-tauri/tests/api_scope_test.rs` with tempdirs. Outside path rejected. `..` rejected. A symlink escaping the root rejected. A not-yet-existing file in an existing folder accepted. A symlinked vault root (macOS `/var` to `/private/var`) accepted, because both sides are canonicalized. A deny-listed DB path rejected. A failing test that reproduces the `toggle_task_status` outside-path write comes first. TS: the init-sequence test in `src/tests/lib/app/lifecycle/` asserts that `vault_session_open` is the first `invoke` of `initializeVault`. Update the existing exact-order assertions in the same commit, without loosening them.
- **Risk (rank 1):** a legitimate desktop path gets rejected (NFC vs NFD names, a trailing slash, a vault path given in non-canonical form). Mitigation: compare canonical forms on both sides, add the tests above, and show a user-visible error through the existing `error()` and toast path. A failed save keeps the text in the editor, so this is not silent data loss. An option for the owner: one release in log-only mode first (section 8, Q5).

### R3. `Core` context + `api/` for all 58 commands; DTOs move out of `commands/` (A: required, B: not needed) [M]

- `CommandMap` has 58 entries (count of `args:` in `src/lib/contracts/commands.ts`; scout 08 §9 agrees). Model A needs a host dispatcher (`method -> api::fn`) that does not go through Tauri, so every command body must be callable as `api::<group>::<fn>(&Core, args) -> Result<T, String>`.

```rust
pub struct Core {
    pub index: VaultIndexState,        // vault/mod.rs:25, unchanged type
    pub watcher: VaultWatcherState,    // vault/watcher.rs:143
    pub session: VaultSession,         // R2
    pub sink: FanoutSink,              // R1
}
// shell: .manage(Arc<Core>); wrappers take tauri::State<'_, Arc<Core>> (State is in ipc-parity INJECTED, :22)
```

- DTOs defined in `commands/` (`FileNode`, `CachedScanResult`, `ScanSource`, `IndexStats`, `DiffLine`, `FileReadResult`) move to `api/`. Old paths are re-exported (`pub use crate::api::vault::FileNode;`), because tests import `kokobrain_lib::commands::vault::{...}` (`src-tauri/tests/commands/vault_test.rs:1-6`) and `ipc_contracts_test.rs:7-8`. ts-rs writes one file per type name into a flat dir (`.cargo/config.toml` `TS_RS_EXPORT_DIR`, no `export_to` anywhere), so a move should leave `src/lib/contracts/generated/` byte-identical. The CI `git status` check proves it (scout 17 §2.1).
- **Do not do now** (no gain for one vault): replacing the process-global `DB`/`FTS_DB` (`db/mod.rs:17,27`) and semantic statics (`commands/semantic.rs:24-95`) with instance handles. The Mac app and its embedded host share one process and one vault. A headless host is also one process with one vault.
- **Optional, A-relevant:** the lock-across-I/O fixes (`get_tasks_in_section_v2` `vault.rs:615-657`, `toggle_task_status` `:715-720`, `propagate_type_rename` `:403-408`). Concurrent clients make the stalls more likely, but they are not a prerequisite.
- **Test:** the existing Rust suite unchanged (re-exports) plus `git status src/lib/contracts/generated` clean. Add a dispatch-coverage test now: `api::COMMANDS: &[&str]` equals the `generate_handler!` names minus desktop-only ones. That is a Rust-side twin of `ipc-parity.test.ts`, so the later WS dispatcher cannot drift.
- **Risk:** medium, mostly mechanical churn. The rule "never remove a call claiming redundant" applies: each wrapper body moves verbatim.

### R4. cfg gates: `desktop` shell, `semantic` core (B: required; A: only if the iOS client is a Tauri shell) [M]

Verified mechanisms:
- tauri-build 2.7.4 (the locked version, `Cargo.lock:5423-5424`) emits `cfg(desktop)` and `cfg(mobile)` with check-cfg (`crates/tauri-build/src/lib.rs:304-305, 659-660` at tag `tauri-build-v2.7.4`, https://github.com/tauri-apps/tauri/blob/tauri-build-v2.7.4/crates/tauri-build/src/lib.rs). `lib.rs:222` already uses `cfg_attr(mobile, ...)`.
- `generate_handler!` applies per-entry attributes (`crates/tauri-macros/src/command/handler.rs:18, 177` at `tauri-v2.12.5`), so `#[cfg(desktop)] commands::update_channel::check_for_update_on_channel,` works.

Changes:
- `Cargo.toml:28, 31, 67, 68`: move `tauri-plugin-global-shortcut`, `arboard`, `tauri-plugin-updater` and `tauri-plugin-process` into `[target.'cfg(not(any(target_os = "ios", target_os = "android")))'.dependencies]`. The global-shortcut crate is empty on iOS (scouts 02, 03, 04), so `lib.rs:15-17` would not resolve.
- `lib.rs`: put `#[cfg(desktop)]` on the imports at `:13-31`, the menu `:153-220, 256-257, 274-278`, the composer `:92-151, 268`, the shortcuts `:224-252, 271, 285`, updater and process `:286-287`, `pub mod quick_capture` `:5`, and the 4 qc and 1 updater `generate_handler` entries `:347-351`. The `WebviewWindowBuilder` chain is `cfg(desktop)` in tauri 2.12.5 (scout 03 §3d).
- **semantic:** add a feature `semantic-onnx` (in `default`) that turns on `ort`, `tokenizers`, `ndarray`, `half`, `reqwest` and `futures-util` as optional deps (`Cargo.toml:59-64`). Put those deps in the non-iOS target table. `build.rs` emits `cargo::rustc-check-cfg=cfg(semantic)` and `cargo::rustc-cfg=semantic` when `CARGO_FEATURE_SEMANTIC_ONNX` is set and `CARGO_CFG_TARGET_OS != "ios"`. The check-cfg line is required, or `unexpected_cfgs` breaks the clippy `-D warnings` gate. Gate the list in scout 02 §3: move `cosine_similarity` and `deserialize_embedding` out of `embedder.rs:342-364` first.
- **Keep every semantic command registered.** Use `#[cfg(semantic)]` and `#[cfg(not(semantic))]` inside one fn body, not two fns. `ipc-parity.test.ts` regex-matches the first `pub fn <name>` in the file (`:96-101`), and the frontend calls `update_semantic_file` and `remove_semantic_file` on every save and delete (`note-change.service.ts:209-218, 247-252`). Stubs: `is_*_model_available` returns false, `update_semantic_file` keeps the DB-only branches, and `search_hybrid` returns the FTS results. Today it returns Err after FTS (`commands/semantic.rs:946, 952`).
- `capabilities/default.json`: split into `desktop.json` (`"platforms": ["macOS","windows","linux"]`) and `mobile.json` (`["iOS"]`). The field is `platforms: Option<Vec<Target>>` with `"iOS"` (`tauri-utils/src/acl/capability.rs:204`, `platform.rs:45-47` at `tauri-v2.12.5`).
- `ipc-parity.test.ts`: `handlerEntries` (`:84-89`) and `parseCommand` (`:92-95`) must strip a leading `#[...]` before `split('::')`, or the derived file path breaks. Keep `MIN_COMMANDS` (`:21`).
- **Test:** (1) ubuntu CI: add `cargo test --no-default-features` next to the default run. It exercises the `not(semantic)` stubs on Linux with no iOS SDK, including a new test that `search_hybrid` returns the FTS hits without a model. Gate the ORT test binaries (`semantic_embedder_*`, `semantic_reranker_test.rs`) with `#![cfg(semantic)]`. (2) macOS nightly job: `rustup target add aarch64-apple-ios && cargo check --target aarch64-apple-ios`. It proves compilation of rusqlite `cc`, notify, sentry and sysinfo, none of which has been built yet (scouts 02 §8, 04). (3) `ipc-parity` keeps passing with the attributes present.
- **Risk:** iOS compile surprises in C deps (rusqlite bundled, `onig` drops out with semantic). Only the macOS job reveals them, so land it in the same step.

### R5. Physical crate split `src-tauri/crates/kokobrain-core` (A with a headless `kokobrain serve` only) [M, conditional]

- Do it only if the owner picks a headless host. A host embedded in the Mac app needs no split: the R1 to R3 module boundary is enough, and the ratchet already enforces it.
- Workspace root stays at `src-tauri/Cargo.toml`, so `src-tauri/target` (sccache, and the shared worktree target per memory) does not move. `lib.rs` keeps `pub use kokobrain_core::{vault, db, search, semantic, utils, api};`, so the `kokobrain_lib::...` test imports still resolve.
- **Gotcha:** in a workspace whose root is a package, `cargo test --manifest-path src-tauri/Cargo.toml` tests only the root package unless `default-members` is set (Cargo book, https://doc.rust-lang.org/cargo/reference/workspaces.html#the-default-members-field, from memory, not re-fetched). The ts-rs exports in the core crate would then never be written, and the bindings check would still pass on stale files. Set `default-members = [".", "crates/kokobrain-core"]`. Test it by deleting one generated file locally and confirming that `cargo test` restores it.
- `core_tauri_free_test.rs` becomes a check that `crates/kokobrain-core/Cargo.toml` has no `tauri` dependency. Compilation then enforces the rest.

## 3. TypeScript track

### T1. Transport port in `contracts/ipc.ts` (A: required; B: not needed) [S]

```ts
/** How `call`/`on` reach the backend. The default is Tauri IPC. */
export interface Transport {
	invoke(cmd: string, args?: Record<string, unknown>): Promise<unknown>;
	listen(event: string, handler: (payload: unknown) => void): Promise<() => void>;
	/** Fires after the transport lost and regained its link; consumers must refetch. Tauri never fires it. */
	onResync(handler: () => void): () => void;
}
export function setTransport(t: Transport): () => void; // returns restore
export function onTransportResync(handler: () => void): () => void;
```

- The Tauri default keeps the one-arg `invoke(cmd)` for zero-arg commands. `ipc.ts:13-15` exists so that `toHaveBeenCalledWith('cmd')` holds.
- `onResync` replaces scout 17's version-gap idea, which is wrong here. `VaultIndex.version` is bumped on every `update_entry`, no-ops included (`vault/index.rs:228`), while no-op updates do not emit (`vault.rs:317`). Gaps in `payload.version` are therefore normal on desktop, and a gap check at `tauri-listeners.service.ts:271` would trigger constant full refreshes. Loss detection belongs to the transport: a per-connection sequence number, owned by design A. The vault-index consumer registers `onTransportResync(() => { invalidateVaultEntries(); fullRefresh(); })`.
- **Test:** extend `src/tests/lib/contracts/ipc.test.ts`. A fake transport receives exactly `('cmd')` for a zero-arg command and `('cmd', args)` otherwise. `on()` hands over the payload. Restore returns to Tauri. A test in `src/tests/lib/app/` shows that a resync triggers `get_all_vault_entries_v2` through the fake, with real stores.

### T2. Command policy table (A and B) [S]

```ts
// contracts/command-policy.ts
export type CommandClass = 'vault-read' | 'vault-write' | 'host-lifecycle' | 'device' | 'desktop-only';
export const COMMAND_POLICY = { open_vault_db: 'host-lifecycle', toggle_task_status: 'vault-write', /* ... */ }
	satisfies Record<keyof CommandMap, CommandClass>;
```

- Model A: clients must not send `host-lifecycle` commands (`open_vault_db`, `close_vault_db`, `shutdown_semantic`, watcher start and stop, `save_vault_cache`, `vault_session_open`). Today `teardownVault()` runs on every cold start without a vault (`(app)/+layout.svelte:65-79`) and would close the Mac's DB (`app-lifecycle.service.ts:597, 601`, scout 08 §1). The table also seeds per-scope auth on the host (t3code pattern, scout 14 §14).
- Model B: `desktop-only` (qc x4, `check_for_update_on_channel`) is not registered on iOS after R4, so TS must not call those commands (see T8).
- **Test:** `satisfies` gives a compile-time exhaustiveness check. A runtime test asserts `Object.keys(COMMAND_POLICY)` equals `Object.keys(COMMAND_ARGS)` (`commands.ts:192`).

### T3. Platform port + capability flags in `core/platform/` (A and B) [M]

Today's importers outside plugin-fs: plugin-dialog 9, plugin-opener 7, api/window 2, api/webviewWindow 1, plugin-clipboard-manager 1, plugin-process 1, plugin-http 1, plugin-deep-link 1 (grep of `src/lib` and `src/routes`, matching scout 08 §5).

```ts
// core/platform/platform.ts
export type PlatformKind = 'desktop' | 'ios' | 'web';
export interface Capabilities {
	vaultFolderPicker: boolean;   // dialog open({directory}) – false on iOS (dialog-v2.8.4 commands.rs:185-186, scout 06)
	revealInFileManager: boolean; // opener revealItemInDir – UnsupportedPlatform on iOS
	openLocalPath: boolean;       // opener openPath (log folder)
	appUpdater: boolean;          // updater + relaunch
	quickCapture: boolean;        // global shortcuts, composer window, qc:* events
	nativeMenu: boolean;          // menu:settings
	windowCloseEvent: boolean;    // onCloseRequested/destroy; iOS uses pagehide/visibilitychange instead
	zoom: boolean;
	systemFonts: boolean;         // list_system_fonts returns [] off macOS (fonts.rs:71-74)
	semanticSearch: boolean;      // false on iOS (R4); remote: from host descriptor
	deepLinks: boolean;
}
export interface Platform {
	readonly kind: PlatformKind;
	readonly caps: Capabilities;
	ask(message: string, options?: AskOptions): Promise<boolean>;
	pickVaultFolder(): Promise<string | null>;
	openUrl(url: string): Promise<void>;
	revealItemInDir(path: string): Promise<void>;
	openPath(path: string): Promise<void>;
	readClipboardText(): Promise<string>;
	onOpenUrl(handler: (urls: string[]) => void): Promise<() => void>;
	getCurrentDeepLinks(): Promise<string[] | null>;
	onCloseRequested(handler: (e: { preventDefault(): void }) => void | Promise<void>): Promise<() => void>;
	destroyWindow(): Promise<void>;
	onFocusChanged(handler: (focused: boolean) => void): Promise<() => void>;
	setBadgeCount(count?: number): Promise<void>;
	setZoom(factor: number): Promise<void>;
	relaunch(): Promise<void>;
	fetch: typeof globalThis.fetch;
	assetUrl(path: string): string;   // T6; sync on purpose (EditorHost.assetUrl, editor-host.ts:41)
}
export function getPlatform(): Platform;           // default: tauriDesktopPlatform
export function setPlatform(p: Platform): () => void;
// core/platform/dialog.ts: export const ask = (...a) => getPlatform().ask(...a);  (same for opener, clipboard, ...)
```

- The thin named re-exports make the migration of the 18 dialog, opener, clipboard, process, http and deep-link files an import swap. The 3 window, zoom and badge files (`tauri-listeners.service.ts:1, 53, 71, 309`, `dock-badge.service.ts:17`, `zoom.service.ts:29`) are edited by hand, because they chain `getCurrentWindow()`.
- The default adapter forwards `...args` verbatim. An added trailing `undefined` would break `toHaveBeenCalledWith` assertions (same reason as `ipc.ts:13-15`).
- New ratchet `src/tests/lib/architecture/platform-imports.test.ts`, modelled on `raw-invoke.test.ts`: only `core/platform/**` may import those 8 Tauri modules. During migration an allowlist starts at today's files and only shrinks. `utils/log.service.ts` stays allowlisted for `api/path` and `plugin-opener` `openPath`. It is utils-layer and device-local.
- **Test:** the existing tests of each migrated file pass unmodified. They mock the Tauri module, and the default adapter calls it. That is the proof that behaviour did not change. Add `platform.test.ts` for set/restore and the ratchet.
- **Risk:** low. Split into 3 or 4 commits by module (dialog, opener, window, rest) so that each commit stays one task (CLAUDE.md rule 10).

### T4. VaultFs port `core/filesystem/vault-fs.ts` (A and B) [M]

- Port surface = the plugin-fs subset actually used (scout 05 §2): `readTextFile`, `writeTextFile(path, data, { create?: boolean })`, `exists`, `mkdir(path, { recursive? })`, `readDir` returning `{ name, isDirectory, isFile, isSymlink }[]`, `remove(path, { recursive? })`, `rename`, `copyFile`. `readFile` (binary) is left out: its one caller, canvas (`canvas-image.service.ts:35`), moves to the asset URL in T6. Options types are narrowed to the used keys, so a new option fails `pnpm check`.

```ts
export interface VaultFs { readTextFile(p: string): Promise<string>; writeTextFile(p: string, d: string, o?: { create?: boolean }): Promise<void>; /* ...as above */ }
export function setVaultFs(fs: VaultFs): () => void;   // default: pluginFsAdapter (forwards args verbatim)
export const readTextFile: VaultFs['readTextFile'] = (...a) => current.readTextFile(...a);  // etc.
```

- Migrate 26 of the 27 importers by import swap (`@tauri-apps/plugin-fs` to `#lib/core/filesystem/vault-fs.js`). The exception is `utils/log.service.ts`, which is device-local and utils-layer. Two of them are `app/` files (`editor-host.ts`, `deep-link-actions.ts`), which may import core.
- `vault.service.ts:40` (`exists(vaultRoot)` before any session) goes to the Platform port, not VaultFs. It runs before a vault scope exists.
- The raw-write ratchet keeps working with no edit, because call sites still say `writeTextFile(`. The new file sits in `core/filesystem/`, which the ratchet exempts (`raw-write-ratchet.test.ts:17`). That is right: it is the owner of raw writes.
- New ratchet `vault-fs-imports.test.ts`: only `vault-fs.ts` and `utils/log.service.ts` may import `@tauri-apps/plugin-fs`.
- **Conformance suite** `src/tests/lib/core/filesystem/vault-fs.conformance.ts`: `runVaultFsConformance(makeAdapter)` checks the behaviours callers rely on. Missing read rejects. `writeTextFile` with `{create:false}` on a missing file rejects (`frontmatter-write.service.ts:149`). `exists` returns booleans. `readDir` includes dot entries. Recursive `remove` works. `rename` moves folders with their children. Run it now against the plugin-fs adapter over an in-memory fake (the `calendar-vault.fixture.ts` model). In T5, run it against `coreVaultFs`. The E2E fake ignores `create:false`, `recursive` and binary content (`e2e/mocks/tauri-fs.ts:7-17, 35-38`, scout 05 §6). Fix those three in the same step, or the suite cannot run against it.
- **Risk:** low, mechanical. A wrong import path fails `pnpm check`.

### T5. Rust `fs_*` commands + `coreVaultFs` adapter (A: required; B: recommended) [L]

- Six new commands in `api/fs.rs`, all through `VaultScope` (R2): `fs_write_text{path, content, create}` (wraps `utils::fs::write_atomic`, `utils/fs.rs:16-33`), `fs_exists`, `fs_list_dir`, `fs_remove{recursive}`, `fs_rename`, `fs_copy` (a recursive, byte-exact `std::fs::copy`, so no bytes cross IPC). Reads go through the existing `read_files_batch`, or an `fs_read_text` single-file convenience. `fs_mkdir{recursive}` generalises `create_folder` (`vault.rs:922-926`). That is 6 or 7 commands, not scout 05's 7 plus `read_binary`. Binary reads are dropped by T6.
- Each command needs a `CommandMap` entry, a `COMMAND_ARGS` entry, a `generate_handler!` entry and an E2E `HANDLERS` entry. The `HANDLERS` table is exhaustive over `CommandMap` (`e2e/mocks/tauri-core.ts:408-412`), so `pnpm check` fails until all four exist. `DirEntry` gets `#[ts(export)]`. This is an IPC DTO change, so the gate is "Both" (CLAUDE.md rule 6).
- `coreVaultFs` (`core/filesystem/vault-fs.core.ts`) calls them through `call()`. That makes one adapter serve B (Tauri invoke on device) and A (WS through T1).
- **Desktop keeps `pluginFsAdapter`.** ADR-0025 kept the disk rename on plugin-fs because of the ACL, the `exists()` precheck and the error semantics (`docs/adr/0025-rust-vault-index.md:75-85`). Switching desktop is an owner decision (Q2).
- Why B benefits: iOS plugin-fs has an open "writeTextFile produces an empty file" report (plugins-workspace#1976, scout 13). It has no NSFileCoordinator (scout 12). The fs scope on iOS is "restricted to Application folder by default" (https://v2.tauri.app/plugin/file-system/, scouts 05 and 11). Rust `std::fs` under `VaultScope` gives one code path for iOS and for the remote host.
- **Test:** Rust `api_fs_test.rs` for semantics and scope. TS: the T4 conformance suite run against `coreVaultFs`, over a fake transport that drives a Node in-memory implementation of the same commands, plus a parity check that the fake implements exactly the `fs_*` keys.
- **Risk:** semantic drift between the plugin-fs and core adapters. Rename-over-existing and the error text callers match on are the likely spots. The conformance suite exists for this.

### T6. Assets port (A: required; B: small) [S-M]

- `EditorHost.assetUrl` stays synchronous (`core/markdown-editor/editor-host.ts:41`) and calls `getPlatform().assetUrl(path)` from `app/editor-host.ts:72-74`. Defaults: desktop and iOS use `convertFileSrc`. On iOS that yields `asset://localhost/<enc>` (`tauri/crates/tauri/scripts/core.js`, scout 07 §5). Remote uses `${origin}/v1/vault/file?path=<rel>` with cookie auth, because `<img>` cannot send headers (scout 07 §4). Design A owns that URL.
- Canvas: `canvas-image.service.ts:28-40` switches from `readFile` plus blob to `assetUrl`. This fixes the likely ACL denial (`fs:allow-read-file` is not granted in `capabilities/default.json`, scouts 05 and 07, UNVERIFIED at runtime) and removes the last binary VaultFs read. **Behaviour change on desktop**, so it needs a manual check on a vault under `$DOCUMENT/kokobrain-vaults` and one outside the static asset scope (`tauri.conf.json:30-41`). Scout 07 also notes `$HOME/kokobrain-vault/**` (singular) there.
- **Test:** update `canvas-image.service.test.ts` to assert the URL it builds. It currently mocks `readFile`. Add an `editor-host` test showing that `assetUrl` delegates to the installed platform.

### T7. Boot-time platform selection (A and B) [S]

- `app/platform-select.ts`: `installPlatform()` runs synchronously at the top of `(app)/+layout.svelte`, before `registerAppPorts()` (`:27`). The selection logic is pure, in `platform-select.logic.ts`, and maps `(isTauri, os, remoteConfig) -> { platform, vaultFs, transport? }`.
- Detection must be at runtime, not build-time. `scripts/tauri-before-build.sh` skips `pnpm build` when the frontend inputs are unchanged, and its fingerprint does not include env vars. A `TAURI_ENV_PLATFORM` define (https://v2.tauri.app/reference/environment-variables/) would therefore leave the desktop bundle in an iOS build. `isTauri()` is synchronous (`@tauri-apps/api/core.js:491-493`). For iOS vs macOS, `@tauri-apps/plugin-os` `platform()` is synchronous (`plugins/os/guest-js/index.ts:96-97`, iOS supported per its README). It is a new dependency, though (Q1). `navigator.platform` is unreliable: iPadOS may report `MacIntel` (scout 06, UNVERIFIED).
- **Test:** a table test of the pure selector. A desktop selection installs nothing, which is the zero-change guarantee.

### T8. Capability gating of desktop-only paths (A and B) [M]

- Gate on `caps`:
  - listeners: `registerMenuSettingsListener`, `registerQuickCaptureListener`, `registerCloseHandler`, `registerFocusListener` (`(app)/+layout.svelte:40-58`). The iOS and web adapters map close and focus to `pagehide` and `visibilitychange`.
  - UI: the Update section, reveal items (`fs.service.ts:291`, `note-action-bar.service.ts:41`), open log folder (`log.service.ts:186`), zoom keys (`global-keybindings.ts:178-181`), font picker, semantic download UI (`SearchSection.svelte:28-73`).
  - The vault picker (`vault.service.ts:26`), which has no catch today (scout 12).
- **Test:** an integration test with `setPlatform(iosCaps)` plus a recording fake transport. It boots, opens a vault, saves a note and deletes a note, then asserts that no `desktop-only` command from `COMMAND_POLICY` was invoked. Add component tests that the gated items are absent and that the desktop caps still render them.
- **Risk:** a missed gate shows up as an `error()` and a Sentry event when an iOS call hits an unregistered command. The integration test is the net. Extend it as features are ported.

### CI (with R4 and T-steps)

- ubuntu: `cargo test --no-default-features` (R4).
- macOS nightly: `cargo check --target aarch64-apple-ios` (R4). Later a `tauri ios build` smoke. `src-tauri/gen/apple` is git-ignored (scout 13), so CI must run `tauri ios init`.
- E2E: an optional `webkit-iphone` Playwright project (`devices['iPhone 15']` defaults to webkit, scout 17 §2.3) for later UI work. It is not a seam prerequisite.

## 4. What is dropped on iOS (seam view)

| Item | Mechanism | Why |
|---|---|---|
| Semantic and hybrid search (ONNX BGE-M3, reranker, model download) | `cfg(semantic)` off, stubs registered, `semanticSearch:false` | Owner allows the drop. The model is about 542 MB plus a 571 MB reranker, with about 1.6 GB peak RSS on macOS (`semantic/mod.rs:27-31`). ORT iOS memory is unknown. FTS5 stays. |
| Auto-updater, relaunch | target-gated deps, `appUpdater:false` | Plugin unsupported on iOS (updater README). The App Store handles updates. |
| Quick capture (global shortcuts, composer window, arboard clipboard, frontmost app) | `cfg(desktop)` module, `quickCapture:false` | The global-shortcut crate is empty on iOS. The composer builder chain is `cfg(desktop)`. arboard has no iOS backend. |
| Native menu, `menu:settings` | `cfg(desktop)`, `nativeMenu:false` | Menu API is `cfg(desktop)` (tauri 2.12.5). Settings must have an in-app entry. |
| Reveal in Finder, open log folder | `revealInFileManager/openLocalPath:false` | opener `revealItemInDir` is UnsupportedPlatform, and `openPath` is likely a no-op (scout 06). |
| Folder picker for vaults | `vaultFolderPicker:false` | `FolderPickerNotImplemented` on mobile. The replacement (container vault, custom Swift picker, or the host's vault) belongs to the vault-location design, not to the seams. |
| Multi-vault switching | not built for iOS | Owner: one vault. Desktop keeps it. |
| System font list, process memory | return `[]` / `0` | `fonts.rs:71-74`. sysinfo iOS stub (scout 01 §7). Cosmetic. |

## 5. Step table (dependencies, gate, who needs it)

| Step | Depends on | Gate (CLAUDE.md rule 6) | Desktop behaviour change | A | B | Size |
|---|---|---|---|---|---|---|
| R1 EventSink + FanoutSink | none | Rust | none | required | optional | S |
| R2 VaultScope + `vault_session_open` | none | Both | rejects out-of-vault paths | required | recommended | M |
| R3 Core + `api/` for all commands | R1, R2 | Rust (bindings unchanged) | none | required | no | M |
| R4 cfg gates (desktop, semantic), capability split, parity parser, CI jobs | none | Both | none | if Tauri shell | required | M |
| R5 crate split | R3 | Rust | none | headless host only | no | M |
| T1 Transport port | none | Frontend | none | required | no | S |
| T2 Command policy | none | Frontend | none | required | required | S |
| T3 Platform port + caps | none | Frontend | none | required | required | M |
| T4 VaultFs port + conformance | none | Frontend | none | required | required | M |
| T5 `fs_*` commands + `coreVaultFs` | R2, T4 | Both | none (desktop stays on plugin-fs) | required | recommended | L |
| T6 Assets port, canvas to asset URL | T3 | Frontend | canvas image path | required | small | S-M |
| T7 Boot selection | T1, T3, T4 | Frontend | none | required | required | S |
| T8 Capability gating | T2, T3, T7 | Frontend | none | required | required | M |

Recommended order:
- Wave 1, pure seams with zero behaviour change: T1, T2, T3, T4, R1.
- Wave 2: R2, R4, T6, T7.
- Wave 3: T5, T8, R3.
- R5 only on demand.

Shortest path per model:
- B: R4, T2, T3, T7, T8, then T4 and T5 once the vault location is decided.
- A: R1, R2, R3, T1, T2, T4, T5, T6, T7, then the design-A server.

Each step is one `.scratch` Issue and one commit.

Total for all of it, excluding R5: about 20 to 27 dev-days (estimate). The Wave 1 seams alone are about 6 to 8 days.

## 6. Risks, ranked

| # | Risk | Where | Mitigation |
|---|---|---|---|
| 1 | VaultScope rejects a legitimate desktop path (symlinked root, NFC vs NFD, trailing slash, `.kokobrain` JSON) | R2 | Compare canonical forms on both sides. Test-first cases listed in R2. The deny-list covers only DB, models and index cache. Failed saves stay visible and keep their text. Optional log-only release (Q5). |
| 2 | iOS compile failures in C deps or crates nobody has built (rusqlite `cc`, sentry, notify, sysinfo) | R4 | Land the macOS `cargo check --target aarch64-apple-ios` job in the same step. With semantic gated, `onig` and ORT drop out. |
| 3 | Adapter forwards extra `undefined` args or changes error shapes, so tests break or caller semantics drift | T3, T4, T5 | Forward `...args` verbatim. Conformance suite for VaultFs. The existing per-file tests stay unmodified as the oracle. |
| 4 | ts-rs bindings silently stale after the DTO move or crate split | R3, R5 | CI `git status src/lib/contracts/generated`. Set `default-members` in R5. Check by deleting a generated file once. |
| 5 | `ipc-parity` parser breaks on `#[cfg]` entries or picks a cfg-duplicated fn | R4 | Strip attributes in `handlerEntries`. One fn per command with cfg inside the body. |
| 6 | iOS frontend calls a command that is not registered there (Sentry noise, broken saves) | R4, T8 | Keep semantic stubs registered. `COMMAND_POLICY` plus the iOS boot/save integration test. |
| 7 | A slow WS sink blocks the desktop emit or holds a lock | R1 (A) | `EventSink::emit` must not block. The WS sink does a bounded `try_send`. On overflow it drops and the client resyncs (T1 `onResync`). Emit runs after the lock is released (tested). |
| 8 | False loss detection from the index `version` | T1 | Do not use `UpdateResult.version` for gap checks (`vault/index.rs:228`). Use a transport sequence number. |
| 9 | Platform misdetected on iPad | T7 | plugin-os `platform()` or a Rust `platform_info`, never `navigator.platform`. |
| 10 | Canvas switch breaks images on a vault outside the asset scope | T6 | Manual check on two vault locations before merge. Narrow or align the asset scope with the vault separately (scout 07 §6.4). |

## 7. Corrections to the scouts (found while verifying)

- Scout 17 §1.4 (version-gap check on `vault-index-updated`): wrong for this code. The version bumps on no-op updates, which do not emit (`vault/index.rs:228`, `commands/vault.rs:317`). Replaced by the transport-level `onResync` (T1).
- Scout 05 §4 (7 new commands including `read_binary`): canvas is the only binary reader, and T6 moves it to the asset URL. 6 or 7 commands, with no binary read over IPC.
- Scout 08 §9 "only `ipc.ts` imports `call`/`on`": it is the only importer of raw `invoke`/`listen` (`raw-invoke.test.ts:14-19`, `event-listen.test.ts:16-19`). `call` is imported widely.
- Brief "~64 commands": `CommandMap` has 58, confirmed by count.
- Confirmed against the locked tags: per-entry `#[cfg]` in `generate_handler!` (tauri-v2.12.5 `handler.rs:18, 177`) and the `desktop`/`mobile` cfg aliases (tauri-build-v2.7.4 `lib.rs:659-660`).

## 8. Open questions for the owner

1. **Platform detection dependency:** add `tauri-plugin-os` and `@tauri-apps/plugin-os` (synchronous, iOS supported), or write a custom `platform_info` command and await it before `initializeVault`? The plugin is simpler. The command adds no new dependency (ADR-0014 quarantine applies).
2. **Desktop VaultFs:** keep plugin-fs and its ACL (the default in this plan), or also move desktop to the `fs_*` commands later? Moving gives one code path and fixes the canvas `readFile` gap, but needs an ADR-0025 amendment and changes rename error semantics.
3. **Crate split (R5):** only if a headless `kokobrain serve` is wanted. If the Mac app itself is the host, skip it.
4. **Semantic gate:** a Cargo feature plus an iOS target exclusion (this plan, which leaves room to try ORT on iOS later), or a plain target exclusion?
5. **VaultScope rollout:** enforce at once (this plan: tests plus visible errors), or one release in log-only mode first?
6. **ADRs:** a new ADR for "platform ports" (Transport, VaultFs, Platform, caps) and an ADR-0020 amendment (the session root is the containment root for every path command). ADR-0003 needs no change.
7. **Remote client shape:** a Tauri iOS shell that connects to the Mac (R4 needed, device-local commands available), or a PWA in Safari (R4 not needed for A, no device-local Rust)? This decides whether `device` commands in `COMMAND_POLICY` resolve locally or become no-ops.

## 9. Not verified

- No build, test, cargo or pnpm run. All iOS compile and runtime claims are source-level, except where a locked-tag source was read (R4, T7).
- Cargo `default-members` behaviour (R5) is from the Cargo book, from memory.
- On-device behaviour of `asset://` on iOS, plugin-os on iPad, WKWebView `pagehide` and `visibilitychange` as close and focus replacements, and the canvas ACL denial (G2): all UNVERIFIED.
- `TAURI_ENV_PLATFORM`'s value for iOS builds: the docs list `windows`, `darwin`, `linux`, "...etc". Not needed, since detection is at runtime.
