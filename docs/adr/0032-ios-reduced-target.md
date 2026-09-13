---
type: ADR
id: "0032"
title: "iOS / iPadOS as a reduced target: feature-gated semantic engine and desktop shell, one on-device vault"
status: active
date: 2026-09-13
---

## Context

The app was macOS-only: a native menu bar, a quick-capture composer window driven by global shortcuts, an in-app updater and an ONNX Runtime backed semantic search (`ort`, `tokenizers`, two ~550 MB models) were all wired unconditionally in `src-tauri/src/lib.rs`, and the frontend assumed a folder picker, three resizable panes and Cmd-key shortcuts. The user wants the markdown editor on iPhone and iPad, explicitly without semantic search.

Constraints discovered while mapping the crate (all verified in the cargo registry on 2026-09-13):

- `ort` 2.0.0-rc.13 has no iOS binaries under `download-binaries`; `arboard` 3.6 has no iOS backend; `tauri-plugin-global-shortcut` 2.3 is `#![cfg(not(any(android, ios)))]`; the updater and process plugins are desktop-only.
- `notify` 8.2 selects `KqueueWatcher` on iOS, `sysinfo` 0.39 supports iOS, `rusqlite` is bundled: the vault index, watcher, FTS5 search and file history need no change.
- Tauri validates each capability file against the plugins present in the dependency tree, but skips files whose `platforms` exclude the target.
- The Tauri CLI exposes `tauri ios` only on macOS, and `cargo check --target aarch64-apple-ios` needs the Apple SDK for the `-sys` build scripts, so the mobile Rust profile cannot be compiled in a Linux container.
- iOS has no folder picker for arbitrary locations and `tauri-plugin-fs` exposes no security-scoped bookmarks; the app can only write inside its own container.

## Decision

**Ship iOS / iPadOS as a reduced target selected by two default Cargo features that `build.rs` forces off on mobile, a platform-scoped capability split, a frontend `platformStore.isMobile` flag read at every desktop-only call site, and a single on-device vault under the app container's `Documents`.** Desktop keeps every feature and the same code path; mobile compiles the cross-platform core only.

Components:

1. **Cargo features `semantic` and `desktop-integration`** (`src-tauri/Cargo.toml`), on by default. Their crates are declared under `[target.'cfg(not(any(target_os = "ios", target_os = "android")))'.dependencies]` as optional, so an iOS build never resolves them. `build.rs` emits the `semantic` / `desktop_integration` cfgs only when the feature is on *and* the target is not mobile; code gates on the cfg, never on the feature, so `--no-default-features` on a desktop host reproduces the mobile cfg set exactly (`scripts/check-mobile-profile.sh`, run in CI).
2. **Module gating** (`lib.rs`, `semantic/mod.rs`, `commands/mod.rs`): `semantic::{embedder, model, reranker}` and `commands::semantic` behind `semantic`; `quick_capture`, `commands::update_channel`, the menu bar, composer window, global shortcuts, updater and process plugins behind `desktop_integration`. `tauri::generate_handler!` takes `#[cfg]` per command. The pure semantic modules (chunker, quantize, filtering, types, cache stats) stay unconditional because the FTS / hybrid code and their tests use them.
3. **Capabilities** (`src-tauri/capabilities/`): `default.json` holds every cross-platform permission; `desktop.json` and `composer.json` carry `"platforms": ["macOS", "windows", "linux"]`. `KOKO_CAPABILITIES_GLOB` in `build.rs` lets the host-side check validate only `default.json`.
4. **Frontend platform flag** (`src/lib/core/platform/`): `detectPlatform(userAgent, maxTouchPoints)` (iPadOS reports a desktop `Macintosh` user agent; `maxTouchPoints > 1` is the tell) behind a getter-based store. Semantic init / shutdown / incremental updates, the auto update check, the Update and Quick Capture settings sections, the semantic toggle and the non-text search modes read it; settings values are never rewritten on mobile so a synced vault keeps its desktop configuration.
5. **On-device vault** (`vault.service.ts::openMobileVault`, `vault.logic.ts::mobileVaultPath`): `<documents>/kokobrain-vaults/Notes`, created on first launch and opened by the welcome page on mount. `Info.ios.plist` sets `UIFileSharingEnabled` + `LSSupportsOpeningDocumentsInPlace` so the folder is reachable from the Files app. The path stays inside the `$DOCUMENT/kokobrain-vaults/**` scope shared with desktop.
6. **Touch shell** (`AppShell.svelte` mobile branch, `mobile-layout.store.svelte.ts`): full-width editor, the file explorer / search panel as an overlay drawer, status-bar buttons for the drawer and settings, `h-dvh` + `env(safe-area-inset-*)` with `viewport-fit=cover`. Drawer state is transient: `layout.leftSidebarVisible` describes the desktop pane and syncs between machines.

## Alternatives considered

- **Gate on Tauri's own `desktop` / `mobile` cfgs only, no Cargo features.** Rejected: the mobile branch of the crate could then only be compiled with an Apple SDK, so a Linux container or CI could not catch an unused import or a missing `#[cfg]` before the first Xcode build. The features cost one `[features]` table and ten lines of `build.rs`.
- **A `cfg(feature = "semantic")` gate without the build.rs indirection.** Rejected: the feature is on by default, so an iOS build would still see it on while the optional crates are absent for that target, and the code would fail to compile there. Deriving the cfg from feature *and* target keeps one gate for both cases.
- **Semantic search on iOS via a smaller model.** Out of scope by request; the models are 500 MB+ each and ONNX Runtime on iOS would need a different `ort` linkage anyway. The pure chunker / quantize modules remain compiled so a future decision can start from the FTS side.
- **Folder picker on iOS (`dialog.open({ directory: true })`).** Rejected: the picked folder would be outside the container and unreadable after the picker returns without security-scoped bookmark support in the fs plugin. A fixed container vault exposed to Files gives the same editing and sync workflow.
- **Reuse the desktop pane layout with narrower breakpoints.** Rejected: PaneForge's 3-40% pane limits and the traffic-light spacers have no meaning on a phone, and the sidebar toggles floated under the notch. A separate branch keeps the desktop markup untouched.
- **Persist the mobile drawer through `layout.leftSidebarVisible`.** Rejected: that field syncs with the desktop vault and describes a pane, not an overlay; a drawer left open on a phone would collapse the Mac's sidebar.

## Consequences

- Desktop builds are unchanged: same features, same ACL (now over two capability files), same startup path. The mobile profile is verified on every PR touching `src-tauri/**` by `scripts/check-mobile-profile.sh`, and the touch shell by `e2e/specs/mobile-shell.spec.ts`.
- New desktop-only Rust code must live behind `desktop_integration` (or `semantic`) and new desktop-only permissions must go to `capabilities/desktop.json`; the host-side check fails otherwise.
- New frontend calls into gated commands must check `platformStore.isMobile` first; a command that does not exist rejects the invoke, which the lifecycle treats as an error and, for semantic search, used to disable the synced setting.
- The generated Xcode project (`src-tauri/gen/apple/`) is produced by `pnpm tauri ios init` on a Mac and committed afterwards; this repository does not carry it yet. Code signing needs `APPLE_DEVELOPMENT_TEAM`.
- The iOS deployment target is 16.0 (`bundle.iOS.minimumSystemVersion`) for `dvh` units and safe-area insets.
- **Re-evaluation triggers**: `ort` ships iOS binaries and a small enough model makes on-device semantic search viable; `tauri-plugin-fs` gains security-scoped bookmarks (folder picking from iCloud Drive); the right-sidebar panels are wanted on iPad, where a two-pane layout fits.
