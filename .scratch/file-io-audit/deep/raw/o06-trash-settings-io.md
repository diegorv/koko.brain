# o06-trash-settings-io: deep dive (raw)

Worktree: `.claude/worktrees/file-io-repro` (identical to main). No app code edited, no cargo or build run.
Repro tests: `src/tests/repro/o06-trash-settings-io/`, run one file at a time with `./node_modules/.bin/vitest run <file>`.

Upstream source fetched: `https://raw.githubusercontent.com/tauri-apps/plugins-workspace/v2/plugins/fs/src/commands.rs`
- `write_text_file` -> `write_file_inner`. With no options it opens with `create: true, truncate: true, append: false` and then calls `write_all(&data)` on the target. No temp file and no rename, so the write is not atomic: the file is truncated at open, before any bytes arrive.
- `remove` calls `std::fs::symlink_metadata(&resolved_path)` first and returns `failed to get metadata of path: ...` when the path is missing. Removing a missing path is an error.

## Bug 1: trash writers rebuild the manifest from an in-memory snapshot, and Empty Trash deletes every container, listed or not

Covers: cross-cutting-8, recovery-2, vault-lifecycle-4. Verdict: CONFIRMED_BY_TEST. Data-loss, P1.

Trace (own reading):
- `trash.service.ts:24-43` `loadTrash`: a missing manifest sets `[]` (:29-31). A read error goes through `catch` and sets `[]` (:37-39), and it does not rethrow, so the toast at `app-lifecycle.service.ts:291-294` never fires. `trash.logic.ts:58-66` `parseTrashManifest` returns `[]` for invalid JSON or a non-array, and `:62` drops entries that fail `isValidTrashItem` (:95-105). The empty-file case `''` hits the JSON.parse catch and gives `[]`.
- Every writer serializes `trashStore.items`, never what is on disk: `moveToTrash` at :79 writes `[item, ...trashStore.items]`, `restoreItem` at :137-139, `deletePermanently` at :191. `saveManifest` (:269-276) is an in-place `writeTextFile`, which is non-atomic (see upstream above).
- The store is loaded only by `initializeVault` step 3 (`app-lifecycle.service.ts:288`) and by `TrashSection.svelte:17-21` onMount. Nothing reloads it on an external change: the watcher drops hidden dirs (`.kokobrain`), and `grep loadTrash` finds only those two callers.
- `emptyTrash` (:205-222) runs `remove(itemsDir, { recursive: true })` on the whole `items/` dir. The confirm text (`TrashSection.svelte:49-51`) counts `trashStore.count`, so containers that are not in the store are deleted without being counted. `remove` is permanent: the files do not go to the macOS Trash.

Triggers, ordered by how realistic each one is:
1. Vault synced between two Macs (iCloud, Dropbox). Mac 1 trashes X, and the sync brings X's container and the new manifest to Mac 2. Mac 2 has had the vault open since before that, so its store is stale. When Mac 2 trashes Y, it writes `[Y, ...stale]` and X's entry is gone. X is now an orphan, and Empty Trash on either Mac deletes it while counting only the listed items. Proved by test 2.
2. The manifest is unreadable or truncated at vault open. A crash or power loss during the truncate-then-write leaves it empty, and a transient read error has the same effect. The Trash then shows empty, and the next delete rewrites the manifest with only the new item. Proved by test 1.
3. A stale `loadTrash` from `TrashSection` onMount that resolves after a `moveToTrash` drops the new entry from the store, because `setItems` has no version guard. The next write then orphans that entry. This needs a millisecond overlap and is P3 on its own. Proved by test 3.
4. Not claimed, same mechanism: two overlapping `moveToTrash` calls both read `trashStore.items` before either one runs `addItem` (:83), so the last write wins. No multi-select delete exists, so this needs two deletes within about 10 ms. Theoretical.
5. Not claimed, same orphan, different source: a crash between the rename (:71) and the manifest write (:79) leaves a container with no entry. The window is about 2 IPCs.

Refutation attempts that failed: no other code rebuilds the manifest from `items/`. No caller passes a fresh manifest to the writers. `emptyTrash` has no listed-items filter. An existing test (`trash.service.test.ts:105`) asserts that a load error gives `[]`, but no test covers what the next write does after that.

Recoverable: yes, until Empty Trash. The orphaned bytes stay under `<vault>/.kokobrain/trash/items/<uuid>/`, which a user can reach in Finder only with hidden files shown and only if they know the folder is there. After Empty Trash, only an external backup (Time Machine, or the sync provider's deleted-files history) can bring them back.

Test: `trash-manifest-orphans.test.ts`
```
× a transient manifest read failure at load does not make the next delete drop earlier entries
  AssertionError: expected [ Array(1) ] to deeply equal ArrayContaining ["a", "b", "c"]
× a manifest updated on disk after load (sync from another machine) survives the next delete
  AssertionError: expected [ …(2) ] to include 'b'
× a stale loadTrash (TrashSection mount) that resolves after a delete does not drop the new entry from the store
  AssertionError: expected [] to include 'notes/x.md'
× keeps a trashed note whose container is not listed in the manifest   (Empty Trash)
  AssertionError: expected undefined to be '# orphan, only copy'
```

Fix sketch: writers re-read the manifest from disk and merge by id before they write, or they hold a single serialized queue that re-reads. `loadTrash` adopts the `items/<uuid>` dirs that have no entry (it can rebuild `fileName` from the single child). `emptyTrash` removes only the containers it listed, or it counts the orphans in the confirm. On a read or parse failure, keep a `.bak` copy and do not overwrite the manifest. Write the manifest atomically (temp file plus rename).

## Bug 2: a phantom trash entry (manifest entry whose container is gone) can be neither deleted nor restored

Covers: recovery-9. Verdict: CONFIRMED_BY_TEST. Minor, P3.

Trace:
- `deletePermanently` runs `remove(itemDir)` at :188 before it writes the manifest. Upstream `remove` errors on a missing path (it calls `symlink_metadata` first), so the call throws and the entry stays.
- `restoreItem` of a phantom: `rename(trashPath)` at :126 fails with ENOENT and the function throws. Only `emptyTrash` clears the entry (`exists(itemsDir)` guards that call).
- How a phantom is created:
  - The app crashes after the restore rename (:126) and after the container removal (:130), but before the manifest write (:139). The window is a few milliseconds.
  - The restore manifest write fails (:140-142, swallowed). The store drops the entry but the disk keeps it. The next trash write in the same session heals it; otherwise the phantom shows up on the next launch.
  - `deletePermanently` removes the dir and then `saveManifest` throws. The store keeps the item, and every retry hits ENOENT.
- If the container still exists (crash before :130), delete works, so the stuck state needs the container to be gone.
- Data impact: none by itself. The user has to empty the whole Trash to get rid of the phantom, but that is a choice they make knowingly. The claimed "destroys every real item too" is the documented behavior of Empty Trash, so it is not a separate loss.

Test: `trash-manifest-orphans.test.ts`
```
× Delete permanently clears the phantom entry instead of failing forever
  AssertionError: promise rejected "Error: failed to get metadata of path: /v…" instead of resolving
  ❯ Module.deletePermanently src/lib/core/trash/trash.service.ts:188:9
```
Fix sketch: in `deletePermanently`, treat a missing container as already deleted (`exists` check, or ignore NotFound). In `restoreItem`, drop the entry when `exists(trashPath)` is false.

## Bug 3: loadSettings swaps a successfully read settings file for defaults when only the write-back fails, and the catch then writes those defaults over the file

Covers: vault-lifecycle-3. Verdict: CONFIRMED_BY_TEST. Data-loss (app config, plus file history for some users), P2.

Trace:
- `settings.service.ts:162-163`: `setSettings(merged)` runs, then `await saveSettings(vaultPath)`. That write-back is optional, because the file was just read successfully.
- When the write-back throws, control jumps to `catch` at :166, which replaces the store with `DEFAULT_SETTINGS` (:168-170). It then calls `saveSettings` again (:172) with those defaults.
  - If the second write succeeds (a transient error such as EBUSY), the user's settings.json is overwritten with defaults at once.
  - If it fails too (full disk, read-only volume, file locked in Finder), the session runs on defaults. `startSettingsPersistence` then takes the defaults as its baseline (`settings-persistence.svelte.ts:50`), and the first settings change after writes work again persists the defaults.
- Consequence: `app-lifecycle.service.ts:273-277` calls `cleanup_history` with `settingsStore.history.retentionDays`, and the default is 7 (`settings.store.svelte.ts:96`). In `src-tauri/src/commands/history.rs:143-158`, `delete_old_snapshots` (`history_repo.rs:82-89`, `DELETE FROM snapshots WHERE created_at < cutoff`) then deletes every snapshot older than 37 days, and `delete_medium_duplicates` thins the 7-37 day range to one snapshot per file per day. A user who raised retention to 365 days loses that history permanently, and with it the means to recover old note versions.
- Caveat on the history part: on a truly full disk, the SQLite DELETE may also fail. The history loss is cleanest when only settings.json is unwritable (a locked or read-only file, or a permissions problem) while the DB stays writable.
- The claimed "a full disk leaves the file empty" is plausible from the upstream truncate-then-write order (truncation happens before `write_all`). The empty-file branch (:45-52) then writes defaults on the next open. That part is proved by trace only.
- Related, same catch: invalid JSON in settings.json (a hand edit, a sync merge) is overwritten with defaults at :172 without a backup. Existing tests (`settings.service.test.ts:268-279`) treat the in-memory fallback as intended behavior, but none of them asserts that the file is kept.

Refutation attempts that failed: no caller retries. `initializeVault` does not inspect the result. No test covers the case of a good read followed by a failed write-back.

Test: `settings-writeback-failure.test.ts`
```
× keeps the settings it just read when only the write-back fails
  AssertionError: expected 7 to be 365
× does not overwrite a readable settings.json with defaults after one failed write-back
  AssertionError: expected 7 to be 365
```
Fix sketch: wrap only the parse in the try. Treat a write-back failure as non-fatal: log it, keep `merged`, and do not write defaults. On a parse failure, copy the bad file to `settings.json.bak` before writing defaults. Write atomically.

## Bug 4: initializeVault has no initVersion check between `await configureSentry` and `startSettingsPersistence`

Covers: vault-lifecycle-5. Verdict: CONFIRMED_BY_TEST. Corruption (app config), P3.

Trace:
- `app-lifecycle.service.ts:199-200`: `await loadSettings`, then the version check. :201-205: `await configureSentry`. :210: `startSettingsPersistence(vaultPath)` with no check in between. The next check is at :240.
- Order of events:
  1. init(B) starts while init(A) is suspended in `configureSentry`. B's unconditional `stopSettingsPersistence` (:150) finds no session yet.
  2. A resumes and starts a session for path A, with baseline = A's settings.
  3. B's `loadSettings` puts B's settings in the store.
  4. Either A's effect debounce flush, or B's `startSettingsPersistence` -> `stopSettingsPersistence` -> `flushSettingsPersistence`, writes B's settings to `session.path` = A (`settings-persistence.svelte.ts:79-83`).
- Reachability: there is no auto-open of the last vault at launch (`vaultPath` starts null and only `switchVault` opens one). So the overlap needs init(B) to start inside A's `configureSentry` window:
  - With Sentry off (the default) and no active client, that window is one IPC (`sentry.service.ts:39-56`).
  - It grows to `Sentry.close(2000)` only when a client was active.
  - Triggers: two deep links to different vaults in one batch or in quick succession (the `onOpenUrl` batch loop is serialized, but `switchVault` returns before init runs), or a deep link arriving while the user opens a recent vault.
  - Millisecond timing, so P3, even though the result is a silent full replacement of vault A's settings.

Test: `settings-superseded-init.test.ts` (lifecycle harness copied from `app-lifecycle.service.test.ts`, real `settings.service` and `settings-persistence`, in-memory plugin-fs, Sentry gated)
```
× does not write vault B settings into vault A when init(B) starts while init(A) awaits configureSentry
  AssertionError: expected 'B-journal' to be 'A-journal'
```
(The "Failed to build content order: entries is not iterable" stderr comes from B's later steps under the stub `invoke` and does not affect the assertion.)

Fix sketch: add `if (initVersion !== version) return;` right after the `configureSentry` try/catch, before `startSettingsPersistence`.

## Not verified

- I did not observe real macOS ENOSPC/APFS behavior (whether truncate-then-write leaves 0 bytes). That is inferred from the upstream open flags.
- iCloud/Dropbox sync of `.kokobrain/trash` was not exercised. I assume dot-folders sync, which is the default for both.
- The Rust history cleanup was read, not run.
