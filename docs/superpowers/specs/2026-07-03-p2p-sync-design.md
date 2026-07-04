# P2P Vault Sync — Design

Sync files between two computers running Kokobrain on the same LAN, peer to peer, with no server and no broadcast. Each instance chooses which vault folders it exposes; each instance chooses which of the peer's exposed folders it subscribes to. On conflict, the local version wins. All traffic is encrypted and indistinguishable from random bytes on the wire.

## Decisions (agreed with the user)

| Topic | Decision |
|---|---|
| Network scope | Same LAN only. Direct TCP, no NAT traversal, no relay. |
| Pairing | High-entropy pairing key generated on one machine, copy-pasted once into the other. It is the Noise PSK. |
| Granularity | Vault folders. Expose folders; peer subscribes to exposed folders. |
| Timing | Manual only: a "Sync now" button. No background sync. |
| Deletions | Never propagated. Sync is additive (create/update only). |
| Conflicts | Local wins. The losing remote version is saved next to the file as a conflict copy. |
| Discovery | Manual `ip:port` entered once and persisted. Zero broadcast (no mDNS). |
| Transport/crypto | Direct TCP + Noise Protocol (`snow` crate), pattern `XXpsk3`. |

## Model: pull-only sessions

"Sync now" on machine A connects to machine B and writes **only to A's disk**. The listener side is strictly read-only — it serves folder listings, manifests, and file contents; it never writes. For B to receive A's changes, the user clicks "Sync now" on B. A full two-way sync is one click on each machine.

Consequences:

- The server's attack surface is read-only access to explicitly exposed folders.
- "Local wins" is trivial: the only writer is the machine whose user initiated the sync.
- For a folder to flow both ways, both machines must expose it and both must subscribe to the other's exposure. This matches the requirement: each side chooses what it exposes and what it consumes.

## Architecture

### Rust — new module `src-tauri/src/sync/`

| File | Responsibility |
|---|---|
| `protocol.rs` | Message enum serialized with `rmp-serde` (already a dependency); 4-byte little-endian length-prefixed framing. |
| `noise.rs` | Noise `XXpsk3` handshake via the `snow` crate; PSK derived from the pairing key. Wraps the TCP stream into an encrypted transport. Noise transport messages cap at 65535 bytes, so file content is chunked at ≤ 60 KB. |
| `server.rs` | Tokio `TcpListener` started/stopped by command. Handles one connection at a time. Read-only: answers `ListShares`, `GetManifest`, `GetFile`. |
| `engine.rs` | The puller. Builds local and remote manifests, applies the decision table, downloads with hash verification, writes atomically (temp file + rename). |
| `state.rs` | Per-(peer, relative path) sync state persisted as JSON at `<vault>/.kokobrain/sync-state.json`. |

New Tauri commands in `src-tauri/src/commands/sync.rs`: `sync_generate_pairing_key`, `sync_start_listener`, `sync_stop_listener`, `sync_status`, `sync_list_remote_shares`, `sync_now`. Configuration is passed as command parameters; the source of truth is the frontend vault settings (same `loadSettings`/`saveSettings` flow as today). `sync_now` returns a summary `{ downloaded, conflicts, skipped, errors }`.

New Cargo dependencies: `snow` (Noise), plus the `net` feature on the existing `tokio` dependency. Exact versions verified against crates.io at implementation time.

### Frontend — `src/lib/plugins/sync/`

| File | Responsibility |
|---|---|
| `sync.store.svelte.ts` | Reactive state: listener status, peer config, exposed folders, subscriptions, last sync summary. Getter-based access (no `$derived`), per project convention. |
| `sync.service.ts` | Wraps the Tauri commands in try/catch, updates the store, surfaces errors to the caller. |
| `SyncSection.svelte` | Settings section, registered in `SettingsPanel` alongside the existing sections in `core/settings/sections/`. |

Sync configuration (pairing key, listen port, device name, peer address, exposed folders, subscriptions) lives in the vault `settings.json` via the existing settings store/service.

### Free integration with the rest of the app

Files written by the engine trigger the native notify watcher → `vault-files-changed` → the existing watcher handler updates the Rust `VaultIndex` and the UI reacts through `vaultIndexVersion`. No editor or index integration code is needed.

## Protocol

All messages after the handshake are encrypted. Paths on the wire are **vault-relative** (the two machines have different absolute vault roots). A subscribed folder lands at the same relative path under the local vault root.

```
→ Hello { device_name, protocol_version }   ← HelloAck { device_name, protocol_version }
→ ListShares                                ← Shares { folders: [String] }
→ GetManifest { folder }                    ← Manifest { files: [{ rel_path, size, sha256 }] }
→ GetFile { rel_path }                      ← FileChunk { data }* , FileEnd { sha256 }
→ Bye
```

- `protocol_version` mismatch (major) → both sides close with a clear error.
- A sync session only pulls folders in the intersection of the local subscriptions and the peer's current `Shares` list. A subscription whose folder is no longer exposed is skipped and reported in the summary; it is not deleted locally.
- Manifests cover every file under the exposed folder, any type (markdown, images, attachments), excluding dot-directories.
- Hashing is SHA-256 (`sha2` is already a dependency).

## Decision table

Pure function in Rust, unit-tested exhaustively. Persisted state per (peer, rel_path): `synced` (hash of the last content both sides agreed on) and `seen_remote` (last remote hash observed).

| # | Situation | Action |
|---|---|---|
| 1 | No local file | Download. `synced = seen_remote = remote`. |
| 2 | `local == remote` | Update state only. |
| 3 | `local == synced` and `remote != synced` (only remote changed) | Download remote. `synced = seen_remote = remote`. |
| 4 | `local != synced` and `remote == synced` (only local changed) | Keep local. Peer receives it when it pulls. |
| 5 | Both changed (`local != synced`, `remote != synced`) | **Local wins.** Write the remote version as a conflict copy — only if `remote != seen_remote`, so repeated syncs do not duplicate the copy. Then `seen_remote = remote`. |

First sync with no state and a differing local file falls into case 5 (no `synced` baseline → treated as both-changed).

Conflict copy naming: `<stem> (conflict from <peer device name> <YYYY-MM-DD>).<ext>`, written in the same directory. Never overwrites an existing conflict copy for the same remote hash (guaranteed by the `seen_remote` guard).

Local-only files in a subscribed folder are untouched. Deletions are never propagated in either direction.

## Security

- **Noise `XXpsk3`** with the pairing key as PSK: mutual authentication and forward secrecy. A wrong key fails the handshake before any application data flows.
- **Wire discretion:** handshake and transport bytes are indistinguishable from random data — no TLS ClientHello, no SNI, no protocol banner. The listen port is configurable (a random high port is picked on first enable). No broadcast or advertisement of any kind.
- **Server path validation:** every requested `rel_path` is canonicalized and must resolve inside an exposed folder. Rejects `..`, absolute paths, and symlinks escaping the folder.
- **Client path sanitization:** `rel_path` values from remote manifests are validated with the same rules before any write; entries under dot-directories are ignored.
- **Verified atomic writes:** downloads are hash-checked against the manifest/`FileEnd` value, written to a temp file, then renamed. A failed or truncated transfer never leaves a partial file in the vault.
- **Off by default:** the listener runs only while the "expose" toggle is on.
- **Accepted trade-off:** the pairing key is stored in the vault's `settings.json` like every other setting. It protects the very vault it sits in, so it adds no new at-rest exposure beyond what a vault leak already implies; it does grant network access to exposed folders, which the user accepts for v1 simplicity.

## Settings UI ("Sync" section)

- **Expose:** enable toggle (off by default), device name, local IP + port display when active, "Generate pairing key" + copy button.
- **Peer:** paste field for the pairing key, `ip:port` field. Both persisted.
- **Exposed folders:** add/remove list backed by a vault folder picker.
- **Subscriptions:** "List peer shares" button → checkboxes over the peer's exposed folders; checked = subscribed.
- **Sync now:** button plus last-sync result (time, files downloaded, conflicts, errors).

## Error handling

Per project rules: try/catch in services, propagate to caller, user-facing toast.

| Failure | Behavior |
|---|---|
| Connection refused / timeout | Toast: peer unreachable at `ip:port`. |
| Handshake failure | Toast: pairing key mismatch. |
| Protocol version mismatch | Toast: update the app on both machines. |
| Per-file failure (hash mismatch, I/O) | Recorded in the summary; sync continues with remaining files; no partial writes. |
| Listener bind failure | Error state shown in the settings section. |

## Testing

**Rust** (`cargo test --manifest-path src-tauri/Cargo.toml`):

- Unit: framing round-trip, message serialization, decision table (all 5 cases + first-sync + conflict-copy dedup), path validation (traversal, absolute, symlink escape, dot-dirs), conflict-copy naming.
- Integration: two in-process endpoints over `localhost` TCP with `tempfile` vaults — full handshake + sync session; wrong-PSK handshake must fail; hash-mismatch download must not write.

**Frontend** (`pnpm check` + `pnpm vitest run`):

- `sync.store` getter tests (every computed getter, per project rule).
- `sync.service` tests with mocked `invoke` (Tauri API mocks are allowed) — happy path, empty input, error propagation.

## Out of scope (v1)

- Internet sync / NAT traversal, more than one paired peer, background or automatic sync, deletion propagation, mDNS discovery, per-file sharing granularity, rename detection (a rename syncs as a new file; the old name persists on the peer per the no-deletion rule).
