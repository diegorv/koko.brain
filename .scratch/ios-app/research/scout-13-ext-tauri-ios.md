<!-- Recovered from the agent return value (agent a2c7f7d150e5f39cf); the scout did not write this file itself. -->

The output file was not written: this subagent's instructions forbid writing report `.md` files, so the full findings are below for the parent to save.

**Key findings (Tauri 2 on iOS, as of 2026-11-02)**

1. **Blocker for the vault picker.** The repo's vault picker calls `open({directory:true})` (`src/lib/core/vault/vault.service.ts:26`). The dialog plugin returns `FolderPickerNotImplemented` on mobile (`plugins/dialog/src/error.rs:24-26`, `plugins/dialog/src/commands.rs:185-186`, [source](https://github.com/tauri-apps/plugins-workspace/blob/HEAD/plugins/dialog/src/commands.rs)). The iOS Swift picker only uses `forOpeningContentTypes` with file types, defaulting to `UTType.item` (`plugins/dialog/ios/Sources/DialogPlugin.swift`, ~L115-128). Apple's documented route is `UIDocumentPickerViewController(forOpeningContentTypes: [.folder])`, which returns a recursive security-scoped URL that can be saved as a bookmark ([Apple: Providing access to directories](https://developer.apple.com/documentation/uikit/providing-access-to-directories)). So a folder vault on iOS needs a custom Swift plugin or a fork.
2. **plugin-fs does not cover arbitrary picked folders.** Security scope starts automatically only for `file://` URLs passed to `open()` (`plugins/fs/src/ios.rs:12`, `:33-35`, [source](https://github.com/tauri-apps/plugins-workspace/blob/HEAD/plugins/fs/src/ios.rs)). The repo's 27 plugin-fs importers (`grep -l ... --exclude-dir=tests`) pass plain absolute paths. Persistence across launches is not provided: [tauri#3716](https://github.com/tauri-apps/tauri/issues/3716) is open since 2022-03-17.
3. **Desktop-only plugins are registered unconditionally.** `global-shortcut`, `updater` and `process` are registered at `src-tauri/src/lib.rs:285-287`, and their deps are unconditional at `src-tauri/Cargo.toml:28`, `:67`, `:68`. The only target gate is macOS (`Cargo.toml:72`). The README matrix lists updater, window-state and positioner as iOS ❌, and global-shortcut, process and persisted-scope as `?` ([plugins-workspace README](https://github.com/tauri-apps/plugins-workspace)).
4. **Native Swift plugins are the sanctioned extension point.** Layout: `ios/Package.swift` plus `ios/Sources/*.swift`; `Package.swift` declares `.iOS(.v13)` ([dialog Package.swift](https://github.com/tauri-apps/plugins-workspace/blob/HEAD/plugins/dialog/ios/Package.swift)). Commands are `@objc` methods taking `Invoke`, Rust calls `run_mobile_plugin`, and C FFI uses `@_silgen_name` ([develop-mobile.mdx](https://github.com/tauri-apps/tauri-docs/blob/HEAD/src/content/docs/develop/Plugins/develop-mobile.mdx), lines 44, 414-416).
5. **Background work is not available.** There is no Tauri background API (code search for `BGTaskScheduler` in tauri and plugins-workspace returned zero hits). iOS only offers BGTaskScheduler, which Apple describes as running code "even when the app is suspended" ([Apple: BGTaskScheduler](https://developer.apple.com/tutorials/data/documentation/backgroundtasks/bgtaskscheduler.json)). Run timing is UNVERIFIED (from memory).
6. **Rust crates with iOS exposure.** `notify` falls back to kqueue on iOS (`notify/src/lib.rs:321`, [source](https://github.com/notify-rs/notify/blob/HEAD/notify/src/lib.rs)). `arboard` pulls its Linux/x11 backend on iOS because `unix` matches iOS (`arboard/src/platform/mod.rs:1`, `Cargo.toml:80`), while the repo uses it unconditionally (`Cargo.toml:31`, `src-tauri/src/quick_capture/clipboard.rs:76`). Likely compile risk, not compiled. `ort` ships prebuilt iOS arm64 and simulator binaries with the coreml variant only, and no x86_64 iOS row ([dist.tsv](https://github.com/pykeio/ort/blob/HEAD/ort-sys/build/download/dist.tsv) lines 4-5). `ort` is pinned at `2.0.0-rc.13` (`Cargo.toml:59`) but the lock resolves `rc.15`.
7. **Signing and distribution.** $99/yr Apple Developer membership, Xcode-managed signing, or manual cert and profile via `IOS_CERTIFICATE`, `IOS_CERTIFICATE_PASSWORD`, `IOS_MOBILE_PROVISION` ([sign/ios.mdx](https://github.com/tauri-apps/tauri-docs/blob/HEAD/src/content/docs/distribute/Sign/ios.mdx)). Team ID comes from `bundle.iOS.developmentTeam` or `APPLE_DEVELOPMENT_TEAM` (`tauri-utils/src/config.rs:3612-3613`). Upload uses `tauri ios build --export-method app-store-connect`, then `altool` ([app-store.mdx](https://github.com/tauri-apps/tauri-docs/blob/HEAD/src/content/docs/distribute/app-store.mdx), ~L301-319). The docs disagree on the key-ID env var name (`APPLE_API_KEY` in sign/ios.mdx, `APPLE_API_KEY_ID` in app-store.mdx).
8. **Remote-model (A) network gotcha.** iOS ATS blocks plain HTTP unless an exception is configured ([Apple: ATS](https://developer.apple.com/tutorials/data/documentation/bundleresources/information-property-list/nsapptransportsecurity.json)). Exceptions go through `bundle.iOS.infoPlist`, a merge-file path (`config.rs:3629-3633`).

---

**Repo baseline (verified locally)**

| Item | Evidence |
|---|---|
| Mobile entry point present | `src-tauri/src/lib.rs:222` `#[cfg_attr(mobile, tauri::mobile_entry_point)]` |
| Crate types | `src-tauri/Cargo.toml:16` `["staticlib","cdylib","rlib"]` |
| build.rs calls tauri_build | `src-tauri/build.rs:23` `tauri_build::build()` |
| Mobile entry macro needs env vars | `crates/tauri-macros/src/mobile.rs`, `get_env_var` for `TAURI_ANDROID_PACKAGE_NAME_*` runs unconditionally in `entry_point`; error text says "do you have a build script with tauri-build?" ([source](https://github.com/tauri-apps/tauri/blob/HEAD/crates/tauri-macros/src/mobile.rs)) |
| iOS project generated locally | `src-tauri/gen/apple/kokobrain.xcodeproj`, `build/kokobrain_iOS.xcarchive` (mtime Jun 9-10 2026), `src-tauri/gen/schemas/iOS-schema.json` |
| Generated iOS project is not in git | `git ls-files src-tauri/gen/apple` = 0 files; `git status --ignored` shows `!! src-tauri/gen/`; `core.excludesfile` = `~/dotfiles/git/ignore_global`. Fresh checkouts and CI must re-run `tauri ios init`. |
| iOS CLI subcommands | `tauri-cli/src/mobile/ios/mod.rs:94-100`: Init, Dev, Build, Run, XcodeScript ([source](https://github.com/tauri-apps/tauri/blob/HEAD/crates/tauri-cli/src/mobile/ios/mod.rs)) |
| Default min iOS | `tauri-utils/src/config.rs:3621` defaults to `15.0` ([source](https://github.com/tauri-apps/tauri/blob/HEAD/crates/tauri-utils/src/config.rs)) |
| Asset protocol scope is desktop-shaped | `src-tauri/tauri.conf.json:30-36`: `$DOCUMENT/**`, `$HOME/MyFiles/**`, `.kokobrain` variants. `convertFileSrc` is at `src/lib/app/editor-host.ts:73`. |
| Static CSP | `src-tauri/tauri.conf.json:29`. No iOS bundle block exists in the config (the `bundle` key is at line 60). |
| macOS-only code | `src-tauri/src/lib.rs:106` (`apply_move_to_active_space`), `Cargo.toml:72-74` (objc2). Desktop window code at `lib.rs:92`, `:132` (composer window), `:153` (menu). Menu on iOS is unsupported ([tauri#15964](https://github.com/tauri-apps/tauri/issues/15964)). |
| Capabilities | `src-tauri/capabilities/default.json:5` lists windows, with no `platforms` key. Capability `platforms` exists in tauri-utils (`crates/tauri-utils/src/acl/capability.rs:196-204`, [source](https://github.com/tauri-apps/tauri/blob/HEAD/crates/tauri-utils/src/acl/capability.rs)). |
| plugin-fs importers | 27 non-test files import `@tauri-apps/plugin-fs`, e.g. `src/lib/core/filesystem/fs.service.ts:1` |

**Mobile plugin support for the repo's plugins** (README matrix, [plugins-workspace](https://github.com/tauri-apps/plugins-workspace))

| Plugin | iOS | Repo use |
|---|---|---|
| dialog | ✅ (file picker only; folder picker not implemented) | `vault.service.ts:26` folder pick |
| fs | has `plugins/fs/src/ios.rs` | 27 files |
| opener | ✅ | 7 files |
| deep-link | ✅ | registered `lib.rs:283` |
| clipboard-manager | ✅ | `lib.rs:284` |
| http | ✅ | `lib.rs:282` |
| global-shortcut | ? | `lib.rs:285`, desktop feature |
| updater | ❌ | `lib.rs:286` |
| process | ? | `lib.rs:287` |

**Filesystem on iOS**

- App container is the default sandbox. `$DOCUMENT` and `$HOME` resolve inside it.
- Folders outside the sandbox: Apple says a picked directory URL lets the app recursively access its contents, and children are security-scoped. Every access needs `startAccessingSecurityScopedResource`, a file-coordinator read or write, then `stop...`. Bookmarks resolve back to a scoped URL ([Apple](https://developer.apple.com/tutorials/data/documentation/uikit/providing-access-to-directories.json)).
- Dialog `copy` vs `scoped` mode: `plugins/dialog/guest-js/index.ts:90-107`. Copy duplicates the file into the sandbox. Scoped keeps the original and needs iOS 14+ (`:141`, `:151`). Image and video pickers always copy.
- Files app exposure: Apple's UIFileSharingEnabled overview says "If you set this key to YES, your app can share files with the user. Place the files in a Documents folder..." ([Apple](https://developer.apple.com/tutorials/data/documentation/bundleresources/information-property-list/uifilesharingenabled.json)). The fetched text does not cover Files-app visibility. The combination with LSSupportsOpeningDocumentsInPlace is UNVERIFIED (from memory). LSSupportsOpeningDocumentsInPlace is about opening documents from file providers in place ([Apple](https://developer.apple.com/tutorials/data/documentation/bundleresources/information-property-list/lssupportsopeningdocumentsinplace.json)).
- Implication for ADR-0019 (`.kokobrain/` inside the vault): a vault in iCloud Drive or another file provider would be scoped and need a bookmark. Writing a SQLite WAL database there is UNVERIFIED as safe. Fetched sources do not cover it.
- Community options (UNVERIFIED beyond repo state): [alasdairpan/tauri-plugin-ios-bookmark](https://github.com/alasdairpan/tauri-plugin-ios-bookmark) (MIT, pushed 2026-06-23, 0 stars). Its described commands (`pickAndBookmark`, `readByBookmark`, `forgetBookmark`) and folder support are from docs.rs ([docs.rs](https://docs.rs/tauri-plugin-ios-bookmark/latest/tauri_plugin_ios_bookmark/)). The repo URL `TensorBinge/...` from search was wrong. `tauri-plugin-scoped-bookmarks` (docs.rs) was not opened.

**WKWebView**

- Tauri serves the frontend on `tauri://localhost` on macOS and iOS (`crates/tauri/src/manager/mod.rs:769`, `:792`, [source](https://github.com/tauri-apps/tauri/blob/HEAD/crates/tauri/src/manager/mod.rs)).
- Open bug [tauri#16442](https://github.com/tauri-apps/tauri/issues/16442): CSP HTTP header over 16 KiB is truncated by WebKit, leaving the WebView blank. Applies to code-split bundles with per-asset hashes. The repo's static CSP (`tauri.conf.json:29`) may not hit it. Not verified.

**Known pain points** (open issues, GitHub, 2026-11-02)

| Issue | Summary |
|---|---|
| [plugins-workspace#3030](https://github.com/tauri-apps/plugins-workspace/issues/3030) (2025-10-07) | iOS picker: custom extensions unselectable, image picker default, security-scope handling incomplete |
| [plugins-workspace#1976](https://github.com/tauri-apps/plugins-workspace/issues/1976) (2024-10-27) | `writeTextFile` on iOS produces empty file (device and simulator) |
| [tauri#16121](https://github.com/tauri-apps/tauri/issues/16121) | Latest Xcode requires functionality Tauri does not support |
| [tauri#15663](https://github.com/tauri-apps/tauri/issues/15663) | Embedded app extensions lose entitlements under App Store Connect API-key auth |
| [tauri#15740](https://github.com/tauri-apps/tauri/issues/15740) | Signing identity not resolved on clean CI runners (Xcode 26) |
| [tauri#15931](https://github.com/tauri-apps/tauri/issues/15931) | Xcode build phase cannot find Node under nvm |
| [tauri#15719](https://github.com/tauri-apps/tauri/issues/15719) | Empty UISceneConfigurations crash on iOS 27 SDK |
| [tauri#15526](https://github.com/tauri-apps/tauri/issues/15526) | `ios-deploy` invocation failure |

Open-issue counts (GitHub search API): 46 with label `platform: iOS`, 157 matching the keyword `ios`.

**Native-plugin and background gaps**

- No official folder picker on iOS, so one must be written in Swift.
- BGTaskScheduler timing and force-quit behavior are from memory (UNVERIFIED); the fetched Apple page gave no timing text.

**Not checked**

- No compile or cargo run, per the rules. arboard, ort, tokenizers (onig), sysinfo, rusqlite and reqwest iOS builds are UNVERIFIED.
- UIFileSharingEnabled plus LSSupportsOpeningDocumentsInPlace for Files visibility: from memory.
- WKWebView File System Access API support: not checked.
- ATS ports for a tailnet route, Local Network permission prompts: not checked.
- Tailscale-specific HTTPS certs: not checked.