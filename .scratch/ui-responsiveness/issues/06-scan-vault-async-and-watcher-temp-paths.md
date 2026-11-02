# 06: `scan_vault` leaves the main thread, and the watcher ignores `write_atomic` temp files

**Status:** needs-triage

Priority: P2 (quick-win bundle; 185-300 ms main-thread blocks per scan, max 2.4 s; 381 ms full rebuild per non-Markdown creation)

**What to build:**

1. **`scan_vault` async** (`src-tauri/src/commands/vault.rs:80-81`). It takes no state and no lock, so moving it to `async` + `spawn_blocking` is mechanical. 77 calls in 12 sessions, max 2,426 ms, all on the app main thread today.
2. **Generation guard in `loadDirectoryTree`** (`src/lib/core/filesystem/fs.service.ts:74-102`). Async completion can land an older tree last; only the newest call may write `fsStore.fileTree`. Apply the same rule to the watcher's subtree scans (`fs.watcher.ts:162`).
3. **Filter `write_atomic` temp paths in the Rust watcher.** `write_atomic` writes `${path}.tmp-<pid>-<seq>` and renames it (`src-tauri/src/utils/fs.rs:26-28`). The name is not dot-prefixed, so `watcher.rs:71-79` lets it through. On every non-Markdown creation (kanban, collection, view, canvas via `create_note`) the batch then fails `areAllRecentSaves` and `rebuildAllIndexes` takes the full branch: 381 ms at 17:53:44 (`scan_vault_v2_cached` 281 ms, `buildPropertyIndex` 49 ms, `buildFrontmatterIconIndex` 98 ms). Task toggles and type renames write through the same helper (`vault.rs:370,683,899`). Drop `*.tmp-<digits>-<digits>` paths in the Rust watcher.

**Blocked by:** 05

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run` + `pnpm build` (Rust and frontend)

**Source:** src-tauri/src/commands/vault.rs:80-141, src-tauri/src/utils/fs.rs:20-40, src-tauri/src/vault/watcher.rs:71-99,160, src/lib/core/filesystem/fs.service.ts:74-110, src/lib/core/filesystem/fs.watcher.ts:155-185, src/lib/app/lifecycle/watcher-handler.service.ts:30-79

- [ ] Failing first (TS): two overlapping `loadDirectoryTree` calls, the first resolves last, the newer tree wins
- [ ] Failing first (Rust): the watcher's path filter drops `note.md.tmp-123-4` and keeps `note.md`, `note.tmp`, `a.tmp-x`
- [ ] Failing first: a creation batch holding only the created path and its temp path takes the self-save branch (no full `rebuildAllIndexes`)
- [ ] Existing watcher and `scan_vault` Rust tests stay green
- [ ] Not verified by the agent: with Issue 05's `[MAIN-HB]`, creating a note logs no main-thread stall from `scan_vault`; dragging the window during a creation stays smooth

## Notes

- Blocked by 05 only so the gain can be measured; the code does not depend on it.
- Async scans widen the lost-update race in subtree patching; Issue 09 rebases the patch after the await.
- Research: `.scratch/ui-responsiveness/research/B-deep-dive.md` (fix 5), `B-verify.md` (correction 1, missed risk 1).
