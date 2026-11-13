# Senior review: vault-lifecycle (vault open / switch / teardown, quit, app-owned files)

Read-only review at commit e9065422. No cargo, pnpm, vitest or build was run. Every claim was checked against the code at the cited line.
Labels: READ = seen in code; INFER = reasoning from read code; FETCHED = third-party source fetched from GitHub or the official docs (the fetch tool returns a summary, so short quotes only).

## Context that changes how likely each finding is

- While a vault is open, there is no way to switch to another vault except a deep link. The welcome page with "Open Vault" and the recent list renders only when `!vaultStore.isOpen` (READ `src/lib/app/AppShell.svelte:160-161`). `vaultStore.close()` has no caller outside tests (READ, rg). The only `switchVault` caller with a vault already open is `deep-link.service.ts:166`. So the switch-time races below need a deep link. Quit and app-owned-file corruption do not.
- Sync Tauri commands run on the main thread, in order. Async commands run on a spawned task (FETCHED https://v2.tauri.app/develop/calling-rust/: "Commands without the async keyword are executed on the main thread unless defined with #[tauri::command(async)]"). `open_vault_db` / `close_vault_db` (`src-tauri/src/commands/db.rs:7,15`) and `save_snapshot` (`commands/history.rs:57`) are sync, so they keep IPC order. `update_semantic_file` (`commands/semantic.rs:1211`) is async.
- `writeTextFile` is not atomic. FETCHED from `tauri-apps/plugins-workspace` v2 `plugins/fs/src/commands.rs`: `write_file_inner` opens with `truncate: true, create: true`, does one `write_all`, and uses no temp file, rename or fsync. `readTextFile` decodes in JS with a non-fatal `TextDecoder` (FETCHED `plugins/fs/guest-js/index.ts`), so invalid UTF-8 does not throw. `exists` returns `Path::exists()` after the scope check.

## Findings (most severe first)

### VL-1. Cmd+Q, Dock > Quit and "Restart to update" skip the save-on-close handler. Unsaved edits and the pending settings write are lost without a prompt (data-loss, confidence medium-high, not run)

Path:
- The only flush on exit is `getCurrentWindow().onCloseRequested(...)` (READ `src/lib/app/tauri-listeners.service.ts:50-82`; the handler body is at :54-71): `saveAllDirtyTabs`, then a prompt on failure, then `drainEventCalendarWrites`, then `flushSettingsPersistence`, then `destroy`.
- The app menu uses the predefined `.quit()` item (READ `src-tauri/src/lib.rs:195`). There is no `RunEvent` / `ExitRequested` handler. The builder ends at `.run(tauri::generate_context!())` (READ `lib.rs:353`).
- FETCHED `tauri-apps/muda` (dev) `src/platform_impl/macos/mod.rs`: Quit maps to `sel!(terminate:)` and has no target, so AppKit handles it natively and muda sends no event.
- FETCHED `tauri-apps/tao` tag `tao-v0.37.2` (the version in `src-tauri/Cargo.lock:5303-5304`), `src/platform_impl/macos/app_delegate.rs`: there is no `applicationShouldTerminate:`. `applicationWillTerminate:` only calls `AppState::exit()`. Nothing sends `CloseRequested` to windows.
- "Restart to update" (READ `src/lib/core/settings/sections/UpdateSection.svelte:208-210, 293-294`) calls `relaunch()`. FETCHED `tauri-apps/tauri` tag `tauri-v2.12.5` `crates/tauri/src/app.rs` `AppHandle::restart`: on the main thread it "skip[s] them and directly restart[s] the process". Off the main thread it goes through `ExitRequested`. Neither path sends `CloseRequested`.
- No other flush exists. There is no `beforeunload` or `visibilitychange` save, and the focus listener only refreshes the daily note (READ `tauri-listeners.service.ts:306-325`).

Scenario: type in a note and press Cmd+Q within 2 s, while the body autosave is still debounced (READ `editor.service.ts:197`, 2000 ms). The process terminates and the keystrokes since the last save are gone. The same happens to a tab whose save has been failing (the 5 s retry at `editor.service.ts:192`): the red-button close would ask "Close anyway and lose unsaved changes?" (:58-62), but Cmd+Q discards with no prompt. A settings change in the last 500 ms is also lost (`settings-persistence.svelte.ts:10, 59-62`). INFER: if Cmd+Q lands while an autosave `writeTextFile` is mid-write, the truncate-in-place leaves a partial note. That window is milliseconds.

Not run. Verify on a dev build: edit, Cmd+Q within 1 s, reopen. Cmd+Q is the normal way to quit on macOS, so the trigger is common. The loss is bounded to the edits since the last autosave, plus any tab whose saves were failing.

Known issue: none. The 50-69 issues and issue 34 do not cover quit or relaunch (rg for `relaunch`, `Cmd+Q`, `onCloseRequested` in `.scratch/architecture-stability/issues/`: no hits).

### VL-2. A settings.json that cannot be parsed or read is overwritten with defaults with no backup and no toast. The same open then purges file history using the default 7-day retention (data-loss, confidence high on code, trigger medium-low)

Path (READ):
- `loadSettings` (`src/lib/core/settings/settings.service.ts:30-179`): `JSON.parse(content)` (:54) or `readTextFile` (:44) throws, so the catch (:166-178) runs `settingsStore.setSettings(DEFAULT_SETTINGS)` (:170) and then `saveSettings(vaultPath)` (:172). That writes the defaults over the user's file in place (:193). It does not copy the original bytes aside. `error()` (:167) logs to the console and Sentry but shows no toast. Tests pin this as intended (`src/tests/lib/core/settings/settings.service.test.ts:221-243`, "uses defaults on parse error / read error").
- Then `initializeVault` reads the in-memory retention right after the load (READ `src/lib/app/lifecycle/app-lifecycle.service.ts:273-277`) and calls `cleanup_history` with the default `retentionDays: 7` (`settings.store.svelte.ts:96`). `cleanup_history` (READ `src-tauri/src/commands/history.rs:143-158`) runs `DELETE FROM snapshots WHERE created_at < cutoff_daily` (`db/history_repo.rs:82-89`), which removes every snapshot older than 37 days, and thins days 7-37 to one per file per day (`history_repo.rs:93-109`).

Triggers:
- a crash, kill or power loss during any settings write. Writes are non-atomic (FETCHED) and frequent: the 500 ms persistence debounce, plus layout fixes AppShell writes on its own (READ `AppShell.svelte:150-154`), plus the write-back on every open (VL-3);
- a hand edit that leaves a trailing comma;
- a read error. INFER: a dataless iCloud file in `~/Documents/kokobrain-vaults` read while offline. Not verified.

Lost: periodic-note folders and formats, templates folder, Todoist token, tag colors, editor and layout settings, Sentry DSN. If the user had set a longer retention (the UI allows up to 365, `FileHistorySection.svelte:8`), the snapshots older than 37 days also go, permanently. File history is the owner's recovery store for note content. That makes this the worst part.

Known issue: none.

### VL-3. Every vault open rewrites settings.json in place. A failed write-back replaces the session's settings with defaults, and on a full disk it leaves the file empty, so the next open resets to defaults (data-loss, confidence high on code, trigger low-medium)

Path (READ): after a successful parse, `settingsStore.setSettings(normalizeSettings(merged))` (`settings.service.ts:162`) runs, then `await saveSettings(vaultPath)` (:163) on every load. If that write throws, the same catch as VL-2 runs (:166-170) and swaps the valid in-memory settings for `DEFAULT_SETTINGS`.
- Disk full (ENOSPC): INFER from the fetched `truncate: true`. The open truncates the file to 0 bytes, then `write_all` fails. The retry at :172 fails too. The file is now empty or partial, and the session runs on defaults. With defaults in memory, `cleanup_history` at app-lifecycle :275 also uses retention 7 (see VL-2). After space is freed, the next open hits `!content.trim()` (:45-52) or a parse error, and the defaults become permanent.
- Read-only volume or `.kokobrain` not writable: the file on disk stays intact, but the session runs on defaults with no toast. INFER: if writes start working again within the session, the next settings or layout change persists the defaults through `flushSettingsPersistence` (`settings-persistence.svelte.ts:79-83`), because the persistence baseline was taken from the defaults (:50).

Known issue: none. Note: the same truncate-on-ENOSPC applies to note saves (`editor.service.ts:168`). That belongs to the editor-save theme; see VL-7 for how it meets the vault switch.

### VL-4. A failed or corrupt trash-manifest load becomes an empty list. The next trash action rewrites the manifest from it, and "Empty Trash" then deletes items the user never saw (data-loss, confidence high on code, trigger medium-low)

Path (READ):
- `loadTrash` (`src/lib/core/trash/trash.service.ts:24-43`) is called at vault open (`app-lifecycle.service.ts:288`) and on each Trash panel mount (`TrashSection.svelte:17-21`). Any read error gives `setItems([])` (:37-39). `parseTrashManifest` returns `[]` for invalid JSON or a non-array, and silently drops entries that fail `isValidTrashItem` (`trash.logic.ts:58-66, 95-105`).
- The next `moveToTrash` writes `[item, ...trashStore.items]`, which is just `[item]` (`trash.service.ts:79`). The write is non-atomic (FETCHED).
- The Empty Trash dialog counts `trashStore.count` ("Permanently delete all 1 item", `TrashSection.svelte:47-51`). `emptyTrash` then runs `remove(trash/items, { recursive: true })` (`trash.service.ts:207-210`), which deletes every container, listed or not.

Scenario: a crash during a manifest write (every trash, restore or delete rewrites it) leaves it truncated. On the next open the Trash panel is empty. The user deletes a note, then empties the trash, confirming "1 item". Every earlier trashed note and folder under `.kokobrain/trash/items/<uuid>/` is deleted for good. Before the empty they were only recoverable through Finder. Same outcome when a manifest save fails after a move (:78-82, error swallowed) and the app quits before the next trash action: the moved item is unlisted.

Known issue: none in `.scratch/architecture-stability/issues`. This overlaps the trash slice (`scout-trash.md`); listed here because the load runs at vault open.

### VL-5. A superseded init starts settings persistence for the old vault after the next init began, and that session then writes the new vault's settings into the old vault's settings.json (corruption, confidence high on mechanism, likelihood low)

Path (READ `app-lifecycle.service.ts`):
- `initializeVault(A)` checks `initVersion` at :200, then awaits `configureSentry` (:202). There is no version check before `startSettingsPersistence(vaultPath)` (:210). The next check is at :240.
- If `initializeVault(B)` starts during that await, its unconditional `void stopSettingsPersistence()` (:150) finds no session yet. A then resumes and starts a session with path A, and its baseline is `serialize()` of the store, which is still A's settings (`settings-persistence.svelte.ts:46-66`).
- B's `loadSettings(B)` runs `setSettings(B)` (`settings.service.ts:162`). A's effect sees a change (:57) and arms a 500 ms write. B's own `startSettingsPersistence(B)` (:210) calls `stopSettingsPersistence()`, which flushes A's session: `serialize()` (B's settings) !== `lastWritten` (A's), so `writeSettingsFile(A path, B settings)` (`settings-persistence.svelte.ts:79-83`). If the timer fires first, the outcome is the same.
- Window: one `configure_sentry` IPC. It grows to as much as `Sentry.close(2000)` when the vault before A had Sentry enabled, because `disableSentry` is queued ahead of A's configure (`sentry.service.ts:15, 45-47`).

Scenario: two deep links in quick succession (Z, then A, then B). A's settings.json silently becomes a copy of B's: other periodic-note folders, templates folder, Todoist token, tag colors. Because switching needs deep links (see Context), likelihood is low. The fix is one `if (initVersion !== version) return;` after :205.

The related lead L11 from the scout (`loadSettings(A)` resolving after `loadSettings(B)`) needs A's two read IPCs to finish after B's, though they were sent first. It is the same outcome, even less likely. Not separately reported.

Known issue: none.

### VL-6. Failed note saves are discarded on a vault switch, and a failed write may already have emptied the file on disk (data-loss, KNOWN for the discard, new fact for the truncation)

Path (READ): `switchVault` ignores the failed list (`src/lib/core/vault/vault.service.ts:19`). The `initializeVault` safety net ignores it too (`app-lifecycle.service.ts:180`). `teardownVault` then calls `resetEditor` (`app-lifecycle.service.ts:622`), which clears the tabs (`editor.service.ts:412-417`). The red-button close prompts instead (`tauri-listeners.service.ts:55-62`).

Known: issue 34's Comments record "the switch still goes ahead ... whether to block the switch instead is the owner's call". New fact for that decision (INFER from the fetched `truncate: true`): on ENOSPC the failed `writeTextFile` has already truncated the note, so the disk does not hold "the old version". It holds an empty or partial file. The last successfully saved content survives only as the file-history snapshot from that save (`file-history.service.ts:110-124`, history on by default `settings.store.svelte.ts:95`). The quit prompt's wording ("lose unsaved changes") understates this in the same way.

### VL-7. An in-flight semantic update for vault A commits into vault B's database (stale-state, minor, confidence medium)

Path (READ): `update_semantic_file` is async with `spawn_blocking` (`commands/semantic.rs:1211-1342`). It reads the hashes through the global `DB` (:1233), embeds (hundreds of ms per CLAUDE.md), then opens a transaction on whatever `DB` holds at that moment (:1300) and writes `mtime:<rel>` (:1334). `DB` / `FTS_DB` are process-global (`db/mod.rs:91-99, 110-117`). `switchVault` triggers it through `saveAllDirtyTabs` (the search after-save observer, `search.service.ts:327`). Then B's init runs `close_vault_db` (`app-lifecycle.service.ts:601`) and `open_vault_db(B)` (:233) within tens of ms. So A's chunks, keyed by A's vault-relative path, plus A's mtime key, land in B's `kokobrain.db`.

Outcome: semantic search in B can return a note path that does not exist in B, or mix chunks for a same-named note (for example a daily note at the same relative path). INFER: it heals when B's `build_semantic_index` runs `cleanup_orphaned_chunks` or the mtime comparison. Only while semantic search is enabled. Minor.

Known issue: none.

### VL-8. Auto-move rules (minor, confidence medium)

- A corrupt or unreadable `auto-move-rules.json` loads as empty (READ `auto-move.service.ts:49-63`). The next edit in Settings writes only the store (:77-81; callers only on user edits, `AutoMoveSection.svelte:33-80`), so every rule in the unreadable file is gone from disk. Same shape as VL-2, for a smaller file.
- `saveConfigDebounced` (`AutoMoveSection.svelte:41-46`) resolves `vaultStore.path` when the 500 ms timer fires (:34). A deep-link switch inside that window writes A's rules, or after `resetAutoMove`, an empty config, into B's file. Narrow timing; listed for completeness.

## Paths checked and found SAFE

- Teardown order for settings: `stopSettingsPersistence()` serializes synchronously before its first await and disposes the effect before `resetSettings()` (`settings-persistence.svelte.ts:96-105`, `app-lifecycle.service.ts:575, 627`). The defaults never reach the vault being left.
- The unconditional `void stopSettingsPersistence()` at `initializeVault` entry (:150) flushes with the captured path while the store still holds the old vault's settings. The flush is correct on a normal A to B switch.
- `folder-order.json`: the template is written only when `exists` is false. Read and parse errors give `{}` in memory and never write (`fs.service.ts:41-71`).
- Index cache: `write_snapshot_atomic` uses tmp, `sync_all` and `rename` (`src-tauri/src/vault/index_cache.rs:55-78`). A corrupt cache is deleted and a full scan runs (`commands/vault.rs:1226-1235`). The teardown save is keyed by `indexedVaultPath`, set only after a successful build (`app-lifecycle.service.ts:350-354, 586-591`), and runs before B's scan is sent. Only the cache is at risk, never notes. `update_note_in_index` takes mtime from disk at call time (`commands/vault.rs:310`), so the cache's mtime reconciliation (:1297) sees later external edits.
- DB close/open ordering: both are sync main-thread commands (FETCHED Tauri docs), so `close_vault_db` (:601) runs before `open_vault_db` (:233). `save_snapshot` is sync, so a history snapshot sent before the switch cannot land in B's DB.
- Watcher across a switch: `stopWatching` unlistens synchronously before its IPC (`fs.watcher.ts:211-216`), so A's tail events never reach B's handler.
- Bookmarks migration: re-checks `vaultStore.path !== vaultPath` before each note write and before the delete (`bookmark-migration.service.ts:79, 87, 93, 109`). Deleting a corrupt legacy `bookmarks.json` (:26-28, 101-102) is deliberate and holds only path references.
- `moveToTrash` keeps the container once the rename has happened (`trash.service.ts:88-93`). The user's only copy is never removed on a later failure.
- `deleteItem`'s permanent-remove fallback (`fs.service.ts:179-181`) needs `vaultStore.path === null` after a vault was opened, which cannot happen (`close()` has no production caller).
- `openRecentVault` checks `exists(path)` before switching (`vault.service.ts:38-51`).
- `cleanup_history` caps retention at 36500 days, and the `u32` arg rejects negatives (`history.rs:144-146`). Only a hand-edited `0` shortens it (cutoff now minus 30 days). That is by design, so it is not reported.
- Invalid UTF-8 in settings.json does not throw (FETCHED non-fatal TextDecoder), so it is not a VL-2 trigger. It is a silent U+FFFD replacement that the write-back persists. Minor, not reported.
- The autosave retry timer surviving a switch (`editor.service.ts:192`) only saves dirty tabs that are still in the store, so it is benign.

## Leads from the scouts not confirmed or downgraded

- Scout L7 (A's tabs surviving into B when teardown is skipped): mechanism READ (`app-lifecycle.service.ts:172`, `resetEditor` only in teardown). It needs a deep-link double switch before step 7, and saves go to absolute paths, so no content is lost. Stale UI only.
- Scout L12 (shared `.tmp` name between the teardown cache save and a scan write): the teardown save is sync on the main thread and is sent before B's scan, so they do not overlap for the same vault on a normal switch. Cache-only in any case.
- Scout L14 (`save_vault_cache` has no `validate_vault_path`, `commands/vault.rs:1412-1424`): the only caller passes a previously validated path. Hygiene only.
- Lifecycle scout L4 (two overlapping writes to one note): belongs to the editor-save theme, not re-traced here.

## Not checked

- Nothing was run, including the Cmd+Q behavior (VL-1). Verify it on a dev build before fixing.
- tao's `AppState::exit()` body; the iCloud dataless-file read behavior (VL-2 trigger); whether APFS really fails a small write with ENOSPC after the truncate (VL-3, VL-6 are INFER from POSIX `O_TRUNC` semantics).
- `todoist-sent.json` (`todoist.service.ts:103-130`): same load-empty-then-overwrite shape, and it resolves `vaultStore.path` at write time. Losing it can re-send tasks. Not traced to callers.
