# Perf: Persistent VaultIndex on disk (Win 3)

Cold start currently runs a full filesystem walk + parse on every launch — `[FRONT-END:BACKLINKS] buildIndex:scan_vault_v2: 1811.0ms` on the 5,755-note vault. The Rust side breaks down as ~1766 ms for `collect_v2_entries` (disk walk + frontmatter/wikilink/tag/task parsing) and ~30 ms for `VaultIndex.build` (reverse-index construction). Persist the parsed `NoteEntry` set to disk after each successful build, then on the next launch deserialize + reconstruct the reverse indexes from the snapshot (~50-80 ms total) and run a background mtime sweep to reconcile any files that changed while the app was closed. Comparison reference: Tolaria's `~/.laputa/cache/<vault-hash>.json` strategy (see `/Users/diegorv/.claude/plans/analise-esse-projeto-baseado-jolly-stroustrup.md`), adapted to not assume git as the change feed.

Expected saving: ~1.7 s per cold start on the current vault; ~4-5 s once the vault crosses ~15k notes (point at which Win 3 was originally going to be revisited).

## Scope

In: persistent disk cache of `Vec<NoteEntry>` (the source data — reverse indexes are derived at boot via `VaultIndex::build`), schema-versioned format, atomic write, mtime-based reconciliation sweep on boot, watcher-event queueing during sweep, corruption recovery, TS-side bootstrap wiring.

Out: changing the `NoteEntry` shape, persisting any TS-side index, persisting FTS5 / semantic indexes (already on disk via SQLite), any git-aware optimisation (Kokobrain does not assume the vault is a git repo).

## Design summary

### Cache file

- Location: `<app_local_data_dir>/index/<vault-hash>.bincode` (Tauri 2 path API: `app.handle().path().app_local_data_dir()`; resolves to `~/Library/Application Support/com.diegorv.kokobrain/index/` on macOS).
- Key: `<vault-hash>` = first 16 hex chars of `sha256(canonicalize(vault_path))`. Multiple vaults each get their own cache file; switching vaults loads a different snapshot.
- Format: bincode 2.x (new crate dep — fastest pure-binary serde codec, ~5-10× smaller than JSON for this shape, ~1 MB total on the 5755-note vault).
- Schema: a top-level `IndexSnapshot { schema_version: u32, vault_path_hash: String, written_at_secs: i64, entries: Vec<NoteEntry> }`. Reverse indexes are NOT persisted — they are rebuilt at load time via the existing `VaultIndex::build`.

### Schema versioning

- New constant `INDEX_SCHEMA_VERSION: u32` in `src-tauri/src/vault/index_cache.rs`.
- Bumped whenever `NoteEntry` shape changes in any way that affects bincode layout (any field add/remove/reorder/type change).
- On load, mismatched version → log + delete file + fall back to full scan. No migration logic; the cache is always disposable.
- `vault_path_hash` mismatch (e.g. user moved their vault) → same fallback.

### Write path

- After every successful `VaultIndex::build` (full scan from `scan_vault_v2`) and after every `update_entry` call: schedule a debounced disk write.
- Debounce: 5 s quiet window. A second `update_entry` within 5 s cancels and reschedules. Implemented via a `tokio::time::sleep` task that owns a generation counter (matches the pattern used in `src-tauri/src/commands/semantic.rs:25` for embedder unload).
- Atomic write: serialize to `<vault-hash>.bincode.tmp`, fsync the file handle, rename over `<vault-hash>.bincode`. Rename is atomic on POSIX filesystems within the same directory.
- Failure handling: any IO error → log + skip. The in-memory index is untouched; the next successful write recovers.
- Vault close: flush any pending debounced write synchronously before tearing down the watcher.

### Boot read path

- New Tauri command `scan_vault_v2_cached(vault_path: String)` (kept beside `scan_vault_v2`, doesn't replace it — the latter remains the "force full rescan" path).
- Sequence:
  1. Resolve cache file path from `vault_path`.
  2. If file missing → call `scan_vault_v2(vault_path)` and return — first-launch path.
  3. Read + deserialize cache file. On any error → log + delete file + fall back to `scan_vault_v2`.
  4. Validate `schema_version` and `vault_path_hash`. Mismatch → fall back to `scan_vault_v2`.
  5. Call `VaultIndex::build_from_entries(snapshot.entries)` to reconstruct all reverse indexes (~30 ms).
  6. Emit `vault-index-updated` immediately with `version = 1`. Frontend panels render against the cached data.
  7. Spawn an async mtime reconciliation sweep (see below). Sweep emits a second `vault-index-updated` when complete.
  8. Return.

### Mtime reconciliation sweep

- Walks the vault using the same `walkdir` + hidden-dir filter as `collect_v2_entries`.
- For each file path: stat for `modified_at` + compare against `snapshot.entries[path].modified_at`.
  - **Fresh** (mtimes equal): skip (the snapshot entry is authoritative).
  - **Stale** (mtimes differ): re-parse the file, call `update_entry(path, new_entry)` on the in-memory index. Each call bumps `version` and emits `vault-index-updated`.
  - **New** (path on disk, not in snapshot): parse + `add_entry`.
  - **Deleted** (path in snapshot, not on disk): `remove_entry(path)`.
- Runs on a dedicated `tokio::spawn`; does NOT block the boot command return.
- Watcher events arriving during the sweep are queued (see next section) and drained after the sweep completes.
- Emits a `vault-index-sweep-complete` event when done so the TS side can clear a "reconciling" status indicator (optional UX).

### Watcher race during boot

- File watcher start (currently in `app-lifecycle.service.ts:304`: `startWatching(vaultPath)`) must be deferred until AFTER the boot sweep completes. Otherwise watcher events interleave with the sweep's `update_entry` calls and produce inconsistent intermediate state.
- Simplest scheme: the TS side calls `scan_vault_v2_cached`, then `await`s a single `vault-index-sweep-complete` event (with a timeout fallback), then calls `startWatching`. The Rust side already handles the watcher independently; this is purely an ordering concern.

### Corruption recovery

- Any `bincode::deserialize` error or struct-version mismatch → log via `debug_log`, delete the cache file, fall back to `scan_vault_v2`. The cache is always disposable; no migration logic.
- Tests cover: truncated file, file with mismatched schema version, file with valid header but corrupt entry payload, file with wrong `vault_path_hash`.

## Tasks

- [x] Task 1: add bincode dep + serialization helpers. Implementation note: `NoteEntry.frontmatter: BTreeMap<String, serde_json::Value>` cannot round-trip through bincode's serde compat layer (`serde_json::Value` requires `deserialize_any`, which non-self-describing formats reject — error: `Serde(AnyNotSupported)`). Worked around with a private `PersistedNoteEntry` proxy struct that stores `frontmatter_json: String`; conversion happens at the cache boundary via `PersistedNoteEntry::from_note_entry` / `into_note_entry`. The public API still takes `&[NoteEntry]` and `IndexSnapshot::into_entries() -> Result<Vec<NoteEntry>, String>` reconstructs the live shape on load. Cost: ~50 LOC of proxy + one JSON-parse pass at load time (negligible vs the 30 ms reverse-index build). Also added `validate_vault_path_hash` upfront so Task 5 can short-circuit on mismatched vault. Tests: 10 inline `#[cfg(test)]` cases covering empty / multi-entry / rich-frontmatter (nested objects + arrays + numbers + bools) round-trips, truncated / empty / garbage input rejection, schema and vault-path hash validators. All 10 pass via `cargo test --manifest-path src-tauri/Cargo.toml --lib vault::index_cache`; full Rust suite green (no regressions).
- [x] Task 2: atomic disk write helper. Extended `index_cache.rs` with `hash_vault_path` (SHA-256 prefix 16 hex chars, canonicalizes when possible), `cache_file_path(base_dir, vault_path) -> PathBuf` (creates parent, separates base-dir from AppHandle so unit tests run against `tempfile::tempdir()` — IPC layer in Task 5 builds `<app_local_data_dir>/index` and passes it), `write_snapshot_atomic(path, bytes)` (process+nanos-unique temp name + fsync + rename, cleans up orphan staging on rename failure), `read_snapshot_bytes(path) -> Option<Vec<u8>>` (Ok(None) for missing — first-launch path), and `delete_snapshot(path)` (no-op when missing — used by Task 5's corruption fallback). Initially used a fixed `.tmp` name; concurrent-write test failed because both writers raced on the same staging file. Switched to PID + nanos-suffixed temp names so concurrent writers each get their own staging file and the final rename remains atomic on POSIX. Tests: 10 new cases — `hash_vault_path` stability + distinctness, `cache_file_path` parent-creation + filename shape, write/read roundtrip via disk, missing-file read returns None, overwrite, no-tmp-leftover-after-success (walks dir), concurrent writes produce one valid file (no partial bytes), delete-existing + delete-noop. 20/20 in `vault::index_cache`. Full Rust suite still green.
- [ ] Task 3: hook debounced write into VaultIndex mutations. Add a module-level `tokio` task in a new `src-tauri/src/vault/index_persist.rs` that owns a generation counter (pattern from `src-tauri/src/commands/semantic.rs:25` `RERANKER_UNLOAD_GENERATION`). On every `VaultIndex::update_entry` and every successful `build`, call `schedule_snapshot_write(app_handle, vault_path, entries_snapshot)` which: increments gen, spawns a `tokio::time::sleep(5s)`, after sleep checks gen still matches, then writes. New helper `flush_pending_snapshot()` that synchronously waits for any in-flight write — called on vault close + `stop_vault_watcher`. Tests: assert N rapid updates produce 1 write, assert `flush_pending_snapshot` synchronously waits, assert write failure does not propagate to caller. Tests: `cargo test --manifest-path src-tauri/Cargo.toml`. Commit: `feat(vault): debounced background write of cache snapshot on every index mutation`.
- [ ] Task 4: add `VaultIndex::build_from_entries(entries: Vec<NoteEntry>) -> Self`. Equivalent to the second half of the existing `build`: take an already-parsed entries vec, populate the reverse indexes (`by_path`, `backlinks`, `tags_index`, `properties_index`). Add to `src-tauri/src/vault/index.rs` near the existing `build`. Tests: assert the result matches `build` for a small synthetic vault. Tests: `cargo test --manifest-path src-tauri/Cargo.toml`. Commit: `refactor(vault): extract VaultIndex::build_from_entries from build`.
- [ ] Task 5: add `scan_vault_v2_cached` Tauri command. New command in `src-tauri/src/commands/vault_v2.rs` (or wherever `scan_vault_v2` lives — confirm at implementation time). Sequence: resolve cache path → if missing → call existing `scan_vault_v2` and return → else read + deserialize → on error: delete + fall back → validate schema + vault_path_hash → on mismatch: delete + fall back → call `VaultIndex::build_from_entries` → emit `vault-index-updated` → spawn reconciliation sweep (Task 6) → return. Add `IndexLoadResult { source: "cache" | "scan" | "cache_then_sweep", entries: usize, load_ms: u64 }` to the command's return value for telemetry. Tests: command returns "scan" on missing cache, returns "cache_then_sweep" with valid cache, returns "scan" after corrupting the file. Tests: `cargo test --manifest-path src-tauri/Cargo.toml`. Commit: `feat(vault): scan_vault_v2_cached command with cache load + scan fallback`.
- [ ] Task 6: mtime reconciliation sweep. New function `reconcile_with_disk(index: Arc<Mutex<VaultIndex>>, vault_path: &str, app_handle: AppHandle)` in `src-tauri/src/vault/index_sweep.rs`. Walks the vault using `collect_v2_entries`'s walker + hidden-dir filter (extract to a shared `walk_vault_paths` helper if needed). For each path: stat → compare `modified_at` against snapshot entry → if stale: parse + `update_entry` → if missing from snapshot: parse + `update_entry` → if path in snapshot but not on disk: `remove_entry`. Each mutation emits `vault-index-updated` per the existing `update_entry` contract. Emit `vault-index-sweep-complete` at the end. Runs on `tokio::spawn`; takes a `CancellationToken` so `stop_vault_watcher` can cancel the sweep mid-run. Tests: synthetic vault where one entry changed mtime since snapshot, one added, one deleted — assert the index reflects all three after sweep. Tests: `cargo test --manifest-path src-tauri/Cargo.toml`. Commit: `feat(vault): mtime reconciliation sweep after cache load`.
- [ ] Task 7: TS-side bootstrap wiring. Edit `src/lib/core/app-lifecycle/app-lifecycle.service.ts`: replace the `scan_vault_v2` invocation in the bootstrap path with `scan_vault_v2_cached`. Listen for `vault-index-sweep-complete` (once) before starting the watcher (`startWatching`) — defer watcher start until sweep is done to avoid event interleaving. Add telemetry: log `appendLog('PERF', \`cold-start source=\${result.source} entries=\${result.entries} load=\${result.load_ms}ms\`)`. Tests in `src/tests/lib/core/app-lifecycle/app-lifecycle.service.test.ts`: assert cached path goes through `scan_vault_v2_cached`, assert watcher starts only after `vault-index-sweep-complete`, assert fallback to direct `scan_vault_v2` when the new command rejects. Tests: `pnpm check && pnpm vitest run`. Commit: `feat(app-lifecycle): consume cached vault index on boot + defer watcher start until sweep completes`.
- [ ] Task 8: vault-switch + close lifecycle. Audit every place that opens or closes a vault (`switch_vault`, vault close on app quit). Ensure: on switch, flush any pending snapshot for the old vault before swapping `VAULT_PATH`; on close, same flush. Update `src-tauri/src/vault/commands.rs` or wherever the vault lifecycle lives. Tests: cargo test that asserts no orphan in-flight write task after vault switch. Tests: `cargo test --manifest-path src-tauri/Cargo.toml`. Commit: `fix(vault): flush pending cache write on vault switch and close`.
- [ ] Task 9: corruption recovery tests. Add tests under `src-tauri/tests/index_cache_recovery_test.rs` covering: truncated cache file, mismatched schema version, mismatched vault_path_hash, valid header + corrupt entry payload, write failure during snapshot (mock filesystem). Each scenario asserts the next `scan_vault_v2_cached` call returns a non-empty index from the scan fallback and the corrupted file is deleted. Tests: `cargo test --manifest-path src-tauri/Cargo.toml`. Commit: `test(vault): corruption recovery for persistent index cache`.
- [ ] Task 10: validation on real vault. Cold-start the patched build on the 5.5k-note vault. Grep session log for `[PERF] cold-start source=cache_then_sweep` and verify `load=` value is <100 ms. Trigger a few external edits while the app is closed, relaunch, confirm the sweep picks them up (log shows `update_entry` calls during the sweep). Compare against pre-fix cold-start latency (~1811 ms). Document evidence in this task file's notes section. No commit unless a tweak is needed.
- [ ] Task 11: archive. Move this file to `tasks/done/`. Tests: `pnpm check`. Commit: `chore(tasks): archive persistent-vault-index after validation`.

## Risks + mitigations

| Risk | Mitigation |
|---|---|
| Stale snapshot momentarily renders wrong backlinks until sweep finishes (1-2s) | The cached entries are usually correct; only files edited externally while the app was closed are stale. Sweep emits `vault-index-updated` per stale file, so panels refresh per-file as the sweep progresses. Most users see the same data as before close. |
| Crash during snapshot write leaves `<vault-hash>.bincode.tmp` orphan | On next boot, the loader ignores `.tmp` files. Add a one-line cleanup pass that removes any `.tmp` siblings of the target on every boot. |
| Schema bump on production users discards their cache | Acceptable — cache is always disposable. Next launch does a full scan once, same as today. |
| APFS mtime resolution is 1 ns but iCloud sync can rewrite files with their original mtime, making the sweep think the file is fresh when content changed | iCloud-synced vaults are not a primary use case today. Document the limitation. Future mitigation: optional content-hash check on suspicious entries (size matches but content might differ). |
| Watcher fires DURING the boot sweep, mid-`update_entry` calls | Defer `startWatching` in app-lifecycle until `vault-index-sweep-complete` fires (Task 7). If watcher must start earlier, queue its events on a Vec<PathBuf> until the sweep completes, then drain them through the normal handler. |
| bincode major version changes break the format silently | Pin bincode to a minor version (`bincode = "2.0"`), bump `INDEX_SCHEMA_VERSION` if we ever upgrade the major. |
| Cache file accumulates across renamed/moved vaults | The vault-hash key prevents collisions. Periodically (or on user request) clean orphans via a future `cleanup_index_cache` command. Out of scope here. |

## Estimated cost

- Files touched: ~10 (1 new Rust module split into `index_cache.rs` + `index_persist.rs` + `index_sweep.rs`, plus edits to `index.rs`, `commands/vault_v2.rs` or equivalent, `lib.rs`, `app-lifecycle.service.ts`, `Cargo.toml`, and 2-3 test files).
- LOC: ~600-1000 across all 11 tasks.
- Test suites: ~30-50 new tests (Rust + TS).
- Time: ~1-2 weeks of focused work, plus ~2 days of polish if real-vault validation surfaces edge cases.

## Reconsider triggers (from Win 3 deferral notes)

- Vault grows past ~15k notes (scan crosses 3-5 s, becomes a launch UX problem). **Current vault: 5,755 notes; scan = 1.8 s. Not at trigger yet, but close.**
- User reports launch latency as a felt pain point.
- A feature requires synchronous index access at app boot (CLI entry point, deep link that hits backlinks before UI mounts).

## Notes

- Branch name (when picked up): `perf/persistent-vault-index`.
- Reverse indexes (`by_path`, `backlinks`, `tags_index`, `properties_index`, `version`) are NOT persisted because `VaultIndex::build_from_entries` reconstructs them in ~30 ms from the entries Vec. This keeps the snapshot format simple and lets us bump the index-derivation logic without bumping `INDEX_SCHEMA_VERSION`.
- `NoteEntry` already has `Serialize + Deserialize` (`entry.rs:123`). No type-level work needed there.
- The mtime sweep is structurally similar to the existing `incremental update` path in `watcher-handler.service.ts:93`, just running over the whole vault instead of a watcher-provided subset.
- Out of scope but adjacent: the FTS5 + semantic-search SQLite databases under `<vault>/.kokobrain/` already persist across restarts. Win 3 only adds the missing third leg (metadata index).
