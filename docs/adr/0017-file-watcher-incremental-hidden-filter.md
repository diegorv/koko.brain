---
type: ADR
id: "0017"
title: "File watcher: incremental subtree rescans, hidden-dir filtering, debounce + version counter"
status: superseded
date: 2026-04-22
superseded_by: "0031"
superseded-date: 2026-08-18
superseded-reason: "The JS watcher this ADR describes no longer exists. Phase 9 of ADR 0025 moved detection, the hidden-dir filter and the debounce into a native Rust `notify` watcher (`src-tauri/src/vault/watcher.rs`); `fs.watcher.ts` became a thin consumer of the `vault-files-changed` event. ADR 0031 records the landed design and carries Decision item 5 forward verbatim."
---

## Context

The vault is watched recursively for external changes (`git pull`, iCloud sync, Finder drag, another editor saving over a file). Naively subscribing to every filesystem event and rebuilding the tree is the obvious implementation — and the wrong one:

- `.git`, `.kokobrain`, `.obsidian`, `.claude`, node_modules-like trees generate thousands of events per second during sync and rebase operations. Logging them drowns the debug output and the tree rebuild pegs the main thread.
- A full tree rebuild on every event destroys the explorer's visible state (expanded folders, scroll position) and costs O(vault) for a single-file change.
- The app itself writes files (`writeTextFile`); those writes loop back as watcher events. Without deduplication, every save triggers a rebuild that triggers an index refresh that can trigger another save through auto-move or templates.
- When the user switches vaults, in-flight async refreshes for the old vault can land after the new vault is already open and corrupt its state.

## Decision

**Wrap Tauri's native filesystem watcher with four layers of discipline: (1) hidden-dir pre-filter, (2) 1 000 ms native-side event delay plus 500 ms JS-side debounce, (3) incremental per-parent subtree rescans with a full-rescan fallback, and (4) a monotonic `watchVersion` counter that invalidates in-flight callbacks when the vault changes or the watcher stops.** Implemented in `src/lib/core/filesystem/fs.watcher.ts`.

Components:

1. **Hidden-dir pre-filter** (`fs.watcher.ts:22-33, 218-233`). `isInsideHiddenDir(pathStr, vaultPrefix)` checks whether the first path segment under the vault root starts with `.`. Matching paths are silently discarded *before* logging and counted in `counters.skippedKokobrain`. `.git`, `.kokobrain`, `.obsidian`, `.claude` are the common cases.
2. **Double debounce**. The Tauri `watch()` call sets `delayMs: 1000` (coalesces rapid events at the OS layer); the JS handler wraps the refresh in a 500 ms `debounce()` (`fs.watcher.ts:247` + `debouncedRefresh`). Pending changed paths accumulate in `pendingChangedPaths: Set<string>` during the quiet window.
3. **Incremental subtree rescans** (`fs.watcher.ts:180-207`). The handler derives the set of parent directories containing changed files, calls `invoke('scan_vault', { path: parentDir })` once per parent, and splices the result into the current tree via `patchSubtree(...)`. On any subtree-scan failure, it falls back to a full `refreshTree()` call and increments `counters.fullRefreshes`.
4. **Version counter** (`fs.watcher.ts:54, 181, 187, 196, 255`). `watchVersion` is a module-level integer bumped in `stopWatching()`. Every async chain captures the version at entry and aborts early (`if (watchVersion !== version) return;`) if it changed mid-flight. Prevents old-vault writes from landing after a new vault is opened.
5. **Change listeners with path payload** (`fs.watcher.ts:57-67`). `onFileChange(listener)` registers consumers that receive the exact list of changed paths. Consumers (backlinks, index-updater, auto-move) decide whether to act — e.g., skip rebuilds for paths that match a recent self-save.

## Alternatives considered

- **No hidden-dir filter; filter at the consumer level**: every consumer duplicates the filter, events still log, debounce still fires. Rejected.
- **Single debounce (JS-only, no native delay)**: the native delay is free and coalesces OS-level bursts before they cross the IPC bridge; removing it doubles event volume across the Tauri boundary. Rejected.
- **Always full rescan**: simpler but costs O(vault) per change and loses the file-explorer's expanded/selected state. Rejected after profiling on a 1 870-note vault (~400 ms full rescan vs ~30 ms subtree rescan).
- **Compute a diff from the last known tree and patch**: less IPC but re-implements what `scan_vault` already does well. The per-parent approach is simpler and fast enough.
- **Cancel in-flight promises via `AbortController`**: Tauri's `invoke()` doesn't accept abort signals; the version-counter check at await points is the equivalent pattern. Accepted.
- **Listen to Rust-side watcher events directly via Tauri events**: equivalent; we use the plugin-fs `watch()` API because it already gives us the recursive watcher and the batching.

## Consequences

- Event-to-UI latency is ~1.5 s worst case (1 s native + 500 ms JS). Acceptable for "file changed externally" — anything tighter risks flicker and wasted rebuilds.
- The explorer preserves expanded/selected state across external changes because the patch targets just the affected subtree.
- Consumers of `onFileChange` receive raw paths, not a semantic event type. "Added/Removed/Modified" is reconstructed at consume time if needed; this keeps the watcher agnostic about consumer intent.
- The hidden-dir filter is unconditional — there is no opt-in to watch `.kokobrain/` or any other dot directory from the frontend. If a future feature needs to react to `.kokobrain/` events, it must invoke a Rust command directly rather than piggyback on the file watcher.
- The watcher emits event counters (`getWatcherCounters()`) used by both tests and debug UI. Writing a new consumer that silently eats events should bump `counters.accepted` the same way.
- Re-evaluation triggers: the 500 ms debounce becomes user-visible latency (rare; only when an external edit needs instant reflection); Tauri's watch API changes its batching contract; vault sizes grow to a point where per-parent subtree rescans are themselves too expensive (would need a path-keyed cache of subtrees).
