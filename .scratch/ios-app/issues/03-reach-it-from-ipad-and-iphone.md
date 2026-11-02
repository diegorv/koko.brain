# 03: Reach it from iPad and iPhone over the tailnet

**What to build:** The owner opens `https://<mac>.<tailnet>.ts.net:<port>` in Safari on the iPad or iPhone and gets the Kokobrain app served by the Mac, through Tailscale Serve, on a port separate from the one t3code already uses. Only the owner's own Tailscale login gets in. When the phone locks or the connection drops, the app says so and offers a reload instead of silently failing.

**Blocked by:** 01

**Status:** ready-for-agent

**Gate:** Both (Rust + frontend), plus the owner's device check below.

- [ ] Settings shows the exact commands to publish and unpublish the host (`tailscale serve --bg --https=<port> http://127.0.0.1:<port>`, the matching `off` command, and `tailscale serve status`), with a port outside 443, 8443 and 10000 (the Funnel ports) and different from t3code's
- [ ] The host accepts the tailnet host name (configured in Settings) in its Host allowlist
- [ ] On the tailnet host name, every request (page, WebSocket, assets) must carry a `Tailscale-User-Login` header equal to the owner login configured in Settings; a missing or different login gets 403. This also rejects Funnel traffic, which carries no identity header
- [ ] When the WebSocket closes or a call times out, the app shows a "Disconnected from the Mac" banner with a reload action; it does not keep the UI looking live
- [ ] `docs/REMOTE-ACCESS.md`: setup, the Certificate Transparency note (tailnet HTTPS names are public in CT logs), how to revoke (`serve off`, toggle off)
- [ ] ADR for the in-app remote host (loopback only, Serve as the route, Tailscale identity as the auth for phase 1)
- [ ] Owner device check, recorded here: on the iPhone (iOS 27) and the iPad, the URL loads the app; the WebSocket connects through Serve (`wss://`); the identity header is present on a non-443 Serve port; lock the phone for 5 minutes, unlock, and record what happens

## Notes

- Owner answers 2026-11-02: t3code is reached through `tailscale serve` with HTTPS (so tailnet HTTPS is already on), iOS 27 with Tailscale working.
- UNVERIFIED until the device check: that Serve accepts a non-443 HTTPS port and forwards the identity headers there (https://tailscale.com/kb/1312/serve). If the header is missing, stop and ask the owner: the fallback is a one-time pairing token stored in a cookie (proposal 4.4, deferred).
- Can run in parallel with 02: with only 01 merged the device sees the not-connected state, which is enough to prove the route.
