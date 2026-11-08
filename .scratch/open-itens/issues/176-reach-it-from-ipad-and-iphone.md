# 176: Reach it from iPad and iPhone over the tailnet

**Origin:** `ios-app` Issue 04, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/ios-app/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** The owner opens `https://<mac>.<tailnet>.ts.net:<port>` in Safari on the iPad or iPhone and gets the Kokobrain app served by the Mac, through Tailscale Serve, on a port separate from the one t3code already uses. Only the owner's own Tailscale login gets in. When the phone locks or the connection drops, the app says so and offers a reload instead of silently failing.

**Blocked by:** 175

**Status:** ready-for-agent

**Branch:** `feature/ios-poc` only. Run from its worktree; this work never lands on `main`.

**Gate:** Both (Rust + frontend).

- [ ] Settings shows the exact commands to publish and unpublish the host (`tailscale serve --bg --https=<port> http://127.0.0.1:<port>`, the matching `off` command, and `tailscale serve status`), with a port outside 443, 8443 and 10000 (the Funnel ports) and different from t3code's
- [ ] The tailnet host name (configured in Settings) is added to the Host allowlist, and `https://<name>:<port>` to the Origin allowlist used by the WebSocket and assets
- [ ] Identity fails closed. A request is local only when its Host is `127.0.0.1:<port>` and it carries no proxy markers (`X-Forwarded-For`, `X-Forwarded-Host`, `X-Forwarded-Proto`, any `Tailscale-*` header). Every other request (page, WebSocket upgrade, assets) must carry `Tailscale-User-Login` equal to the owner login configured in Settings, otherwise 403. This also rejects Funnel traffic, which carries no identity header
- [ ] Tests for the identity rule: local request allowed; proxied request with the right login allowed; with a wrong or missing login 403; proxied request whose Host was rewritten to `127.0.0.1:<port>` still needs the login
- [ ] When the WebSocket closes or a call times out, the app shows a "Disconnected from the Mac" banner with a reload action; it does not keep the UI looking live
- [ ] `docs/REMOTE-ACCESS.md`: setup, the Certificate Transparency note (tailnet HTTPS names are public in CT logs), how to revoke (`serve off`, toggle off)
- [ ] ADR for the in-app remote host (loopback only, Serve as the route, Tailscale identity as the auth for phase 1)

## Owner check (not an acceptance criterion; recorded here after delivery)

On the iPhone (iOS 27) and the iPad: the URL loads the app; the WebSocket connects through Serve (`wss://`); record the Host and the identity headers that reach the host on a non-443 Serve port (log them in debug mode); lock the phone for 5 minutes, unlock, and record what happens.

## Notes

- Owner answers 2026-11-02: t3code is reached through `tailscale serve` with HTTPS (tailnet HTTPS is already on), iOS 27 with Tailscale working.
- UNVERIFIED until the owner check: that Serve accepts a non-443 HTTPS port and forwards the identity headers there (https://tailscale.com/kb/1312/serve). If the header is missing, stop and ask the owner: the fallback is a one-time pairing token kept in a cookie (proposal 4.4, deferred).
