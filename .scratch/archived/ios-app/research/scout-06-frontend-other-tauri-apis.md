<!-- Recovered from the agent return value (agent ae3e60c1ba775254e); the scout did not write this file itself. -->

Not written to the .scratch path: subagent rules bar report .md files, so the parent should persist this text to `/Users/diegorv/Dev/pet-projects/koko/brain/.scratch/ios-app/research/scout-06-frontend-other-tauri-apis.md`.

## Key findings

1. **Vault folder picker is a hard iOS blocker.** `open({directory:true})` returns `FolderPickerNotImplemented` on mobile (plugin-dialog 2.8.4, `commands.rs:185-186`). It is the only vault-open path (`vault.service.ts:26`, called from `routes/(app)/+page.svelte:13`).
2. **Dialog `ask`/message works on iOS** (9 call sites, README iOS ✓, `showMessageDialog` in `DialogPlugin.swift`). Not a blocker.
3. **Plugins with no iOS support:** process (`relaunch`), updater, global-shortcut, and opener `reveal_item_in_dir`. Opener `openPath` is effectively a no-op on iOS, which breaks "open log folder".
4. **Rust-side compile risk (inferred, not compiled):** `lib.rs:15-17, 245-271` use global-shortcut unconditionally. The plugin crate is `#![cfg(not(any(target_os="android", target_os="ios")))]` (global-shortcut 2.4.1 `src/lib.rs:15`), so an iOS build would fail to resolve it. `Cargo.toml:28` is unconditional.
5. **Badge and zoom are not desktop-only per Tauri docs.** `setBadgeCount` is supported on iOS (i32 clamp, tauri 2.12.5 `window/mod.rs:2282`). `setZoom` is iOS 14+ (`webview_window.rs:2687`), but keyboard zoom is only meaningful on iPad with a keyboard.
6. **Deep links need iOS config.** `tauri.conf.json:47-52` declares only `desktop.schemes: ["kokobrain"]`. iOS needs `mobile` entries (universal links per README; custom-scheme behaviour on iOS UNVERIFIED).
7. **Local iOS scaffold exists but is git-ignored.** `src-tauri/gen/` (`git check-ignore` confirms) has `apple/` with `kokobrain.xcodeproj` and `build/kokobrain_iOS.xcarchive`. Its `gen/schemas/iOS-schema.json` has no `process:`, `updater:` or `global-shortcut:` identifiers, while `desktop-schema.json` has them. This agrees with the plugin READMEs.
8. **Capabilities have no `platforms` key** (`src-tauri/capabilities/default.json`). Desktop-only permissions (updater-related, process restart, global-shortcut, set-zoom, badge) are therefore granted on iOS too. Harmless, but misleading.

## Platform support at locked versions

Versions from `src-tauri/Cargo.lock`: tauri 2.12.5, dialog 2.8.4, opener 2.7.2, process 2.4.0, deep-link 2.6.3, http 2.8.3, clipboard-manager 2.5.0, updater 2.14.1, global-shortcut 2.4.1. Sources are the upstream tags of the same names, read via `gh api`.

| Plugin / API | iOS | Evidence |
|---|---|---|
| dialog `ask`/`message` | ✓ | README table; `DialogPlugin.swift:264` (`showMessageDialog`) |
| dialog `open` file | ✓ (UIDocumentPicker) | `DialogPlugin.swift:68-136` |
| dialog `open` directory | ✗ `FolderPickerNotImplemented` | dialog-v2.8.4 `commands.rs:185-186` |
| opener `openUrl` | ✓ default browser; `with:"inAppBrowser"` uses SFSafariViewController | opener-v2.7.2 `OpenerPlugin.swift:18-33` |
| opener `openPath` | Resolves unconditionally; a plain path becomes a scheme-less `URL(string:)`, so likely silent no-op (inference, UNVERIFIED on device) | `OpenerPlugin.swift:18-40`; docs say "Always opens using default program" (`open.rs:42`) |
| opener `revealItemInDir` | ✗ `UnsupportedPlatform` | `reveal_item_in_dir.rs:11-12, 35, 75` |
| process `relaunch` | ✗ (README x) | process-v2.4.0 README; `commands.rs:13-15` (`request_restart`) |
| http `fetch` | ✓ | README |
| deep-link `onOpenUrl`/`getCurrent` | ✓ via universal links (`mobile` domains) | README:67-101; `deep-link src/lib.rs:9-11, 74-75` |
| clipboard `readText` | ✓ | README |
| updater | ✗ (README x) | updater-v2.14.1 README |
| global-shortcut | ✗ crate cfg'd out | `global-shortcut src/lib.rs:15` |
| `window.setBadgeCount` | ✓ | tauri 2.12.5 `window/mod.rs:2282` |
| `webview.setZoom` | ✓ iOS 14+ | `webview_window.rs:2687` |
| `window.onCloseRequested` / `destroy` / `onFocusChanged` | UNVERIFIED | No iOS close event found in docs checked |
| `convertFileSrc` | ✓ URL form `asset://localhost/<encoded>` (not windows/android branch) | tauri 2.12.5 `scripts/core.js:16-18` |
| `path.appLogDir` | JS docs list only Linux/macOS/Windows. Rust non-macOS branch gives `data_local_dir()/<id>/logs` (UNVERIFIED on device) | `path/desktop.rs:296-306`; `path.ts:658-667` |
| `Channel`, `invoke`, `listen` | Core, not platform-gated (not separately verified) | `ipc.ts` |

## Call-site inventory (all under `/Users/diegorv/Dev/pet-projects/koko/brain/`)

**plugin-dialog**

| file:line | Does | iOS | Browser / thin client |
|---|---|---|---|
| `src/lib/app/tauri-listeners.service.ts:58` | `ask` on close with failed saves | ✓ | `dialog` component (`src/lib/components/ui/dialog` exists), `window.confirm` |
| `src/lib/core/editor/editor.service.ts:272` | `ask` discard unsaved changes | ✓ | same |
| `src/lib/core/settings/sections/TrashSection.svelte:34,49` | `ask` confirm trash | ✓ | same |
| `src/lib/core/settings/sections/UpdateSection.svelte:195` | `ask` downgrade to stable | ✓ dialog, but updater itself ✗ | n/a on iOS |
| `src/lib/core/vault/vault.service.ts:26` | `open({directory:true})` vault picker (`openVaultDialog`, called from `src/routes/(app)/+page.svelte:13`) | ✗ | `showDirectoryPicker()` (Chrome 86+, Safari and Firefox no; MDN `api/Window.json`). Thin client: host-side vault list, not a local picker |
| `src/lib/features/file-history/FileHistoryDialog.svelte:44` | `ask` | ✓ | same |
| `src/lib/features/note-action-bar/note-action-bar.service.ts:21` | `ask` move to trash | ✓ | same |
| `src/lib/features/note-list/NoteRowMenu.svelte:123` | `ask` | ✓ | same |
| `src/lib/features/rail-shell/FilesNavigator.svelte:170` | `ask` | ✓ | same |

**plugin-opener**

| file:line | Does | iOS | Browser / thin client |
|---|---|---|---|
| `src/lib/app/editor-host.ts:82` (`openExternal`; callers `live-preview/click-handler.ts:36`, `meta-bind-button-widget.ts:99`) | open URL | ✓ | `window.open(url,'_blank','noopener')` (no existing call) |
| `src/lib/core/settings/sections/TodoistSection.svelte:35` | open Todoist settings URL | ✓ | `<a target=_blank rel=noopener>` |
| `src/lib/core/settings/sections/UpdateSection.svelte:252` | open GitHub releases | ✓ | same |
| `src/lib/features/canvas/LinkNode.svelte:83` | open canvas link | ✓ | same |
| `src/lib/core/filesystem/fs.service.ts:291` | `revealItemInDir` (reveal in Finder) | ✗ | none; hide on iOS, or show copyable path |
| `src/lib/features/note-action-bar/note-action-bar.service.ts:41` | `revealItemInDir` | ✗ | same |
| `src/lib/utils/log.service.ts:186` (`openLogDir` at :180; called from `TroubleshootingSection.svelte:82`) | `openPath(logsDir)` | effectively ✗ | none |

**plugin-process**

| file:line | Does | iOS | Browser / thin client |
|---|---|---|---|
| `src/lib/core/settings/sections/UpdateSection.svelte:209` (`restartApp`, button at :293) | `relaunch()` | ✗ | `location.reload()`; iOS restarts are OS-managed |

**plugin-http**

| file:line | Does | iOS | Browser / thin client |
|---|---|---|---|
| `src/lib/features/tasks/tauri-fetch-adapter.ts:16` (used by `todoist-client.ts:10`) | Todoist SDK fetch, bypasses CORS per the file's own comment (lines 7-8) | ✓ | `fetch`. Whether api.todoist.com sends CORS headers for a browser origin: UNVERIFIED |

**plugin-deep-link**

| file:line | Does | iOS | Browser / thin client |
|---|---|---|---|
| `src/lib/features/deep-link/deep-link.service.ts:87` (`onOpenUrl`), `:99` (`getCurrent`); registered in `src/routes/(app)/+layout.svelte:49` | Receives `kokobrain://` URLs | ✓ with universal-link config; `kokobrain://` on iOS UNVERIFIED | Parse query string on load, use `https://host/...` routes |

**plugin-clipboard-manager**

| file:line | Does | iOS | Browser / thin client |
|---|---|---|---|
| `src/lib/features/deep-link/deep-link.service.ts:217` (`readText`, for `clipboard=true` deep links) | Read clipboard | ✓ | `navigator.clipboard.readText()` (user gesture and permission; from memory, UNVERIFIED) |

**api/window**

| file:line | Does | iOS | Browser / thin client |
|---|---|---|---|
| `src/lib/app/tauri-listeners.service.ts:53` (`onCloseRequested`), `:71` (`destroy`) | Save dirty tabs before quit | UNVERIFIED | `visibilitychange`/`pagehide` for save-on-background (recommendation) |
| `src/lib/app/tauri-listeners.service.ts:309` (`onFocusChanged`, in `registerFocusListener` :306) | Refresh daily note on focus | UNVERIFIED | `visibilitychange` |
| `src/lib/features/dock-badge/dock-badge.service.ts:17` (`setBadgeCount`; caller `src/lib/app/AppShell.svelte:73`) | Badge count | ✓ (may need notification permission: UNVERIFIED) | `navigator.setAppBadge`/`clearAppBadge` (BCD: Safari 17, iOS 16.4; installed-app requirement UNVERIFIED) |

**api/webviewWindow**

| file:line | Does | iOS | Browser / thin client |
|---|---|---|---|
| `src/lib/core/zoom/zoom.service.ts:29` (`setZoom`; keys at `src/lib/app/global-keybindings.ts:178-181`) | Cmd+=/-/0 zoom | iOS 14+ API, keyboard-only use | None needed; browser zoom |

**api/path**

| file:line | Does | iOS | Browser / thin client |
|---|---|---|---|
| `src/lib/utils/log.service.ts:31` (`appLogDir`) | Log dir (comment at :27 says `~/Library/Logs`, macOS-only) | Non-macOS path branch (UNVERIFIED on device) | Remote logs via host |

**api/core**

| file:line | Does | iOS | Browser / thin client |
|---|---|---|---|
| `src/lib/contracts/ipc.ts:1, 25` (`invoke` in `call()`), `:2, 37` (`listen` in `on()`) | Typed IPC | ✓ | WebSocket/HTTP to host |
| `src/lib/core/settings/sections/UpdateSection.svelte:171` (`plugin:updater|download_and_install`), `:157` (`Channel` for progress) | Desktop updater | ✗ | none |
| `src/lib/app/editor-host.ts:73` (`convertFileSrc`, via `assetUrl` :72; consumers `live-preview/widgets.ts:159, 517`) | Image URLs for editor | ✓ `asset://localhost/`; CSP `img-src` already includes `asset:` (`tauri.conf.json:29`); `$DOCUMENT/**` scope (`:33`) | host HTTP asset URL or blob URL |

**api/event** (all cross-platform; subscription sites)

| file:line | Event |
|---|---|
| `src/lib/app/tauri-listeners.service.ts:30` | `menu:settings` (native menu, see desktop-only) |
| `src/lib/app/tauri-listeners.service.ts:270` | `vault-index-updated` |
| `src/lib/core/filesystem/fs.watcher.ts:198` | `vault-files-changed` |
| `src/lib/features/search/search.service.ts:86` | `semantic-index-progress` (ONNX, see iOS note) |
| `src/lib/utils/debug.ts:123` | `tauri-debug-log` |
| `src/lib/plugins/quick-capture/quick-capture.service.ts:55` | `qc:capture-detected` (macOS quick capture) |
| `src/routes/composer/+page.svelte:76` | `qc:open-composer` (second window) |

Type-only imports of `UnlistenFn`: `fs.watcher.ts:1`, `search.service.ts:1`, `utils/debug.ts:1`, `routes/composer/+page.svelte:2`.

**Browser-native (no Tauri plugin)**

- `navigator.clipboard.writeText`: `code-block-widget.ts:94`, `copy-block-link.service.ts:36,58`, `note-action-bar.service.ts:51`, `FilesNavigator.svelte:179`, `NoteRowMenu.svelte:197,200`, `TypesNavigator.svelte:274,277,321,324`. Clipboard write is Safari 13.1+ (BCD `api/Navigator.json`). Works in WKWebView on iOS: UNVERIFIED in Tauri.
- `<input type="file">`: `components/ui/input/input.svelte:33` (generic), `core/settings/sections/ThemeEditor.svelte:167` (theme JSON import). Already browser-compatible.
- `window.open`: none found. `isTauri`/`__TAURI__` checks: none found. No `plugin-os`, `plugin-store`, `plugin-notification`, `plugin-global-shortcut` JS imports.
- Platform detection: `src/lib/utils/platform.ts:17-23` (`IS_MAC` via `navigator.platform`), used by 6 files (`kb-api.ts:12`, `MarkdownEditor.svelte:17`, `wikilink-click-target.ts:3`, `click-handler.ts:4`, `widgets.ts:18`, and platform.ts itself). iPadOS desktop UA reporting "MacIntel" would make `IS_MAC` true on iPad: from memory, UNVERIFIED.

## Desktop-only features to flag

| Feature | Where | iOS status |
|---|---|---|
| Vault folder picker | `vault.service.ts:26`, `(app)/+page.svelte:13` | Blocked (dialog folder picker) |
| Auto-updater + restart | `UpdateSection.svelte:135-210, 171` | Not available; App Store |
| Global hotkey (quick capture) | `lib.rs:15-17, 245-271`; `Cargo.toml:28`; capability `default.json:20-22` | Plugin crate absent on iOS; compile risk |
| Native menu, Settings item | `lib.rs:154-215, 274-278`; `tauri-listeners.service.ts:30` | No iOS menu bar (UNVERIFIED in Tauri docs) |
| Composer popover window | `lib.rs:132-160, 268`; `routes/composer/+page.svelte` | Second window on iOS UNVERIFIED; `build_composer_window` is called unconditionally |
| Quick-capture source | `src-tauri/src/quick_capture/source.rs` (macOS `cfg` gates at :65, :87, :93, ...) | macOS-only |
| Zoom shortcuts | `zoom.service.ts`, `global-keybindings.ts:178-181` | Keyboard-only; drop for iPhone |
| Reveal in Finder, open log folder | `fs.service.ts:291`, `note-action-bar.service.ts:41`, `log.service.ts:186` | Unsupported or no-op |
| Window close / focus handlers | `tauri-listeners.service.ts:53-71, 309` | UNVERIFIED on iOS |
| Dock badge | `dock-badge.service.ts:17` | Supported per Tauri docs |
| Deep-link custom scheme | `tauri.conf.json:47-52`; `deep-link.types.ts:11-48` | Needs `mobile` config |

## Other Rust/config notes

- `tauri.conf.json:29` CSP `connect-src` lists `huggingface.co` and GitHub hosts, relevant to the semantic model download.
- `tauri.conf.json:30-43` asset scope lists macOS paths (`$HOME/MyFiles`, `$HOME/kokobrain-vault`, `$DESKTOP`, `$PICTURE`, `$DOWNLOAD`). On iOS, `$DOCUMENT/**` is the only applicable entry. How `$DOCUMENT` resolves on iOS: UNVERIFIED.
- `updater` is unconditional at `Cargo.toml:67` and `lib.rs:286`. The updater README recommends target-gating for mobile.

## Not verified

- Did not compile or run anything (per rules). The global-shortcut compile failure is inferred from the crate-level `cfg`.
- Not verified on device: `openPath` no-op, custom-scheme deep links on iOS, `appLogDir` location, `onCloseRequested`/`onFocusChanged` on iOS, iPad `navigator.platform`, badge permission requirements, Todoist CORS.