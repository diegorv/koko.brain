# Scout 16: embedded Rust HTTP/WS server, SvelteKit static serving, Tailscale, iOS PWA limits

Scope: external research for the remote mode (model A) and the webview constraints that apply to both models. Read-only on the repo. No builds run.

Legend: **[V]** verified from a fetched primary page or repo file. **[S]** verified only from a search-result excerpt (page not fetched). **[U]** UNVERIFIED (memory or inference; check before relying on it).

## 1. Repo facts (path:line)

| Fact | Location |
|---|---|
| `tauri` 2 with features `macos-private-api`, `protocol-asset` | `src-tauri/Cargo.toml:22` |
| `tokio` declared with `rt-multi-thread`, `fs`, `io-util` only (no `net`, no `time`) | `src-tauri/Cargo.toml:65` |
| No `axum`, `tower-http`, `tokio-tungstenite` dependency yet | `src-tauri/Cargo.toml` (grep) |
| `tauri-plugin-http` present | `src-tauri/Cargo.toml:66` |
| Dev server URL `http://localhost:1420` | `src-tauri/tauri.conf.json:8` |
| CSP `connect-src` lists `ipc:`, `http://ipc.localhost`, todoist, huggingface, github, sentry. No tailnet, no `ws:`/`wss:` origin | `src-tauri/tauri.conf.json:29` |
| `#[cfg_attr(mobile, tauri::mobile_entry_point)]` on `run()` (iOS entry already wired) | `src-tauri/src/lib.rs:222` |
| `tauri::Builder::default()` chain, `generate_handler!` command list | `src-tauri/src/lib.rs:254`, `:293` |
| Commands take `tauri::AppHandle` and `tauri::State<VaultIndexState>` | `src-tauri/src/commands/vault.rs:304-305` and following |

Consequence for remote mode: a remote webview origin needs its own `connect-src` entries (`https://<host>.ts.net`, `wss://<host>.ts.net`); the current CSP at `tauri.conf.json:29` would block them.

## 2. Embedding an HTTP + WebSocket server in the Tauri Rust process

### 2.1 axum facts

| Claim | Status | Source |
|---|---|---|
| `axum::serve(listener, router)` takes a `tokio::net::TcpListener`; examples bind `0.0.0.0:3000` | [V] | https://github.com/tokio-rs/axum/blob/main/axum/src/serve/mod.rs (lines 55, 110, 150) via `gh api` |
| axum's optional tokio dependency enables features `time`, `rt`, `net` | [V] | https://github.com/tokio-rs/axum/blob/main/axum/Cargo.toml (line 102) |
| WebSocket support is behind crate feature `ws`; `WebSocketUpgrade` extractor, `ws.on_upgrade(|socket| ...)`, `socket.split()` for concurrent read/write; state via `with_state` and closure capture | [V] | https://docs.rs/axum/latest/axum/extract/ws/index.html (docs page reported axum 0.8.9) |
| The `Message` enum variants (Text/Binary/Ping/Pong/Close) were not listed on the fetched page | [U] | check docs.rs `Message` |
| `ws` pulls `tokio-tungstenite` (~0.29-0.30 range shown on docs.rs and axum Cargo.toml line 140) | [V] | axum/Cargo.toml:140 |

Implication: adding axum means adding `net` (already implied by axum's tokio dep) and `ws`; the repo's tokio line (`Cargo.toml:65`) needs no edit if axum enables `net`, but making it explicit is cheap.

### 2.2 Tauri-specific constraints for an in-process server

| Point | Status | Source |
|---|---|---|
| `tauri-plugin-localhost` serves the app's own assets over `http://localhost:<port>` instead of the custom protocol. Its page warns: "This plugin brings considerable security risks and you should only use it if you know what you are doing." and "If in doubt, use the default custom protocol implementation." Requires Rust 1.90. | [V] | https://v2.tauri.app/plugin/localhost/ |
| The same page lists iOS in its platform table but the Level/Notes column is empty in the fetched capture | [U] | confirm iOS support in the plugin repo |
| Tauri's distribute page documents `tauri ios build` and App Store signing only. It does not mention `ios init`/`ios dev`, `mobile_entry_point`, or the iOS custom-protocol origin | [V] for what is absent | https://v2.tauri.app/distribute/ |
| The `tauri://localhost` origin on iOS WKWebView and whether it counts as secure/HTTPS: not confirmed by any fetched page | [U] | Tauri iOS docs |
| Mixed-content blocking for `ws://` / `http://` from an HTTPS-like Tauri origin is documented for Windows and Android (`https://tauri.localhost`); `dangerousUseHttpScheme` exists to switch origins | [S] | https://github.com/tauri-apps/tauri/issues/3007 , https://github.com/tauri-apps/tauri/issues/6055 , https://github.com/tauri-apps/tauri/discussions/7079 |
| Routing the remote-API calls through Rust (`tauri-plugin-http`, already in the repo) sidesteps webview mixed-content rules | [S] (Tauri discussion above) | repo `Cargo.toml:66` |
| iOS App Transport Security: IP-address literals are exempt from ATS exception-domain rules; `NSExceptionDomains` cannot name a numeric IP; WKWebView cancels blocked navigations with `-1022` | [S] | Apple forums via search; https://developer.apple.com/forums/thread/22131 |

Whether an ATS or WKWebView cleartext rule would block a `ws://100.x.y.z` or `http://100.x.y.z` load from a Tauri iOS webview is **[U]**: no source fetched for Tauri iOS specifically. Using HTTPS through `tailscale serve` avoids the question for the remote path.

### 2.3 Lifecycle risk (model A and B both)

- iOS suspends the app when it is backgrounded. An axum listener spawned in `setup` does not keep serving while suspended. Apple DTS is quoted in a forum excerpt saying apps cannot stay alive in the background just to watch a network connection. [S] https://developer.apple.com/forums/thread/35065 and https://developer.apple.com/forums/thread/731211
- **[U, inference]** therefore a Rust-on-device server on iOS is only reachable while the app is foregrounded. This favours model A (host on the Mac or a headless box) for "reach it from the phone at any time".

## 3. Typed RPC and event streaming over the wire

### 3.1 JSON-RPC 2.0 (transport-agnostic)

- Request has `jsonrpc:"2.0"`, `method`, optional `params` (array or object), `id`. A request without `id` is a notification. [V] https://www.jsonrpc.org/specification
- "The Server MUST NOT reply to a Notification, including those that are within a batch request." [V] same URL.
- Error codes: -32700 parse, -32600 invalid request, -32601 method not found, -32602 invalid params, -32603 internal; -32000..-32099 implementation-defined. [V] same URL.
- The spec defines no transport. [V] same URL.
- Fit for this repo: `CommandMap` (`src/lib/contracts/commands.ts`, about 64 commands) maps 1:1 to `method` names with `params` = the existing args object; `EventMap` (`events.ts`, 7 events) maps to server-pushed notifications (no id). The wire format is a new layer the repo does not have yet (it uses Tauri `invoke`/`listen`, `src/lib/contracts/ipc.ts`).
- Gap: no schema/codegen in JSON-RPC itself. The repo's ts-rs output (`src/lib/contracts/generated/`, per CLAUDE.md) would supply param/result types on the Rust side.

### 3.2 tRPC-style

- tRPC subscriptions can run over WebSocket or SSE. The docs recommend SSE: "we recommend using SSE for subscriptions as it's easier to setup and doesn't require setting up a WebSocket server." [V] https://trpc.io/docs/server/subscriptions
- Reconnect resume via `tracked()` IDs and `lastEventId`. [V] same URL.
- Every server example is TypeScript (`@trpc/server`, async generators, Zod). The page does not document the wire protocol for non-TypeScript servers. [V for what is absent] same URL.
- Conclusion: tRPC implies a Node/TS server, which conflicts with the goal of keeping the Rust core as the single host. **Not recommended** for a Rust host unless a Node sidecar is accepted. [U] for any tRPC wire-compat from Rust.

### 3.3 Streaming events

- SSE (`text/event-stream`, `Last-Event-ID`) is simpler than WebSocket for one-way events and works through Tailscale Serve HTTPS. Standards reference only; not fetched. [U]
- WebSocket needed for bidirectional RPC. iOS Safari behaviour (below) means the client must heartbeat and reconnect on `pageshow`/`visibilitychange`.

### 3.4 Serving the SvelteKit static build from Rust

- `tower_http::services::ServeDir` serves a directory, infers Content-Type, supports `not_found_service` (SPA fallback that forces 404), `append_index_html_on_directories` (default on), and precompressed `.br`/`.gz`/`.zst`. Requires crate feature `fs`. [V] https://docs.rs/tower-http/latest/tower_http/services/struct.ServeDir.html (docs page reported tower-http 0.7.1)
- For an SPA fallback, use `not_found_service` only if you want 404 status on fallback; for a SvelteKit adapter-static app the usual pattern is a fallback page (`200.html`/`index.html`), which needs `fallback` instead. [U] confirm against the repo's adapter-static fallback setting (not checked).
- `tauri-plugin-localhost` (see 2.2) is an alternative for serving the bundled app, but its own docs call it a security risk. For remote mode, serving the static bundle from the host is the t3code pattern (see 4).

## 4. Prior art: t3code (pingdotgg/t3code)

- Repo: MIT, default branch `main`. [V] `gh api repos/pingdotgg/t3code`
- README: "T3 Code is an 'agent harness control surface'... [iOS]... [Android]... [web app] and [Electron-based desktop app]". [V] https://github.com/pingdotgg/t3code (README via gh)
- Remote docs: `docs/user/remote-access.md` describes T3 Connect, direct LAN/tailnet pairing, `t3 pair`, and that "Pairing authorizes that device for future connections. Use a fresh one-time link for each new device". Tailscale's `100.64.0.0/10` may show as VPN unless the machine confirms it is on Tailscale. [V] `gh api repos/pingdotgg/t3code/contents/docs/user/remote-access.md`
- Server CLI wires Tailscale Serve in front of a local server: `buildTailscaleHttpsBaseUrl`, `ensureTailscaleServe`, `readTailscaleStatus`, `DEFAULT_TAILSCALE_SERVE_PORT`; errors say Serve "can only proxy plain-HTTP local targets" and that "This machine has no MagicDNS name. Run `tailscale up` and enable MagicDNS." [V] `apps/server/src/cli/pair.ts:14-18`, `:54-56` (5 probe attempts for first-cert latency), `:108`, `:117`, `:159`
- Pairing tokens: one-time bootstrap credential consumed atomically (`PairingGrantStore.ts`, error "Failed to atomically consume an available bootstrap credential."); token TTL flag `--ttl`, default 5 minutes (`pair.ts:450-453`). [V] `apps/server/src/auth/PairingGrantStore.ts:137-155`
- Token transport: hash fragment `#token=` preferred, search param as fallback; stripped from URL after read. [V] `packages/shared/src/remote.ts:146-163`
- Network binding: `t3 serve --lan` accepts LAN and tailnet connections, "so a pairing code is all that keeps other devices on them out." [V] remote-access.md
- Model confirmed: one host owns state; thin clients pair once; Tailscale is one route among several. This matches the owner's description.

## 5. Tailscale

### 5.1 Serve

| Claim | Status | Source |
|---|---|---|
| `tailscale serve` routes tailnet traffic to a local service; tailnet-only (Funnel is the public variant) | [V] | https://tailscale.com/kb/1312/serve |
| Syntax `tailscale serve --https=<port> <target>`; targets are a port or `localhost:3000`; "only `http://127.0.0.1` is supported for proxies" | [V] | https://tailscale.com/docs/reference/tailscale-cli/serve.md |
| `--https` is the default mode; 443 appears only in examples, not stated as default | [V] | same |
| `--bg` runs persistently; "After a reboot or a `tailscale down`/`up` cycle, Serve automatically resumes sharing" (background mode is the default for Tailscale Services; plain Serve needs `--bg`) | [V] | same |
| WebSocket upgrade passthrough through Serve | [U] | not stated in any fetched Serve page; test with a real `wss://` before committing |
| Serve and Funnel cannot share one port; the most recent command wins | [V] | https://tailscale.com/kb/1312/serve |
| Serve on macOS: file/directory serving only in the open-source variant (sandbox); port sharing works in App Store/standalone builds | [V] | tailscale-cli/serve.md and kb/1312/serve |
| Serve on iOS or Android (running it on the phone): no source found; iOS Serve not documented | [U] | no official source. Assume the phone is a client only. |

### 5.2 HTTPS certificates and MagicDNS

| Claim | Status | Source |
|---|---|---|
| Serve HTTPS requires enabling HTTPS certificates on the tailnet; the CLI sends you to a consent page that enables it | [V] | https://tailscale.com/kb/1312/serve |
| Setup: turn on MagicDNS (HTTPS depends on it), enable HTTPS in the DNS admin page, run `tailscale cert` per device | [V] | https://tailscale.com/kb/1153/enabling-https |
| Certs via Let's Encrypt, DNS-01 TXT under `*.ts.net`; 90-day lifetime; renewal is the user's job when using `tailscale cert` directly (Caddy/Serve renew automatically) | [V] | https://tailscale.com/kb/1153/enabling-https |
| Hostnames: `device.tailnet.ts.net`; bare `https://machine-name` cannot get HTTPS | [V] | same |
| **Privacy:** every issued cert is written to the public Certificate Transparency ledger; the page says the ledger "includes the fully qualified domain name of your devices" and warns "Do not enable the HTTPS feature if any of your machine names contain sensitive information." Tailnet owner is obscured; machine names are not | [V] | https://tailscale.com/kb/1153/enabling-https |

Action implied: name the Mac host with a non-sensitive machine name before `tailscale cert`/Serve HTTPS.

### 5.3 Identity headers (Serve only)

| Claim | Status | Source |
|---|---|---|
| Serve adds `Tailscale-User-Login`, `Tailscale-User-Name`, `Tailscale-User-Profile-Pic` to proxied requests | [V] | https://tailscale.com/docs/features/tailscale-serve (also https://tailscale.com/s/serve-headers) |
| Funnel traffic has no identity headers; tagged-device traffic has none | [V] | same |
| Serve strips incoming copies of these headers (anti-spoofing); `Tailscale-App-Capabilities` only with `--accept-app-caps` (v1.92+) | [V] | same |
| Backend must bind to localhost only, otherwise any direct caller can forge the headers | [V] | same |
| Header added in tailscale/tailscale issue #6954, released in 1.44 | [V] | https://github.com/tailscale/tailscale/issues/6954 (cited in search results) [S] |
| Stronger pattern: verify the source via `tailscale whois` on the peer address rather than trusting the header alone (OpenClaw) | [S] | https://docs.openclaw.ai/gateway/tailscale |

Recommendation for a single-owner app: identity header + loopback bind is adequate for the Serve route. Still add the app's own pairing token (t3code model) because non-Serve routes and multi-device pairing need it.

### 5.4 iOS Tailscale app behaviour

- No official iOS background/suspension doc found. The fetched `kb/1134` page was about IPv4/IPv6 and had no iOS content. [U] (wrong page fetched; no correct page located)
- Network Extension: Tailscale on iOS runs as a Network Extension. Memory limits on the extension were stated in a Tailscale blog post about five years old; may be stale. [S] https://tailscale.com/blog/go-linker
- Open GitHub issues describe the tunnel dropping after backgrounding or with VPN On Demand: #21387 (tunnel passes pings 5-7 times then stops, VPN shows connected), #21163 (On Demand leaves LAN TCP broken after returning from cellular), #21371 (Tailscale reasserts its Network Extension and displaces another packet-tunnel VPN), #336 (old: loses connection in background, shows misleading "paused" message). These are user reports, not docs. [S] https://github.com/tailscale/tailscale/issues/21387 , https://github.com/tailscale/tailscale/issues/21163 , https://github.com/tailscale/tailscale/issues/21371 , https://github.com/tailscale/tailscale/issues/336
- iOS 16.4+ and the Tailscale app: iPhone is reachable at its 100.x address when Tailscale is on. [U] not verified from a Tailscale doc.

Implication: the phone must keep Tailscale connected to reach the host; reconnect logic on the client is needed after app switches.

## 6. iOS PWA and webview limits (for the remote web client, and the webview of model B)

| Limit | Status | Source |
|---|---|---|
| Service workers need a secure context: HTTPS or `http://localhost`. A plain `http://100.x` origin gets no `navigator.serviceWorker`. | [V] | https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API (quoted: "Service workers are only available in secure contexts...") |
| Secure-context-only APIs (WebCrypto `subtle`, some clipboard/permissions APIs) follow the same rule | [U] (general knowledge; check MDN Secure Contexts) | https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts (not fetched) |
| Home-screen web app storage exempt from the ITP 7-day script-writable cap: WebKit's tracking-prevention page says "The first-party domain of home screen web applications is exempt from ITP's 7-day cap on all script-writeable storage" | [S] (search excerpt; page not fetched) | https://webkit.org/tracking-prevention/ |
| The 2020 WebKit post says home-screen apps "have their own counter of days of use" | [S] | https://webkit.org/blog/10218 (search excerpt) |
| The ITP 2.3 cap applies after link-decorated navigation (e.g. `?clickID=`): "After seven days of Safari use without the user interacting with a webpage..." | [V] | https://webkit.org/blog/9521/intelligent-tracking-prevention-2-1/ (fetched; the post is the 2.1 page but the text quoted is the ITP 2.3 rule) |
| Storage-pressure eviction still applies; eviction is whole-origin, oldest last-use first; "a site might be excluded from eviction if it has active page at the time of eviction, or its storage is in persistent mode" | [V] | https://webkit.org/blog/14403/updates-to-storage-policy/ (fetched) |
| `navigator.storage.persist()` is heuristic on iOS (no prompt), likely granted for home-screen apps | [S] | https://progressivewebapps.com/platforms/ios-safari/ (not fetched; secondary) |
| Web Push for Home Screen web apps: iOS/iPadOS 16.4+, app must be added to Home Screen (manifest `display` standalone/fullscreen), permission only after a user gesture | [V] | https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/ |
| Home-screen apps have their own cookies and storage separate from Safari | [S] (secondary) | search excerpts; not fetched from Apple |
| Background WebSockets: JS stops in the background; iOS closes the socket, often without `onclose`; on return `readyState` may still read 1. Remedy: app-level heartbeat with timeout; on `visibilitychange` and `pageshow` (check `event.persisted`), force-close and reconnect; refetch missed state. | [S] | https://github.com/flarum/framework/issues/4588 , https://bugs.webkit.org/show_bug.cgi?id=228296 , https://github.com/home-assistant/frontend/issues/17409 |
| Mixed content: `https://` page cannot open `ws://` (must be `wss://`) | [S] | Tauri issue #7701 / discussion #7079 |

Implications:
- Remote web client: serve it over `https://<host>.ts.net` through Tailscale Serve, so SW, install and secure-context APIs work. Plain `http://100.x` loses SW and therefore offline use.
- Storage eviction: the home-screen app is the protected form. Local IndexedDB/cache in a Safari tab is not. Model B with a local vault on iOS sits inside the Tauri app container (native storage), which is outside this WebKit rule. [U] for Tauri iOS storage specifics.
- The client needs reconnect-on-resume logic regardless of model.

## 7. Candidate shape (for the architect; not a recommendation)

| Piece | Option | Notes |
|---|---|---|
| Host | axum on the existing tokio runtime, started from Tauri `setup` on desktop | Adds `axum` (`ws`), `tower-http` (`fs`); repo has no net/ws today (`Cargo.toml:65`) |
| Transport | JSON-RPC 2.0 over one WebSocket, plus SSE fallback for events | No vendor lock; notifications for `EventMap` |
| Typing | ts-rs generated types (existing `src/lib/contracts/generated/`) for params/results; `CommandMap` as method table | Reuses existing contract layer |
| Static client | ServeDir from host, or a separate static deploy, behind Tailscale Serve HTTPS | t3code pattern (`pair.ts`) |
| Auth | Serve identity header + loopback bind + one-time pairing token (TTL 5 min default in t3code) | Token needed for non-Serve routes |
| Client resilience | heartbeat + reconnect on `pageshow`/`visibilitychange` | iOS suspends sockets |
| Model B impact | the Rust core runs on device; no server needed on iOS for local use; server would be suspended when backgrounded | See 2.3 |

## 8. Open questions / not verified

1. Whether `tailscale serve` proxies WebSocket upgrades (wss) end to end. Test before design freeze. [U]
2. Whether Tailscale on iOS can run Serve or host a port at all (no official source). [U]
3. Current Tailscale iOS background/Network Extension limits (only old blog and GitHub issues). [U]
4. Tauri iOS origin (`tauri://localhost`) and whether ATS or mixed-content rules block `ws://`/`http://` to tailnet IPs in WKWebView. [U]
5. `tauri-plugin-localhost` iOS support (platform table had empty notes). [U]
6. tRPC wire protocol for non-TS servers: not documented on the fetched page. [U]
7. Exact ATS behaviour for IP literals on current iOS. [S] only, from forum excerpts.
8. Whether the repo's SvelteKit fallback config needs `fallback` vs `not_found_service` (not checked; repo not inspected beyond Cargo.toml and tauri.conf.json). [U]

What I did not check: axum/Tauri source beyond the cited files; no compile or run; no Tailscale CLI test; no iOS device test (device tools were not used since none is needed for research).

## 9. Sources

- https://tailscale.com/kb/1312/serve
- https://tailscale.com/docs/features/tailscale-serve
- https://tailscale.com/s/serve-headers
- https://tailscale.com/docs/reference/tailscale-cli/serve.md
- https://tailscale.com/kb/1153/enabling-https
- https://tailscale.com/blog/go-linker
- https://github.com/tailscale/tailscale/issues/6954
- https://github.com/tailscale/tailscale/issues/21387
- https://github.com/tailscale/tailscale/issues/21163
- https://github.com/tailscale/tailscale/issues/21371
- https://github.com/tailscale/tailscale/issues/336
- https://github.com/pingdotgg/t3code (README, docs/user/remote-access.md, apps/server/src/cli/pair.ts, apps/server/src/auth/PairingGrantStore.ts, packages/shared/src/remote.ts)
- https://docs.openclaw.ai/gateway/tailscale
- https://docs.rs/axum/latest/axum/extract/ws/index.html
- https://github.com/tokio-rs/axum (axum/Cargo.toml, axum/src/serve/mod.rs)
- https://docs.rs/tower-http/latest/tower_http/services/struct.ServeDir.html
- https://www.jsonrpc.org/specification
- https://trpc.io/docs/server/subscriptions
- https://v2.tauri.app/plugin/localhost/
- https://v2.tauri.app/distribute/
- https://github.com/tauri-apps/tauri/issues/3007 , https://github.com/tauri-apps/tauri/issues/6055 , https://github.com/tauri-apps/tauri/issues/7701 , https://github.com/tauri-apps/tauri/discussions/7079
- https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- https://webkit.org/blog/9521/intelligent-tracking-prevention-2-1/
- https://webkit.org/blog/14403/updates-to-storage-policy/
- https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- https://webkit.org/tracking-prevention/ (search excerpt only)
- https://webkit.org/blog/10218 (search excerpt only)
- https://progressivewebapps.com/platforms/ios-safari/ (search excerpt only)
- https://bugs.webkit.org/show_bug.cgi?id=228296
- https://github.com/flarum/framework/issues/4588
- https://github.com/home-assistant/frontend/issues/17409
- https://developer.apple.com/forums/thread/22131 (search excerpt)
- https://developer.apple.com/forums/thread/35065 (search excerpt)
- https://developer.apple.com/forums/thread/731211 (search excerpt)
