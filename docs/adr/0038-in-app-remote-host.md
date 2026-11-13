---
type: ADR
id: "0038"
title: "In-app remote host: loopback only, Tailscale Serve as the route, Tailscale identity as the auth"
status: active
date: 2026-11-02
---

## Context

The owner wants to read and edit the vault from the iPad and iPhone while the Mac runs Kokobrain. The plan (`.scratch/ios-app/architecture-proposal-2026-11-02.md`, model A) serves the existing frontend bundle from the desktop app to Safari and forwards its IPC calls over a WebSocket. Opening a vault to another device is a remote attack surface: other tailnet members, the public internet through Funnel, DNS rebinding from a page on the Mac, and a `serve --bg` handler that outlives the session. The owner already reaches t3code through `tailscale serve` with tailnet HTTPS on.

## Decision

**The desktop app hosts the browser session itself, bound to `127.0.0.1` only; Tailscale Serve is the only route off the Mac; the Tailscale identity header is the auth for phase 1.**

- **Loopback bind.** `remote::server` listens on `127.0.0.1:<port>` and never on a wildcard address (a raw wildcard probe refuses a port another process holds). Nothing on the LAN can connect.
- **Serve as the route.** `tailscale serve --bg --https=<port> http://127.0.0.1:<port>` publishes the host on the tailnet under the Mac's name. Serve terminates TLS with the tailnet certificate. The port is the Settings port: at least 1024, never a Funnel port (443, 8443, 10000: https://tailscale.com/kb/1223/funnel), and not one t3code uses. Settings shows the publish, `tailscale serve --https=<port> off` and `tailscale serve status` commands; the app never runs them.
- **Identity fails closed** (`remote::access`). A request is local only when its Host is `127.0.0.1:<port>` and it carries no proxy marker (`X-Forwarded-For`, `X-Forwarded-Host`, `X-Forwarded-Proto`, any `Tailscale-*` header). Every other request (page, asset, WebSocket upgrade) needs a Host on the allowlist (`127.0.0.1:<port>` or `<tailnet name>:<port>`) and exactly one `Tailscale-User-Login` equal to the owner login set in Settings, otherwise 403. Serve sets that header and strips client copies (https://tailscale.com/kb/1312/serve); Funnel traffic carries none, so it is refused. No owner login configured refuses every proxied request.
- **Origin allowlist.** The WebSocket upgrade needs exactly one Origin, `http://127.0.0.1:<port>` or `https://<tailnet name>:<port>`; an asset request that sends an Origin needs one of those.
- **Same-origin assets** (`remote::asset`). `/v1/asset/<rel>` shares the app's origin, where the desktop's `asset:` scheme did not. Only raster images, audio, video and PDF are inline; everything else is `application/octet-stream` with `Content-Security-Policy: sandbox` and `Content-Disposition: attachment`, all with `nosniff`. A `Sec-Fetch-Site` other than `same-origin` is refused before the path is read, so another tab cannot probe the vault through `<img>` load and error events.

## Alternatives considered

- **Pairing token in a cookie** (t3code's model, proposal 4.4): needed for routes without an identity header. Deferred: Serve gives a verified login for free, and a token adds a grant store, TTLs and revocation UI. It becomes the fallback if the owner check finds the header missing on a non-443 Serve port.
- **Bind on the tailnet IP or `0.0.0.0`**: reachable without Serve, so no identity header and no TLS; the phone would need plain-HTTP exceptions. Rejected.
- **A separate server process or an axum stack**: more moving parts for one owner on one route; the std server and hand-written WebSocket are enough while traffic is one browser through Serve. Revisit if a second route or streaming assets need it.

## Consequences

- Revoking access is `tailscale serve --https=<port> off`, or turning Browser access off in Settings (the host stops and ends its sessions). Changing the owner login restarts the host and drops live sessions.
- Tailnet HTTPS puts the Mac's `*.ts.net` name in public Certificate Transparency logs (https://tailscale.com/kb/1153/enabling-https). The owner's name was already there through t3code.
- Trust rests on Serve: anything else that proxies to `127.0.0.1:<port>` on the Mac without adding a marker header looks local. Only processes on the Mac can do that.
- UNVERIFIED until the owner check of `.scratch/ios-app` Issue 04: that Serve accepts a non-443 HTTPS port, forwards `wss://` upgrades, and sends `Tailscale-User-Login` there. In debug mode the host logs the Host and identity headers of proxied requests.
- Re-evaluation triggers: a route other than Serve (LAN, a native iOS app), more than one user, or the identity header proving unavailable.
