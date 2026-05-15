# Browser FS/Dialog Parity

Wrap `@tauri-apps/plugin-fs` and `@tauri-apps/plugin-dialog` in `$lib/api` so the embedded HTTP transport supports vault open, file IO, and dialogs from a regular browser. Native Tauri behavior must remain byte-identical.

## Problem

The `tauri-browser-http-access` branch wraps `invoke` and `listen` in `$lib/api`, but plugin functions (`@tauri-apps/plugin-fs::readTextFile|writeTextFile|exists|mkdir|remove|rename|copyFile|readDir|readFile` and `@tauri-apps/plugin-dialog::open|ask`) call their own internal `invoke('plugin:fs|...')` that goes straight to `window.__TAURI_INTERNALS__`. In a regular browser that global is undefined, so every plugin call throws. Vault open is the first observable failure but 25+ files break in browser mode.

## Approach

Add explicit wrappers to `$lib/api` mirroring each plugin function. In Tauri (detected by `__TAURI_INTERNALS__` or `__PLAYWRIGHT__`) they delegate to the real plugin imports. In browser they `POST /api/invoke` to new dispatcher arms that perform the same operation server-side. Native Tauri code path uses the real plugins unchanged — zero behavior change for the native binary.

Dialog over HTTP works because the binary still hosts the Tauri AppHandle: `app.dialog().file().pick_folder()` opens the native dialog on the Tauri window even when the trigger came from a browser request. Both transports share state.

Binary reads (`readFile`) cross HTTP as base64 so JSON survives the wire; the browser wrapper decodes back to `Uint8Array` so call sites stay unchanged.

## Tasks

- [x] Task 1: Foundation — add fs+dialog wrappers to `$lib/api`, add Rust core commands + dispatcher arms, wire `app.dialog()` for browser-triggered dialogs. Native code path still imports `@tauri-apps/plugin-*` directly so existing behavior is unchanged. Cover with unit tests (`src/tests/lib/api.test.ts` for the wrapper branches; `src-tauri/tests/http_test.rs` for dispatcher arms via mock state). Validation: `cargo test`, `pnpm check`, `pnpm vitest run` all pass.

- [ ] Task 2: Pilot migration — switch only `src/lib/core/vault/vault.service.ts` + its test from `@tauri-apps/plugin-{dialog,fs}` to `$lib/api`. Rebuild static frontend, `pnpm tauri dev`, open browser at `http://127.0.0.1:47823`, click "Open vault", pick a folder via the native dialog, verify the browser session loads the vault. Then verify the native Tauri window still opens vaults normally. This stage catches integration bugs in the smallest possible blast radius before the bulk migration.

- [ ] Task 3: Bulk migrate non-test imports for the remaining 24 files (every `from '@tauri-apps/plugin-fs'` and `from '@tauri-apps/plugin-dialog'` outside `src/tests/`). Mechanical find-replace. After this step every production call site routes through `$lib/api`. Validation: `pnpm check` + `pnpm vitest run` + `cargo test` all green; native Tauri smoke test (open vault, edit + save a note, settings round-trip) still works.

- [ ] Task 4: Migrate test mocks — every `vi.mock('@tauri-apps/plugin-fs')` and `vi.mock('@tauri-apps/plugin-dialog')` in `src/tests/` repointed to `vi.mock('$lib/api')` (or kept against the plugin module when the test specifically asserts plugin behavior — decide case by case). Validation: `pnpm vitest run` returns the same passed/failed counts as before this plan started.

- [ ] Task 5: Browser end-to-end smoke — with `pnpm build && pnpm tauri dev`, drive the browser at `:47823` through: open vault, open recent vault, create note, edit + save, open settings, switch theme, toggle a plugin, run a queryjs block. Each must work identically to the native window. Document any features that legitimately cannot work over HTTP (e.g. terminal PTYs already work via SSE per the previous plan; updater is native-only) inline in the plan's Notes section before moving to `tasks/done/`.

## Notes

- **Native Tauri remains the source of truth.** The wrappers in `$lib/api` are a thin selection layer; in Tauri mode every fs/dialog call still goes through the real `@tauri-apps/plugin-*` import. Zero refactor of plugin behavior. The migration is mechanical and the diff for native users is invisible.

- **Path resolution stays absolute.** Per the project's `vault/index.rs` invariant, the dispatcher only accepts absolute paths and continues to rely on the canonicalize + starts_with check inside `read_files_batch`-style commands. The new fs arms reuse that pattern; they do not re-implement path-traversal protection from scratch.

- **No `BaseDirectory` translation.** Every fs call site in this codebase passes absolute paths today (verified by grep — no `baseDir` option used outside test mocks). If a future call site needs `BaseDirectory`, the wrapper signature already accepts the option; only the Rust side would need to grow a resolver. Out of scope for this plan.

- **Dialog over HTTP keeps the native window in the loop.** `app.dialog().file().pick_folder()` is invoked server-side and the dialog UI appears on the Tauri webview window. If the user is testing browser-only with the Tauri window minimized, the dialog still pops above. Acceptable for development; the binary runs the same process either way.

- **Test mocks remain explicit.** Don't auto-shim everything — when a test asserts the exact plugin path was called (e.g. settings tests assert `writeTextFile` was called with a specific path + content), keep the mock pointed at the plugin module so the assertion's intent is preserved. Convert mocks only where the test is checking behavior, not invocation site.

- **No regression policy.** Before each task is committed, run the relevant test suites (`cargo test` for Rust changes, `pnpm check` + `pnpm vitest run` for TS, both when both change). Native-Tauri behavior must remain unchanged at every step — smoke-test the native window after the bulk migration, not just the browser.
