# Scout 07: how images, attachments, embeds, PDFs, canvas files and icons reach the DOM

Scope: frontend asset paths, Tauri asset protocol config, what a remote thin client would need, and iOS status of the asset protocol. Read-only study. No build, test or cargo run. Versions pinned in the repo: `tauri` 2.12.5, `tauri-plugin-fs` 2.7.1, `@tauri-apps/api` 2.12.4 (`src-tauri/Cargo.lock` 5371-5372, 5557-5558; `node_modules/@tauri-apps/api/package.json`). Upstream Rust sources were read from `tauri-apps/tauri` and `tauri-apps/plugins-workspace` default/dev branches, so there is minor version skew.

## 1. Inventory: every path binary or media bytes take to the DOM

| # | Surface | Code (path:line) | Mechanism | Gate |
|---|---|---|---|---|
| A | Markdown image `![alt](url)` with `file:` URL | `live-preview/widgets.ts:143-147` (branch), `:156-161` (`applyFileSrc`) | `fileUrlToFsPath` (`:104`) then `host.assetUrl(path)` then `img.src` | asset scope |
| B | Markdown image `![alt](url)` with `https:` | `widgets.ts:149-150` | `img.src = url` | CSP `img-src https:` |
| C | Markdown image `![alt](relative.png)` (no scheme) | `widgets.ts:149` (`isSafeUrl` returns true for schemeless), `image-plugin.ts:140,153` passes raw URL | `img.src = "relative.png"`, resolved against the app origin, NOT the vault | none (see gap G1) |
| D | Wikilink image embed `![[img.png]]` | `plugins/wikilink-embed-plugin.ts:79-85`, `widgets.ts:521-560`, helper `resolveImageEmbedAssetUrl` `:514-518` | `host.resolveLink` (vault absolute path) then `host.assetUrl` then `img.src` | asset scope |
| E | Wikilink non-image embed `![[doc.pdf]]`, `![[clip.mp3]]` | `parsers/wikilink-embed.ts:2-5,32-36` (image set only), `wikilink-embed-plugin.ts:79-91` routes non-image to `WikilinkNoteEmbedWidget` | `loadEmbedContent` (`widgets.ts:561-575`) calls `host.readNote` (`app/editor-host.ts:68-70`, `readTextFile`) | text read scope |
| F | `<audio>` / `<video>` HTML block | `widgets.ts:175-205` (`MediaWidget`, `:187-188` `media.src = this.src`), parsers `parsers/media.ts` | raw `src` from the markdown; no `assetUrl` call | CSP `default-src 'self'` |
| G | Canvas image node (drag from tree) | `canvas/CanvasInner.svelte:556-560` (`isImageFile`), `canvas/ImageNode.svelte:26-35`, `canvas/canvas-image.service.ts` `resolveImageSrc` (`:28-40`) | plugin-fs `readFile` (whole file in JS), `Blob`, `URL.createObjectURL`; revoke on unmount `ImageNode.svelte:29,42-44` | NO binary-read permission granted (gap G2) |
| H | Canvas file node (`.md` text) | `canvas/FileNode.svelte` (`readTextFile` on absolute path) | plugin-fs text read | text read scope |
| I | Attachments (PDF, zip, audio, video) | Binary extensions set `core/filesystem/fs.logic.ts:79-89`; `editor.service.ts:104-111` rejects them; `wikilink-navigation.ts:17-19` makes wikilink clicks a no-op | No in-app PDF or attachment viewer. `FileKind` `'pdf'` is only an icon (`features/rail-shell/lens.logic.ts:628,640`). External open only via `revealItemInDir` (`core/filesystem/fs.service.ts:291`, `features/note-action-bar/note-action-bar.service.ts:41`). `openPath` is used only for the logs dir (`utils/log.service.ts:186`). | n/a |
| J | File icons | `features/file-icons/file-icons.icon-data.ts:74-186` loads icon packs as bundled JS modules (`lucide-static`, `@fortawesome/*`, `@iconify-json/*`, `simple-icons`). No `convertFileSrc` or asset URL in `features/file-icons/`. Only the recent-icons JSON uses plugin-fs (`file-icons.service.ts:50`). | bundled | none |
| K | Collection cell image | `features/collection/CollectionTableView.svelte:59` (`<img src={value.src}>`), origin of `value.src` not traced | UNVERIFIED | n/a |

Sanitizer: `utils/sanitize.ts:9-28` `sanitizeHtml` allows `img`, `audio`, `video`, `source` with `src`/`poster`, forbids `iframe`/`object`/`embed`. It does not restrict the `src` scheme beyond DOMPurify defaults (UNVERIFIED for `asset:` handling).

Tests: `tests/.../widgets/image-widget.test.ts` covers `https`, `javascript:`, and `file://` routed through `assetUrl`. No test pins behaviour for relative image URLs (`tests/.../plugins/image-plugin.test.ts:36-63` asserts decoration presence only). `tests/lib/features/canvas/canvas-image.service.test.ts` mocks `readFile`, so the permission gap in G2 is invisible to the suite.

### Read surfaces (all of them)

| Surface | Command or API | Scope/permission | Binary? |
|---|---|---|---|
| Text notes | plugin-fs `readTextFile` (27 frontend files) | capability `fs:allow-read-text-file` `src-tauri/capabilities/default.json:66-80`: only `$DOCUMENT/kokobrain-vaults/**`, `$HOME/kokobrain-vaults/**` (+ `.kokobrain/**`) | no (UTF-8 only) |
| Bulk text (search, watcher) | IPC `read_files_batch` `src-tauri/src/commands/files.rs:24-70` | Rust-side `canonicalize` + `starts_with(vault_root)`; `fs::read_to_string` at `:63` | no (errors on non-UTF-8) |
| Binary bytes | plugin-fs `readFile` (ONLY `canvas-image.service.ts:35`) | NO `fs:allow-read-file` in `capabilities/default.json` (grep: none). `fs:allow-read-file` is the `read-files` permission set, which default.json does not include (`plugins-workspace/plugins/fs/permissions/read-files.toml`). | yes, but ACL-blocked (see G2) |
| Binary bytes for display | asset protocol `asset://localhost/<enc>` via `convertFileSrc` (`app/editor-host.ts:72-74`, consumed by `widgets.ts:159,542`) | `app.security.assetProtocol` (tauri.conf.json:30-41) | yes, streamed by the webview |

Nothing in the frontend reads binary through IPC except G. The only binary path that scales is the asset protocol.

## 2. Asset scope configuration (`src-tauri/tauri.conf.json`)

- `security.csp` (`:29`): `img-src 'self' asset: http://asset.localhost data: https:`. `font-src 'self' data:`. There is NO `media-src` (so `<video>`/`<audio>` fall back to `default-src 'self'`). `connect-src` lists `ipc:`, `http://ipc.localhost`, todoist, huggingface, github, objects.githubusercontent, sentry. No tailnet, `ws:` or `wss:` origin.
- `security.assetProtocol` (`:30-41`): `enable: true`, `scope`:
  - `$DOCUMENT/**`, `$DOCUMENT/**/.kokobrain/**`
  - `$HOME/MyFiles/**` (+ `.kokobrain`)
  - `$HOME/kokobrain-vault/**` (+ `.kokobrain`) (note: singular "vault", unlike `kokobrain-vaults` in the fs capability)
  - `$DESKTOP/**`, `$PICTURE/**`, `$DOWNLOAD/**`
  - `$HOME/Library/Caches/com.diegorv.kokobrain/**`
- Asset scope is broader than the fs text scope. Any file under `Documents`, `Desktop`, `Pictures` or `Downloads` is servable to the webview by URL, not just vault files.
- Runtime grants: a directory chosen through the dialog is added to the asset scope too. `plugins-workspace/plugins/dialog/src/commands.rs:155-165` calls `tauri_scope.allow_directory`, and `tauri/crates/tauri/src/scope/mod.rs:59-65` forwards that to `asset_protocol.allow_directory` (default branch, fetched via `gh api`). The app's only directory picker is `vault.service.ts:26` (`open({ directory: true })`). Whether a vault re-opened on the next launch keeps its grant is UNVERIFIED (not persisted by plugin-fs; static scope covers only the globs above).
- Other config: `lib.rs:280` `tauri_plugin_fs::init()`; `Cargo.toml:22` `tauri` features `protocol-asset`.

## 3. Gaps found while tracing (static reading, not run)

| ID | Gap | Evidence | Confidence |
|---|---|---|---|
| G1 | Relative markdown images `![alt](image.png)` are not resolved to the vault. `ImageWidget` only converts `file:` URLs. A schemeless URL passes `isSafeUrl` (`utils/sanitize-url.ts:5-15`, returns true for schemeless) and becomes a relative `img.src`, resolved against the app origin. | `widgets.ts:143-150`, `image-plugin.ts:140` | Code path clear. Runtime result UNVERIFIED. No test pins it. |
| G2 | Canvas image nodes call plugin-fs `readFile`, but no `fs:allow-read-file` (or `fs:read-files`, `fs:default`) permission is granted in `capabilities/default.json`. Expected result: ACL denial, then `ImageNode` shows the placeholder (`ImageNode.svelte:26-36`). | `canvas-image.service.ts:35`, capability file | Inferred from the capability file. Runtime error text UNVERIFIED. The test mocks `readFile`. |
| G3 | Non-image wikilink embeds (`![[x.pdf]]`, `![[x.mp3]]`) take the NOTE embed path and call `readTextFile` on binary. | `parsers/wikilink-embed.ts:32-36`, `wikilink-embed-plugin.ts:79-89`, `widgets.ts:570` | Route clear. UTF-8 failure result UNVERIFIED. |
| G4 | `<video>`/`<audio>` `src` is used raw (no `assetUrl`), so a vault-relative media path or `file:` URL does not resolve. | `widgets.ts:187-188` | Code path clear. Runtime UNVERIFIED. |
| G5 | `isImageFile` lists 7 extensions; `isImageEmbed` lists 9 (adds `ico`, `avif`); `fs.logic.ts` BINARY set lists more again. Unknown image extensions in canvas `extToMime` default to `image/png`. | `canvas-image.service.ts` `extToMime`, `parsers/wikilink-embed.ts:2-5`, `fs.logic.ts:79-89` | Certain (static). Minor. |
| G6 | Seam leak: `EditorHost.assetUrl` is the one injectable seam for embeds, but canvas (`canvas-image.service.ts`, `FileNode.svelte`) and about 25 other files call plugin-fs or `convertFileSrc` directly, bypassing it. | `core/markdown-editor/editor-host.ts:41,69`, `app/editor-host.ts:72-74` | Certain (static). |

## 4. Remote thin client: what an HTTP endpoint needs

Context: the asset protocol is a local webview mechanism. A remote client needs a network equivalent, and the existing `EditorHost.assetUrl(path): string` (`core/markdown-editor/editor-host.ts:41`) is synchronous, so it cannot await a signed URL. `widgets.ts` builds `img.src` synchronously in `toDOM` (`:149-160`, `:542`).

Recommended shape (design, not verified against a running server):

| Need | Shape | Evidence / rationale |
|---|---|---|
| Read a vault file | `GET /v1/vault/file?path=<vault-relative>` (also `HEAD`) | Upstream asset handler returns 200, 206, 403 (scope), 404 (missing), 416 (unsatisfiable), 500 (other) (`tauri/crates/tauri/src/protocol/asset.rs`, `get_response`). Mirror these codes. |
| Path form | Vault-relative path, resolved by the server against its own vault root | The brain CLAUDE.md mandates absolute paths everywhere, which a client on another machine cannot use. The server should keep the `read_files_batch` pattern: canonicalize, `starts_with(vault_root)` (`files.rs:24-70`). Also deny `.kokobrain/` unless explicitly allowed (ADR-0019 puts the DB and models there). |
| Auth for `<img>`/`<video>` | Browsers cannot send an `Authorization` header from `src`. Options: (a) cookie set at pairing, `HttpOnly; Secure; SameSite=Lax` on the tailnet host; (b) short-lived HMAC-signed query token minted by an authenticated JSON call (exp ~ minutes, bound to path); (c) fetch with bearer, then `URL.createObjectURL` (the `canvas-image.service.ts` pattern, whole file in memory, no streaming). Avoid long-lived tokens in URLs (they land in logs and history). | `EditorHost.assetUrl` is synchronous, so (b) needs pre-minting or a different seam. (a) fits `assetUrl` unchanged. |
| Range | Must support `Range: bytes=` with 206, `Content-Range`, `Accept-Ranges: bytes`. Media elements rely on it. The upstream handler caps each range at 1000 KB (`MAX_LEN`), a reasonable model for chunk size. | `asset.rs` range branch. Large-video failures under `convertFileSrc` are reported in tauri#7355 (macOS, 2023). |
| Caching | `ETag` from `mtime` plus `size` (Rust already reads both: `vault.rs:219-233`). `Cache-Control: private, no-cache` (revalidate). Honour `If-None-Match` with 304. Client-side blob cache keyed by path + ETag, because `ImageNode` re-fetches on every mount (`ImageNode.svelte:26`). | `vault.rs:219-233`. The fs watcher already emits `vault-files-changed` (`watcher-handler.service.ts:87-100`), so cache invalidation has a signal. |
| MIME | Sniff magic bytes first 8 KB, fall back to extension (upstream does this). Do not default unknown extensions to `image/png` (see G5). | `asset.rs` (`MimeType::parse(&magic_buf, &path)`) |
| Security headers | `X-Content-Type-Options: nosniff`. For SVG, serve with a `Content-Security-Policy: sandbox` header, or refuse direct navigation to SVG. `Content-Disposition: inline` for media. | Standard hardening. wry#1889 shows `Content-Disposition: attachment` renders blank on iOS/macOS webviews, so avoid it. |
| CORS | Needed only for `crossOrigin` media or `fetch`. Send `Access-Control-Allow-Origin` for the exact client origin (the upstream handler does this with `window_origin`, `asset.rs`). | Upstream behaviour. |
| Client CSP | Add the tailnet host to `img-src`, a new `media-src`, and the host (`wss:`) to `connect-src`. Today there is no `media-src` (tauri.conf.json:29). | Required for model A. |

Other endpoints a thin client needs, for context only: text read (replace `readTextFile` and `read_files_batch`, `files.rs:24`), change-event WebSocket (replace `vault-index-updated` and `vault-files-changed`, `contracts/events.ts`). Binary reads have no IPC command today, so the HTTP endpoint is the only binary path for a remote client.

## 5. Tauri iOS: does the asset protocol work?

Verified in source:

| Claim | Evidence |
|---|---|
| The `asset` scheme is registered on every target. Only the `protocol-asset` feature gates it, with no `target_os` exclusion. | `tauri/crates/tauri/src/manager/webview.rs` (`#[cfg(feature = "protocol-asset")]` block, `register_uri_scheme_protocol("asset", ...)`) |
| On iOS, `convertFileSrc` returns `asset://localhost/<encodeURIComponent(path)>`. Windows and Android use `http(s)://asset.localhost/...`. | `tauri/crates/tauri/scripts/core.js` (`osName === 'windows' \|\| osName === 'android'` branch, else `${protocol}://localhost/${path}`) |
| The asset handler checks scope (403), reads with `File::open` (404/403 mapped), sniffs MIME, and serves Range (206/416). No iOS-specific branch. The only platform-specific log is `#[cfg(target_os = "android")]`. | `tauri/crates/tauri/src/protocol/asset.rs` |
| The `$DOCUMENT` style scope variables exist on iOS, but iOS app-data paths change with the sandbox container UUID, so scope globs cannot be hard-coded absolute paths. | tauri#12276 (iOS `appDataDir` resolves to a path with a different UUID and an extra `Library/Application Support` tail) |

Upstream reports (no iOS-specific asset-protocol failure found; Android failures are documented):
- tauri#14776 (open, 2026-01-15, label `platform: Android`): `convertFileSrc` on `app_data_dir` works in emulator, fails on real devices.
- tauri#12364 (open, 2025-01-12, Android): images from the asset server return 500.
- tauri#7355 (open, 2023, macOS): large `convertFileSrc` videos produce garbled frames or fail.
- tauri#9946 (open): feature request for asset scope through `convertFileSrc`.
- tauri#16220 (open PR, 2026-10-06): `androidHostname` to serve Android from a stable https origin, motivated by Digital Asset Links. Shows origin stability is a live concern on mobile.
- wry#1775 (open): iOS/macOS custom-protocol responses block the calling thread when called off the main thread. wry#1856 (open PR): dispatch custom-protocol responses on the main thread. Large asset responses on iOS may stall the UI thread (impact UNVERIFIED).
- wry#1889 (open): `Content-Disposition: attachment` shows a blank page on iOS and macOS instead of downloading.
- tauri#16442 (open): CSP hashes for bundled JS exceed WebKit's 16 KiB header limit, blocking app startup on iOS. This affects the app shell, not asset URLs, but it is an iOS-only blocker on the CSP path.

Dialog and file picking on iOS:
- Official dialog docs state iOS and Android do not support the folder picker (`https://v2.tauri.app/plugin/dialog/`). `vault.service.ts:26` (`open({ directory: true })`) therefore has no iOS equivalent. Vault selection on iOS needs a different design.
- Search results (not verified against the primary docs) point to `plugins-workspace#3030` and to a 2.6.0 dialog option `fileAccessMode: 'scoped'` for security-scoped file access on iOS, plus `startAccessingSecurityScopedResource`. Treat as UNVERIFIED until read from the plugin's docs. Sources: https://github.com/tauri-apps/plugins-workspace/issues/3030, https://v2.tauri.app/reference/javascript/fs/.

Answer on the asset protocol: it is compiled for iOS, the URL form is defined, and nothing found says it fails on iOS. On-device behaviour (scope match, Range from WKWebView custom scheme, large videos) is UNVERIFIED and needs a device test. For model A (remote) the asset protocol is irrelevant. For model B (local) it is the best binary path, but it depends on a vault location that iOS does not let the app pick with the current dialog.

## 6. Implications for the iOS plan

1. Model A: `EditorHost.assetUrl` is the seam to replace. Its synchronous shape (`editor-host.ts:41`) forces cookie auth or pre-minted URLs. Canvas (G), FileNode (H) and the remaining direct plugin-fs callers must move behind a host port as well (G6).
2. Model B: switch canvas images from `readFile` plus blob to `convertFileSrc` directly. It removes the whole-file JS buffer and the ACL gap (G2), and gets Range for free. Add the missing permission or the switch, and keep the asset scope aligned with the vault location.
3. Both models: fix G1 (relative images) and G3 (binary note embeds) before iOS, since they break on every platform.
4. Security note: the asset scope covers `$DOCUMENT/**`, `$DESKTOP/**`, `$PICTURE/**`, `$DOWNLOAD/**`, which is wider than the vault. Narrowing it to the vault path would reduce the blast radius of any webview compromise (`script-src 'unsafe-eval'` also present at tauri.conf.json:29).

## 7. Not checked or verified

- No run on macOS, iOS simulator or device. No check of the actual ACL error for `readFile` (G2) or the `readTextFile` error on binary input (G3).
- Upstream sources were read from `dev` (and default branches for plugins), not the pinned 2.12.5 tags.
- wry WKWebView Range behaviour for `<video>` on iOS: no issue found, not tested.
- Dialog security-scoped behaviour on iOS: UNVERIFIED beyond the official "no folder picker" statement.
- Whether `$HOME/kokobrain-vault/**` (singular) is intentional: the fs capability uses `kokobrain-vaults` (plural). Looks like a mismatch, not confirmed.

## Sources

- Tauri config reference (AssetProtocolConfig, FsScope): https://v2.tauri.app/reference/config/
- Tauri asset protocol handler: https://github.com/tauri-apps/tauri/blob/dev/crates/tauri/src/protocol/asset.rs
- Asset scheme registration: https://github.com/tauri-apps/tauri/blob/dev/crates/tauri/src/manager/webview.rs
- `convertFileSrc` URL construction: https://github.com/tauri-apps/tauri/blob/dev/crates/tauri/scripts/core.js
- Scope add on directory grant: https://github.com/tauri-apps/tauri/blob/dev/crates/tauri/src/scope/mod.rs
- Dialog plugin grant path: https://github.com/tauri-apps/plugins-workspace/blob/v2/plugins/dialog/src/commands.rs (fetched from default branch)
- fs permission sets: https://github.com/tauri-apps/plugins-workspace/blob/v2/plugins/fs/permissions/read-files.toml
- Dialog plugin docs (iOS/Android folder picker): https://v2.tauri.app/plugin/dialog/
- Issues: https://github.com/tauri-apps/tauri/issues/14776, https://github.com/tauri-apps/tauri/issues/12364, https://github.com/tauri-apps/tauri/issues/7355, https://github.com/tauri-apps/tauri/issues/9946, https://github.com/tauri-apps/tauri/issues/16220, https://github.com/tauri-apps/tauri/issues/12276, https://github.com/tauri-apps/tauri/issues/16442
- wry: https://github.com/tauri-apps/wry/issues/1775, https://github.com/tauri-apps/wry/pull/1856, https://github.com/tauri-apps/wry/issues/1889
- Security-scoped iOS file access (search results only): https://github.com/tauri-apps/plugins-workspace/issues/3030
