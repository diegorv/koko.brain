# Tauri Browser HTTP Access

Expose the Tauri 2 backend over an embedded HTTP/SSE server bound to `127.0.0.1:47823` so the same SvelteKit frontend can be loaded in a regular browser (or built into another shell) while the Tauri binary runs. Native Tauri behavior must stay identical.

## Architecture

- One binary, two transports (Tauri IPC + axum HTTP/SSE) calling shared core functions.
- `EventBus` (`tokio::sync::broadcast`) is the single emit point. A setup task bridges `bus → app.emit(...)` so existing `listen()` listeners in the native window keep working.
- `AppState { bus, app_handle }` is shared with axum; HTTP handlers pull `tauri::State<T>` via `app_handle.state::<T>()`.
- Frontend wrapper `src/lib/api.ts` mirrors `@tauri-apps/api/core::invoke` and `/event::listen` signatures. Tauri detection: `__TAURI_INTERNALS__ in window || __PLAYWRIGHT__` (build-time flag for the Playwright path so the existing vite aliases keep working).
- Bind `127.0.0.1` (never `0.0.0.0`).

## Tasks

- [x] Task 1: Cargo deps (`tower-http`, `async-stream`, `tokio` sync feature) + `event_bus.rs` + `http/` skeleton compile.
- [x] Task 2: Wire HTTP server + bus->tauri bridge in `setup`, migrate watcher emit through bus.
- [x] Task 3: Migrate every remaining `app.emit(...)` (5 vault sites, logger, 4 semantic sites, 2 terminal sites, menu) through `EventBus`.
- [x] Task 4: Frontend `src/lib/api.ts` + vite `__PLAYWRIGHT__` define + vitest config update.
- [x] Task 5: Migrate production frontend imports `@tauri-apps/api/core|event` -> `$lib/api` (all `src/lib/` and `src/routes/`).
- [x] Task 6: Migrate vitest test mocks `vi.mock('@tauri-apps/api/...')` -> `vi.mock('$lib/api')`.
- [x] Task 7: Dispatcher arms + core-fn extraction batch 1: `db`, `debug`, `fonts`, `files`, `search`, `search_index`, `history`, `crypto`.
- [x] Task 8: Dispatcher arms + core-fn extraction batch 2: `vault` (16 commands) + `mcp` + `update_channel`.
- [x] Task 9: Dispatcher arms + core-fn extraction batch 3: `watcher` (2 commands), `terminal` (5 commands), `semantic` (13 commands).
- [ ] Task 10: SSE endpoint validation, final compile, frontend `pnpm check` + `pnpm vitest run`, `cargo test`.

## Notes

- `Channel` from `@tauri-apps/api/core` (used in `UpdateSection.svelte`) is re-exported by `$lib/api` so the find-replace stays mechanical. `Channel` only works in native Tauri; the updater flow is Tauri-only by design.
- `check_for_update_on_channel` and the updater `download_and_install` plugin pipe both require `Webview::resources_table()` to keep the `Update` object alive between commands. Over HTTP the resource table is per-connection, so the dispatcher routes this command through the Tauri AppHandle's first webview (`app_handle.webviews().values().next()`). When no webview exists (impossible while the app is up, but defensive) the command returns an error.
- Terminal commands emit topics scoped by session id (`terminal:output:<sid>`, `terminal:exit:<sid>`). SSE clients subscribe by exact topic, so this works the same over HTTP.
- `frontendDist` in `tauri.conf.json` is `../build` (SvelteKit static-adapter output). `ServeDir::new("../build")` resolved relative to the binary's CWD is unreliable; the server resolves it via `app_handle.path().resource_dir()` joined with `build` only inside the Tauri-built bundle. For dev (and the immediate use case "run app while Tauri is alive") we serve from the project's `build/` directory using a path resolved at startup against `CARGO_MANIFEST_DIR` -> repo root -> `build`. Until `pnpm build` runs, only `/api/*` is functional.
