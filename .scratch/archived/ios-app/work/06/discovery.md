# 06 discovery: Images and embeds load

No `spec.md`; the plan is `architecture-proposal-2026-11-02.md` 4.4 "Assets" / step 1.8, plus `research/scout-07-frontend-assets-images.md`. Builds on `work/01` (server, CSP), `work/03` (containment), `work/04` (Host/identity rule, Origin allowlist). Gate: Both.

## Files that change
- `src-tauri/src/remote/dispatch.rs:116-147`: new `pub fn asset_path(root, path) -> Result<canonical, String>`: the `require_vault_path` rule without the root (no `.kokobrain/**` in any case, no dot segment, no settings file / link to it), on the client and the canonical spelling.
- `src-tauri/src/remote/asset.rs` (new, pure): `asset_type(path) -> (mime, inline)` (inline allowlist: raster images, audio, video, PDF; everything else `application/octet-stream`), `is_cross_site(head)` (`Sec-Fetch-Site` present and not `same-origin`).
- `src-tauri/src/remote/server.rs:340-385`: `respond` gets the `RpcHost` (its `vault_root`); `GET|HEAD /v1/asset/<percent-encoded rel>` after the existing Host/identity/Origin checks: cross-site 403, no session host or no vault 404, refused path 403, missing/unreadable 404, else 200 with `nosniff`, `Cache-Control: no-cache`, and for non-inline types `Content-Security-Policy: sandbox` + `Content-Disposition: attachment`.
- `src/lib/app/remote/tauri-bridge-stand-in.ts:128`: `convertFileSrc(path)` -> `/v1/asset/<rel, each segment encodeURIComponent>` when `path` is under `remoteConnectionStore.vaultRoot`, `''` otherwise (widgets treat `''` as missing, `widgets.ts:168`).
- Tests: `src-tauri/tests/remote_server_test.rs` (asset section, real temp vault + `RpcHost`), `src-tauri/tests/remote_containment_test.rs` or the same file for `asset_path`; `src/tests/lib/app/remote/tauri-bridge-stand-in.test.ts` (convertFileSrc case updated).

## Plan
1. `asset_path` + `asset.rs` + server route, test-first over raw TCP (`send` helper in `remote_server_test.rs`, `Vault`/`echo_host` pattern from `remote_ws_test.rs`).
2. Stand-in `convertFileSrc` + vitest.
3. CSP: no change (see defaults); a test pins that same-origin images/media/frames stay allowed via `default-src 'self'` and `object-src 'none'` stays.

## Risks
- Whole file read into memory per request, no Range (Issue notes accept no Range); a large video costs its size in RAM per request.
- `Sec-Fetch-Site` absent (old browsers, curl) is allowed: the Origin and Host checks still apply. `none` (address bar) is refused, so opening an asset URL directly in a tab does not work.

## Defaults taken
- SVG is not inline, so it is served as `application/octet-stream`: an `![[x.svg]]` embed does not render in the browser (the criterion says SVG is not inline).
- CSP unchanged: the desktop has no PDF/iframe embed widget (scout-07 row I, gap G3; `sanitizeHtml` forbids `iframe`/`object`/`embed`), images and media are same-origin `/v1/asset/` URLs covered by `img-src 'self'` and `default-src 'self'` (media, frames), as on the desktop. `object-src 'none'` stays (stricter than the desktop's fallback to `'self'`; nothing uses it).
- Refused path -> 403, missing -> 404. Path outside the vault in `convertFileSrc` -> `''` (marked missing), never a host request.
