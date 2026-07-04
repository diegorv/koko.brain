# P2P Vault Sync

Sync vault folders between two Kokobrain instances on the same LAN over direct TCP encrypted with Noise (XXpsk3, `snow`), pull-only, local-wins conflicts with conflict copies, no deletion propagation.

Spec: `docs/superpowers/specs/2026-07-03-p2p-sync-design.md`
Full step-by-step plan (code included): `docs/superpowers/plans/2026-07-03-p2p-sync.md`

## Tasks

- [ ] Task 1: Cargo deps (snow/getrandom/serde_bytes, tokio net+sync+time) + wire protocol `sync/protocol.rs` (Msg enum, framing)
- [ ] Task 2: Pairing key + Noise XXpsk3 channel `sync/noise.rs`
- [ ] Task 3: Persisted sync state `sync/state.rs` (`.kokobrain/sync-state.json`)
- [ ] Task 4: Rel-path validation + hashing + folder manifest `sync/manifest.rs`
- [ ] Task 5: Local-wins decision table + conflict-copy naming `sync/decision.rs`
- [ ] Task 6: Read-only listener `sync/server.rs` + `tests/sync_server_test.rs`
- [ ] Task 7: Pull engine `sync/engine.rs` + `tests/sync_e2e_test.rs`
- [ ] Task 8: Tauri commands `commands/sync.rs` + lib.rs registration
- [ ] Task 9: Frontend settings plumbing (SyncSettings, defaults, updateSync, merge-on-load)
- [ ] Task 10: `plugins/sync/sync.store.svelte.ts` + tests
- [ ] Task 11: `plugins/sync/sync.service.ts` + tests
- [ ] Task 12: `SyncSection.svelte` + panel registration + app-lifecycle wiring
- [ ] Task 13: Docs (CLAUDE.md plugins list) + move this file to tasks/done/

## Notes

- One commit per task, immediately after its tests pass (rule 6: Rust tasks → cargo test; frontend tasks → pnpm check + pnpm vitest run; mixed → all three).
- The `SettingsSection` union gains `'sync'` only in Task 12 (with the panel icon map), otherwise `pnpm check` breaks in Task 9.
- Pull-only model: the listener never writes; all writes happen on the machine whose user clicked Sync now.
- Dependency versions verified on crates.io 2026-07-03: snow 0.10.0, getrandom 0.4.3, serde_bytes 0.11.19.
