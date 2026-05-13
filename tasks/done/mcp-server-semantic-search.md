# MCP server for semantic search

Expose Kokobrain's hybrid search and a path-validated note reader to Claude Code via an in-process MCP server. Server lives in `src-tauri/src/mcp/`, starts inside `tauri::Builder::setup()`, and stops when the app exits. Logs through `debug_log("MCP", ...)` to match `SEMANTIC` / `EMBEDDER` / `RERANKER`.

Full design context: `/Users/diegorv/.claude/plans/quero-criar-um-mcp-giggly-willow.md`.

Wire protocol: `rmcp` 1.7.x with `transport-streamable-http-server`. Endpoint at `http://127.0.0.1:3737/mcp` (streamable HTTP). Tools registered:

- `search` -> wraps `commands::semantic::search_hybrid`
- `read_note` -> reads any path inside the currently-loaded vault root, after canonicalize + `starts_with(vault_root)` validation

(Tool names renamed from the plan's `search_vault` / `get_note` to avoid collision with the existing `commands::search::search_vault` Tauri command and to match the short-name MCP convention.)

## Tasks

- [x] Task 1: Add `rmcp`, `axum`, `schemars`, and `tokio-util` to `src-tauri/Cargo.toml` with the right feature flags. Run `cargo build --manifest-path src-tauri/Cargo.toml` and confirm it compiles cleanly with no new warnings beyond the existing baseline.
- [x] Task 2: Create `src-tauri/src/mcp/mod.rs` exposing `pub async fn start(app: AppHandle, vault_state: Arc<VaultIndexState>) -> ()`. Bind `127.0.0.1:3737`; on failure log via `debug_log("MCP", ...)` and return (do not panic). On success log `listening on 127.0.0.1:3737` and serve until the runtime stops. Wire it into `lib.rs:.setup()` via `tauri::async_runtime::spawn`. Register an empty toolset for now. Smoke test: `pnpm tauri dev`, see the log line, `curl -i http://127.0.0.1:3737/mcp` returns a non-error response (any HTTP code, not connection-refused). _Implementation note: the function signature ended up `pub async fn start(app: AppHandle)` — vault root is tracked via a module-level static (`set_current_vault_root` / `current_vault_root`) populated by `scan_vault_v2` in task 4, keeping the MCP module decoupled from `VaultIndexState`. The dead-code warning on `tool_router` is suppressed for the empty-router scaffold; the `#[tool_handler]` expansion consumes it once a `#[tool(...)]` method lands in task 3._
- [x] Task 3: Implement the `search` tool in `src-tauri/src/mcp/tools.rs`. Input: `{ query: String, max_results: Option<u32> }`. Calls `commands::semantic::search_hybrid(query, max_results.map(|n| n as usize))`. Maps `Vec<SemanticResult>` into the MCP `CallToolResult` payload (JSON array of records). Add unit tests under `src-tauri/tests/mcp_tools_test.rs` covering input parsing + a happy-path search against a temp vault. _Implementation note: wire shape is camelCase (`maxResults`) to match the rest of Kokobrain's Tauri payloads (`SemanticResult`, etc.). The "happy-path against a temp vault" subtest was downgraded to JSON deserialization coverage (camelCase, optional default, missing required field) because exercising `search_hybrid` end-to-end would require initializing the ONNX embedder + downloading models — far heavier than the rest of the suite; runtime smoke is delegated to manual verification through Claude Code._
- [x] Task 4: Implement the `read_note` tool. Input: `{ path: String }`. Validates with `canonicalize` + `starts_with(vault_root)` (vault root read from `VaultIndexState` snapshot). Returns `{ path, content }`. Rejects with `"path outside vault"` otherwise. Unit tests: valid path inside vault, path outside vault, missing file. _Implementation note: vault root is read from `mcp::current_vault_root()` (the static cell from task 2) rather than `VaultIndexState`, keeping the MCP module decoupled. `commands::vault::scan_vault_v2` now publishes the canonical vault root via `mcp::set_current_vault_root` after a successful scan. Validation logic lives in `pub fn read_note_impl` so the integration tests can exercise it directly without standing up an MCP session._
- [x] Task 5: Append a "Exposed via MCP" section to `docs/SEARCH.md`. Document the two tool names + JSON shapes, the localhost port, and the Claude Code config snippet. _Also added `[TAURI:RUST:MCP]` to the tracing-tags table and updated the SEARCH.md description in CLAUDE.md so the MCP surface is discoverable from the top-level docs index._

## Notes

- All log lines must use tag `"MCP"` (uppercase, no prefix). Mirrors `SEMANTIC` / `EMBEDDER` / `RERANKER`.
- Tool input/output structs derive `serde::Deserialize` / `serde::Serialize` and `schemars::JsonSchema` (required by `#[tool(...)]`).
- `VaultIndexState` is `RwLock<VaultIndex>` (managed at `lib.rs:89`). The vault root path lives inside `VaultIndex` -- need to expose a getter if one doesn't exist yet; if it does, reuse.
- rmcp HTTP transport mounts at whatever path we nest it under in axum (`/mcp` by convention; matches the rmcp example). Claude Code config: `"url": "http://127.0.0.1:3737/mcp"`.
- Server lifecycle is bound to the tokio runtime owned by Tauri. No explicit shutdown channel needed; the port closes on process exit.
- Out of scope: settings UI, HTTPS, multi-vault, streaming progress, auth.
