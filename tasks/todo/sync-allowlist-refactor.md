# Refactor Sync: Excluded Paths → Allowed Paths (Allowlist)

## Context

The LAN sync feature currently uses an **exclusion model** (`excluded_paths`) where everything syncs by default and users exclude specific paths via glob patterns. The user wants to invert this to an **allowlist model** (`allowed_paths`) where only explicitly listed paths are synced. This gives users tighter control over what leaves their machine.

**Key design decision:** Hardcoded system exclusions (db files, trash, etc.) and `.noted/` allowlist entries (`vault-id`, `settings.json`) remain unchanged — they're essential for sync infrastructure and are separate from user-configured paths.

**Empty allowlist behavior:** When `allowed_paths` is empty, no user files sync. System files (`vault-id`, `settings.json`) still sync since they're handled by a separate code path.

## Tasks

- [ ] Task 1: Rename `excluded_paths` → `allowed_paths` in Rust `SyncLocalConfig` struct and persistence functions
  - `src-tauri/src/sync/crypto.rs`: Rename field in `SyncLocalConfig` (line 55), update default (line 75), update serde
  - `src-tauri/src/sync/crypto.rs`: Update `load_sync_local_config` / `save_sync_local_config`
  - Tests in `sync_crypto_test.rs`: Update config field references

- [ ] Task 2: Invert filtering logic in `manifest.rs` — `is_excluded()` → `is_allowed()`
  - `src-tauri/src/sync/manifest.rs`: Rename `is_excluded()` → `is_allowed()` (line 83), invert logic:
    - Hardcoded excludes still reject (return false)
    - If `allowed_paths` is empty → return false (nothing allowed)
    - If path matches any allowed glob → return true
    - Otherwise → return false
  - Update `build_manifest()` (line 128): Change filter from `!is_excluded()` to `is_allowed()`
  - Tests in `sync_manifest_test.rs`: Rewrite `is_excluded_*` → `is_allowed_*`, update `build_manifest` test

- [ ] Task 3: Rename in engine state and sync cycle
  - `src-tauri/src/sync/engine.rs`:
    - Rename `excluded_paths` field in `EngineState` (line 142) → `allowed_paths`
    - Rename `reload_excluded_paths()` (line 262) → `reload_allowed_paths()`
    - Update sync cycle: lines 570-571, 590-593, 752 — use `is_allowed()` instead of `!is_excluded()`
  - `src-tauri/src/sync/server.rs`: Update `handle_manifest_request` (line 485) field access

- [ ] Task 4: Update Tauri commands
  - `src-tauri/src/commands/sync.rs`:
    - `save_sync_local_config`: rename hot-reload call to `reload_allowed_paths()` (line 152)
    - Comments referencing "excluded"

- [ ] Task 5: Update frontend store, service, and tests
  - `src/lib/features/sync/sync.store.svelte.ts`: Rename `excludedPaths` → `allowedPaths`, `setExcludedPaths` → `setAllowedPaths`
  - `src/lib/features/sync/sync.service.ts`: Update `loadSyncLocalConfig` and `saveSyncLocalConfig` to use `allowed_paths`
  - `src/tests/lib/features/sync/sync.store.test.ts`: Update test names and assertions
  - `src/tests/lib/features/sync/sync.service.test.ts`: Update mock data and assertions

- [ ] Task 6: Run all tests and verify
  - `cargo test --manifest-path src-tauri/Cargo.toml`
  - `pnpm check && pnpm vitest run`

## Notes

- The JSON field in `.noted/sync-local.json` changes from `excluded_paths` to `allowed_paths` — this is a breaking change for existing sync configs, but sync is still in development so no migration needed.
- `HARDCODED_EXCLUDES` and `NOTED_DIR_ALLOWLIST` remain untouched — they protect system files regardless of user config.
- The receiver-side filter in `engine.rs` (line 593) also inverts: only accept incoming files that match local `allowed_paths`.
