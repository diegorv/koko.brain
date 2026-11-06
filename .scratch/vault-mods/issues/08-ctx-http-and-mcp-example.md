# 08: `ctx.http.fetch`, with an MCP Streamable HTTP example mod

**What to build:** a mod can call an HTTP API, and through it an MCP server over Streamable HTTP. Today webview `fetch` is blocked by `connect-src` (`src-tauri/tauri.conf.json:29`) and plugin-http is scoped to Todoist and the theme repo (`src-tauri/capabilities/default.json:223-266`).

## Owner decision needed

PRD "Owner decisions needed" 3. Two shapes:

- **(a) Widen plugin-http.** Add `https://**` plus `http://localhost:*` and `http://127.0.0.1:*` to the four `http:allow-fetch*` permissions, and add `http:allow-fetch-cancel`, which is missing today (`default.json` grants only `allow-fetch`, `-send`, `-read-body`, `-cancel-body`), so an abort before headers is denied and silently does not cancel (D3, INFERRED). plugin-http 2.8.3 already honors `AbortSignal` and streams bodies (`node_modules/@tauri-apps/plugin-http/dist-js/index.js:48-57`, `:136`). Small, but it reverses ADR-0035's scope and every webview script gains it, QueryJS included. Verify the scope-pattern syntax in the plugin-http docs.
- **(b) A Rust command** `mods_http_request` on `reqwest` (already a dependency, `src-tauri/Cargo.toml:65`): timeout, response size cap, redirect policy, streamed body over a `tauri::ipc::Channel`, cancel by request id. No capability change, and keys can later stay in Rust. Larger: ts-rs DTOs, `CommandMap`, an E2E `HANDLERS` entry (`e2e/mocks/tauri-core.ts`), Rust tests.

**Recommended: (b)** (D1 R4). Record the choice in the mods ADR (Issue 07).

## Scope either way

- `ctx.http.fetch(url, init)` returning a `Response`-like object; `init.signal` defaults to the current `run.signal` (Issue 06).
- The privacy gate (`.github/workflows/privacy.yml`) needs `privacy-ok` annotations on the TS wrapper (its `fetch(` matches the TS scan) and, for (b), on the Rust file (the Rust scan matches `reqwest`). `PRIVACY.md` gets a row.
- Example mods in `help/examples/mods/`: "Fetch URL into note" and "MCP tools list" for one Streamable HTTP server. MCP has two live generations: 2026-07-28 is stateless (no `initialize`, a mandatory `server/discover`), 2025-11-25 and older need the `initialize` handshake and `Mcp-Session-Id` (V6). The example targets one and says which. No `ctx.mcp` host API.
- Docs: extend `28-mods.md`; amend the mods ADR.

**Blocked by:** 06, 07

Also waits on owner decision 3 (above).

**Status:** needs-info

**Gate:** Both, either way (option (a) edits `src-tauri/capabilities/default.json`, CLAUDE.md rule 6): `pnpm check` + `pnpm vitest run` + `cargo test --manifest-path src-tauri/Cargo.toml`; with (b), commit the regenerated bindings.

- [ ] Failing tests first: the wrapper with Tauri mocked (signal merge, abort, non-2xx); for (b), Rust tests against a local test server (timeout, size cap, cancel).
- [ ] Manual pass in `pnpm tauri dev`, steps written in the commit: E2E has no CSP, no ACL and stubs HTTP (V5).

## Notes

- Origin header: whether plugin-http sends one matters for MCP servers that validate `Origin` (V6). Check.
- **Size:** S-M for (a), M for (b).

## Comments
