---
type: ADR
id: "0031"
title: "Native Rust vault watcher: Rust-side filter + debounce, one vault-files-changed event, no JS watch API"
status: active
date: 2026-08-18
---

## Context

[0017](0017-file-watcher-incremental-hidden-filter.md) recorded a JS-side watcher built on `@tauri-apps/plugin-fs`'s `watch()`: a hidden-dir pre-filter, a 1 000 ms native delay plus a 500 ms JS debounce, per-parent subtree rescans, and a `watchVersion` counter — all running on the JS main thread.

Phase 9 of [0025](0025-rust-vault-index.md) replaced that machinery. None of 0017's implementation survives:

- Detection, filtering and debouncing moved into `src-tauri/src/vault/watcher.rs` (the `notify` crate, declared directly at `src-tauri/Cargo.toml:38`). The plugin's `watch()` API is no longer called from anywhere in `src/`.
- `isInsideHiddenDir` is Rust-side (`watcher.rs:74-82`) and now rejects a dot-prefixed segment at *any* depth, not just the first one under the vault root.
- The 1 000 ms native `delayMs` is gone; there is a single 500 ms debounce (`watcher.rs:38`).
- The counter fields 0017 names (`counters.accepted`, `counters.skippedKokobrain`) do not exist; the current struct is `fs.watcher.ts:31-37`.

Two artefacts of the old design were still shipping regardless: `tauri-plugin-fs` kept its `watch` feature enabled, and `src-tauri/capabilities/default.json` still granted `fs:allow-watch` (over four vault path globs) and `fs:allow-unwatch` to a frontend that calls neither. An ACL grant with no caller is capability surface the app pays for and nothing uses.

## Decision

**Watch the vault from a native `notify` watcher on its own thread, do the hidden-dir filtering, ancestor collapsing and debouncing in Rust, emit one `vault-files-changed` event per burst to a thin JS consumer — and ship no JS-side filesystem watch API at all, dropping the `tauri-plugin-fs` `watch` feature together with its `fs:allow-watch` / `fs:allow-unwatch` capability grants.** The JS side keeps only the tree-patch orchestration and the consumer fan-out, because those own `fsStore`.

Components:

1. **Native watcher + bridge thread** (`watcher.rs:219-261`). `notify::recommended_watcher` feeds raw paths over an `mpsc` channel to a bridge thread; dropping the handle stops the watch. Lifecycle is a Tauri-managed `Mutex<Option<VaultWatcher>>` (`watcher.rs:121`, registered at `lib.rs:277`) behind the `start_vault_watcher` / `stop_vault_watcher` commands (`watcher.rs:280-332`, `lib.rs:313-314`). Start drops the old watcher *inside* the lock so an old vault's final flush cannot land after the new watcher is installed.
2. **Hidden-dir filter at any depth** (`watcher.rs:74-82`). Any path with a dot-prefixed segment relative to the vault prefix is discarded before it enters the buffer. This matches `utils::fs::walk_dir`, so the watcher and the vault scan can never disagree about which files exist.
3. **One 500 ms debounce, measured from the last real event** (`watcher.rs:38, 130-208`), plus ancestor-path collapse (`watcher.rs:91-102`) so macOS parent-directory metadata events do not trigger redundant rescans. The flush runs after every wakeup, not only on timeout, so a sustained hidden-dir stream (`.git`, a sync client, our own `.kokobrain/` WAL writes) cannot starve a buffered real edit.
4. **A single frontend event** (`watcher.rs:34`) consumed by `fs.watcher.ts:126-221`: `listen('vault-files-changed')` is registered *before* `start_vault_watcher` is invoked so the first burst cannot be lost, then each burst rescans the affected parent directories (≤ 5) via `scan_vault` and splices them in with `patchSubtree`, falling back to a full `refreshTree()` above that threshold or on any scan failure. `watchVersion` (`fs.watcher.ts:55, 225`) still aborts in-flight callbacks when the vault changes or the watcher stops.
5. **Change listeners with path payload** (`fs.watcher.ts:57-67`). `onFileChange(listener)` registers consumers that receive the exact list of changed paths. Consumers (backlinks, index-updater, auto-move) decide whether to act — e.g., skip rebuilds for paths that match a recent self-save.
6. **No JS filesystem watch surface.** `tauri-plugin-fs` is declared without features (`src-tauri/Cargo.toml:24`), so the plugin's `watch`/`unwatch` commands are not compiled in, and the two capability grants that fronted them are deleted from `capabilities/default.json`.

## Alternatives considered

- **Amend 0017 in place.** Rejected: this directory's own rule is that active ADRs are never rewritten ([README](README.md), "Supersede, don't rewrite"). 0017 stays readable as the record of why the JS watcher was built the way it was.
- **Let 0025 supersede 0017 on its own.** 0025 records the migration *plan* in target-state terms; it does not describe the landed watcher and does not carry the consumer-decides rule (item 5 above), which is cited elsewhere as the reason a writer may deliberately skip self-save suppression. Rejected — the live decision needs a live home.
- **Keep the `watch` feature "in case a JS-side watcher is needed again".** Speculative: it costs two compiled IPC commands and two ACL grants over the whole vault, with zero callers. Re-adding the feature and the grants later is a two-line change. Rejected.
- **Suppress self-saves centrally, inside the Rust watcher.** Rejected: consumers disagree about what a self-save means. `watcher-handler.service.ts:35-49` skips the index rebuild for an all-self-save batch *without clearing the recent-save markers*, precisely so a later batch from the same save still matches; the tab reloader on the same event (`app-lifecycle.service.ts:333-344`) wants the paths regardless. Centralising the filter would take that choice away from both.
- **Move the subtree rescan and tree patch into Rust too.** Rejected for now: `patchSubtree` writes `fsStore.fileTree` and depends on the frontend's sort/folder-order state (`fs.watcher.ts:168-195`). The expensive part (event detection and coalescing) is already off the JS thread.

## Consequences

- Worst-case event-to-UI latency drops from ~1.5 s (0017: 1 000 ms native + 500 ms JS) to ~800 ms: 500 ms in Rust plus the 300 ms lifecycle debounce at `app-lifecycle.service.ts:333-344`.
- Filesystem events no longer wake the JS event loop one at a time — the main thread sees exactly one message per burst, already filtered and deduplicated.
- Self-save suppression stays a per-consumer decision (item 5). Any new write path that wants the watcher to resync tabs and indexes for it simply omits `markRecentSave`; that is a supported strategy, not an oversight.
- Nothing in the app can watch the filesystem from JavaScript. A future feature that needs to would have to re-enable the Cargo feature *and* re-add both capability grants; the frontend cannot regain the ability by itself.
- The two edits are independent, and neither is load-bearing for the other: `tauri-plugin-fs` ships its permission files unconditionally, so `fs:allow-watch` / `fs:allow-unwatch` stay resolvable in the generated ACL manifest even with the `watch` feature off (verified in `src-tauri/gen/schemas/acl-manifests.json` after the feature was dropped). The grants were removed because they authorize commands that are no longer in the binary, not because they would have failed the build. Capability edits are still only provable by a real `pnpm tauri build` — `cargo test` never runs the codegen.
- The watcher counters (`fs.watcher.ts:30-46`) are debug instrumentation. Unlike 0017, this ADR does not name them and does not protect them.
- **Re-evaluation triggers**: the 500 ms debounce becomes user-visible latency for a workflow that needs instant external-change reflection; `notify` changes its event batching contract; vault sizes grow to where per-parent subtree rescans are themselves too expensive (a path-keyed subtree cache, or moving the patch into Rust, would be the next step).
