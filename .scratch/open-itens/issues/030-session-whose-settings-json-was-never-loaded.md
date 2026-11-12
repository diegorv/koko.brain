# 030: A session whose settings.json was never loaded never writes it and never purges File History at the default retention

**Origin:** `audit-2026-11-05` Issue 115, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**Migrated from:** `.scratch/archived/audit-2026-11-04/issues/03-settings-guard-unloaded-file.md` (audit 2026-11-05). Priority: corner case (bucket 4-corner). 09ec9f363 fixed most of Issue 10. Its remaining read-error overwrite and history-purge legs follow from the same load outcome. It needs a settings read failure. D3 (a) is recorded.

**Audit check at `5f8003d67`:** still_present (corner, low). src/lib/core/settings/settings.service.ts:36 loadSettings returns Promise<void>; :40-48 the exists/readTextFile catch calls useDefaultSettings(), toasts 'the file was left unchanged' (:45) and returns with no outcome. :209-218 resetBrokenSettingsFile returns after a copyFile failure with defaults in the store (toast :216). src/lib/app/lifecycle/app-lifecycle.service.ts:199 awaits loadSettings, :211 startSettingsPersistence(vaultPath) runs unconditionally. src/lib/core/settings/settings-persistence.svelte.ts:50 lastWritten = serialize() (the defaults), :57-62 any diff arms the 500 ms timer, :79-83 flush calls writeSettingsFile, which runs writeTextFile at settings.service.ts:258 with no guard. :96-105 stopSettingsPersistence flushes through the same path. update-check.service.ts:27 writes updates.lastCheckedAt at launch with no user action when autoCheck is on. No 'file-protected' or load-outcome code at HEAD. The last change to settings.service.ts is 09ec9f363 (the backup), and to app-lifecycle.service.ts it is 9d1c8d927 (views), which does not touch this path.

**Stale in the text below:** Line refs drifted a little: loadSettings is :36-76 (Issue says :36-75), its docstring :26-35 (says :27-34), the stop function :96-105 (says :88-101), the baseline :50 (Notes say :49). The rest is accurate.

**What to build:** When the vault opens and settings.json cannot be read (exists/readTextFile throws), or it does not parse and the backup copy fails, the app runs on defaults. No later settings change may replace the file on disk until its bytes are safe. Today the next toggle, or an auto-check writing updates.lastCheckedAt, overwrites it. Fix at the seam between load and persistence. loadSettings (src/lib/core/settings/settings.service.ts:36-75) returns a load outcome, for example 'loaded' | 'defaults-written' | 'file-protected'. initializeVault (src/lib/app/lifecycle/app-lifecycle.service.ts:199-211) passes that outcome on. settings-persistence.svelte.ts never writes settings.json for the rest of a session whose outcome is 'file-protected', including the flush on vault switch. Update the loadSettings docstring (:27-34), the lifecycle comment (:207-210) and the toast wording, so 'left unchanged' stays true.

**Blocked by:** none

**Status:** resolved

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] Failing test first, in src/tests/lib/core/settings/settings-persistence.test.ts. Mock only @tauri-apps/plugin-fs and svelte-sonner, and use the real settingsStore, loadSettings and startSettingsPersistence. readTextFile rejects, then await loadSettings('/vault'), startSettingsPersistence('/vault'), settingsStore.updateLayout({ railPanelsVisible: false }), and advance timers 500 ms. Expect writeTextFile never called with '/vault/.kokobrain/settings.json' for the rest of the session. It fails today.
- [x] The same test with readTextFile resolving to '{"periodicNotes": ' and copyFile rejecting gives the same assertion.
- [x] A launch-time mutation (settingsStore.updateUpdates({ lastCheckedAt: 1 })) after an unreadable load does not overwrite settings.json.
- [x] Happy path still holds: a valid settings.json that loaded writes the change after 500 ms (existing settings-persistence tests stay green unchanged).
- [x] A missing or blank settings.json still gets defaults written (settings.service.test.ts existing cases stay green).
- [x] The toast text matches what will actually happen to the file for the rest of the session.
- [x] When settings.json was not loaded (read error or failed backup), initializeVault skips cleanup_history (app-lifecycle.service.ts:276-278), so File History is not purged at the default retention; tested in src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts.
- [x] Frontend gate: pnpm check, pnpm vitest run and pnpm build all pass.

## Notes

- **Source:** audit 2026-11-04 (`.scratch/archived/audit-2026-11-04/findings.md`), deep dive by an opus verifier the same day. Wave 1 of the parallel plan.
- **Finding `settings-unreadable`:** real, medium. Root cause: startSettingsPersistence takes the current store as the on-disk baseline without checking how loadSettings ended. When the read failed, the store holds defaults the file never contained, so the first settings mutation writes defaults plus that change over the unread file.
  Evidence: src/lib/core/settings/settings.service.ts:40-47: the exists/readTextFile catch calls useDefaultSettings(), toasts 'the file was left unchanged' and returns. loadSettings returns void, so the caller cannot tell this case apart. src/lib/app/lifecycle/app-lifecycle.service.ts:199 awaits loadSettings, then :211 calls startSettingsPersistence(vaultPath) unconditionally. The comment at :207-210 assumes the file was read. src/lib/core/settings/settings-persistence.svelte.ts:49 sets lastWritten = serialize(), which is the defaults. The effect at :57 arms the 500 ms timer on any diff, and flush at :82 calls writeSettingsFile, which runs writeTextFile at settings.service.ts:258 with no guard or backup. Test gap: settings.service.test.ts:423-449 stops at loadSettings.
- **Finding `settings-backup-failed`:** real, low. Root cause: Same root cause as settings-unreadable: resetBrokenSettingsFile returns early when the backup copy fails, leaving defaults in the store, and persistence then starts with defaults as its baseline. The first mutation overwrites the only copy of the broken file.
  Evidence: src/lib/core/settings/settings.service.ts:209-218: useDefaultSettings(), then copyFile, then a catch that toasts 'left unchanged' and returns. Back in loadSettings :62-66 it returns normally. app-lifecycle.service.ts:211 starts persistence, settings-persistence.svelte.ts:49 takes the baseline, and :82 writes. Low because it needs copyFile to fail while writeTextFile on the same directory succeeds. Test settings.service.test.ts:393-405 stops at loadSettings.
- **Owner decision (2026-11-04):** D3 (a): a session whose settings.json could not be read, or could not be backed up, never writes settings.json; the toast says changes in this session will not be saved.
- Use the real stores, never mock settings.store or settings.logic. stopSettingsPersistence on a vault switch (settings-persistence.svelte.ts:88-101) flushes through the same path, so the guard must cover flush as well as the debounced write. update-check.service.ts:27 is a mutation trigger with no user action when autoCheck is on. Unverified: whether plugin-fs readTextFile rejects invalid UTF-8 (from memory only).
- **Size:** M.

## Audit 2026-11-05 additions

### Merged from `.scratch/archived/file-io-audit/issues/10-settings-load-failure-defaults.md`

That Issue was folded into this one by the audit; its text follows.

### 10: A settings load failure writes defaults over settings.json and purges File History at the 7-day default

**Status:** needs-triage

**Blocked by:** none
Priority: P1
Severity: data-loss
Source: file I/O audit, deep-dive group(s) o05-settings-history, o06-trash-settings-io (raw reports in .scratch/archived/file-io-audit/deep/raw/), verified at c4bfee07

Reviewer note: read settings.service.ts loadSettings: the catch block sets DEFAULT_SETTINGS (retentionDays 7) and saves them; the try block also lands in that catch when only the write-back fails. cleanup_history deletes all snapshots older than retention+30 days.

### A settings load failure resets the store to defaults, overwrites settings.json, and the same open runs cleanup_history with retention 7

- Verdict: CONFIRMED_BY_TEST (deep dive priority P1, severity data-loss)
- Claims covered: cross-cutting-7, recovery-1, vault-lifecycle-2, fidelity-11

**How a user hits it.** Needs settings.json to be unreadable or invalid: a crash or power loss during the in-place truncate+write (it runs at every vault open and on every debounced settings change), a hand edit with a JSON syntax error, or a transient read/write I/O error. A third path is a successful parse whose write-back fails (EACCES/ENOSPC): that also resets the store to defaults. Uncommon but realistic. The extra history purge only matters when the user raised retention above the default 7. The settings loss hits everyone.

**Recoverable from.** Settings: none in-app (no backup, no toast); Time Machine or git only. Purged snapshots: none (DB rows deleted). Exception: .kokobrain/snapshots-backup/*.md files from snapshotBackupEnabled stay on disk.

**Root cause.** src/lib/core/settings/settings.service.ts:166-178 (the catch overwrites with defaults and also catches the :163 write-back failure); src/lib/app/lifecycle/app-lifecycle.service.ts:273-277 (cleanup runs without checking that the load succeeded)

**Evidence.** settings.service.ts:44/:54 throw -> catch :166 -> setSettings(DEFAULT) :170 -> saveSettings :172 -> writeSettingsFile :193 (plugin-fs writeTextFile). Fetched tauri-apps/plugins-workspace v2 plugins/fs/src/commands.rs write_file_inner: OpenOptions truncate:true, create:true, one write_all, no temp/rename, no sync_all. app-lifecycle.service.ts:198 awaits loadSettings, then :273 reads settingsStore.history.retentionDays (default 7, settings.store.svelte.ts:96) -> history.rs:143-157 -> history_repo.rs:82-89 DELETE WHERE created_at < now-(days+30)d for every file, the latest row included; :93-109 thins the middle range. auto-move.service.ts:59-62 loads in-memory defaults on a parse error; :69-87 writes the store state over the file on the next rules save.

**Limits found while trying to refute.** Partly downgraded: a user on the default retention (7) loses no extra history. The empty-file case is a separate branch (:45-52), not the catch, but it has the same effect.

**Repro test.** `.scratch/archived/file-io-audit/repro/o05-settings-history/settings-load-failure.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
3 failed: truncated file -> AssertionError: expected true to be false (overwritten, original bytes not kept); transient read error -> AssertionError: expected [ Array(1) ] to deeply equal [] (defaults written to settings.json); valid file + write EACCES -> AssertionError: expected 7 to be 365 (settingsStore.history.retentionDays)
```

**Fix sketch.** In the catch: do not write. Rename the bad file to settings.json.corrupt-<ts>, show a toast, and return loaded:false. initializeVault skips cleanup_history when loaded is false. Move the :163 write-back out of the try so a write failure keeps the parsed settings. Write settings atomically (temp+rename, e.g. through Rust vault_fs::write_atomic).

### loadSettings replaces a successfully read settings.json with defaults when only the optional write-back fails, then writes those defaults (and the session prunes file history with retention 7)

- Verdict: CONFIRMED_BY_TEST (deep dive priority P2, severity data-loss)
- Claims covered: vault-lifecycle-3

**How a user hits it.** Runs on every vault open, but it takes a failed settings.json write right then: a transient error such as EBUSY (the second write at :172 then succeeds and overwrites the file with defaults), or a persistent one (locked or read-only file, read-only volume, full disk), where the session runs on defaults and the first settings change after writes recover persists them. The history pruning hurts only users who raised retentionDays above the default 7, and needs the vault DB to stay writable. A full disk may also make the SQLite DELETE fail.

**Recoverable from.** settings.json: no backup is kept; only an external backup restores it. Pruned history snapshots are gone from the DB, so only a backup of the history DB brings them back.

**Root cause.** src/lib/core/settings/settings.service.ts:163 (optional write-back inside the same try as the read/parse) and :166-175 (catch replaces the store with DEFAULT_SETTINGS and writes them)

**Evidence.** settings.service.ts:162 setSettings(merged), :163 await saveSettings, which throws into the catch at :166, then :168-170 setSettings(defaults) and :172 saveSettings(defaults). app-lifecycle.service.ts:273-277 calls cleanup_history with settingsStore.history.retentionDays (default 7, settings.store.svelte.ts:96). history.rs:143-158 runs delete_old_snapshots (history_repo.rs:82-89, DELETE ... WHERE created_at < now-37d) and thins the 7-37 day range to one snapshot per file per day. settings-persistence.svelte.ts:50 takes the defaults as its baseline. Upstream write_file_inner truncates on open, so a crash or ENOSPC can leave the file empty, and the empty-file branch (:45-52) writes defaults on the next open (that part is proved by trace only). Related: invalid JSON is overwritten with defaults at :172 without a backup.

**Limits found while trying to refute.** Kept at P2, not P1: note content is never touched, and the history loss needs both a raised retention and a settings-only write failure while the DB stays writable.

**Repro test.** `.scratch/archived/file-io-audit/repro/o06-trash-settings-io/settings-writeback-failure.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
× keeps the settings it just read when only the write-back fails: AssertionError: expected 7 to be 365 (settingsStore.history.retentionDays)
× does not overwrite a readable settings.json with defaults after one failed write-back: AssertionError: expected 7 to be 365 (on-disk history.retentionDays)
```

**Fix sketch.** Keep the try around read and parse only. Make the write-back failure non-fatal: log it, keep the merged settings, and never write defaults over a file that was read successfully. Copy a corrupt file to settings.json.bak before replacing it. Write atomically (temp file plus rename).


## Comments

- 2026-11-06: migrated from `.scratch/archived/audit-2026-11-04/issues/03-settings-guard-unloaded-file.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
- 2026-11-06: purge guard criterion added after the order review (the title promised it).
- 2026-11-12: delivered from branch issue/030-session-whose-settings-json-was-never-loaded. settings persistence no longer writes a settings.json the session could not load (read error or failed backup), and initializeVault skips the File History purge in that case; Tailwind no longer scans `.scratch/` (fixed `pnpm build`), and the persistence JSDoc says what omitting the outcome means. Full suite: 614 files passed, 15574 tests passed, 54 skipped, 1 todo (exit 0). Reviews: round 1 CHANGES_REQUESTED (review.md), fix round ran, round 2 APPROVED (review-2.md, one nit needing no change).
