# Scout 03: Rust shell (lib.rs, main.rs, events, error monitoring, utils, quick capture, Tauri config, capabilities) for iOS

Scope: `src-tauri/src/{lib.rs,main.rs,events.rs,error_monitoring.rs,utils/*,quick_capture/*}`, `tauri.conf.json`, `capabilities/*`, `Cargo.toml`, `build.rs`, `gen/`. Read-only. No cargo, pnpm or compile run.

Verification basis:
- Repo facts: path:line below.
- Tauri core: fetched from tag `tauri-v2.12.5` (matches `Cargo.lock`). `https://github.com/tauri-apps/tauri/blob/tauri-v2.12.5/...`
- Plugins: fetched from plugins-workspace default branch, NOT the locked versions (global-shortcut 2.4.1, updater 2.14.1, process 2.4.0, deep-link 2.6.3, clipboard-manager 2.5.0). Platform tables may differ slightly from the locked tags.
- Tauri docs: `https://github.com/tauri-apps/tauri-docs/blob/main/src/content/docs/...`

## 1. Summary

- lib.rs is already mobile-ready at the entry point: `#[cfg_attr(mobile, tauri::mobile_entry_point)]` (lib.rs:222) and `crate-type = ["staticlib","cdylib","rlib"]` (Cargo.toml:16). `main.rs` is a desktop-only shim (main.rs:4-6).
- The shell is desktop-shaped in four places that will NOT compile for iOS as written: global-shortcut (plugin excludes iOS), updater, process, and the desktop-only Tauri APIs (menu, set_menu, on_menu_event, and the WebviewWindowBuilder chain for the composer). arboard (clipboard) also has no iOS backend.
- Quick Capture is a desktop feature: the clipboard path is on demand (no poller), the frontmost-app path is macOS AppKit/osascript with stubs elsewhere, and the composer is a second window. Drop it on iOS; the pure parts (kind_detect, shortcut registry, payload shaping) are portable.
- There is NO clipboard poller. Capture runs only when a shortcut fires or the composer submits.
- Only background threads in this shell: the vault watcher bridge (vault/watcher.rs:271), the composer refocus thread (quick_capture/commands.rs:266, macOS composer only). The rest of the threading (tokio spawns, ORT workers) is in the semantic and vault scouts' scope; listed in section 5 for completeness.
- `src-tauri/gen/apple` exists but is an EMPTY directory skeleton (23 directories, 0 files), left over from an earlier `tauri ios init`. It is untracked and git-ignored (`git status --ignored` shows `!! src-tauri/gen/`). Treat it as "not initialized".
- `capabilities/default.json` has no `platforms` key, so it applies to iOS too and references desktop-only permissions. It needs splitting.
- Deep link: only `plugins.deep-link.desktop` is configured (tauri.conf.json:47-52). iOS needs a `mobile` entry; without it `kokobrain://` does not register on iOS.

## 2. Plugin registration (lib.rs:279-287) and iOS support

Plugin platform support per plugins-workspace READMEs (fetched, default branch):

| Plugin (Cargo.toml) | Registered at | iOS per README | Crate gate on iOS | Class |
|---|---|---|---|---|
| opener (Cargo.toml:23) | lib.rs:279 | yes | n/a | works-on-iOS |
| fs (Cargo.toml:24) | lib.rs:280 | yes | n/a | works-on-iOS, needs PrivacyInfo.xcprivacy (section 7) |
| dialog (Cargo.toml:25) | lib.rs:281 | yes | n/a | works-on-iOS |
| http (Cargo.toml:66) | lib.rs:282 | yes | n/a | works-on-iOS (tasks/tauri-fetch-adapter.ts uses it) |
| deep-link (Cargo.toml:26) | lib.rs:283 | yes | iOS branch exists (`#[cfg(target_os = "ios")]`, deep-link src/lib.rs:74) | works-on-iOS after `plugins.deep-link.mobile` config (section 6) |
| clipboard-manager (Cargo.toml:27) | lib.rs:284 | yes | n/a | works-on-iOS (JS read in deep-link.service.ts:2) |
| global-shortcut (Cargo.toml:28) | lib.rs:285 + 15-17, 244-252, 271 | NO | `#![cfg(not(any(target_os = "android", target_os = "ios")))]` (global-shortcut src/lib.rs:15) | needs-cfg-gate: crate is empty on iOS, so `use tauri_plugin_global_shortcut::...` (lib.rs:15-17) fails to resolve |
| updater (Cargo.toml:67) | lib.rs:286 | NO | README tells you to target-gate the dep | needs-cfg-gate (also commands/update_channel.rs:19,97) |
| process (Cargo.toml:68) | lib.rs:287 | NO | none at crate top | needs-cfg-gate (JS `relaunch` in UpdateSection.svelte:6) |

Plugin READMEs (platform tables): global-shortcut, updater, process show iOS = x; deep-link, clipboard-manager, opener, dialog, http, fs show iOS = check:
- https://github.com/tauri-apps/plugins-workspace/blob/main/plugins/global-shortcut/README.md
- https://github.com/tauri-apps/plugins-workspace/blob/main/plugins/updater/README.md
- https://github.com/tauri-apps/plugins-workspace/blob/main/plugins/process/README.md
- https://github.com/tauri-apps/plugins-workspace/blob/main/plugins/deep-link/README.md
- https://github.com/tauri-apps/plugins-workspace/blob/main/plugins/fs/README.md (and dialog, http, opener, clipboard-manager READMEs)

Managed state (lib.rs:288-292), all portable types:
- `VaultIndexState = RwLock<VaultIndex>` (vault/mod.rs:25): works-on-iOS.
- `VaultWatcherState = Mutex<Option<VaultWatcher>>` (vault/watcher.rs:143): works-on-iOS.
- `SentryState` (error_monitoring.rs:5): type portable; Sentry on iOS UNVERIFIED (section 8).
- `PrevFrontmostPid` (quick_capture/source.rs:35): portable; only macOS code writes it. Drop with quick capture.
- `LastCaptureSignature` (quick_capture/commands.rs:35): portable.
- Global statics in db/mod.rs:17,27 (`DB`, `FTS_DB`), commands/semantic.rs:24-95: process-wide Mutex/atomics, portable.

## 3. Global shortcuts, menus, window, setup hook

### 3a. Global shortcuts (desktop only)
- Accelerators: `Ctrl+Alt+Cmd+Space` (OpenComposer) and `Ctrl+Alt+Cmd+C` (CaptureClipboard), quick_capture/shortcuts.rs:30-37. Parsed in lib.rs:229-236 with `expect`.
- Handler dispatch: lib.rs:37-87 (`dispatch_shortcut`). Guards on `db::is_open()` (lib.rs:42).
- Registration deliberately deferred into `setup` after the composer exists (lib.rs:238-243, 269-271).
- Class: DROP on iOS. iOS has no OS-level global hotkeys for an app. Also needs the desktop capability permissions removed (section 6).

### 3b. Menus (desktop only)
- `build_menu` (lib.rs:153-220): app menu, Edit, Window; `AboutMetadata` with `GIT_HASH` (lib.rs:180).
- `app.set_menu` (lib.rs:257) and `on_menu_event` (lib.rs:274-278; emits `menu:settings`).
- Tauri: `pub mod menu` is `#[cfg(desktop)]` (tauri crate lib.rs, https://github.com/tauri-apps/tauri/blob/tauri-v2.12.5/crates/tauri/src/lib.rs#L111-L113); `set_menu` is `#[cfg(desktop)]` (crates/tauri/src/app.rs:980-981); `on_menu_event` is `#[cfg(desktop)]` (crates/tauri/src/app.rs:825, 2111).
- Class: needs-cfg-gate (`#[cfg(desktop)]` or `not(any(ios, android))`). The `settings` menu item is the only path to Settings on desktop. On iOS, Settings must be reachable from in-app UI (this is already the case for the rail, presumably; UNVERIFIED in this scout).

### 3c. Main window (tauri.conf.json:12-27)
- `titleBarStyle: Overlay`, `hiddenTitle`, `trafficLightPosition`, `maximized`, `minWidth/minHeight`, `dragDropEnabled: false`. These are desktop window chrome settings. Expected to be ignored on iOS (UNVERIFIED on device).
- `macOSPrivateApi: true` (tauri.conf.json:13) and the Cargo feature `macos-private-api` (Cargo.toml:22). The Tauri config doc says `macos_private_api` is a no-op since 2.12.1 (https://github.com/tauri-apps/tauri/blob/tauri-v2.12.5/crates/tauri-utils/src/config.rs, around line 3375-3377). Class: macOS-only, harmless on iOS; can be removed when the Mac config is next touched.

### 3d. Composer window (lib.rs:92-151, 268) (macOS-centric)
- `build_composer_window` is called in setup with `?` (lib.rs:268): if it errors, setup fails and the app does not start.
- Builder chain at lib.rs:133-147 uses `.center()` (146), `.decorations(false)` (141), `.skip_taskbar(true)` (144), `.shadow(true)` (145). In tauri 2.12.5 these are methods in the `#[cfg(desktop)]` impl block (crates/tauri/src/webview/webview_window.rs: impl starts at 496, `center` 507, `decorations` 601, `skip_taskbar` 641, `shadow` 673). So the chain does NOT compile for iOS.
- `apply_move_to_active_space` (lib.rs:106-126) uses `WebviewWindow::ns_window` which is `#[cfg(target_os = "macos")]` (webview_window.rs:1953). Its non-macOS stub exists (lib.rs:125-126).
- `intercept_close_as_hide` (lib.rs:92-100): only meaningful for the composer.
- Class: DROP on iOS (composer is a popover on desktop). Gate `build_composer_window` and the `setup` call, and gate the composer commands in the invoke handler.
- UNVERIFIED: whether an iOS build of `WebviewWindowBuilder::build()` for a second window returns an error or silently creates a window. Not needed if the call is removed on iOS.

### 3e. Setup hook (lib.rs:255-273)
- Order: build_menu + set_menu (256-257) -> set_log_sink (258-267) -> build_composer_window (268) -> register_multiple shortcuts (271).
- set_log_sink emits `tauri-debug-log` via `log_handle.emit` (lib.rs:259-267). Class: works-on-iOS (emit is portable).
- Class of setup as a whole: needs-cfg-gate; keep the log sink, the managed state and nothing else.

### 3f. Invoke handler (lib.rs:293-352)
- 67 commands registered; quick-capture ones at lib.rs:348-351.

| Command group | Lines | iOS class |
|---|---|---|
| vault / search / semantic / db / history / files / watcher | 294-342 | works-on-iOS in principle (the scouts for those modules cover their own portability) |
| `set_tauri_debug_mode`, `get_process_memory` (commands/debug.rs:11-31) | 343-344 | works (sysinfo README lists iOS: https://github.com/GuillaumeGomez/sysinfo/blob/main/README.md, line 12) |
| `configure_sentry` (commands/sentry.rs) | 345 | UNVERIFIED on iOS |
| `list_system_fonts` (commands/fonts.rs:5-75) | 346 | compiles on iOS via the `not(macos)` branch and returns an empty list (fonts.rs:71-74). Could extend the CoreText block to `any(macos, ios)`; UNVERIFIED that the framework link works on iOS |
| `check_for_update_on_channel` (commands/update_channel.rs:87-129) | 347 | needs-cfg-gate / drop (uses updater plugin; updater iOS = x) |
| `capture_clipboard_now`, `open_composer`, `dismiss_composer`, `submit_composer_capture` | 348-351 | DROP on iOS (arboard, composer window, NSWorkspace) |

### 3g. Entry and binaries
- `#[cfg_attr(mobile, tauri::mobile_entry_point)] pub fn run()` (lib.rs:222-223). Already in place. Matches the Tauri template: https://github.com/tauri-apps/tauri-docs/blob/main/src/content/docs/start/project-structure.mdx (lines 41-44: lib.rs holds the mobile entry point, main.rs is desktop-only).
- `main.rs:2` `windows_subsystem` and `main.rs:5` call `kokobrain_lib::run()`: not used on iOS; no change needed.
- `generate_context!()` (lib.rs:353) reads tauri.conf.json, including the desktop-only `bundle.icon` list (tauri.conf.json:64-70). iOS icons come from `tauri icon` into `gen/apple/assets` (UNVERIFIED exact behavior).

## 4. Quick Capture (quick_capture/*): class per file

| File | Content | iOS class | Evidence |
|---|---|---|---|
| mod.rs | module tree | portable | mod.rs:9-13 |
| shortcuts.rs | `ShortcutId`, `default_registry()` accelerator strings | works-on-iOS (pure; but only consumed by desktop shortcut plugin, so drop with it) | shortcuts.rs:12-39 |
| kind_detect.rs | pure `decide(ClipboardSnapshot) -> Vec<CaptureInput>` | works-on-iOS (documented pure: kind_detect.rs:1-10; uses mime_guess, std::path only) | kind_detect.rs:1-30 |
| clipboard.rs | `Clipboard` trait, `FakeClipboard`, `SystemClipboard` (arboard) | trait/fake portable; `SystemClipboard` needs-cfg-gate | clipboard.rs:52-60, 74-136, 143-163 |
| source.rs | frontmost-app PID, NSWorkspace, osascript (Chrome/Safari tab) | macOS-only bodies with non-macOS stubs; stubs compile on iOS (the cfg is `target_os`, so iOS takes the stub branch). Effectively: returns `None` / no-op on iOS. Drop the feature | source.rs:65-88 (record), 93-116 (activate), 122-147 (frontmost bundle), 153-178 (pid->bundle), 203-236 (browsers), 242-259 (osascript) |
| commands.rs | Tauri commands and pure payload builders | command layer is DROP on iOS; `capture_clipboard_now_with` and `build_composer_note_payload` are pure and portable | commands.rs:71-97, 232-251 (capture), 263-275 (refocus thread), 281-296 (show_composer), 300-319 (open/dismiss), 348-365 (submit) |

Other quick-capture facts:
- Temp file writing for clipboard images: `std::env::temp_dir()` (commands.rs:123-142, `qc-shot-*.png`). Portable in principle; only reached via the clipboard path.
- Dedup via `LastCaptureSignature` (commands.rs:29-35, 62-97): session-only.
- Composer save path: `submit_composer_capture` emits `qc:capture-detected` (commands.rs:348-365); the main-window listener is `quick-capture.service.ts` (frontend scout's area). On iOS, the equivalent would be an in-app composer (no second window), which would still need `qc:capture-detected`-compatible payloads.
- Frontend: `src/routes/composer/+page.svelte` is a route in the same static build; capabilities/composer.json (windows: ["composer"]) is the only thing scoping it.

Clipboard poller: NONE. Confirmed by:
- All thread spawns in src-tauri/src (section 5). No loop reads the clipboard.
- Frontend `src/lib/plugins/quick-capture/` contains no `setInterval` (rg over the directory).
- Clipboard reads happen on demand: shortcut handler (lib.rs:245-251 -> lib.rs:53-84) or the `capture_clipboard_now` command (commands.rs:235-251).
- Consequence for iOS: there is no background clipboard capture to port. An iOS equivalent would be an explicit user action (in-app paste, Share extension, or Shortcuts/App Intent). Those are design options, not verified here.

## 5. Background threads and async work owned by the shell

| Thread / task | Location | Platform note |
|---|---|---|
| Vault watcher: `notify` callback thread + bridge thread, 500 ms debounce | vault/watcher.rs:14-27 (notify callback), 34 (`DEBOUNCE_MS = 500`), 271 (`thread::spawn` bridge), commands/watcher.rs:11-23 (emit) | works while foregrounded. iOS suspends the app, so events stop; re-scan on resume is needed (general iOS behavior, UNVERIFIED in this repo). `notify` iOS backend UNVERIFIED |
| Composer refocus thread (150 ms, 280 ms retries) | quick_capture/commands.rs:263-275 (spawn at 266) | macOS composer only: DROP |
| Quick capture clipboard poller | none | n/a |
| Semantic embedder/reranker idle-unload timers | commands/semantic.rs:316-317 (reranker), 328-329 (embedder) via `tokio::spawn` | portable; a sleeping timer does not survive suspension (general behavior) |
| ORT intra-op worker threads at macOS utility QoS | semantic/qos.rs:124-140, embedder.rs:28 | `pthread_set_qos_class_self_np` calls are `cfg(target_os = "macos")` (qos.rs:22, 38, 51, 56, 63, 90, 108); other targets are no-ops. Works (no-op) on iOS |
| Tokio blocking pool for scans and index work | commands/vault.rs:563, 1098, 1183; commands/search_index.rs:40, 200, 232 | works-on-iOS |
| Debug log sink (`tauri-debug-log`) | utils/logger.rs:15-30, 47-59; lib.rs:258-267 | works-on-iOS; stderr is not visible on device without Xcode |

## 6. Capabilities and tauri.conf.json (iOS-relevant)

### 6a. capabilities/default.json (windows: ["main"], no `platforms`)
- Applies to iOS because `platforms` is absent. Capability docs: https://github.com/tauri-apps/tauri-docs/blob/main/src/content/docs/security/capabilities.mdx (section "Target Platform", lines 121-154): use `"platforms": [...]` to scope; mobile example uses `["iOS","android"]`.
- Desktop-only permissions in it that must move to a desktop-scoped file:
  - `global-shortcut:allow-register`, `allow-unregister`, `allow-is-registered` (default.json:20-22)
  - `updater:default` (default.json:255)
  - `process:allow-restart` (default.json:256)
  - `core:webview:allow-create-webview-window` (default.json:16) and `core:window:allow-*` (default.json:10-15) if the composer is dropped on iOS
- Vault and log scopes that depend on path variables (`$DOCUMENT`, `$HOME`, `$APPLOG`): default.json:24-222. Path-variable resolution on iOS is UNVERIFIED (the docs list the variables at https://github.com/tauri-apps/tauri-docs/blob/main/src/content/docs/plugin/file-system.mdx, scope section). Vault location on iOS (app container vs. user-picked folder) is an architecture decision for the parent plan, not settled here.
- UNVERIFIED: whether an unresolved permission (plugin not compiled on iOS) fails the iOS build or only warns. Splitting avoids the question.

### 6b. capabilities/composer.json
- `windows: ["composer"]` (composer.json:5), permissions core:default, window hide/focus. Drop on iOS.

### 6c. tauri.conf.json
| Key | Lines | iOS class |
|---|---|---|
| `identifier` `com.diegorv.kokobrain` | 5 | reused as iOS bundle id (Xcode/`tauri ios` uses it; deep-linking.mdx mentions `$APP_BUNDLE_ID` from `identifier`) |
| `build.devUrl` `http://localhost:1420` | 8 | device builds need `TAURI_DEV_HOST`; vite.mdx:17 and this repo already reads it (vite.config.js:31) |
| `build.beforeBuildCommand` `bash scripts/tauri-before-build.sh` | 9 | UNVERIFIED whether mobile builds run it (expected yes) |
| `app.security.csp` | 29 | `connect-src` already includes `ipc:`, and Tauri builds IPC requests against `ipc://localhost/{cmd}` (crates/tauri/src/ipc/protocol.rs:611, https://github.com/tauri-apps/tauri/blob/tauri-v2.12.5/crates/tauri/src/ipc/protocol.rs). `asset:` / `http://asset.localhost` origin for iOS UNVERIFIED |
| `app.security.assetProtocol.scope` | 30-44 | path scopes incl. `$DOCUMENT`, `$HOME/...`, `$DESKTOP`, `$PICTURE`, `$DOWNLOAD`; `$DESKTOP` and `$DOWNLOAD` are not meaningful on iOS. `convertFileSrc` users: live-preview/widgets.ts and app/editor-host.ts (per the brief; not re-checked) |
| `plugins.deep-link.desktop.schemes` `["kokobrain"]` | 47-52 | desktop only. Add `plugins.deep-link.mobile` (see below) |
| `plugins.updater` | 53-58 | desktop only (updater iOS = x). App Store builds do not self-update |
| `bundle.createUpdaterArtifacts`, `bundle.targets: "all"`, `bundle.icon` (desktop icons) | 60-70 | desktop only; iOS needs its own icon set and `bundle.iOS` section |

Deep link on iOS: the deep-link docs give the mobile form (https://github.com/tauri-apps/tauri-docs/blob/main/src/content/docs/plugin/deep-linking.mdx, Examples section): `"mobile": [{ "scheme": ["ovi"], "appLink": false }]`, which "registers the `ovi://*` scheme on Android and iOS". The plugin generates `CFBundleURLTypes` from it (deep-link src/config.rs:134-145). Without this, the frontend `onOpenUrl` path (deep-link.service.ts:1) gets no iOS URLs.

`bundle.iOS.developmentTeam` (or env `TAURI_APPLE_DEVELOPMENT_TEAM`) is needed for device builds (deep-linking.mdx, iOS section, around line 145). `minimumSystemVersion` key name UNVERIFIED.

## 7. Native iOS artifacts: what `tauri ios init` needs

Present now:
- Rust mobile entry point (lib.rs:222), staticlib crate type (Cargo.toml:16).
- Vite already honours `TAURI_DEV_HOST` (vite.config.js:31).
- Local `gen/apple` directory skeleton (23 dirs, 0 files: `find src-tauri/gen/apple | wc -l` = 23; `find -type f` = 0). No project.pbxproj, no Info.plist, no Externals binaries. Re-run init; the skeleton carries nothing.

Missing / to do:
1. Run `pnpm tauri ios init` on macOS with Xcode. CLI: https://github.com/tauri-apps/tauri-docs/blob/main/src/content/docs/reference/_cli_ios.mdx (commands init, dev, build, run; macOS hosts only). It writes into `src-tauri/gen/apple` (fs plugin doc, iOS section, refers to that path).
2. `bundle.iOS.developmentTeam` in tauri.conf.json or `TAURI_APPLE_DEVELOPMENT_TEAM` (deep-linking.mdx).
3. `PrivacyInfo.xcprivacy` in `src-tauri/gen/apple` declaring `NSPrivacyAccessedAPICategoryFileTimestamp` with reason `C617.1`. The fs plugin doc requires it (https://github.com/tauri-apps/tauri-docs/blob/main/src/content/docs/plugin/file-system.mdx, iOS section). This repo reads file mtimes (commands/vault.rs:127 `.modified()`, and mtime fields in entry.rs), so it is needed regardless of the fs plugin. Whether Rust `std` metadata triggers the same privacy category is UNVERIFIED; declaring it is the conservative choice.
4. Deep-link `mobile` config (section 6c).
5. Split capabilities by platform (section 6a).
6. Target-gate Cargo deps for iOS, using the pattern the plugin READMEs recommend: `[target.'cfg(not(any(target_os = "ios", target_os = "android")))'.dependencies]` for `tauri-plugin-global-shortcut`, `tauri-plugin-updater`, `tauri-plugin-process`, and `arboard` (arboard: platform cfg `unix && !(macos|android|emscripten)` at arboard src/lib.rs:24-28, which iOS satisfies via `unix`, so it would select the X11 backend; UNVERIFIED whether that compiles on iOS; it is not functional either way).
7. Gate code (lib.rs and quick_capture) with `cfg(desktop)` or `cfg(not(any(target_os="ios", target_os="android")))`. `cfg(mobile)` is documented for the app crate (project-structure.mdx line 41). Use of `cfg(desktop)` in an app crate is UNVERIFIED here; the Tauri crate itself uses it (crates/tauri/src/lib.rs:111), so check `tauri-build` before relying on it.
8. Icons: `tauri icon` writes iOS assets into `gen/apple/assets` (UNVERIFIED for this version; the directory exists and is empty).
9. Run: `pnpm tauri ios dev` (CLI reference above).

Build-script caveat (build.rs:34-37): the ORT CoreML link workaround for `___isPlatformVersionAtLeast` is macOS-only (it returns early unless `CARGO_CFG_TARGET_OS == macos`). If iOS release builds pull ORT CoreML objects, the same undefined symbol may appear on iOS. UNVERIFIED; only relevant if semantic (ONNX) ships on iOS.

## 8. Crate-level iOS risks (not verified by compile)

| Crate | Where | Status |
|---|---|---|
| tauri-plugin-global-shortcut | Cargo.toml:28 | excluded on iOS (verified in source); must gate |
| tauri-plugin-updater | Cargo.toml:67 | README iOS = x; must gate |
| tauri-plugin-process | Cargo.toml:68 | README iOS = x; must gate |
| arboard | Cargo.toml:31 | no iOS backend; must gate (see 7.6) |
| sentry 0.49.2 (`transport`, `panic`, `backtrace`) | Cargo.toml:70; error_monitoring.rs | UNVERIFIED on iOS |
| notify 8 | Cargo.toml:41 | iOS backend UNVERIFIED |
| sysinfo 0.39 | Cargo.toml:47 | README lists iOS (sysinfo README line 12); note README warns about sandbox limits (line ~175) |
| rusqlite (bundled) | Cargo.toml:52 | expected to build (C SQLite); UNVERIFIED |
| tokenizers (onig), ort (download-binaries), reqwest | Cargo.toml:59-63 | semantic scope; prebuilt ORT for iOS UNVERIFIED |
| objc2 / objc2-foundation | Cargo.toml:72-74 | already `cfg(target_os = "macos")`; not built on iOS |
| image (png), chrono, serde, uuid, regex, similar, yaml-rust2, url, futures-util, tokio | Cargo.toml | expected portable; not checked |

## 9. #[cfg(target_os)] and desktop-only inventory (non-test code)

| Location | Gate | What | iOS |
|---|---|---|---|
| lib.rs:106, 125 | macos / not(macos) | apply_move_to_active_space (NSWindow collection behavior) | drop (composer) |
| commands/fonts.rs:7, 71 | macos / not(macos) | CoreText font families; non-macOS returns `[]` | works (empty); extend to iOS UNVERIFIED |
| semantic/qos.rs:22, 38, 51, 56, 63, 90, 108 | macos / not(macos) | QoS class calls | works (no-op) |
| quick_capture/source.rs:65, 87 | macos / not(macos) | record_prev_frontmost | works (stub) |
| quick_capture/source.rs:93, 115 | macos / not(macos) | activate_prev_app | works (stub) |
| quick_capture/source.rs:122, 144 | macos / not(macos) | frontmost_bundle_id | works (stub, None) |
| quick_capture/source.rs:153, 175 | macos / not(macos) | bundle_id_for_pid | works (stub, None) |
| quick_capture/source.rs:203, 216 | macos / not(macos) | Chrome AppleScript | works (stub) |
| quick_capture/source.rs:221, 233 | macos / not(macos) | Safari AppleScript | works (stub) |
| quick_capture/source.rs:242 | macos | run_osascript (`osascript` binary) | never reached on iOS (no osascript) |
| build.rs:34-37 | runtime env check | clang_rt link workaround | skipped on iOS |
| Cargo.toml:72-74 | target = macos | objc2 deps | not built on iOS |
| tauri.conf.json:13, 18, 19, 22 | macOS config | macOSPrivateApi, titleBarStyle, trafficLightPosition, hiddenTitle | ignored on iOS; `macOSPrivateApi` is a no-op since 2.12.1 |

Other `cfg`s in this scope: `cfg(test)` only (logger.rs:61, kind_detect.rs:175, clipboard.rs:165, commands.rs:367, shortcuts.rs:41, source.rs:282), plus `cfg_attr(mobile, ...)` (lib.rs:222), and `windows_subsystem` (main.rs:2).

## 10. Classification (shell scope)

- works-on-iOS: events.rs (7 event consts, lines 6-29); utils/logger.rs; utils/fs.rs (atomic write uses std only; WRITE_ATOMIC_SEQ at fs.rs:9); error_monitoring.rs type shape (client creation UNVERIFIED on iOS); managed state (lib.rs:288-292); lib.rs:222 mobile entry; invoke-handler vault/search/semantic/db/history/files commands; debug memory command (commands/debug.rs).
- needs-cfg-gate: lib.rs:13-17 (menu + global-shortcut imports), lib.rs:153-220 (menu, gate as a whole), lib.rs:244-252, 256-257, 271, 274-278, 285-287; quick_capture/clipboard.rs `SystemClipboard` (arboard); commands/update_channel.rs; Cargo.toml deps (global-shortcut, updater, process, arboard).
- drop on iOS: lib.rs:37-87 (shortcut dispatch), 92-151 (composer window and close-as-hide), 106-126 (macOS Space move), 268 (composer setup call); quick_capture/commands.rs (capture, open/dismiss/submit composer, refocus thread, show_composer); quick_capture/source.rs macOS bodies (stubs compile harmlessly); capabilities/composer.json; desktop permissions in default.json; updater and process config.
- pure and portable (keep): quick_capture/kind_detect.rs; quick_capture/shortcuts.rs registry (only if a future iOS intent reuses it); payload builders in quick_capture/commands.rs (`capture_clipboard_now_with`, `build_composer_note_payload`, lines 71-97 and 324-337).

## 11. What I did not check

- No compile. Every "UNVERIFIED" above needs a `cargo check --target aarch64-apple-ios` (not run here, per the Mac throttle rule).
- Plugin platform claims come from the default branch of plugins-workspace, not the locked versions.
- Not checked: iOS path resolution for `$HOME`, `$DOCUMENT`, `$APPLOG` (affects vault location and the log directory, frontend `log.service.ts:31` uses `appLogDir()`); iOS asset-protocol origin; whether `WebviewWindowBuilder::build()` on iOS fails or creates a second window; sentry/notify/ORT iOS builds; whether iOS suspension stops the watcher (general iOS behavior, not measured).
- Vault location on iOS (sandbox container vs. user-picked folder via document picker and security-scoped access) is outside this scout and is a design question for the parent plan. The current scopes assume `$DOCUMENT/kokobrain-vaults` and `$HOME/kokobrain-vaults`.
