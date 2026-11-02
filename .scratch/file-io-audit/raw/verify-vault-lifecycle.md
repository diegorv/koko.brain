# Adversarial verification: vault-lifecycle

Read-only, at the working tree on 2026-11-02. Nothing was built or run. READ means I saw it in code; INFER means reasoning from that code; FETCHED means third-party source pulled from GitHub with WebFetch, which returns a summary.

Fetched:
- `raw.githubusercontent.com/tauri-apps/tao/tao-v0.37.2/src/platform_impl/macos/app_delegate.rs`. The registered selectors are `applicationDidFinishLaunching:`, `applicationWillTerminate:`, `application:openURLs:`, user-activity, `applicationShouldHandleReopen:hasVisibleWindows:` and `applicationSupportsSecureRestorableState:`. There is **no `applicationShouldTerminate:`**. `applicationWillTerminate:` only calls `AppState::exit()`.
- `.../tao-v0.37.2/src/platform_impl/macos/app_state.rs`. `AppState::exit()` sends only `Event::LoopDestroyed`, then drops the callback. Nothing in it sends `WindowEvent::CloseRequested`.
- `raw.githubusercontent.com/tauri-apps/plugins-workspace/fs-v2.7.1/plugins/fs/src/commands.rs`. `write_file_inner` opens with `truncate: true, create: true` by default, then does one `write_all`. It uses no temp file, rename or `sync_all`.
- Versions come from `src-tauri/Cargo.lock`: tao 0.37.2 (:5303), tauri 2.12.5 (:5371), tauri-plugin-fs 2.7.1 (:5557), muda 0.20.0 (:3033).

---

## vault-lifecycle-1: Cmd+Q / Dock Quit / Restart skip the save handler (CONFIRMED, data-loss)

I tried to refute it in five ways. All failed.
- Is there a Rust-side exit hook? READ: `src-tauri/src/lib.rs` has one `on_window_event` (:94-99). It is `intercept_close_as_hide` for the quick-capture composer, not the main window. rg finds no `RunEvent`, `ExitRequested` or `prevent_exit` in `src-tauri/src`. The builder ends at `.run(tauri::generate_context!())` (lib.rs:353).
- Does Quit go through window close? READ: the menu uses the predefined `.quit()` (lib.rs:195). FETCHED: tao's delegate has no `applicationShouldTerminate:`, so AppKit's `terminate:` is never deferred. `applicationWillTerminate:` emits only `LoopDestroyed`, and no `CloseRequested` reaches any window. The JS `onCloseRequested` handler (`src/lib/app/tauri-listeners.service.ts:50-82`, registered from `src/routes/(app)/+layout.svelte:45`) never runs.
- Is there another flush? READ: there is no `beforeunload` or `pagehide` listener anywhere. The `visibilitychange` listeners belong to the log heartbeat (`utils/log.service.ts:110`) and the event-calendar clock (`event-calendar.service.ts:309`). Neither saves. The focus listener only refreshes the daily note (`tauri-listeners.service.ts:306-325`). Unsaved tab content is not kept in localStorage (rg: only the command palette, quick switcher and recent vaults use it).
- Is the debounce long enough to matter? READ: body autosave is 2000 ms (`editor.service.ts:197`), frontmatter 500 ms (:200), failure retry 5 s (:180, 192). Settings debounce is 500 ms (`settings-persistence.svelte.ts:10, 59-62`).
- Does Restart flush? READ: `UpdateSection.svelte:208-210` calls `relaunch()` directly, with no `saveAllDirtyTabs` first. I did not fetch `AppHandle::restart` myself. The reviewer's quote is unverified, but relaunch does not go through the JS close handler in either case.

Outcome: edits typed within 2 s of Cmd+Q, a tab whose saves keep failing, and the last 500 ms of settings changes are dropped without the "Close anyway?" prompt. INFER: if Cmd+Q lands mid-`writeTextFile`, the truncate-in-place can leave a partial note. That window is milliseconds.

Not run. Repro: `pnpm tauri dev`, type into a note, press Cmd+Q within 1 s, reopen, and the text is missing. A failing-test idea is hard to write in vitest. An E2E test cannot drive the native menu.

Fix hint: add a `RunEvent::ExitRequested { api, .. }` handler in `lib.rs` that calls `api.prevent_exit()` and emits an event the frontend handles with the same flush as `onCloseRequested`, then exits. Have `restartApp` await `saveAllDirtyTabs` + `drainEventCalendarWrites` + `flushSettingsPersistence` before `relaunch()`. Not known: no issue under `.scratch/architecture-stability/issues/` mentions quit, relaunch or `onCloseRequested` (rg).

## vault-lifecycle-2: Unparseable settings.json is overwritten with defaults, then history is cleaned up with retention 7 (CONFIRMED on code, data-loss, trigger needs a corrupt file)

I tried to refute it four ways. All failed.
- Guard against overwrite? READ: `settings.service.ts:54` `JSON.parse` throws into the catch at :166. That catch runs `setSettings(fallback)` (:170) and `saveSettings(vaultPath)` (:172), which calls `writeSettingsFile` → `writeTextFile` in place (:193). There is no copy aside and no `.bak` (rg in `core/settings`). `error()` logs and reports to Sentry; there is no toast. The tests pin this as intended (`src/tests/lib/core/settings/settings.service.test.ts:220-244`).
- Does the history cleanup run on these defaults? READ: `initializeVault` loads settings (:198), opens the DB (:233), then reads `settingsStore.history.retentionDays` (:273) and calls `cleanup_history` (:275). The default is 7 (`settings.store.svelte.ts:96`). `cleanup_history` (`src-tauri/src/commands/history.rs:142-158`) deletes everything older than retention+30 days (`db/history_repo.rs:82-89`) and thins the 30 days before that to one snapshot per file per day (:93-109). The UI allows up to 365 (`FileHistorySection.svelte:9, 36`).
- Mitigation: the opt-in `snapshotBackupEnabled` (default false, `settings.store.svelte.ts:97`) writes `.md` copies to `.kokobrain/snapshots-backup/`, and Rust cleanup does not touch them (rg). Only users who turned it on keep that history.
- Triggers. Crash or power loss between the truncate and `write_all` (FETCHED non-atomic): settings are written on every open (:163), on the 500 ms debounce, and on quit. Also a hand edit with a trailing comma. A read error (permission, iCloud dataless) is INFER only.

Outcome: all vault settings are replaced. If retention was above 7 days, file-history snapshots between 37 days and retention+30 days old are deleted for good, and days 7-37 are thinned. With the default retention, no extra history is lost.

Repro (vitest, real stores): mock `readTextFile` → `'{"history":{"retentionDays":90},}'`, call `loadSettings`, and assert `writeTextFile` was not called with defaults. It fails today. Next, an `initializeVault` test: assert that `cleanup_history` is not invoked when settings failed to load.

Fix hint: on parse/read failure, rename the bad file to `settings.json.corrupt-<ts>`, toast, and skip the write-back and `cleanup_history` for this session. Separately, write settings atomically (tmp + rename).

## vault-lifecycle-3: Every open rewrites settings.json; a failed write-back swaps the session to defaults (PLAUSIBLE, re-graded to corruption)

READ, confirmed: `settings.service.ts:162-163` writes back on every successful load, and a throw from that write lands in the same catch, which replaces the valid parsed settings with defaults (:166-170). That part is real. A transient write error (for example EACCES on `.kokobrain`) puts the session on defaults while the file stays intact. The persistence baseline is then the defaults (`settings-persistence.svelte.ts:50`), so a later change, if a write ever succeeds, persists defaults plus that change.

What weakens the data-loss claim:
- Read-only volume or EROFS/EACCES: the open fails before truncation, so the file is intact. The history purge also likely never runs: `open_vault_db` needs to write the DB, and on failure `initializeVault` returns at :236-237, before `cleanup_history` at :275. INFER: SQLite on a read-only volume fails to open in WAL mode. Not verified.
- ENOSPC after O_TRUNC: INFER. On APFS, truncating frees the old blocks unless a local snapshot pins them. A same-size rewrite then usually fits. So "file left empty" needs a snapshot-pinned or growing write. `cleanup_history` on a full disk likely fails with SQLITE_FULL (WAL append), so the history arm is unlikely there.
- Once the file is empty, the next open takes the `!content.trim()` branch (:45-52), which is VL-2's mechanism.

Repro (vitest): `exists` → true, `readTextFile` → valid JSON with a custom `periodicNotes.folder`, `writeTextFile` rejects once. Assert the store still holds the custom folder after `loadSettings`. It fails today.

Fix hint: drop the unconditional write-back, or write only when the merged result differs from the file content. Never let a write failure replace already-parsed settings.

## vault-lifecycle-4: Corrupt or unreadable trash manifest → [] → Empty Trash deletes unlisted items (CONFIRMED on code, data-loss of trashed items, trigger needs a corrupt manifest)

I tried to refute it three ways. All failed.
- Is there reconciliation with the items directory? READ: rg finds no `readDir`, orphan or reconcile logic in `src/lib/core/trash/`. `loadTrash` (`trash.service.ts:24-43`) trusts the manifest only. A catch gives `[]` (:37-39). `parseTrashManifest` returns `[]` on bad JSON or a non-array, and drops invalid entries (`trash.logic.ts:58-66, 95-105`).
- Does the count guard the deletion? READ: the dialog counts `trashStore.count` (`TrashSection.svelte:47-51`), and the button is shown only when the trash is not empty (:69). The user must trash one new item first, and then the count says "1 item". `emptyTrash` removes the whole `items` dir recursively (`trash.service.ts:207-210`), listed or not.
- Second trigger: `moveToTrash` swallows a manifest save failure (:78-82) and updates only the in-memory store. After a restart that item is unlisted, and the next Empty Trash deletes it unseen.

Severity note: these are items the user already chose to delete. The loss is the ability to restore them, through Finder only, since the UI no longer shows them. That is still data-loss, but lower than note content.

Repro (vitest): seed `readTextFile` with `'[{"id":'`, run `loadTrash`, then `moveToTrash` one file, then `emptyTrash`. Assert that `remove` was called on `.../trash/items` while the earlier containers were never listed. Better: change `emptyTrash` to remove per listed id, then assert unlisted containers survive.

Fix hint: have `emptyTrash` delete only `trash/items/<id>` for listed ids, or list the `items` dir and show the real count. On a manifest parse failure, keep the bad file aside and do not rewrite it.

## vault-lifecycle-5: Superseded init starts settings persistence for A, and B's settings get flushed into A (PLAUSIBLE, corruption)

Trace (READ, `src/lib/app/lifecycle/app-lifecycle.service.ts`):
1. `initializeVault(A)` passes the version check at :200, then awaits `configureSentry` (:202).
2. `initializeVault(B)` enters. `void stopSettingsPersistence()` (:150) finds no session. `void disableSentry()` (:153) is queued after A's configure. Teardown is skipped because `unsubscribeFileChange` is still null in A's init (:172). `loadSettings(B)` awaits `exists` and `readTextFile` before `setSettings(B)` (`settings.service.ts:34, 44, 162`).
3. If A's configure resolves in that gap, `startSettingsPersistence(A)` (:210) runs with `lastWritten = serialize()`, which is A's settings (`settings-persistence.svelte.ts:46-50`).
4. B's `setSettings` arms A's effect. B then reaches `startSettingsPersistence(B)` → `void stopSettingsPersistence()` → `flushSettingsPersistence()`. That serializes B's settings, sees they differ from `lastWritten` (A), and calls `writeSettingsFile(A.path, B content)` synchronously, before its first await (:79-90, 96-105). Corruption.

What I could rule out: the worse ordering, where A's session starts after B's, cannot happen. `configureSentry` is serialized through `configurationQueue` (`sentry.service.ts:16, 94-98`), and B's configure is queued behind A's. So A's `startSettingsPersistence` always runs before B's. If A resumes after B's `setSettings`, A's baseline equals B's settings, and the flush on B's start is a no-op. Only the gap in step 3 corrupts, so this depends on timing.

Trigger: a second switch while a vault is open. That happens only through `switchVault` from a deep link (`deep-link.service.ts:166`). Deep links are serialized (`enqueueDeepLinkUrl`, :25-33), but `switchVault` returns right after `vaultStore.open` (`vault.service.ts:18-22`), so the next link's switch can start while the first init is still running. Two links in quick succession (Shortcuts or automation) are enough.

Repro (vitest): make `configure_sentry` resolve on a manual deferred. Call `initializeVault(Z)` to completion, then `initializeVault(A)` (it pauses at configure), then `initializeVault(B)`. Resolve A's configure before B's `readTextFile` resolves. Assert no `writeTextFile` to `A/.kokobrain/settings.json` carries B's values.

Fix hint: `if (initVersion !== version) return;` right after the `configureSentry` try/catch (before :210).

## vault-lifecycle-6: Failed saves discarded on a vault switch; the failed write may have truncated the note (PLAUSIBLE, data-loss; discard is KNOWN, issue 34)

READ: `switchVault` ignores `saveAllDirtyTabs()`'s result (`vault.service.ts:19`). The safety-net retry also ignores it (`app-lifecycle.service.ts:180`). Teardown then calls `resetEditor()` (:622), which cancels the timers and clears tabs (`editor.service.ts:412-417`). The close path prompts instead (`tauri-listeners.service.ts:55-62`). Issue 34's Comments record the discard as the owner's call, so that part is **known**.

The new claim, that the failed write already emptied the note, is INFER and conditional. EACCES, EROFS and ENOENT fail at `open()` before the truncate, so the file is intact. Only ENOSPC or EIO during `write_all` after O_TRUNC leaves a partial or empty file, and on APFS that usually needs a snapshot-pinned or growing file (see VL-3). It is a property of the save pipeline (`editor.service.ts:168`, FETCHED non-atomic `writeTextFile`), not of the switch. The switch only removes the in-memory copy that the 5 s retry (:192) would otherwise still hold. The last good content survives as the history snapshot of the previous successful save (`file-history.service.ts`, history on by default).

Repro: mock `writeTextFile` to reject for one path, make it dirty, call `switchVault(B)`, and assert the content is gone from the tab store, as issue 34's test already shows. The truncation part needs a real full disk.

Fix hint: make the save pipeline atomic (write `<file>.tmp`, fsync, rename), or move this under the editor-save theme. Whether to block the switch is still the owner's decision under issue 34.

## vault-lifecycle-7: In-flight `update_semantic_file` for A commits into B's DB (PLAUSIBLE, but the reviewer's mechanism is mostly blocked; minor)

READ: `update_semantic_file` is async with `spawn_blocking` (`src-tauri/src/commands/semantic.rs:1211-1216`). It reads hashes through the global DB (:1233), embeds while holding `EMBEDDER` (:1266-1288), then writes through whatever `DB` holds (:1299, `db/mod.rs:91-99, 120-128`). `DB` is process-global.

Refutation of the reviewer's scenario ("embedding takes hundreds of ms; meanwhile close and open run"): teardown sends `shutdown_semantic` (`app-lifecycle.service.ts:597`) before `close_vault_db` (:601). `shutdown_semantic` is a **sync** command (`semantic.rs:1159`), so it runs on the main thread (per the Tauri docs the reviewer cites) and takes `EMBEDDER.lock()` (:1162). While the update task holds `EMBEDDER` for loading or embedding, the main thread blocks in `shutdown_semantic`, so `close_vault_db` and B's `open_vault_db` (:233) cannot run. When the task drops the guard (:1288), it goes straight to `with_db_transaction`. B's open still needs several JS round trips after `close_vault_db` (B's `loadSettings`, `configureSentry`), so the task commits to A or hits "Database not open".

Remaining windows (INFER, narrow):
- The task's thread gets to `ensure_embedder_loaded` (:1264) only after `shutdown_semantic` has set `EMBEDDER = None`. It then lazy-reloads the model from `VAULT_PATH` (still A, :250-263) without blocking the main thread, embeds, and commits after `open_vault_db(B)`. This needs the spawned task to start late by several ms.
- The task contends with a running `build_semantic_index` for `EMBEDDER`, and `shutdown_semantic` wins the lock between batches.

Outcome if hit: A-relative chunks plus `mtime:<rel>` land in B's DB. Healing (INFER): B's `build_semantic_index` → `cleanup_orphaned_chunks` (:550, 753) drops paths not in B. For a same-path note, B's real mtime differs from the stored A mtime, so it gets re-embedded. Stale-state, minor.

Fix hint: pass a vault generation or `vault_path` into the DB guard. For example, `with_db_transaction` checks that the open DB root equals `vault_path` and skips otherwise.

## vault-lifecycle-8: Auto-move rules (CONFIRMED part 1, minor; part 2 PLAUSIBLE)

Part 1, READ: `loadAutoMoveConfig` maps a parse or read error to `DEFAULT_CONFIG` (`auto-move.service.ts:59-62`). `saveAutoMoveConfig` writes the store in place (:69-86). `addRule`, `removeRule` and the reorders call `saveConfig()` immediately (`AutoMoveSection.svelte:49-80`). So one edit after a bad load replaces every rule on disk. There is no backup (rg). The effect is lost automation config, no note content. Empty rules move nothing.

Part 2, PLAUSIBLE: `saveConfigDebounced` (`AutoMoveSection.svelte:41-46`) resolves `vaultStore.path` when the timer fires (:33-38). The Settings panel is not closed on a vault switch (rg: `settingsPanelStore.close` is called only from panel UI), and `onDestroy` clears the timer only on unmount (:25-27). A deep-link switch within 500 ms of typing in a rule field writes A's rules, or after `resetAutoMove` (`app-lifecycle.service.ts:640`) an empty config, into B's file.

Repro (part 1, vitest): `readTextFile` → `'{"rules":[{"id":"1"'`, `loadAutoMoveConfig`, `autoMoveStore.addRule(x)`, `saveAutoMoveConfig`. Assert the written JSON still holds the original rules (it fails today).

Fix hint: on a load error, keep the bad file aside and block saves until it is fixed. Capture the vault path when `saveConfigDebounced` is called.
