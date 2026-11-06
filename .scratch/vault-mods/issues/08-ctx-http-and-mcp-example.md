# 08: `ctx.http.fetch`, with an MCP Streamable HTTP example mod

**What to build:** a mod can call an HTTP API, and through it an MCP server over Streamable HTTP. Today webview `fetch` is blocked by `connect-src` (`src-tauri/tauri.conf.json:29`) and plugin-http is scoped to Todoist and the theme repo (`src-tauri/capabilities/default.json:223-266`).

**Owner decision (PRD, 2026-11-06): widen plugin-http.**

- **Capability.** Add `https://**` plus `http://localhost:*` and `http://127.0.0.1:*` to the four `http:allow-fetch*` permissions in `src-tauri/capabilities/default.json:223-266`, and add `http:allow-fetch-cancel`, which is missing today (only `allow-fetch`, `-send`, `-read-body` and `-cancel-body` are granted), so an abort before headers is denied and silently does not cancel (D3, INFERRED). Verify the scope-pattern syntax for "any https host" and for localhost with any port in the plugin-http 2.8.3 docs before writing it.
- **Wrapper.** `ctx.http.fetch(url, init)` over `fetch` from `@tauri-apps/plugin-http`, returning its `Response`; `init.signal` defaults to the current `run.signal` (Issue 06). plugin-http 2.8.3 already honors `AbortSignal` and streams bodies (`node_modules/@tauri-apps/plugin-http/dist-js/index.js:48-57`, `:136`), which is enough for SSE from a Streamable HTTP MCP server. Add it to `contract/mod-api.v1.ts` and its freeze test.
- **Reach, said plainly.** The scope applies to every script in the webview, QueryJS in any vault included, not only to mods. It reverses ADR-0035's deliberate scope note. Record it in the mods ADR (Issue 07; if 07 has not landed, add the ADR section here), and say so in `28-mods.md` and `PRIVACY.md`.
- **Privacy gate.** The wrapper's `fetch(` and its `@tauri-apps/plugin-http` import match `.github/workflows/privacy.yml`; annotate them `privacy-ok`, and add a `PRIVACY.md` row.
- **Example mods** in `help/examples/mods/`: "Fetch URL into note" and "MCP tools list" for one Streamable HTTP server. MCP has two live generations: 2026-07-28 is stateless (no `initialize`, a mandatory `server/discover`), 2025-11-25 and older need the `initialize` handshake and `Mcp-Session-Id` (V6). The example targets one and says which. No `ctx.mcp` host API.
- E2E: route the example URLs in `e2e/mocks/tauri-http.ts`.

**Blocked by:** 06, 07

**Status:** ready-for-agent

**Gate:** Both (the capability file is under `src-tauri/`, CLAUDE.md rule 6): `pnpm check` + `pnpm vitest run` + `cargo test --manifest-path src-tauri/Cargo.toml`, then `bash scripts/e2e.sh e2e/specs/vault-mods.spec.ts`.

- [ ] Failing tests first: the wrapper with plugin-http mocked (the run's signal is merged in, an abort rejects, a non-2xx response is returned, not thrown); the example mods load through `mods.logic.ts`.
- [ ] Manual pass in `pnpm tauri dev`, steps written in the commit: E2E has no CSP, no ACL and stubs HTTP (V5). Check that an abort before headers really cancels.

## Notes

- Origin header: whether plugin-http sends one matters for MCP servers that validate `Origin` (V6). Check.
- Not in the MVP (PRD: the MVP is Issues 01 to 05).
- **Size:** S.

## Comments
