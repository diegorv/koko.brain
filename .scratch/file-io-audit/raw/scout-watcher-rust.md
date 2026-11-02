# Scout report: slice "watcher-rust"

Scope: `src-tauri/src/vault/watcher.rs` (741 lines) and `src-tauri/src/commands/watcher.rs` (29 lines), plus the TS consumers that the slice's events reach. Read-only. No build or test was run.

Evidence labels: READ = read in this repo at the cited line. FETCHED = read from upstream source by WebFetch. INFERRED = my reasoning, not verified by running anything.

Caveat on FETCHED: the pinned crate is `notify` 8.2.1 (`src-tauri/Cargo.lock`, notify 8.2.1; notify-types 2.1.0). The tag URL returned 404, so the notify sources I read are from the `main` branch (`notify/src/fsevent.rs`, `notify/src/inotify.rs`, `notify/src/config.rs`). Release drift is possible.

## 0. What the slice does (and does not do)

- The slice performs NO disk writes, deletes or renames. It only observes (notify), groups paths, and emits `vault-files-changed`. Its only side effects are threads, channels, a `Mutex`, `app.emit`, and stderr logging.
- Data-loss risk from this slice is therefore indirect: a missing, mis-shaped or late event leads a consumer to keep a stale index or to act on the wrong state. The one direct data-loss path I found sits in a TS consumer (lead A) and is outside this slice.
- Rust side has no self-save suppression and no content hashing. The payload is `{ paths: string[] }` only (`watcher.rs:41-43`). Self-save suppression lives in TS (`editor.hooks.ts:24,47-48`).

## 1. Entry points and call chains

### 1a. Vault open (start)

1. `app-lifecycle.service.ts:494-497`: `onFileChange` listener registered (pushes to `pendingWatcherPaths`, debounced 300 ms, `serializeWithRerun`).
2. `app-lifecycle.service.ts:499`: `startWatching(vaultPath)` (step 7, after indexes; comment at `:476-477` says "Registered LAST (after indexes are built)").
3. `core/filesystem/fs.watcher.ts:190-210` `startWatching`: awaits `stopWatching()` (`:191`), sets `currentVaultPath` (`:192`), registers Tauri listener `on(VAULT_FILES_CHANGED)` (`:198-200`), then `call('start_vault_watcher', { path })` (`:201`). Catch (`:202-209`) unlistens and logs via `error()`; it does not reset `currentVaultPath` and does not notify the user.
4. IPC: `src-tauri/src/commands/watcher.rs:11-23` `start_vault_watcher` (sync command, no `async`). Registered at `src-tauri/src/lib.rs:323`. State managed at `lib.rs:289` (`VaultWatcherState::default()`).
5. `vault/watcher.rs:302-316` `replace_watcher`: locks state (`:306-308`), `take()` old watcher and calls `shutdown()` (`:309-311`), then `start_watcher_inner` (`:313`), stores result (`:314`). On start error the state stays empty (`:313` returns early via `?`).
6. `vault/watcher.rs:241-284` `start_watcher_inner`: prefix `/` appended (`:245-249`); `mpsc` channels (`:250-251`); `notify::recommended_watcher` with closure forwarding each `event.paths` entry to `event_tx` (`:253-265`); `watch(RecursiveMode::Recursive)` (`:267-269`); bridge thread spawned under `catch_unwind` calling `run_debounce_loop` (`:271-277`).
7. `vault/watcher.rs:152-230` `run_debounce_loop`: hidden-dir filter on each received path (`:195`), `HashSet` buffer (`:160`), flush after every wakeup when `last_event.elapsed() >= 500ms` (`:222-228`), `filter_ancestor_paths` (`:224`), `on_emit`.
8. `commands/watcher.rs:17-22` emit closure: `app.emit(VAULT_FILES_CHANGED_EVENT, &payload)`; error only goes to `debug_log` (`:19-21`).
9. TS: `fs.watcher.ts:198-200` listener calls `void handleChangedPaths(payload.paths)`. Unawaited, so rejections are unhandled.
10. `fs.watcher.ts:122-187` `handleChangedPaths`: `resolveRescanParents` (`:144`); full path `refreshTree()` (`:137`, `:149`) or incremental `scan_vault` per parent (`:162`) with fallback `refreshTree()` (`:175`); `setFileTree` (`:184`); then `notifyListeners(changedPaths)` (`:139`, `:151`, `:177`, `:185`).
11. `fs.service.ts:105-110` `refreshTree` to `:74-102` `loadDirectoryTree`, which rethrows (`:96-98`).
12. Listener fan-out: `app-lifecycle.service.ts` runWatcherBatch, then `editor.service.ts:375-404` `reloadExternallyChangedTabs`, then `watcher-handler.service.ts:30-79` `rebuildAllIndexes`, then `:86-116` `incrementalUpdateFiles` (`read_files_batch` at `:90`, `applyNoteChange` at `:105`, delete mapping at `:107-108`).

### 1b. Vault close / teardown

1. `app-lifecycle.service.ts:553-556` `unsubscribeFileChange()` (listener removed).
2. `app-lifecycle.service.ts:576` `stopWatching()` (not awaited, fire and forget).
3. `fs.watcher.ts:213-226` `stopWatching`: `watchVersion++` (`:214`), `unlisten()` synchronously (`:215-218`), then `call('stop_vault_watcher')` (`:220`). This runs before any await, so the listener is detached before the Rust side is stopped.
4. `commands/watcher.rs:26-29` `stop_vault_watcher` to `vault/watcher.rs:321-329` `stop_watcher`: `take()` and `shutdown()`.
5. `vault/watcher.rs:125-136` `shutdown`: `stop_tx.send(())` (`:131`), `drop(watcher)` (`:132`), `bridge.join()` (`:135`). This blocks until the bridge thread exits.

### 1c. Vault switch

`teardownVault` runs stop first (1b), then `initializeVault` runs `startWatching` for the new vault (1a). `startWatching` calls `stopWatching` again and awaits it before `start_vault_watcher`, so the second stop is ordered before the new start.

## 2. Disk operations in the slice

None. Verified by reading both files end to end. The watcher reads no note content. The downstream disk reads it triggers are: `read_files_batch` (`commands/files.rs:24-84`, called from `watcher-handler.service.ts:90`) and `scan_vault` (`fs.watcher.ts:162`, `fs.service.ts:79`). Both are read-only and outside this slice.

Failure mapping for downstream reads, relevant to lead H:
- `read_files_batch` canonicalize failure (missing file, i.e. the old side of a rename) gives `content: None` (`commands/files.rs:37-46`).
- `fs::read_to_string` failure of any kind (permission, transient, invalid UTF-8) also gives `content: None` (`commands/files.rs:63-74`).
- TS maps `content === null` to `{ kind: 'delete' }` (`watcher-handler.service.ts:105-108`). A read error on an existing note therefore deletes it from the index and FTS.

## 3. Concurrency

- Threads: notify backend thread (inotify loop or FSEvents runloop, owned by notify); one bridge thread per watcher (`watcher.rs:271`); Tauri main thread for the sync commands (see lead L).
- Channels: `event_tx` is captured by notify's closure (`:254`, `:260`). `stop_tx` is held by `VaultWatcher` (`:116`). Dropping the watcher drops the closure, which disconnects `event_rx`, which triggers the final flush (`:201-210`).
- Lock: `VaultWatcherState` `Mutex` (`:143`), held across `shutdown()` and `start_watcher_inner` (`:306-314`). No code path takes the lock from inside `on_emit`, so no deadlock was found.
- Stop-signal check: only at the top of the loop (`:165-169`), and it returns without flushing (see lead I).
- Debounce: deadline measured from the last real event (`:187-191`, `:197`, `:222`). Hidden events wake the loop but do not reset the deadline (`:194-197`). Test `debounce_sustained_hidden_stream_does_not_starve_real_file` (`:666-725`) covers this.
- Emits: bridge thread emits bursts sequentially, but TS handles them concurrently (`fs.watcher.ts:199`, `void`). The `watchVersion` guard (`:127`, `:138`, `:160`, `:166`) only drops results after a stop, not overlapping bursts.
- Rust serialization: `replace_watcher` joins the old bridge before the new one starts (`:302-311`), so no old-vault emit can follow a replace, as the comment at `:292-299` says. Issue 26 (below) records this as fixed.
- TS `startWatching` is not serialized. Two overlapping calls can each assign `unlisten` (`fs.watcher.ts:198`), leaking a listener. I found no current caller that overlaps (only `app-lifecycle.service.ts:499`), so this is latent.

## 4. Known-issue matches (checked against `.scratch/architecture-stability/issues/` and `.scratch/cross-audit-plan-2026-08-12/issues/`)

- `architecture-stability/issues/26-rust-logger-and-watcher-tauri-free.md`: the bridge-thread join race (old bridge final flush after new watcher installed). Already fixed (status recorded 2026-11-01). Not re-reported.
- `architecture-stability/issues/34-save-dirty-tabs-before-vault-switch.md`: vault-switch save ordering. Matched by topic only. I did not read it in full.
- `cross-audit-plan-2026-08-12/issues/62-watcher-external-delete-parse-cache.md`: watcher delete does not evict `.view` parse cache. TS side, not this slice.
- `cross-audit-plan-2026-08-12/issues/68-unbounded-init-wait-on-vault-scan.md`: relevant to the size of the startup gap in lead F. Not a duplicate.
- `cross-audit-plan-2026-08-12/issues/60-external-edit-latch-try-finally.md`: mentions the watcher reload and a stuck `isExternalEdit` latch. Different defect from lead A (the overwrite race). Lead A was not found in any issue file I searched (grep for `reloadExternallyChangedTabs`, `overflow`, `fsevent`, `inotify`, `rescan`).

## 5. Leads

Confidence is for the mechanism, not for how often it happens. Severity follows the owner's order: content loss, then silent corruption, then stale indexes, then path safety.

### A. (TS, outside slice) Keystrokes typed during a watcher-triggered reload are overwritten. Confidence: high on mechanism, low-to-medium on likelihood.
- `editor.service.ts:377-381`: eligibility checks `isTabDirty` before the reads.
- `editor.service.ts:386`: `readTextFile` awaited (`Promise.allSettled`).
- `editor.service.ts:396-398`: re-check only verifies the tab exists and `diskContent !== tab.savedContent`. It does not re-check dirtiness.
- `editor.service.ts:401` calls `syncExternalContentToEditor(path, diskContent, true, 'none')`. That function (`:70-91`) has no dirty check. It calls `updateTabContentByPath` (`editor.store.svelte.ts:130-136`), which sets both `content` and `savedContent` to disk content.
- Scenario: note A is open and clean. An external tool (git pull, sync client) changes A on disk. The watcher burst fires and reload starts reading A. While `readTextFile` is in flight, the user types a character in A's tab. The tab is now dirty with unsaved text. The apply loop sees disk differs from `savedContent` and overwrites the editor content with disk content. The typed character is lost with no saved copy.
- Window: the time between `:381` and `:401`, about one IPC round trip per file. Likelihood is low-to-medium, but the loss is silent.

### B. (Rust, watcher.rs + TS rebuild) Rescan and overflow signals are dropped or shaped as directory-only paths, so dropped events never reconcile. Confidence: medium-high (FETCHED sources), requires a real overflow to trigger.
- FETCHED, inotify: on IN_Q_OVERFLOW notify sends `Ok(Event { kind: Other, flag: Rescan })` with NO paths. Our closure (`watcher.rs:256-260`) loops over `event.paths`, so it forwards nothing. The Rescan flag is never read, and nothing is logged in production (`logger.rs:47-49` returns early unless debug mode).
- FETCHED, FSEvents: MustScanSubDirs and Kernel/User-dropped flags become `Event { kind: Other, flag: Rescan }` WITH paths (the affected directory). Our closure forwards that directory path as an ordinary change.
- TS: `watcher-handler.service.ts:33-44` keeps only basenames containing `.` and skips a batch that is directory-only (`filePaths.length === 0`). A directory path such as `/vault/Projects` (no dot) is therefore a no-op for the index. The file tree is refreshed in `fs.watcher.ts`, but `VaultIndex`, backlinks, tags and FTS are not reconciled for the notes that were dropped.
- Scenario (macOS): a large `git checkout`, or a sync client writing thousands of files, overflows FSEvents. A `MustScanSubDirs` for `/vault/Projects` arrives. The index keeps stale rows for files that changed inside it, and nothing retries.
- Fix direction (not a patch): treat a Rescan-flagged path as "rescan this subtree" in the Rust layer and let the TS side reconcile it, or do a full rebuild. Do not filter it as a directory.

### C. (Rust + TS) External folder rename or move leaves child notes in the index. Confidence: medium (mechanism partly INFERRED).
- INFERRED: FSEvents and inotify report a renamed or moved directory as the directory item only. Children are not individually reported (inotify: `MOVED_FROM`/`MOVED_TO` on the directory; notify does not re-walk children). I did not verify this against Apple documentation or a run.
- The old path reaches TS as a directory, the new path as a directory. Both are dropped by the dot filter (`watcher-handler.service.ts:33-36`), so `rebuildAllIndexes` returns at `:41-44`. The file tree is refreshed (`fs.watcher.ts:144-186`), but `VaultIndex` rows, backlinks and FTS rows for `old/…md` stay.
- Scenario: user renames `Projects` to `Archive` in Finder while the vault is open. Notes under `Archive` still show under `Projects` in backlinks and search until each note is touched again. Note: the app's own folder rename does walk children (`path-change.service.ts`, per CLAUDE.md), so this only affects external moves.

### D. (Rust) Partial recursive watch on Linux is reported as success. Confidence: medium.
- FETCHED (inotify): walk and watch-add failures during a recursive setup are sent to the handler as `Err`, and the watch continues for the rest.
- Our closure logs `Err` via `debug_log` only (`watcher.rs:263`). `debug_log` is a no-op unless debug mode is on (`logger.rs:47-49`). `watch()` returned `Ok` (`:267-269`), so the TS side logs nothing and sees a live watcher.
- Scenario: Linux, `fs.inotify.max_user_watches` is exhausted by a large vault, or other processes. Some subfolders are silently never watched for the session. Edits there never reach the index.

### E. (Rust config, Linux only) Possible self-feedback loop from access events. Confidence: low-to-medium, UNVERIFIED at runtime.
- FETCHED (config.rs): `Config::default()` uses `EventKindMask::ALL`, which includes access events. The docs say "Use `EventKindMask::CORE` to exclude access events." We use `notify::recommended_watcher` with the default config (`watcher.rs:253`).
- FETCHED (inotify.rs): access-open and access-close kinds subscribe `IN_OPEN` and `IN_CLOSE_NOWRITE` (`WatchMask::OPEN`, `CLOSE_NOWRITE`).
- Our closure does not filter by kind (`watcher.rs:254-260`). Any process reading a note fires an event for it.
- INFERRED loop: a changed `.md` triggers `rebuildAllIndexes`, which runs `read_files_batch` on it (`watcher-handler.service.ts:90`), which opens the file, which fires another access event, which triggers another rebuild. `areAllRecentSaves` (TS) does not cover reads. Would repeat about every debounce window.
- FSEvents (macOS) does not report reads, so this is likely Linux-only. I did not confirm that from Apple docs.
- Verify before acting: a test with a real inotify watch and one `read_to_string`, counting emits.

### F. (TS startup ordering, with Rust emit) Changes between the initial scan and watcher start are never seen. Confidence: high on ordering, medium on size.
- `app-lifecycle.service.ts:476-477` says the watcher is registered last, after indexes are built, to avoid `rebuildIndex()` racing `buildIndex()`. Steps 4 to 6 (`:298-422`) run before it. `start_vault_watcher` (`watcher.rs:241-269`) does no catch-up scan, so an edit made to a note after its scan and before `watch()` is never reported.
- Scenario: vault with many notes, slow initial scan (cross-audit issue 68 notes unbounded init waits). The user or a sync client edits note N during steps 4 to 6. N stays stale in `VaultIndex`/FTS until N is edited again.
- Fix direction: start the watcher before the scan, or run a reconciling scan right after start. The current order was chosen to avoid a race, so any change needs its own test.

### G. (TS consumer, fed by Rust bursts) A failed tree refresh drops the index update for that burst. Confidence: high on code reading; likelihood depends on `scan_vault` errors (not read).
- `loadDirectoryTree` rethrows (`fs.service.ts:96-98`). `handleChangedPaths` calls it without try/catch on the full paths (`fs.watcher.ts:137`, `:149`, `:175`), so the throw skips `notifyListeners` (`:139`, `:151`, `:177`, `:185`). The index consumer runs only from `notifyListeners`.
- The caller `void handleChangedPaths(...)` (`fs.watcher.ts:199`) makes the rejection unhandled.
- Scenario: `scan_vault` returns an error for the burst (for example, an unreadable folder, if it fails the whole scan; not verified). The changed notes in that burst are never indexed, and no retry happens until those files change again.

### H. (TS, fed by Rust bursts) Overlapping bursts can overwrite each other's file-tree patch. Confidence: medium on mechanism; file tree only, index unaffected.
- `fs.watcher.ts:157` snapshots `fsStore.fileTree` before any await. `:184` writes `currentTree` back. Two overlapping incremental bursts (A patches folder X, B patches folder Y) each start from the same snapshot. The later `setFileTree` drops the earlier patch.
- Overlap needs a scan slower than the gap between bursts (500 ms minimum by construction). Plausible on network drives.
- Consequence: the file explorer shows stale children for folder X until the next event. Notes are still indexed, because `notifyListeners` runs per burst.

### I. (Rust) A stop signal can discard pending paths without flushing. Confidence: high on the code path, low severity.
- `watcher.rs:167-169` returns on `stop_rx` without flushing `buffer`. The check runs at the top of the loop (`:164-169`), so a real event received in the iteration just before (`:193-198`) is discarded with the buffer if the stop was already sent. The final flush (`:201-210`) runs only on `Disconnected`, and TS has already detached its listener (`fs.watcher.ts:215-218`), so that flush is also discarded.
- Effect: changes in the last 500 ms before a stop are not reported. Harmless on vault switch, because the new vault is scanned. It matters only if `startWatching` ever reruns without a rebuild on the same vault (not found).

### J. (Rust) A continuous stream of real events never flushes until it pauses. Confidence: high on code, low severity (latency and memory, not loss).
- `last_event` is reset on every real event (`watcher.rs:197`), and the flush condition is `last_event.elapsed() >= debounce` (`:222`). A stream with gaps under 500 ms (sync client, big copy, git op) never flushes. `buffer` is an unbounded `HashSet` (`:160`).
- When it finally flushes, `filter_ancestor_paths` is O(n²) with an allocation per pair (`:88-99`). It runs on the bridge thread (not the main thread). Large bursts also force a full TS rebuild (`fs.watcher.ts:147`).

### K. (Rust + TS) Silent watcher death: start failure, and root rename or deletion. Confidence: medium.
- Start failure: `replace_watcher` returns `Err` (`watcher.rs:313`). TS logs with `error()` (`fs.watcher.ts:202-203`) and does not retry or notify the user. The app runs with no watcher for the session.
- Root change (FETCHED, FSEvents): a root change arrives as `Modify(Name(From))` with info "root changed" and the root path, which our closure forwards as an ordinary path (`watcher.rs:256-260`). INFERRED: the stream does not continue after the root is renamed or removed. No code re-arms it. I did not verify the stream behavior.
- Emit failure: `commands/watcher.rs:19-21` drops the burst and logs only in debug mode.

### L. (Rust, main thread) Sync commands run on the main thread and block on the bridge join. Confidence: high on thread, low-to-medium on size.
- FETCHED (Tauri v2 docs, https://v2.tauri.app/develop/calling-rust/): commands without `async` run on the main thread.
- `start_vault_watcher` and `stop_vault_watcher` are sync (`commands/watcher.rs:11-12`, `:26-27`). `shutdown` joins the bridge (`watcher.rs:135`) on the main thread. Join is bounded by notify's stop (FSEvents joins its thread in Drop, FETCHED) plus one bridge flush.
- INFERRED: on inotify, the recursive `watch()` may walk and add watches synchronously, which would stall the main thread on a large vault. Not verified.

### M. (Rust, low) Hidden-dir filter depends on a string prefix match. Confidence: low.
- `is_inside_hidden_dir` (`watcher.rs:71-79`) returns `false` when `path` does not start with `vault_prefix` (`:72-74`). If event paths and the stored vault path differ in form (symlink such as `/var` vs `/private/var`, or normalization), hidden noise (`.git`, `.kokobrain` WAL writes) passes the filter and feeds lead J.
- FETCHED (FSEvents): notify translates reported paths to the watched path for paths under a watch, which lowers the likelihood. Not tested.

### H2. (TS, cross-slice) A transient read error on an existing note deletes its index row. Confidence: high on mapping, medium on frequency.
- `read_files_batch` returns `content: None` for any read error (`commands/files.rs:63-74`), and TS maps `None` to delete (`watcher-handler.service.ts:105-108`). The file is not removed from disk, but its `VaultIndex` entry, FTS row and index-dedupe signature are removed.
- Scenario: a note is briefly unreadable during an external save (rename-over with a new mode, or a non-UTF-8 byte), so the next watcher burst deletes its index row. It stays out of backlinks until the next touch.

### Self-save (TS, cross-slice, low-to-medium)
- `editor.hooks.ts:24` sets a 15 s TTL. `areAllRecentSaves` (`:47-48`) suppresses the index rebuild when every path in a batch was recently saved by the app. Tabs still reload (`app-lifecycle.service.ts` runWatcherBatch calls `reloadExternallyChangedTabs` before `rebuildAllIndexes`).
- Scenario: the app saves note A at t=0. An external tool edits A at t=5 s. The burst is skipped by `areAllRecentSaves`. The index keeps the app's content for A.

## 6. Verified, not a lead (for the reviewer to skip)
- Hidden-dir filter itself matches the tests (`watcher.rs:338-431`).
- `filter_ancestor_paths` keeps siblings and does not match prefixes without `/` (`watcher.rs:437-482`).
- No watcher code path writes, deletes or renames disk content.
- `replace_watcher` joins the old bridge before starting the new one (`watcher.rs:302-316`).

## 7. Not checked (ask before relying on these)
- Did not run any build, test or cargo command (hard rule). All Rust behavior is from reading and from upstream source.
- Did not verify FSEvents directory-rename child reporting (lead C) against Apple documentation or a live run.
- Did not verify inotify access-event default at runtime (lead E) or the path-translation claim (lead M).
- Did not read `scan_vault` error behavior (lead G) or `read_files_batch` callers beyond `watcher-handler.service.ts` (lead H2).
- Did not read `areAllRecentSaves` callers beyond `watcher-handler.service.ts:41`.
- Did not read issue 34 in full.
- Notify sources are from `main`, not tag 8.2.1 (404 on tag URL).
