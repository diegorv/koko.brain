# iOS / iPadOS build

Kokobrain ships a reduced build for iPhone and iPad: the markdown editor, the
file explorer, wikilinks, FTS5 text search, file history and the settings that
apply to them. Everything else stays desktop-only. This file records what the
mobile build is, how it is produced on a Mac, and how it is verified on a
machine that has no Apple SDK.

## What the mobile build contains

| Area | Desktop | iOS / iPadOS |
|------|---------|--------------|
| Markdown editor, live preview, wikilinks, tags, tasks, properties | yes | yes |
| File explorer, note creation, rename, trash | yes | yes (sidebar drawer) |
| FTS5 text search | yes | yes |
| Semantic and hybrid search (ONNX Runtime, BGE-M3, reranker) | yes | no |
| In-app updater, release channels | yes | no (store / sideload updates) |
| Quick capture: composer window, clipboard shortcut, global shortcuts | yes | no |
| Native menu bar, dock badge, window zoom | yes | no |
| Right sidebar (backlinks, outgoing links, properties, TOC) | yes | not rendered |
| Vault picker | native folder dialog | fixed on-device vault |

## Where the vault lives

iOS has no folder picker for arbitrary locations and the app can only write
inside its own container, so the mobile build opens one vault by itself:

```
<app container>/Documents/kokobrain-vaults/Notes
```

`src-tauri/Info.ios.plist` declares `UIFileSharingEnabled` and
`LSSupportsOpeningDocumentsInPlace`, which expose the container's `Documents`
folder in the Files app (under "On My iPhone / iPad" > KokoBrain). Notes can be
browsed, edited with other apps and copied in or out from there. The path is
inside the `$DOCUMENT/kokobrain-vaults/**` filesystem scope shared with
desktop (`src-tauri/capabilities/default.json`), so no mobile-specific
capability is needed.

The welcome page opens (and on first launch creates) that vault as soon as it
mounts; `openMobileVault()` in `src/lib/core/vault/vault.service.ts` owns the
flow and `mobileVaultPath()` in `vault.logic.ts` the path.

## How the platform is detected

`src/lib/core/platform/platform.logic.ts` classifies the webview from the
user agent and `navigator.maxTouchPoints` (iPadOS reports a desktop-class
`Macintosh` user agent, so the touch-point count is the tell). The result is
exposed as `platformStore.isMobile` and read at every desktop-only call site:

- `app-lifecycle.service.ts`: skips the semantic init chain and
  `shutdown_semantic`.
- `search.service.ts` and `note-change.service.ts`: skip the semantic legs of
  the after-save and watcher paths (FTS5 still runs).
- `update-check.service.ts`: no auto update check.
- `settings.logic.ts` / `SettingsPanel.svelte`: hide the Update and Quick
  Capture sections; `SearchSection.svelte` shows semantic search as desktop-only.
- `AppShell.svelte`: renders the touch shell (full-width editor, sidebar
  drawer, status-bar buttons for the drawer and settings, safe-area padding).

To preview the touch shell on a Mac, run `pnpm dev` and open it in a browser
with device emulation set to an iPhone: the user agent is what flips the
detection.

## Rust profile

The Rust crate has two default Cargo features, both forced off for
`target_os = "ios"` / `"android"` by `src-tauri/build.rs`:

| Feature | cfg | Gates |
|---------|-----|-------|
| `semantic` | `semantic` | `ort`, `tokenizers`, `ndarray`, `half`, `reqwest`, `futures-util`; `semantic::{embedder, model, reranker}`; `commands::semantic` |
| `desktop-integration` | `desktop_integration` | `tauri-plugin-global-shortcut`, `tauri-plugin-updater`, `tauri-plugin-process`, `arboard`, `image`, `mime_guess`, `url`; `quick_capture`; `commands::update_channel`; menu bar and composer window in `lib.rs` |

The crates are declared under
`[target.'cfg(not(any(target_os = "ios", target_os = "android")))'.dependencies]`
so an iOS build never resolves them. Cross-platform crates (`notify` falls back
to kqueue on iOS, `sysinfo`, `rusqlite` bundled, `tokio`) stay unconditional.
`capabilities/desktop.json` carries the desktop-only permissions and is
platform-scoped, so Tauri's ACL step skips it on iOS.

## Verifying without an Apple SDK

`tauri ios` is compiled into the Tauri CLI on macOS only, and
`cargo check --target aarch64-apple-ios` needs the SDK for the `-sys` build
scripts. The mobile profile is therefore reproduced on the host:

```sh
bash scripts/check-mobile-profile.sh
```

That runs `cargo check --no-default-features --lib --tests --examples` with
`KOKO_CAPABILITIES_GLOB=./capabilities/default.json`, which yields the same
`cfg` set as an iOS build and restricts the ACL validation to the capability
file the mobile build resolves. CI runs it in the Rust job. The frontend side
is covered by `e2e/specs/mobile-shell.spec.ts`, which drives the Chromium
project with an iPhone user agent (`bash scripts/e2e.sh e2e/specs/mobile-shell.spec.ts`).

## Building on a Mac

1. Xcode with the iOS platform installed, plus the Rust targets:

   ```sh
   rustup target add aarch64-apple-ios aarch64-apple-ios-sim
   ```

2. Generate the Xcode project once and commit `src-tauri/gen/apple/`:

   ```sh
   pnpm tauri ios init
   ```

   Code signing needs a team id: set `APPLE_DEVELOPMENT_TEAM=<team id>` in the
   environment or `bundle.iOS.developmentTeam` in `tauri.conf.json`.
   `Info.ios.plist` next to `tauri.conf.json` is merged into the generated
   `Info.plist` on every `ios dev` / `ios build`, so it does not need editing
   inside `gen/apple/`.

3. Run on the simulator or a device, or build an `.ipa`:

   ```sh
   pnpm tauri ios dev
   pnpm tauri ios build
   ```

`bundle.iOS.minimumSystemVersion` is 16.0 (dynamic viewport units and
safe-area insets used by the touch shell).

## Known limits

- One vault, inside the app container. Opening a folder from iCloud Drive or
  another provider would need security-scoped bookmarks the fs plugin does not
  expose; syncing is the Files app's job.
- The sidebar drawer always shows the file explorer (or the search panel while
  search is open). The Types / Calendar sidebar modes and the right sidebar are
  desktop-only.
- Keyboard shortcuts stay `Cmd`-based and only fire with a hardware keyboard.
- The status-bar semantic indicator, the Semantic / Hybrid search modes and the
  reranker download are hidden; a vault synced from a Mac keeps its
  `search.semanticSearchEnabled` value untouched.
- `pnpm tauri ios init` has not been run in this repository yet; the Xcode
  project is generated on the first macOS build.
