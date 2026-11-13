# Remote access (iPad and iPhone over the tailnet)

Kokobrain can serve its own interface, and the vault the desktop has open, to Safari on your iPad or iPhone. The Mac app stays the host: it listens on `127.0.0.1` only, and Tailscale Serve carries the traffic from your tailnet to it. Only your own Tailscale login gets in. The decision and its limits are in [ADR-0038](adr/0038-in-app-remote-host.md).

## Requirements

- Tailscale on the Mac and on each device, signed in to the same tailnet with your login.
- HTTPS certificates enabled for the tailnet (https://tailscale.com/kb/1153/enabling-https). If you already reach t3code through `tailscale serve` over HTTPS, this is done.
- MagicDNS on, so the Mac has a name like `mac.tail1234.ts.net` (`tailscale status` shows it).

## Setup

1. In Kokobrain, open Settings > Browser Access.
2. Pick a port. It must be 1024 or higher and not 8443 or 10000 (the ports Funnel can publish to the internet). It must also differ from every port t3code or anything else already serves: run `tailscale serve status` and pick one not listed. The default is 4747.
3. Enter the Mac's tailnet host name (`mac.tail1234.ts.net`) and your Tailscale login (the email `tailscale status --json` or the admin console shows for you).
4. Turn on "Serve the app to a browser".
5. In Terminal on the Mac, run the publish command Settings shows:

   ```
   tailscale serve --bg --https=<port> http://127.0.0.1:<port>
   ```

   `--bg` keeps it published across reboots until you turn it off.
6. On the iPad or iPhone, open `https://<mac>.<tailnet>.ts.net:<port>` in Safari.

The page needs the Mac app running with a vault open. Changes made on the Mac (edits, new and deleted notes) show up in the page without a reload; an open note follows the Mac only while it has no unsaved edits in the page. If the Mac sleeps, the phone locks for a while, or the tunnel drops, the page shows "Disconnected from the Mac" and keeps trying to reconnect (every 1 s at first, then up to every 30 s). Once it is back it reloads the file tree, the note list and every open note without unsaved edits; the Reload button reloads the whole page instead. Only the vault index, file-change and semantic-progress events reach the page; quick-capture (clipboard), menu and debug-log events stay on the Mac.

## Who gets in

- Requests from the Mac itself on `http://127.0.0.1:<port>` are allowed.
- Every request that came through a proxy (Serve) must carry a `Tailscale-User-Login` header equal to the login in Settings. Serve adds that header for the signed-in user and strips any copy the client sent. Anything else gets 403: another tailnet member, Funnel traffic (no identity header), or any request when no login is set.
- The WebSocket and assets also check the Origin: `http://127.0.0.1:<port>` or `https://<tailnet name>:<port>`.
- Images, audio, video and PDFs in notes load from `/v1/asset/<path in the vault>`. Only those types open in the page; any other file (`.html` and `.svg` included) downloads instead, sandboxed. `.kokobrain/`, other dot-folders and paths outside the vault are refused, and so is any asset request a browser marks as coming from another site or typed into the address bar (`Sec-Fetch-Site` other than `same-origin`). The host does not answer byte-range requests yet, so a video may not play at all in Safari (iOS, iPadOS and the Mac), and where it plays it may not seek.

## Certificate Transparency

Tailnet HTTPS certificates come from Let's Encrypt, and every issued certificate is logged in public Certificate Transparency logs. The Mac's full name (`mac.tail1234.ts.net`) is therefore public, though not reachable from outside your tailnet. Give the Mac a machine name you are fine with being public before enabling HTTPS.

## Revoke

Any one of these closes the route:

- Unpublish the Serve handler: `tailscale serve --https=<port> off`. Check with `tailscale serve status`.
- Turn off "Serve the app to a browser" in Settings. The host stops and ends open sessions; a published Serve handler then has nothing to reach.
- Clear the owner login in Settings: every request through Serve gets 403.

## Troubleshooting

- 403 on the phone: the login in Settings does not match the one Tailscale sends, or the host name differs. With Settings > Troubleshooting > "Tauri debug mode" on, the Mac logs the Host and identity headers of each proxied request (tag `REMOTE`).
- "Port ... is already in use": pick another port in Settings, then rerun the publish command with it (and unpublish the old one).
