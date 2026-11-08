# t3code architecture scout (input to the Kokobrain iOS plan)

## Scope and method

- Subject: pingdotgg/t3code, default branch `main`, commit `ddfc4a92edbdc934fede54c32f19be9ff5af1bb4` (2026-11-01). Fetched 2026-11-02.
- Docs read in full via `gh api repos/pingdotgg/t3code/contents/<path>`: `docs/internals/{remote,environment-auth,connection-runtime,t3-connect,mobile-development,overview,server-updates}.md`, `docs/user/{remote-access,mobile-notifications}.md`.
- Code read via a sparse shallow clone at `/tmp/t3code-src` (outside this repo) for grep and reading.
- Citation form: `path:line` is relative to the t3code repo root. Permalink base: `https://github.com/pingdotgg/t3code/blob/ddfc4a92edbdc934fede54c32f19be9ff5af1bb4/`.
- Kokobrain facts are the main session's verified facts from the brief. Kokobrain files were not re-read.

## 1. Findings (short)

1. **One owner per environment.** The host owns providers, terminals, git, files, and durable state. Clients are thin and must never substitute their own filesystem or credentials (`docs/internals/overview.md:3-6`).
2. **Shared headless runtime, separate UIs.** Web and mobile share `packages/client-runtime` (zero React imports) and `packages/contracts`. The mobile UI is a React Native app with its own components. It does not import `apps/web` (grep: 0 matches). Counts: 797 `.tsx` in `apps/web/src`, 471 in `apps/mobile/src`.
3. **Transport is one HTTP server.** REST covers metadata, auth, and snapshots. One WebSocket `/ws` carries Effect RPC over JSON with 197 `Rpc.make` definitions. Subscriptions are streams with sequence cursors.
4. **Pairing is one-time, short-lived, and scope-limited.** Default TTL 5 min, consumed atomically, optionally bound to a DPoP key, and the URL carries it in the fragment (`apps/server/src/auth/PairingGrantStore.ts:251`, `:378-402`, `:549-561`; `apps/server/src/startupAccess.ts:154-160`).
5. **Route selection is client-driven and token-safe.** The server reports its LAN and tailnet addresses inside the authenticated config. The client probes each route's public descriptor without a credential, then connects over the first route that answers. A token is never sent in clear over a route it was not paired on. Loopback is never learned (`packages/client-runtime/src/connection/routes.ts:240-242`, `:335-352`; `driver.ts:148-151`).
6. **Listener filter.** A wildcard bind closes every TCP connection unless both peer addresses are private IPv4 (loopback, RFC1918, CGNAT, tailnet). The docs say explicitly that this is not a firewall (`apps/server/src/server.ts:351-355`; `startupAccess.ts:55-72`; `docs/internals/remote.md:58-65`).
7. **Reconnection has one owner.** The supervisor retries with equal-jitter exponential backoff from 1 s to a 5 min cap. Foreground, network-change, and explicit-retry events probe the live socket and replace it only on failure. Mutations are never replayed on reconnect (`supervisor.ts:42-43`, `:141-144`; `docs/internals/connection-runtime.md:9-35`, `:127-132`).
8. **Offline is read-only caching.** Cached projections stay readable. There is no offline write queue, no CRDT, and no cross-environment sync. Command acknowledgement means "intent committed", not "work finished" (`docs/internals/overview.md:45-59`; `docs/user/project-settings.md:11`).
9. **Versioning is an integer plus additive capability flags.** The protocol integer is checked at WebSocket upgrade (HTTP 426 on mismatch). Capabilities are optional booleans, and unknown enum values decode to `undefined` (`apps/server/src/ws.ts:3343-3356`, `:676-681`; `packages/contracts/src/environment.ts:13-16`, `:72`; `packages/contracts/src/baseSchemas.ts:48-56`).
10. **Deliberately not built:** host-free local execution on mobile, relay proxying of app traffic, mDNS pairing discovery, shared UI code, offline mutation replay, and cross-environment sync.
11. **Two weak spots to avoid copying.** The one-time pairing credential is stored as a plaintext column (`apps/server/src/persistence/AuthPairingLinks.ts:21`, `:176`). The iOS app sets `NSAllowsArbitraryLoads: true` (`apps/mobile/app.config.ts:265-266`).

## 2. Process topology

| Component | Owns | Source |
|---|---|---|
| Node server (`apps/server`, Effect) | providers, git, files, terminals, SQLite event store, auth, relay link | `docs/internals/overview.md:8-19` |
| `packages/client-runtime` | connection supervisor, RPC sessions, route model, state (headless) | `packages/client-runtime/README.md:3-4`, `:22-27` |
| Web / desktop renderer | UI, connection catalog in browser storage | `docs/internals/remote.md:142-147` |
| Mobile (React Native / Expo) | UI, connection catalog in secure storage, native modules for terminal, composer, and diff | `apps/mobile/src/connection/catalog-store.ts:16`, `:52`; `apps/mobile/modules/` |
| T3 Connect relay (Cloudflare Worker) | Clerk identity, bootstrap brokering, managed tunnels, push, webhook forwarding. Does not proxy app HTTP or WS | `docs/internals/t3-connect.md:3-8`, `:36-43` |

## 3. Transport and RPC shape

**HTTP surface (`packages/contracts/src/environmentHttp.ts`).** Typed `HttpApi` groups with schema-checked success and error shapes:

| Route | Auth | Purpose | Line |
|---|---|---|---|
| `GET /.well-known/t3/environment` | none (public) | identity, versions, capabilities | `:531` |
| `GET /api/auth/session` | optional bearer/DPoP | session state | `:538` |
| `POST /api/auth/browser-session` | credential | cookie session | `:545` |
| `POST /oauth/token` | bootstrap credential + DPoP proof | RFC 8693 token exchange | `:552`; `auth.ts:170-173`, `:220-230` |
| `POST /api/auth/websocket-ticket[/:use]` | authenticated | short-lived route-bound WS or media ticket | `:560`, `:567` |
| `POST /api/auth/pairing-token` | `access:write` | mint a pairing credential | `:575` |
| `POST /api/auth/{pairing-links/revoke,clients/revoke,clients/revoke-others}` | authenticated | revocation | `:583-599` |
| `GET /api/orchestration/shell`, `/threads/:id`, `/transcript`, `/bounded`, `/history` | session + protocol header | snapshot reads | `:685-720` |
| `POST /api/projects/mutate`, `POST /api/pull-requests/diff` | session | writes and reads | `:736`, `:745` |
| `/api/connect/*`, `/api/t3-connect/*` | session | T3 Connect management | `:761-813` |
| `/api/hooks/:hookId/:token` | path token | automation webhooks | `:832-838` |

Other routes:

- `GET /ws` WebSocket upgrade: `apps/server/src/ws.ts:3343-3356`.
- `/api/assets/*` signed media URLs: `apps/server/src/assets/AssetAccess.ts:71`.
- `/api/attachments/upload/*`: `apps/server/src/assets/AttachmentUpload.ts:41`.
- `/api/guest/*` guest links: `apps/server/src/guest/http.ts:140-366`; guest tokens are HMACs (`docs/internals/environment-auth.md:30-40`).
- `/mcp` with MCP OAuth: `apps/server/src/mcp/McpHttpServer.ts:1153`; `environmentHttp.ts:608-645`.
- `/api/device-hub/*`: `apps/server/src/device/DeviceService.ts:80`.

**WebSocket RPC (`packages/contracts/src/rpc.ts`).**

- `WS_METHODS` map at `:407`; `WsRpcGroup` at `:1972`; 197 `Rpc.make` definitions (grep count).
- Serialization is `RpcSerialization.layerJson` (`ws.ts:3406`). Streams are declared with `stream: true`, for example `WsOrchestrationV2SubscribeShellRpc` (`rpc.ts:1831-1837`).
- Orchestration v2 methods: `packages/contracts/src/orchestrationV2.ts:3549-3569`. The four subscriptions are `subscribeShell`, `subscribeThread`, `subscribeCommandOutput`, and `getThreadProjection`.
- Subscribe inputs carry resume cursors and client opt-ins: `afterSequence`, `acceptBoundedSnapshot`, `acceptCompactIds`, `acceptDedupedBodies` (`orchestrationV2.ts:3649-3661`, `:3747-3757`). The server only sends compacted shapes to clients that asked.
- Stream items are a tagged union: `synchronized`, `snapshot` (with `snapshotSequence`), then deltas with `sequence` (`orchestrationV2.ts:2214-2246`).
- Each stored event carries `sequence` and `commandId`, which is the idempotency key (`orchestrationV2.ts:2248-2253`). Command receipts commit in the same DB transaction as the event (`docs/internals/overview.md:49-53`).
- Client side: `packages/client-runtime/src/rpc/protocol.ts:5`, `:10-12` (ping timeout 15 s; the 5 s ping interval appears only in a code comment). `rpc/session.ts:46` (socket open timeout 15 s), `:54` (`ready`), `:226-237` (`Socket.layerWebSocket` with `pingTimeout`).
- Readiness requires the initial server config, not just an open socket (`rpc/session.ts:260`, `docs/internals/connection-runtime.md:64-71`).

## 4. Pairing, credentials, and authorization

| Item | Value | Source |
|---|---|---|
| One-time pairing token | 12 characters from a 32-symbol alphabet (60 bits) | `PairingGrantStore.ts:254-255` |
| Default TTL | 5 min (dev startup token 24 h; desktop bootstrap 24 h) | `PairingGrantStore.ts:251-253` |
| Consumption | atomic `consumeAvailable`; scope check inside the UPDATE, so a rejected request cannot spend the link | `PairingGrantStore.ts:549-561` |
| Key binding | optional `proofKeyThumbprint`; mismatch is a distinct error | `PairingGrantStore.ts:210-227` |
| Delivery | `pair` URL with token in the URL fragment (`#token=`), so it stays out of requests and query strings | `startupAccess.ts:154-160`; `docs/internals/remote.md:149-153` |
| Session token | HMAC-signed payload with a DB revocation check (`MalformedSessionToken`, `InvalidSessionTokenSignature`, `SessionTokenRevoked`) | `SessionStore.ts:80-141`; `auth/utils.ts:83` |
| WebSocket auth | short-lived ticket per route (RPC or media); a DPoP-bound RPC ticket carries a fresh proof in the `dpop` query param | `docs/internals/environment-auth.md:73-86` |
| Replay | DPoP `jti` markers kept about 1 day and pruned | `apps/server/src/auth/replayMarkers.ts:17-22`; `dpop.ts:21` |
| Scopes | 17 scopes (`orchestration:read/operate`, `filesystem:read/write`, `terminal:operate`, `access:write`, ...) | `packages/contracts/src/auth.ts:31-49` |
| Per-RPC scope | `RPC_REQUIRED_SCOPES` with `satisfies Readonly<Record<WsRpcMethod, AuthEnvironmentScope>>`, so a method without a scope fails to compile | `apps/server/src/auth/RpcAuthorization.ts:40-42`, `:211`, `:213-227` |
| Pairing can narrow, never widen | exchange intersects requested scopes with the grant | `docs/internals/environment-auth.md:9-18`, `:88-91` |
| Read model | pairing metadata only; raw secret returned once, at creation | `docs/internals/environment-auth.md:20-23` |
| Relay trust | relay mints a one-time bootstrap; client exchanges it directly with the host using its DPoP key; relay never sees the session token | `docs/internals/t3-connect.md:36-43`, `:45-57` |
| Auth policy | `remote-reachable` vs `loopback-browser` vs `desktop-managed-local`, chosen from bind host | `apps/server/src/auth/EnvironmentAuthPolicy.ts:22-40` |

Weak spot: the pairing credential is a plaintext `credential` column, read with `WHERE credential = ...` (`apps/server/src/persistence/AuthPairingLinks.ts:20-21`, `:176`). Mitigations are the 5 min TTL and single use. Do not copy this without hashing.

## 5. Route discovery and the listener filter

**Route model (`packages/client-runtime/src/connection/routes.ts`).**

- Route kinds: `relay | loopback | lan | tailnet | vpn | public | ssh` (`:17-24`). Classification is by hostname: `isTailnetHost` (MagicDNS `.ts.net` or `fd7a:115c:a1e0::/48`) vs `isSharedAddressSpaceHost` (`100.64/10` alone is "vpn", not "tailnet") (`packages/shared/src/hostClassification.ts:82-93`; `routes.ts:84-103`; `docs/user/remote-access.md:114-116`).
- Rank order for new routes: loopback(0) < lan(1) < tailnet/vpn(2) < public(3) < ssh(4) < relay(5) (`routes.ts:105-113`, `:115-129`).
- Learned routes come from the server's `directEndpoints` in the authenticated config (`packages/contracts/src/server.ts:591-595`, `:621`; `supervisor.ts:333-349`). They inherit the credential of the route they were learned over (`routes.ts:408-411`, `:413-416`).
- Plain-HTTP learned routes are accepted only when the parent token was itself paired over plain HTTP on LAN or public (`routes.ts:317-332`). Loopback reports are skipped (`:240-242`).
- Clients never send a token in clear over a route it was not paired on: `sendsTokenInClear` (`:335-352`) and `usableRoutes` (`:354-357`).
- Pre-flight probe: `GET /.well-known/t3/environment` with `cache: "no-store"` and a 2.5 s timeout. The probe carries no credential. Only a matching `environmentId` counts as "answered" (`driver.ts:47`, `:150-162`).
- Route race: all routes are probed in parallel. Each attempt starts after a 500 ms head start for earlier routes. Only an `unsupported` (incompatible server) error stops the walk (`driver.ts:47-51`, `:69-139`, `:115`).

**Server-side advertising (`apps/server/src/environment/DirectEndpoints.ts`).**

- Advertise only private, non-link-local IPv4 (`:42-43`). Enumerate interfaces on wildcard binds, skipping Docker, libvirt, VMware, VirtualBox, Hyper-V, and macOS `bridge100+` (`apps/server/src/startupAccess.ts:48-49`; `DirectEndpoints.ts:70-80`).
- Cloud VM detection via a plain TCP probe to `169.254.169.254` (300 ms), so a cloud host advertises only its tailnet address (`DirectEndpoints.ts:95-115`, `:126-128`, `:83`).
- A tailnet route is advertised only after the Tailscale HTTPS endpoint answers (`DirectEndpoints.ts:142-164`).

**Listener filter.**

- Only with `privateNetworkOnly` (headless "LAN" mode): `server.on("connection")` destroys the socket unless `localAddress` and `remoteAddress` are both private IPv4 (`apps/server/src/server.ts:351-355`; `startupAccess.ts:55-72`).
- The filter is per connection, before HTTP. The wildcard bind keeps reported addresses current when DHCP changes (`docs/internals/remote.md:58-65`).
- Explicitly "not a firewall": Tailscale Serve and T3 Connect reach the server over loopback, and a proxy that rewrites the source address looks private (`remote.md:61-63`).
- Background service with no configured host: listens on every IPv4 interface behind the private filter (`docs/internals/remote.md:58-61`). Chosen by `privateNetworkOnly` in `apps/server/src/cli/config.ts:427-437`, which follows `--lan` / `T3CODE_LAN` and, otherwise, whether the service launcher is managed. Opt-in LAN for a foreground server: `t3 serve --lan` (`docs/user/remote-access.md:75-83`).

**Pairing discovery.** No mDNS or Bonjour pairing. Pairing is QR or a `t3code://pair` app link (`packages/shared/src/remote.ts:190`; `docs/user/remote-access.md:91-98`). The only mDNS use is for "remote open" editor targets (`apps/server/src/environment/RemoteOpenTargets.ts:70-75`).

## 6. Reconnection and liveness

**Retry policy (`packages/client-runtime/src/connection/supervisor.ts`).**

| Constant | Value | Line |
|---|---|---|
| `RETRY_BASE_DELAY_MS` | 1 s | `:42` |
| `RETRY_MAX_DELAY_MS` | 300 s (5 min) | `:43` |
| `retryDelayMs` | `ceiling = min(max, base * 2^(n+1))`; delay = `ceiling/2 + ceiling/2 * random` (equal jitter) | `:141-144` |
| `BACKOFF_RESET_AFTER_MS` | 30 s stable before reset | `:60` |
| `QUICK_CONNECTION_PROBE_TIMEOUT` | 3 s (loopback, LAN, long resume) | `:50`, `:628-656` |
| `CONNECTION_PROBE_TIMEOUT` | 15 s (elsewhere) | `:49` |
| `SILENT_SOCKET_CHECK_AFTER` | 500 ms, then re-check each second | `:53-54` |
| `REMOTE_SILENT_SOCKET_AFTER` | 2.5 s without frames off-LAN | `:59` |
| `SILENT_ROUTE_BACKOFF_MAX_MS` | 30 min (per silent route, doubling from 60 s) | `:65`, `:151-156` |
| `BETTER_ROUTE_COOLDOWN_MS` | 5 min after a better route fails | `:68` |

Other rules:

- Probe-on-signal (`supervisor.ts:697-700`): foreground, explicit retry, and "offline" reports probe the live session and reconnect only on failure. Offline reports are often wrong (`docs/internals/connection-runtime.md:19-21`).
- Dead-socket test: a probe with no answer after 500 ms asks the host for its descriptor over a fresh request. If the host answers while the socket stays silent, the socket is replaced (`connection-runtime.md:21-27`).
- Wakeups (`packages/client-runtime/src/connection/wakeups.ts:5-26`): `application-active`, `application-active-probe`, `application-active-long`, `credentials-changed`, `network-changed`. Foreground and network-change reset backoff.
- Mobile wiring (`apps/mobile/src/connection/platform.ts:43`, `:86`, `:118-133`): AppState `active` plus a network-type change (Wi-Fi to cellular) fire wakeups. A background interval is measured for `application-active-long`. The `networkPathChanges` stream exists because an online/offline signal misses Wi-Fi-to-cellular moves (comment at `platform.ts:46`).
- Auth-expiry renewal: the driver renews DPoP tokens before expiry on a live socket, and the server moves the socket to the newer session (`driver.ts:202-214`; `connection-runtime.md:52-57`).
- Offline routes: "offline" is a phase, not a retry, and waits for a wakeup (`supervisor.ts:181-190`; `connection-runtime.md:14-17`).

## 7. Offline behavior

- Projections stay readable offline, but must not imply a live connection or overwrite newer live data on reconnect (`connection-runtime.md:64-76`).
- Retry and idempotency for mutations belong to the operation, not the socket. A reconnect does not replay mutations (`connection-runtime.md:127-132`).
- Projection phase is three-valued: `disconnected | synchronizing | ready` (`packages/client-runtime/src/connection/model.ts:180-186`). Socket and data freshness are separate states (`connection-runtime.md:64-71`).
- Connection failures are classified: transient (`network`, `timeout`, `transport`, `endpoint-unavailable`, `relay-unavailable`, `remote-unavailable`, `session-pending`; `model.ts:59-68`) vs blocked (`authentication`, `configuration`, `permission`, `unsupported`; `model.ts:70-77`). Transient retries; blocked waits for a wakeup or user action.
- Pull-request and multi-environment data is per environment. "Offline environments keep their current values; this is a bulk edit, not a synced global default" (`docs/user/project-settings.md:11`).

## 8. Push and background

- Push needs T3 Connect. "Background delivery requires T3 Connect; a direct or Tailscale connection alone does not enable push notifications. The mobile app does not need to maintain a connection" (`docs/user/mobile-notifications.md:11`).
- Device registration is DPoP-bound: `POST /v1/mobile/devices` and `/v1/mobile/live-activities` on the relay (`packages/contracts/src/relay.ts:1026-1037`).
- Mobile background activity uses leases. Mobile reports every 25 s with a 45 s lease TTL (`apps/mobile/src/connection/background-activity.ts:26-29`). The host's `BackgroundPolicy` decides what stays warm, based on host power and thermal state (`apps/server/src/background/BackgroundPolicy.ts:24-30`; `packages/contracts/src/background.ts:15-46`).
- iOS background mode is `audio` only, for picture-in-picture (`apps/mobile/app.config.ts:270-272`). There is no background socket.
- The APNs entitlement location is not in `app.config.ts`. UNVERIFIED how push is enabled on iOS.

## 9. Versioning between client and server

| Mechanism | Detail | Source |
|---|---|---|
| Protocol integer | `ORCHESTRATION_PROTOCOL_VERSION = 2`; sent as WS query `orchestrationProtocol=2` and HTTP header `x-t3-orchestration-protocol` | `environment.ts:13-16`; `compatibility.ts:37-41` |
| Upgrade gate | mismatch returns HTTP 426 with `orchestration_protocol_incompatible` and the server's version | `ws.ts:3349-3356` |
| Client-side compare | server newer: "update this app" (blocked). Server older: "update the server" (`serverUpdateRequired` when self-update is possible) | `compatibility.ts:9-27`, `:29-35` |
| Missing version | treated as 1 (pre-negotiation servers) | `compatibility.ts:12-13` |
| Descriptor | `environmentId`, `label`, `platform`, `serverVersion`, `orchestrationProtocolVersion` (optional), `databaseMigration` (optional), `capabilities` | `environment.ts:169-178` |
| Capabilities | 59 optional booleans (61 optional keys in total), each "hide the UI when absent", e.g. `threadForceStop`, `threadPullRequestLinking` | `environment.ts:72-167` |
| Forward-compatible enums | unknown values decode to `undefined` instead of failing the message | `baseSchemas.ts:48-56` |
| Additive wire changes | new fields are optional; legacy fields kept on the wire (e.g. `linkedPullRequest`) | `docs/internals/overview.md:21-30` |
| Old scopes | retired and unknown scope names dropped at exchange; `permissions` added beside legacy `scopes` | `docs/internals/environment-auth.md:88-99` |
| Persisted events | must decode on replay; a schema change affects old environments at startup | `docs/internals/overview.md:61-63` |
| Server self-update | stable launcher; `prepared -> committed -> ready`; SQLite snapshot before trial migrations; rollback on failure; client correlates by update ID | `docs/internals/server-updates.md:3-14`, `:16-37`, `:39-50`, `:52-57` |

## 10. Mobile client: reuse or reimplement

- **Reuse:** the headless runtime (`@t3tools/client-runtime/{connection,rpc,state/*,environment,relay}`) and `@t3tools/contracts`. Import counts in `apps/mobile/src`: 487 contracts, 88 `state/runtime`, 75 `state/shell`, 48 `connection`, 18 `environment`.
- **Reimplement:** all UI. React Native screens, `expo-*` platform APIs, and native Expo modules for terminal (`apps/mobile/modules/t3-terminal`, libghostty), composer editor, and review diff (`apps/mobile/modules/t3-review-diff`). Remote browser preview uses a WebView (`apps/mobile/src/features/browser/PreviewStreamWebView.tsx`).
- **Platform adapter:** mobile supplies storage (`apps/mobile/src/connection/catalog-store.ts:51-58`, secure storage), lifecycle and network wakeups (`platform.ts`), and persistence through `packages/client-runtime/src/platform`.
- **HMR:** the mobile dev lifecycle needs a swappable atom runtime (`docs/internals/mobile-development.md:3-12`). Not relevant to Kokobrain except as a warning.

## 11. iOS-specific settings in t3code

- `NSAppTransportSecurity.NSAllowsArbitraryLoads: true` (`apps/mobile/app.config.ts:265-266`). Needed for plain-HTTP LAN and tailnet routes. A deliberate trade-off.
- `NSLocalNetworkUsageDescription`: "Allow T3 Code to connect to T3 Code servers on your local network or tailnet." (`app.config.ts:268-269`). Required for the iOS local-network permission.
- `UIBackgroundModes: ["audio"]` only (`app.config.ts:272`).
- Plain `http://` addresses are allowed on mobile; an IP without a scheme defaults to HTTP. Users must add `https://` for HTTPS servers (`docs/user/remote-access.md:204-206`).

## 12. Deliberately not done (and why, per the docs)

| Not done | Reason stated or evident | Source |
|---|---|---|
| Local agent or filesystem execution on mobile | Remote clients must never substitute their own filesystem, credentials, or state | `overview.md:3-6` |
| Relay proxying app traffic | Relay Worker "does not proxy their HTTP or WebSocket sessions" | `t3-connect.md:3-8` |
| Relay ever holds a session token | Bootstrap is exchanged directly with the host using the client's DPoP key | `t3-connect.md:40-43` |
| Hot-swapping the connection runtime on mobile | Only the connection layer is swappable; other atom families are not safe to hot-swap | `mobile-development.md:8-12` |
| Offline mutation queue | Reconnect does not replay mutations; idempotency is per operation | `connection-runtime.md:127-132` |
| Cross-environment sync | Each environment owns its state; "not a synced global default" | `project-settings.md:11`; `overview.md:41-43` |
| Shared UI between web and mobile | Headless runtime only | `packages/client-runtime/README.md:3-4` |
| Firewall-grade LAN filter | Filter is a heuristic on source address | `remote.md:61-63` |
| Treating CGNAT `100.64/10` as Tailscale | Requires MagicDNS or the tailnet IPv6 prefix | `remote-access.md:114-116` |
| mDNS pairing | Not present in code | `RemoteOpenTargets.ts:70-75` (unrelated) |
| Credential in URL query | Token in fragment; WS tickets route-bound | `remote.md:149-153`; `environment-auth.md:73-86` |
| Plain-HTTP token on untrusted routes | `sendsTokenInClear` filter | `routes.ts:335-352` |
| Stateful OAuth for MCP clients | Stateless registration so unauthenticated callers cannot grow server state | `environment-auth.md:42-53` |
| Desktop-only backend for mobile | Desktop disables its local environment without deleting state; the remote is the thing that matters | `remote.md:176-186` |

## 13. Mapping to Kokobrain's candidate models

Kokobrain facts are from the brief. The mapping is inference, not verified against Kokobrain code.

### Model A (remote Mac host over tailnet): closest to t3code

- t3code runs exactly this model. Host owns all state, the thin client holds catalog and cache (`overview.md:3-6`).
- Semantic search (ONNX BGE-M3) stays on the Mac. The iOS build then needs no `ort` or tokenizer and no model download, which solves the iOS semantic-search problem by construction.
- The typed IPC seam already fits. `call(cmd, args)` maps to a request method and `on(event, handler)` to a stream method. About 64 commands and 7 events are roughly a third of t3code's 197 RPCs, so the same shape scales down.
- Rust core: `vault`, `search`, `db` have no tauri refs (brief). The replacement is the `commands/*` glue, not the core. The HTTP and WS server crate is not evaluated here.
- Failure mode: Mac asleep means iOS offline. t3code's answer is an always-on host plus a relay tunnel (`remote-access.md:4-5`, `t3-connect.md:93-114`). Kokobrain needs the same decision.
- ATS: t3code uses plain HTTP on tailnet and disables ATS (`app.config.ts:265-266`). Kokobrain can instead use Tailscale Serve HTTPS (`remote-access.md:170-196`) and avoid the exception.

### Model B (LOCAL Tauri iOS core): no t3code precedent

- t3code never runs the core on a phone. Its only offline-related patterns are the connection state machine, secure credential storage, and read-only cached projections (`overview.md:3-6`; `connection-runtime.md:64-76`).
- The SQLite database is owned by one host. t3code restores it only through its owner, with a snapshot before migrations (`server-updates.md:39-50`). That is the lesson for ADR-0019: `.kokobrain/kokobrain.db` should never be synced as a live WAL file.
- Consequence: a local model rebuilds the FTS index on device and drops semantic search (brief). Nothing in t3code validates this path.

### Hybrid

- t3code's hybrid is: relay for bootstrap, tunnel, push, and hooks; app traffic direct (`t3-connect.md:3-8`). That is a precedent for Model A with a remote-access add-on, not for Model B.
- t3code does not replay mutations, so a hybrid that writes offline would be new design work with no precedent.

## 14. Transferable patterns

| Priority | Pattern | Where it applies to Kokobrain |
|---|---|---|
| Adopt (A) | Protocol integer in the WS query and 426 on mismatch, plus optional capability booleans in a public descriptor | Versioning between iOS and Mac |
| Adopt (A) | Public `GET /.well-known/...` descriptor with identity, version, and capabilities, no secrets | Route probing before credentials |
| Adopt (A) | One-time pairing token: short TTL, single use, optionally key-bound, delivered in the URL fragment, QR code | iOS first pairing |
| Adopt (A) | Session = signed token plus revocation row; WS ticket per route; never a long-lived bearer in a socket URL | Auth on the socket |
| Adopt (A) | Per-command required scope, enforced at compile time (`satisfies Record<...>`) | Future multi-client access |
| Adopt (A) | Supervisor owns retries; equal-jitter backoff; probe on foreground and network change; replace the socket only on evidence | iOS suspension |
| Adopt (A) | Reconnect does not replay mutations; command ack means intent committed | Write path semantics |
| Adopt (A, if LAN bind) | Per-connection private-address filter on wildcard bind | Only if Kokobrain binds LAN |
| Later | Learned routes from server-reported addresses, with credential inheritance | Only with multiple routes |
| Later | Server self-update with prepared, committed, ready handshake and SQLite snapshot | Only if the Mac service self-updates |
| Skip | T3 Connect relay, Clerk, managed tunnels, peer links, MCP OAuth, device hub, guest links, load balancing | No account system or multi-host need stated |

## 15. Unverified and not checked

- APNs or Live Activity entitlement location on iOS: not in `app.config.ts`. UNVERIFIED.
- Whether the plaintext pairing credential is protected at rest (depends on state-dir permissions). UNVERIFIED.
- The 5 s ping interval: only a code comment (`protocol.ts:10`). The library default is UNVERIFIED.
- Whether mobile imports nothing from web: verified by grep for `apps/web` and `@t3tools/web` in `apps/mobile/src` (0 matches), not by building.
- iOS local-network permission prompt behaviour: only the usage string was read, not the runtime behaviour.
- Kokobrain facts (IPC shape, command counts, ADR-0019, Rust module boundaries) are from the brief. Not re-read here.
- Not checked: the `packages/client-runtime/src/state/*` internals, the desktop SSH launcher, and the device hub. None is needed for Kokobrain's model choice.
