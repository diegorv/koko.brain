# LAN sync (MVP)

End-to-end encrypted folder push between Kokobrain vaults on the same local network. Discovery via mDNS, manual pairing with visual fingerprint check, then one-shot directory transfer over a Noise XX channel. Threat model: safe for use on a private home LAN with mutually-trusted devices.

## How it works

- Discovery: mDNS announce + browse on `_kokobrain-sync._tcp.local.`. The TXT record carries the device's 16-char fingerprint hex and a protocol version.
- Pairing: TOFU. Both devices show the same 6-word BIP-39 fingerprint phrase derived from `SHA-256(peer_static_pub)`; the user visually confirms both screens match before accepting.
- Transfer: Noise XX over TCP for mutual authentication against pinned static keys. AES-GCM AEAD frames with a 4-byte big-endian length prefix, 8 MiB max per frame.

## Security model

- Each install has one persistent Ed25519 identity stored as the raw 32-byte secret seed at `<vault>/.kokobrain/identity.key`. On Unix the file is `chmod 0600`; writes go through a temp file + atomic rename.
- The Noise XX static keypair is derived deterministically from that identity by hashing the Ed25519 secret with SHA-256 and applying the RFC 7748 X25519 scalar clamp. One key file, one fingerprint surface across discovery and transport.
- Pairing pins the peer's static public key in `<vault>/.kokobrain/peers.json` (also `chmod 0600` on Unix, atomic temp + rename). Records carry the base64 public key, the fingerprint hex, the 6-word display form, and an optional friendly name.
- Every connection runs Noise XX with `Noise_XX_25519_AESGCM_SHA256`. The initiator pins the expected peer fingerprint hex; the responder consults the trust store. A mismatch aborts the session with `PeerMismatch` before any application data is sent. Fingerprint comparison is constant-time.
- Path-traversal defense on push receivers: every inbound `rel_path` is rejected if it contains `..`, NUL, or an absolute prefix; the final on-disk path is `canonicalize`d and required to `starts_with(vault_root)`. Symlinks are not followed.
- Not in MVP: separate X25519 key file split from the Ed25519 identity, identity backup or rotation, audit log + brute-force throttle, per-share ACLs, conflict resolution, bidirectional sync.

## Pairing two devices

1. On both devices: open Settings, go to the LAN sync tab, toggle "Discoverable" on.
2. On device A: the Discovered list shows device B with its 6-word phrase. Click Pair.
3. On device B: the `PairingPrompt` dialog appears showing the same 6-word phrase plus the matching fingerprint hex.
4. The user confirms the phrase matches on both screens and clicks Accept on B. Either side can Reject to abort.
5. Both devices' trusted lists now show the peer with the pinned public key.

## Pushing a folder

1. Right-click a folder in the file explorer and choose "Send to peer..." (wired in Stage 10).
2. In `PushFolderDialog`, pick a trusted peer from the list.
3. Confirm or edit the target sub-path on the receiver (defaults to the source folder name).
4. Click Push.
5. The progress bar updates from the `lan-sync:push-progress` event (files done / total). On success the dialog auto-closes after 2 seconds; on failure the error stays visible.

## OS permissions

mDNS needs local-network access. Per-OS setup:

- macOS 14+: System Settings, Privacy & Security, Local Network. Toggle Kokobrain on. The OS prompts on first announce; if the prompt is dismissed, restart the app after enabling the toggle.
- Windows 10+: Windows Defender Firewall must allow inbound traffic on the Private profile. The installer registers the rule; if the first-run prompt was missed, re-enable Kokobrain under Settings, Privacy & Security, Firewall, Allowed apps.
- Linux: `avahi-daemon` must be running (`systemctl status avahi-daemon`). `firewalld` or `ufw` must permit UDP 5353 on the local subnet, plus inbound TCP on port 7878 for the push session.

## Known limitations (v2 follow-ups)

- No watcher integration: pushes are manual, one-shot, not background sync.
- No bidirectional sync; pushes overwrite the receiver's files at the target sub-path. No conflict files.
- No resume or partial-transfer support.
- No per-share ACLs; any trusted peer can receive a push.
- No audit log or brute-force throttle.
- No identity backup or rotation flow. Lose `identity.key` and the device must re-pair from scratch with every peer.
- Single TCP port (7878) hardcoded. Only one announce per network interface works cleanly.

## E2E test plan (manual)

Two physical devices on the same LAN:

1. Both devices visible to each other within 5 seconds of toggling Discoverable on.
2. Pair flow: the 6-word phrase matches on both screens, both sides accept, both trusted lists update with the same fingerprint hex.
3. Push a 50-file folder from A to B. Files appear at B's target path with identical SHA-256 to the source; no partial files are visible mid-transfer (atomic apply).
4. Stop Discoverable on A; A disappears from B's Discovered list within ~30 seconds.
5. Attempt a push from a non-paired device: the Noise handshake fails cleanly with `PeerMismatch`, no files are written, no crash.
