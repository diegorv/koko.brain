# 10: A settings load failure writes defaults over settings.json and purges File History at the 7-day default

**Status:** wontfix

**Blocked by:** none
Priority: P1
Severity: data-loss
Source: file I/O audit, deep-dive group(s) o05-settings-history, o06-trash-settings-io (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

Reviewer note: read settings.service.ts loadSettings: the catch block sets DEFAULT_SETTINGS (retentionDays 7) and saves them; the try block also lands in that catch when only the write-back fails. cleanup_history deletes all snapshots older than retention+30 days.

## A settings load failure resets the store to defaults, overwrites settings.json, and the same open runs cleanup_history with retention 7

- Verdict: CONFIRMED_BY_TEST (deep dive priority P1, severity data-loss)
- Claims covered: cross-cutting-7, recovery-1, vault-lifecycle-2, fidelity-11

**How a user hits it.** Needs settings.json to be unreadable or invalid: a crash or power loss during the in-place truncate+write (it runs at every vault open and on every debounced settings change), a hand edit with a JSON syntax error, or a transient read/write I/O error. A third path is a successful parse whose write-back fails (EACCES/ENOSPC): that also resets the store to defaults. Uncommon but realistic. The extra history purge only matters when the user raised retention above the default 7. The settings loss hits everyone.

**Recoverable from.** Settings: none in-app (no backup, no toast); Time Machine or git only. Purged snapshots: none (DB rows deleted). Exception: .kokobrain/snapshots-backup/*.md files from snapshotBackupEnabled stay on disk.

**Root cause.** src/lib/core/settings/settings.service.ts:166-178 (the catch overwrites with defaults and also catches the :163 write-back failure); src/lib/app/lifecycle/app-lifecycle.service.ts:273-277 (cleanup runs without checking that the load succeeded)

**Evidence.** settings.service.ts:44/:54 throw -> catch :166 -> setSettings(DEFAULT) :170 -> saveSettings :172 -> writeSettingsFile :193 (plugin-fs writeTextFile). Fetched tauri-apps/plugins-workspace v2 plugins/fs/src/commands.rs write_file_inner: OpenOptions truncate:true, create:true, one write_all, no temp/rename, no sync_all. app-lifecycle.service.ts:198 awaits loadSettings, then :273 reads settingsStore.history.retentionDays (default 7, settings.store.svelte.ts:96) -> history.rs:143-157 -> history_repo.rs:82-89 DELETE WHERE created_at < now-(days+30)d for every file, the latest row included; :93-109 thins the middle range. auto-move.service.ts:59-62 loads in-memory defaults on a parse error; :69-87 writes the store state over the file on the next rules save.

**Limits found while trying to refute.** Partly downgraded: a user on the default retention (7) loses no extra history. The empty-file case is a separate branch (:45-52), not the catch, but it has the same effect.

**Repro test.** `.scratch/file-io-audit/repro/o05-settings-history/settings-load-failure.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
3 failed: truncated file -> AssertionError: expected true to be false (overwritten, original bytes not kept); transient read error -> AssertionError: expected [ Array(1) ] to deeply equal [] (defaults written to settings.json); valid file + write EACCES -> AssertionError: expected 7 to be 365 (settingsStore.history.retentionDays)
```

**Fix sketch.** In the catch: do not write. Rename the bad file to settings.json.corrupt-<ts>, show a toast, and return loaded:false. initializeVault skips cleanup_history when loaded is false. Move the :163 write-back out of the try so a write failure keeps the parsed settings. Write settings atomically (temp+rename, e.g. through Rust vault_fs::write_atomic).

## loadSettings replaces a successfully read settings.json with defaults when only the optional write-back fails, then writes those defaults (and the session prunes file history with retention 7)

- Verdict: CONFIRMED_BY_TEST (deep dive priority P2, severity data-loss)
- Claims covered: vault-lifecycle-3

**How a user hits it.** Runs on every vault open, but it takes a failed settings.json write right then: a transient error such as EBUSY (the second write at :172 then succeeds and overwrites the file with defaults), or a persistent one (locked or read-only file, read-only volume, full disk), where the session runs on defaults and the first settings change after writes recover persists them. The history pruning hurts only users who raised retentionDays above the default 7, and needs the vault DB to stay writable. A full disk may also make the SQLite DELETE fail.

**Recoverable from.** settings.json: no backup is kept; only an external backup restores it. Pruned history snapshots are gone from the DB, so only a backup of the history DB brings them back.

**Root cause.** src/lib/core/settings/settings.service.ts:163 (optional write-back inside the same try as the read/parse) and :166-175 (catch replaces the store with DEFAULT_SETTINGS and writes them)

**Evidence.** settings.service.ts:162 setSettings(merged), :163 await saveSettings, which throws into the catch at :166, then :168-170 setSettings(defaults) and :172 saveSettings(defaults). app-lifecycle.service.ts:273-277 calls cleanup_history with settingsStore.history.retentionDays (default 7, settings.store.svelte.ts:96). history.rs:143-158 runs delete_old_snapshots (history_repo.rs:82-89, DELETE ... WHERE created_at < now-37d) and thins the 7-37 day range to one snapshot per file per day. settings-persistence.svelte.ts:50 takes the defaults as its baseline. Upstream write_file_inner truncates on open, so a crash or ENOSPC can leave the file empty, and the empty-file branch (:45-52) writes defaults on the next open (that part is proved by trace only). Related: invalid JSON is overwritten with defaults at :172 without a backup.

**Limits found while trying to refute.** Kept at P2, not P1: note content is never touched, and the history loss needs both a raised retention and a settings-only write failure while the DB stays writable.

**Repro test.** `.scratch/file-io-audit/repro/o06-trash-settings-io/settings-writeback-failure.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
× keeps the settings it just read when only the write-back fails: AssertionError: expected 7 to be 365 (settingsStore.history.retentionDays)
× does not overwrite a readable settings.json with defaults after one failed write-back: AssertionError: expected 7 to be 365 (on-disk history.retentionDays)
```

**Fix sketch.** Keep the try around read and parse only. Make the write-back failure non-fatal: log it, keep the merged settings, and never write defaults over a file that was read successfully. Copy a corrupt file to settings.json.bak before replacing it. Write atomically (temp file plus rename).

## Comments

- 2026-11-06: migrated to `.scratch/open-itens/issues/030-session-whose-settings-json-was-never-loaded.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
