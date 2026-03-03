# Sync System Bug Audit & Fixes

Analysis of issues in the LAN sync system between commits `be22be8` and `cccfb02`.
Covers both Rust backend (`src-tauri/src/sync/`) and frontend (`src/lib/features/sync/`, `SyncSection.svelte`).

## Tasks

### High Priority

- [x] Task 1: Fix port change not restarting the sync engine
  - **File:** `src/lib/core/settings/sections/SyncSection.svelte:154-160`
  - **Bug:** `handlePortChange()` only updates `settingsStore.sync.port` — the running engine keeps listening on the old port. Compare with `handleIntervalChange()` (line 143) which correctly calls `updateSyncInterval()` to restart.
  - **Fix:** Add `updateSyncPort()` in `sync.service.ts` (mirrors `updateSyncInterval`): save config → restart engine if running. Call it from `handlePortChange`.

- [x] Task 2: Fix `teardownSync()` resetting store even when `stop_sync` fails
  - **File:** `src/lib/features/sync/sync.service.ts:213-222`
  - **Bug:** `syncStore.reset()` runs unconditionally at line 221, even if `invoke('stop_sync')` threw at line 217. The backend engine may still be running, but frontend state says it's stopped. A subsequent `initSync()` would try to start a second engine.
  - **Fix:** Only call `syncStore.reset()` inside the try block after successful stop. In catch, log but leave `running=true` so the UI reflects the real state.

- [x] Task 3: Fix event listener leak on partial `registerSyncListeners()` failure
  - **File:** `src/lib/features/sync/sync.service.ts:113-170`
  - **Bug:** `Promise.all()` on 9 `listen()` calls — if any one fails, the rest leak because `unlistenFns` is never populated. The catch handler calls `removeSyncListeners()` on an empty array.
  - **Fix:** Register listeners individually with `Promise.allSettled()` or a loop. Store each successful unlisten fn immediately. On failure, clean up only the ones that succeeded.

- [x] Task 4: Fix `lastSyncAt` being cleared during sync progress events
  - **File:** `src/lib/features/sync/sync.service.ts:132-138`
  - **Bug:** `sync:progress` handler calls `syncStore.setStatus({ state: 'syncing', ... })` which replaces the entire status object, clearing `lastSyncAt`. The "Last sync" timestamp disappears from the UI during active sync.
  - **Fix:** Preserve `lastSyncAt` in progress updates: `syncStore.setStatus({ ...syncStore.status, state: 'syncing', peerId: ..., filesTotal: ..., filesDone: ... })`.

- [x] Task 5: Fix `retry_backoff` HashMap never being pruned
  - **File:** `src-tauri/src/sync/engine.rs:143`
  - **Bug:** When a peer disappears (removed from `peers` map via `PeerLost`), its `retry_backoff` entry persists forever. The stale peer pruning in `crypto.rs` only cleans `baseline_manifests` and `last_sync`, not `retry_backoff`. Over time this leaks memory.
  - **Fix:** When handling `DiscoveryEvent::Lost`, also remove the peer's entry from `retry_backoff`. Additionally, prune backoff entries for peers not in `peers` map during `sync_all_peers`.

- [x] Task 6: Fix peer ID using IP:port instead of authenticated UUID
  - **File:** `src-tauri/src/sync/engine.rs:442-443`
  - **Bug:** After authenticating the peer and validating its UUID (line 429-440), the code discards the UUID and uses `format!("{}:{}", candidate.ip, candidate.port)` as peer ID. If a device restarts on a different port, it's treated as a new peer — baseline manifests keyed by the old ID become orphaned, causing unnecessary full re-syncs and conflicts.
  - **Fix:** Use the vault UUID + some stable device identifier as the peer ID, or at minimum use the peer UUID from the session. Update the `SyncPeer` struct and all places that key by peer ID accordingly. Note: the peer UUID is the same for all peers in the same vault, so the peer needs a device-specific identity — consider using the peer's static public key fingerprint.

### Medium Priority

- [x] Task 7: Add guard against concurrent init/teardown on rapid toggle
  - **File:** `src/lib/core/settings/sections/SyncSection.svelte:124-141`
  - **Bug:** No mutex/flag prevents concurrent `initSync()`/`teardownSync()`. Rapid toggling can register duplicate event listeners.
  - **Fix:** Add an `isTransitioning` flag (or similar guard) to `handleToggleSync` — disable the toggle during async operations.

- [x] Task 8: Add error handling to `handleIntervalChange`
  - **File:** `src/lib/core/settings/sections/SyncSection.svelte:143-152`
  - **Bug:** `updateSyncInterval()` can throw (engine restart failure), but the caller has no try/catch. The UI shows the new interval but the engine may have crashed.
  - **Fix:** Wrap in try/catch, revert `settingsStore.updateSync` and show a toast on failure.

- [x] Task 9: Fix baseline deserialization silently dropping errors
  - **File:** `src-tauri/src/sync/engine.rs:594-600`
  - **Bug:** `.and_then(|v| serde_json::from_value(v.clone()).ok())` silently treats corrupt baselines as "no baseline" (first sync), which triggers unnecessary conflicts instead of logging the corruption.
  - **Fix:** Match on the Result, log a warning on `Err`, then fall back to `None`.

- [x] Task 10: Log passphrase check errors instead of silently swallowing
  - **File:** `src/lib/core/settings/sections/SyncSection.svelte:62-63`
  - **Bug:** `.catch(() => { passphraseStatus = 'unknown'; })` discards the error entirely.
  - **Fix:** Add `error('SYNC', 'Failed to check passphrase:', err)` in the catch.

## Notes

### Issues found but NOT included (out of scope / by design)
- **Manifest replay attacks (no nonce):** Would require protocol-level changes. Low risk on LAN.
- **File integrity O(n) search:** Performance concern, not a bug. Could be optimized with a HashMap in a future perf pass.
- **Conflict limit off-by-one:** Temporary `MAX + 1` conflicts is benign.
- **Symlink TOCTOU:** Already mitigated by `O_NOFOLLOW` flag on file open. Defense-in-depth is adequate.

### Verification
For each task:
- **Frontend tasks (1-4, 7-8, 10):** `pnpm check` + `pnpm vitest run`
- **Rust tasks (5-6, 9):** `cargo test --manifest-path src-tauri/Cargo.toml`
- **End-to-end:** Enable sync on two devices on the same LAN, verify peer discovery, file sync, conflict resolution, and engine restart on settings changes.
