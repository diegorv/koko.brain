# LAN Sync

End-to-end encrypted folder sync between Kokobrain vaults on the same local network. Never leaves the LAN, no cloud service, no central server.

## How it works

```
Vault A                              Vault B
  │                                   │
  ├─ mDNS announce ─────────────────► │ (Vault B discovers A)
  │                                   │
  ├─ TCP connect ◄─────────────────── │ Pair handshake
  │                                   │
  │   SPAKE2 over Diceware passphrase │
  │   X25519 ECDH (forward secrecy)   │
  │   Ed25519 signed transcript       │
  │   AES-256-GCM streaming           │
  │                                   │
  ├─ Manifest exchange ──────────────►│
  │◄─ Manifest exchange ──────────────┤
  │                                   │
  ├─ File chunks ───────────────────► │
  │◄─ File chunks ────────────────────┤
```

Architecture detail: `tasks/todo/lan-sync.md` lists the 20 commits that delivered this feature; each commit's body has full implementation rationale.

## Security guarantees

| Property | Mechanism |
|---|---|
| Confidentiality | AES-256-GCM under keys derived from X25519 ephemeral ECDH (forward secrecy) |
| Peer authentication | Ed25519 long-term identity signs the handshake transcript hash |
| Anti-MITM in pairing | SPAKE2 + 7-word Diceware (~77 bits entropy) — passphrase never travels the wire |
| Anti-replay | 96-bit nonce counter per direction; receiver rejects ≤ last-seen |
| Brute-force resistance | 5 failed attempts in 15 minutes → 24 h block (path-traversal weight ×2) |

What is **not** defended:
- Traffic analysis (frame sizes + timing are observable on the LAN).
- Local endpoint compromise (root + Keychain access defeats authentication; same limit as TLS/Signal/SSH).
- Post-quantum attacks (not modelled; not realistic for LAN-only).

## Path traversal defense

Three layers, all required:

1. **Share validation** (`shares.rs::validate_share_config`) — rejects `..`, NUL, absolute, dot-segments, `.encrypted` suffix at share creation.
2. **Inbound message validation** (`sync_engine.rs::validate_inbound_path`) — re-checks the same rules on every `PushUpdate` / `RequestBlock` / `Delete` so a compromised peer cannot smuggle a `..`.
3. **TOCTOU-safe resolve** (`sync_engine.rs::safe_resolve_under_share`) — canonicalises immediately before `File::open`, rejects symlinks pointing outside the share.

The `is_path_exposable` predicate that backs these checks **always** rejects:
- Anything inside `.kokobrain/`, `.git/`, `.obsidian/`, `.claude/`, etc. (any segment starting with `.`).
- Any file ending in `.encrypted` (encrypted-notes payloads are useless to peers anyway).
- Anything with `..`, NUL, an absolute prefix, or a Windows drive letter.

These rules cannot be bypassed via configuration. Listing `.kokobrain` in an exclude list (root-with-excludes mode) is redundant — already denied.

## Two share modes

### 1. Subfolder (allowlist)

Expose one specific subdirectory. Recommended when you want strict isolation — only the chosen folder is visible to the peer.

```
Vault A                  Share config
├─ Projects/             { mode: "subfolder",
│   ├─ sync-test/   ◄────  localPath: "Projects/sync-test" }
│   └─ private/   ◄────── NOT exposed
└─ Personal/  ◄────────── NOT exposed
```

### 2. Vault root with exclusions (denylist)

Expose everything except the folders you list. Recommended when most of the vault is already generic and only a few folders are device-specific.

```
Vault A                  Share config
├─ Projects/      ◄───── exposed   { mode: "root-with-excludes",
├─ Outras/        ◄───── exposed     excludes: ["Trabalho", "Pessoal"] }
├─ Trabalho/      ◄────  NOT exposed
├─ Pessoal/       ◄────  NOT exposed
└─ .kokobrain/    ◄────  NOT exposed (hard-deny, always)
```

Caveat: **a new top-level folder you create later will be synced automatically** unless you add it to the excludes list first. Pick mode 1 if that worries you.

## OS-specific setup

### macOS 14 Sonoma+

The first time you toggle "Make this vault discoverable" or click "Pair new device", the OS shows a Local Network Privacy alert. Tap **Allow** so the app can use mDNS + private network sockets.

If you accidentally tap **Don't Allow**:
- System Settings → Privacy & Security → Local Network → toggle Kokobrain ON.
- The app must be restarted after this change.

The bundle ships with:
- `NSLocalNetworkUsageDescription` in `Info.plist` (the explanatory text shown in the alert).
- `NSBonjourServices = [_kokobrain-sync._tcp]` whitelisting our service type (required from macOS 14 onward).
- Hardened Runtime entitlements `com.apple.security.network.client` + `network.server`.

### Windows 10+

First run of `pnpm tauri dev` or the production app triggers a Windows Defender Firewall dialog. Pick **Private networks** and click **Allow access**. Do NOT pick "Public networks" unless you specifically want to expose sync on untrusted Wi-Fi.

If you missed the dialog: Settings → Privacy & Security → Firewall → Allowed apps → enable Kokobrain on Private networks.

### Linux

No system permission prompt. Make sure your firewall (ufw/firewalld/iptables) allows inbound TCP on the ephemeral port the LAN sync server binds to. The port is logged via `appendLog('LAN-SYNC', ...)` and visible in the activity log.

The `mdns-sd` crate uses pure-Rust mDNS; it does **not** require Avahi to be running.

## Pairing two devices

1. **Vault A (host)** — open settings → LAN Sync → toggle **Make this vault discoverable** ON.
2. **Vault A** — click **Pair new device** → **Show passphrase**. A 7-word phrase appears.
3. **Vault B (guest)** — open settings → LAN Sync → **Pair new device** → **Enter a passphrase**. Pick A from the discovered peers list, type the 7 words separated by hyphens or spaces.
4. **Both sides** — the app displays a 16-hex-char fingerprint. **Read both screens side by side. They must match exactly.** Tap **Confirm** on both.
5. The peer is added to the trust store; future reconnects skip the passphrase entirely.

If the fingerprints **don't** match: tap **Reject**. Someone may be performing a MITM attack on your LAN.

If you mistype the passphrase: the app reports `incorrect passphrase` after a moment. Try again — there's no penalty for one wrong attempt, but 5 wrong attempts in 15 minutes will trigger a 24 h block (visible in **Blocked attempts**).

## Creating a share

1. Settings → LAN Sync → **Add share**.
2. Pick mode (Subfolder or Vault-with-excludes).
3. Subfolder: pick a path. Vault-with-excludes: type one folder name per line in the textarea.
4. Check the boxes for trusted peers allowed to subscribe.
5. Direction: **Bidirectional** (most common), **Push only** (peer is read-only mirror), or **Pull only** (this device mirrors peer's content).
6. **Create share**.

The share immediately starts syncing — the engine builds the manifest, ships it to allowed peers, and they request the file blocks they don't yet have.

## Conflict files

If both devices edit the same file while disconnected, both versions cannot win. The Lamport+mtime tiebreaker picks one as the canonical version and saves the **loser** as a sibling file:

```
Projects/sync-test/note.md                                ← winner
Projects/sync-test/note.conflict-A1B2C3D4-20260512143000.md  ← loser
```

The conflict file is exactly the old local content; nothing is destroyed. Open both side by side and merge manually.

You'll see a toast notification when a conflict file is saved. The status-bar indicator turns amber for ~60 s.

## E2E test plan

End-to-end testing requires real network sockets and is only meaningful in the desktop binary, not in vitest / cargo unit tests. Run on a Mac (preferred) or Linux desktop with two checkouts:

```sh
git clone <repo> /tmp/koko-a
git clone <repo> /tmp/koko-b
cd /tmp/koko-a && pnpm install
cd /tmp/koko-b && pnpm install
mkdir -p /tmp/vault-a/Projects/sync-test
mkdir -p /tmp/vault-b/Projects/sync-test
echo "alpha" > /tmp/vault-a/Projects/sync-test/note.md

# Terminal 1
cd /tmp/koko-a && pnpm tauri dev
# Open /tmp/vault-a in the app.

# Terminal 2 — set LAN_SYNC_TEST_PORT_OFFSET so the two instances'
# loopback announce instances don't collide.
LAN_SYNC_TEST_PORT_OFFSET=1000 cd /tmp/koko-b && pnpm tauri dev
# Open /tmp/vault-b in the app.
```

Verification matrix:

| # | Action | Expected |
|---|---|---|
| 1 | A: discoverable ON; B: Pair → see A in list | B sees A's fingerprint |
| 2 | B: pick A, type the passphrase A shows | Both see same fingerprint |
| 3 | Both: Confirm | Trusted peer added on both sides |
| 4 | A: Add share `Projects/sync-test`, allow B | B sees `note.md` containing `alpha` |
| 5 | A: edit `note.md` to `beta`, save | B's `note.md` becomes `beta` within ~1 s |
| 6 | Stop B; A: edit to `gamma`; B (offline): edit to `delta`; restart B | One wins, other becomes `.conflict-<peer>-<ts>.md` |
| 7 | DevTools console in A: `invoke('lan_sync_add_share', { vaultPath: '/tmp/vault-a', request: { mode: 'subfolder', localPath: '.kokobrain', allowedPeerFingerprints: [], direction: 'bi' } })` | Error — share rejected by `validate_share_config` |
| 8 | A: create `Outras/secret.encrypted` | NOT pushed to B (hard-deny rule) |
| 9 | Run 5 invalid pairings on A from B with random passphrases | After the 5th attempt, B sees `Blocked attempts` row for A in its settings panel |
| 10 | Sniff the LAN with Wireshark on port range | Encrypted gibberish only; no plaintext paths or content |

## Troubleshooting

**"LAN sync not available"** in toast on a discoverable-toggle: the live network wiring (mDNS + TCP listener) is not yet present in this build — see the `Task 15 follow-up` TODOs in `tasks/todo/lan-sync.md`. Until then the UI is functional but actions that drive sockets return early. The store / settings layer still persists choices correctly.

**Discovery doesn't find the peer on macOS**: System Settings → Privacy & Security → Local Network → ensure Kokobrain is allowed. Restart the app after toggling.

**Pairing passphrase rejected**: ensure both devices type **exactly the same words in the same order**. Whitespace and hyphens are interchangeable; case is ignored. If unsure, copy/paste from the host.

**Conflict file keeps recurring**: probably your two devices' clocks are way out of sync, breaking the mtime tiebreaker. Run NTP on both ends.

## Follow-ups

`tasks/todo/lan-sync-followups.md` lists items deliberately deferred from the MVP:

- Don't overwrite open editor buffer with inbound update
- Size limits (DoS guard)
- Per-share pause toggle
- Bandwidth throttle
- Audit log retention configurable
- Backup / restore identity Ed25519 key
- Schema migration framework for `state.sqlite`
- Bytes-transferred stats per share per peer
- 3+ peers in one share (model permits, untested)
- Automatic recovery from corrupted `state.sqlite`
- Async live wiring: mDNS announce/browse loops, TCP accept_loop, SPAKE2 pairing over the wire, keepalive Ping/Pong loop, reconnect backoff. The protocol primitives are all in place — the next commit just needs to glue them through the Tauri commands marked with `TODO(lan-sync live)`.
