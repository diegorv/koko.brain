# LAN Sync MVP — Discovery + One-Shot Push

Smallest end-to-end useful slice of LAN sync: see peers on the LAN, pair with one via TOFU + 6-word fingerprint confirmation, push a folder over Noise XX (mutual auth + forward secrecy + AEAD).

Branch: `claude/lan-sync-mvp`. Full original plan: `/Users/diegorv/.claude/plans/valiant-foraging-mccarthy.md`.

## Status

23 commits on the branch. Build green: full Rust suite + 159 frontend tests + svelte-check 0 errors. Two-PC manual smoke not yet completed end-to-end — pending post-H5 retest.

## Original 12-stage build (DONE)

- [x] Stage 0: Integration seams (Rust plugin mount + frontend factory). `6a1e75ad`.
- [x] Stage 1: Identity + BIP-39 wordlist + fingerprint. `d0caa2fc`.
- [x] Stage 2: peers.json trust store with atomic CRUD. `4692ddf6`.
- [x] Stage 3F-1: Frontend types + reactive store. `a11091b1`.
- [x] Stage 4: Typed event payloads (Rust). `0dd389e1`.
- [x] Stage 5: mDNS announce + browse + first 6 commands. `efb02610`.
- [x] Stage 6: Noise XX transport. `50359268`.
- [x] Stage 7: One-shot folder push with atomic apply + 3-layer receiver traversal defense. `a3570dbc`.
- [x] Stage 8: Pairing + push commands with inbound dispatch loop. `e4556113`.
- [x] Stage 3F-2: Frontend service layer with mockable transport. `1b0ef801`.
- [x] Stage 3F-3a: LanSyncSettings.svelte component + tests. `764c38cb`.
- [x] Stage 3F-3b: PairingPrompt.svelte component + tests. `af1b5553`.
- [x] Stage 3F-3c: PushFolderDialog.svelte component + tests. `8596e17b`.
- [x] Stage 9: Wire frontend service to real Tauri backend (rolled into 3F-2 via `createTauriTransport`). `1b0ef801`.
- [x] Stage 10: Mount plugin into settings dialog + file-explorer context menu. `f762005d`.
- [x] Stage 11: Rewrite docs/lan-sync.md to MVP scope. `a36d51fd`.
- [ ] Stage 12: Manual smoke matrix on two physical macOS PCs. STILL PENDING — see "How to resume" below.

## Post-build hotfixes (DONE)

After Stage 10, an audit of the LAN sync stack surfaced 25 functional issues. Six waves of hotfixes have landed so far. See the audit summary inside this file under "Remaining audit findings" for what's left.

- [x] H1 — Hoist plugin commands into central `invoke_handler`. Stage 5's agent had registered commands inside `tauri::plugin::Builder` which namespaces them as `plugin:kokobrain-sync|<cmd>` and requires a permissions/capabilities config that didn't exist. Smoke surfaced "Command not found" for every `lan_sync_*` invoke. Moved the 8 commands into `lib.rs`'s central `generate_handler!` list. `a7a8ac12`.
- [x] H1.5 — Multi-interface announce (`enable_addr_auto`) + discovery diagnostic logging + `lan_sync_debug_dump` Tauri command. `68af659d`.
- [x] H1.7 — Always-on browse so peers appear without a separate user action. The mDNS browser was never started anywhere; the discoverable toggle only ran the announcer. `lanSyncPlugin.init` now also calls `service.startBrowse(vaultPath)`. `a4a96dbf`.
- [x] H2 — Unify on Ed25519 fingerprint via post-handshake binding proof. Fixes audit #1 + #3 + #4. mDNS / UI / peers.json carried Ed25519 fingerprints but `transport::open_to` pinned X25519. Two-PC pair always failed `PeerMismatch`. Added post-handshake `IdentityProof` exchange (Ed25519 sig over Noise X25519 static) + `Session::remote_ed25519_pub` accessor. `peers.json` now stores Ed25519 public keys. `trust::load` self-heals legacy records. `54bccba2`.
- [x] H3 — Split `lan_sync_pair_with_peer` into explicit initiator + responder commands. Fixes audit #2 + #12. PairingPrompt Accept was driving initiator mode (opened a new TCP back to the requester) instead of replying via the stashed session. New `lan_sync_respond_to_pair(vault_path, request_id, accept)` command and a 4-arg `pairWithPeer` (no `accept` flag). `d18d97af`.
- [x] H4 — Sender-side path validation closes `.kokobrain` leak + traversal. Fixes audit #16 + #17. `validate_sender_source_rel_path` + `validate_sender_target_rel_path` + canonical containment check in `lan_sync_push_folder` before any network I/O. `plan_push` blocks `.kokobrain`/`.git`/`node_modules` as the source root. `6408384d`.
- [x] H5 — Toggle robustness: bind-first, vault-switch restart, atomic teardown. Fixes audit #5 + #6 + #7 + #10. Two new `SyncState` slots (`announcer_vault`, `browser_vault`) track which vault each subsystem was started against. `set_discoverable(true)` binds TCP before announcer registration; `set_discoverable(false)` tears BOTH announcer + accept loop down even on partial failure; `start_browse` restarts on vault switch. `lanSyncPlugin.shutdown` also calls `service.setDiscoverable(lastVaultPath, false)` so the previous vault stops broadcasting on vault close. `9b8017d3`.

## Remaining audit findings (TO DO)

Source: post-H1 integration audit + cavecrew-reviewer pass. Severities use the original audit's letters. Already-fixed findings (#1-#7, #10, #12, #16, #17) are crossed out below; this is the leftover list. Estimates are LOC including tests.

### H6 — Peer + pair lifecycle gaps (~150 LOC)

- [ ] **#8 [HIGH] No peer-removed event.** `discovery.rs::Browser` logs `ServiceRemoved` but never emits to the frontend. Stale peers stay in `lanSyncStore.discoveredPeers` forever. The store already has `removeDiscoveredPeer(fp)` but nothing calls it. Documented smoke step 4 ("Stop discovery on A → A disappears from B's discovered list within ~30 s") cannot pass.
  - Add `PeerRemovedPayload { fingerprintHex }` + `EVT_PEER_REMOVED` + `emit_peer_removed` to `events.rs`.
  - Extend `Browser::start` to take a second callback `on_peer_removed(fingerprint_hex)`. Maintain a `HashMap<fullname, fingerprint_hex>` inside the consumer thread, populated on `ServiceResolved`, consumed on `ServiceRemoved`.
  - Wire `lan_sync_start_browse` to call `events::emit_peer_removed` from the new callback.
  - Frontend `service.init` adds a 6th listener for `lan-sync:peer-removed` that calls `lanSyncStore.removeDiscoveredPeer(payload.fingerprintHex)`.
  - Tests: events_test contract pin, browser callback wiring, service listener mapping.

- [ ] **#11 [HIGH] `pending_pair_sessions` entries never time out.** `dispatch.rs::handle_inbound_connection` inserts an entry then awaits the responder oneshot forever. If the user closes the modal without clicking Accept/Reject, the dispatcher task hangs in `rx.await` and the entry stays in the map. Resource leak under retry storms.
  - Wrap the `rx.await` in `tokio::time::timeout(Duration::from_secs(60), rx)`.
  - On timeout: send `PairResponse { accepted: false, reason: "user-timeout" }` over the session, remove the entry from the map, close.
  - Tests: integration test simulating the no-response case.

- [ ] **#15 [MED] Receiver side has zero UI feedback on incoming push.** `dispatch.rs::handle_push_intent` emits `push-progress` + `push-complete` on the responder, but `PushFolderDialog.svelte` only matches `peerFingerprint === peerFingerprintHex` (the locally-selected dropdown). Files arrive, no toast, no notification. Documented behaviour ("Files appear at B's target path") is invisible to the receiver.
  - Add a separate `EVT_PUSH_RECEIVED { peerFingerprint, peerFingerprintDisplay, filesReceived }` event for the responder side.
  - Dispatch emits it after `receive_folder` succeeds.
  - Frontend service listens for it and shows a toast via svelte-sonner: "Received N files from {fingerprintDisplay}".

### H7 — Robustness polish (~100 LOC)

- [ ] **#9 [HIGH] Discoverable toggle defaults to `false` ignoring backend state.** `LanSyncSettings.svelte:24` initialises `let discoverable = $state(false)`. After H5 the announcer can survive across panel re-opens (vault switch); the switch then visually lies. Hydrate from `lan_sync_debug_dump.announcerRunning` (already exposed via `service.debugDump`) inside the mount `$effect`.

- [ ] **#13 [MED] `pairWithPeer` clears `pendingPair` in its finally regardless of mode.** Today harmless because H3 already restricted clearing to `respondToPair`. Verify the H3 change is durable in `lan-sync.service.ts:214-236` — if not, restore the guard.

- [ ] **#14 [MED] `respond_to_pair` writes trust + emits `peer-trusted` BEFORE the dispatcher's wire ACK is sent.** Asymmetric state possible: local accepts, remote never sees the ACK. Either:
  - Await dispatcher confirmation that the ack was sent before persisting + emitting locally, or
  - Write a `pending_trust` marker first, finalise after the dispatcher confirms.

- [ ] **#18 [MED] `service.init` unlisten → re-listen race window drops events.** Between the 5 unlistens and the 5 fresh listens (each is an awaited IPC round-trip), backend events can arrive without a handler. Vault switch with an active inbound pair could lose the `pairing-incoming` event. Fix: attach the new listeners FIRST, then tear down the old ones; or skip re-listening when the new vaultPath equals the previous one.

- [ ] **#19 [MED] Double-fetch identity + trust at panel mount.** `+layout.svelte` runs `lanSyncPlugin.init(vaultPath)` which fetches identity + trust; `LanSyncSettings.svelte:33-47` $effect ALSO calls them. Either drop the panel-level $effect or guard it strictly on `lanSyncStore.myFingerprint === null && lanSyncStore.trustedPeers.length === 0`.

- [ ] **#20 [MED] No two-phase commit on pair.** A persists peer after reading `PairResponse { accepted: true }`; B may have crashed before its own `respond_to_pair` finished writing. Surface asymmetric trust via a manual sanity check on next contact OR add a confirmation round-trip.

- [ ] **#21 [LOW] Switch component controlled-ness verification.** `LanSyncSettings.svelte:50-62` reverts the local state in the catch — depends on the Switch being fully controlled by `checked`. Verify; if it isn't, the toggle visually lies on error.

- [ ] **#22 [LOW] Browser + announcer share-daemon refactor warning.** Today separate daemons; informational only.

- [ ] **#23 [LOW] `tx.listen` registration race.** Tauri 2's `listen` resolves after IPC roundtrip; the 5 sequential awaits create a window where the first listener is active but the rest aren't. Register all 5 in `Promise.all` so they go on the wire in parallel.

- [ ] **#24 [LOW] `enable_addr_auto` interface enumeration blocks the Tauri worker.** Informational; only matters on a machine with dozens of utun*/awdl* interfaces.

- [ ] **#25 [LOW] TS doc drift.** Already covered by H2 commit, but worth a final pass to make sure no `lan-sync.types.ts` JSDoc references the old X25519 surface.

## How to resume

1. Pull origin: `git pull origin claude/lan-sync-mvp`.
2. Re-run the two-PC smoke documented at `docs/lan-sync.md` § "E2E test plan (manual)". Most of the post-H5 hotfixes should already unblock pair end-to-end on two macOS PCs.
3. Diagnostic hooks if smoke surfaces issues:
   - Toggle Rust debug log: `await window.__TAURI__.core.invoke('set_tauri_debug_mode', { enabled: true })` from devtools.
   - Dump runtime: `await window.__TAURI__.core.invoke('lan_sync_debug_dump', { vaultPath: '<path>' })` returns identity + every local IPv4 interface + announcer/browser running flags + `last_seen_addrs`.
   - Tail Rust log on macOS: `tail -f ~/Library/Logs/com.diegorv.kokobrain/<latest>.log | grep sync::`.
4. After smoke passes, work the H6 + H7 backlog above. Each numbered finding becomes its own commit per `docs/COMMITS.md`. The audit list inside `/Users/diegorv/.claude/plans/valiant-foraging-mccarthy.md` contains the original detailed traces if needed.
5. When everything in H6 + H7 is checked off, move this file to `tasks/done/lan-sync-mvp.md` and merge the branch.

## Notes

- Each stage = one commit. NO batching. Full Conventional Commits body (Context/Problem/Solution/Behavior/Files w/ line ranges) per docs/COMMITS.md.
- After every stage: relevant tests pass (Rust → `cargo test`; Frontend → `pnpm check` + `pnpm test`; both → all three) before commit.
- `git diff --cached --stat` before every commit to verify only files in the stage's declared scope are staged.
- Integration seam: only Stage 0 + Stage 10 touch host files outside `src-tauri/src/sync/`, `src-tauri/src/commands/sync.rs`, and `src/lib/plugins/lan-sync/`.
- Reference branch (read-only): `claude/vault-lan-sync-r1D89`. Lift `wordlist.rs`, structure of `identity.rs` / `events.rs` / `discovery.rs`, and the 3-layer path-traversal defense from its `docs/lan-sync.md`.
- Hotfix H1 (post-Stage 10): Stage 5 mistakenly registered the commands inside a Tauri 2 plugin builder, which namespaces them as `plugin:kokobrain-sync|<cmd>` and additionally requires permission + capability config. Smoke testing surfaced "Command not found" for every `lan_sync_*` invoke. Resolved by hoisting the 8 commands into the central `tauri::generate_handler!` list in `lib.rs`; `sync::init` now returns `Builder<R> -> Builder<R>` and only manages `Arc<SyncState>`. Frontend invokes unchanged.
