# 06: `scan_vault` leaves the main thread, and the watcher ignores `write_atomic` temp files

**Status:** resolved

Priority: P2 (quick-win bundle; 185-300 ms main-thread blocks per scan, max 2.4 s; 381 ms full rebuild per non-Markdown creation)

**What to build:**

1. **`scan_vault` async** (`src-tauri/src/commands/vault.rs:80-81`). It takes no state and no lock, so moving it to `async` + `spawn_blocking` is mechanical. 77 calls in 12 sessions, max 2,426 ms, all on the app main thread today.
2. **Generation guard in `loadDirectoryTree`** (`src/lib/core/filesystem/fs.service.ts:74-102`). Async completion can land an older full tree last; only the newest full load may write `fsStore.fileTree`.
   **Watcher subtree patches need a rebase, not newest-wins:** two batches usually patch different subtrees, so dropping the older one loses its change for good. Today the handler patches a snapshot taken before its await (`fs.watcher.ts:157`); async scans widen that race. After each await, patch the current `fsStore.fileTree` instead of the snapshot.
3. **Filter `write_atomic` temp paths in the Rust watcher.** `write_atomic` writes `${path}.tmp-<pid>-<seq>` and renames it (`src-tauri/src/utils/fs.rs:26-28`). The name is not dot-prefixed, so `watcher.rs:71-79` lets it through. On every non-Markdown creation (kanban, collection, view, canvas via `create_note`) the batch then fails `areAllRecentSaves` and `rebuildAllIndexes` takes the full branch: 381 ms at 17:53:44 (`scan_vault_v2_cached` 281 ms, `buildPropertyIndex` 49 ms, `buildFrontmatterIconIndex` 98 ms). Task toggles and type renames write through the same helper (`vault.rs:370,683,899`). Drop `*.tmp-<digits>-<digits>` paths in the Rust watcher.

**Blocked by:** none

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run` + `pnpm build` (Rust and frontend)

**Source:** src-tauri/src/commands/vault.rs:80-141, src-tauri/src/utils/fs.rs:20-40, src-tauri/src/vault/watcher.rs:71-99,160, src/lib/core/filesystem/fs.service.ts:74-110, src/lib/core/filesystem/fs.watcher.ts:155-185, src/lib/app/lifecycle/watcher-handler.service.ts:30-79

- [x] Failing first (TS): two overlapping `loadDirectoryTree` calls, the first resolves last, the newer tree wins
- [x] Failing first (Rust): the watcher's path filter drops `note.md.tmp-123-4` and keeps `note.md`, `note.tmp`, `a.tmp-x`
- [x] Failing first: two watcher batches for different subtrees whose scans resolve out of order both end up in `fsStore.fileTree`
- [x] Failing first (Rust): the debounced batch produced by a `write_atomic` of `dir/note.md` contains `dir/note.md` and no `.tmp-` path
- [x] Existing watcher and `scan_vault` Rust tests stay green
- [ ] Not verified by the agent: with Issue 05's `[MAIN-HB]`, creating a note logs no main-thread stall from `scan_vault`; dragging the window during a creation stays smooth

## Notes

- Issue 05's `[MAIN-HB]` makes the device check measurable; the code does not depend on it.
- Issue 09 applies the same rebase rule to app-initiated tree updates.
- Research: `.scratch/ui-responsiveness/research/B-deep-dive.md` (fix 5), `B-verify.md` (correction 1, missed risk 1).

## Comments

- 2026-11-02, branch `issue/06-scan-vault-async-and-watcher-temp-paths`: `scan_vault` is now `async` + `spawn_blocking`; the watcher drops `write_atomic` temp paths (`is_write_atomic_temp`); `loadDirectoryTree` keeps the newest overlapping load; watcher subtree patches rebase on the current tree. Review 1 fix: ADR 0031 amendment and CLAUDE.md watcher item name the second filter. Tests: pnpm check 0 errors; full vitest + build exit 0 (443 files, 10190 passed); cargo test exit 0 (1234 passed). Reviews: round 1 APPROVED (findings fixed), round 2 APPROVED (no findings). Device check (MAIN-HB, window drag) left to the owner.
