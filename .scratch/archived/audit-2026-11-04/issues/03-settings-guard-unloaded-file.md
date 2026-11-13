# 03: Do not overwrite settings.json that was never loaded (read error or failed backup)

**What to build:** When the vault opens and settings.json cannot be read (exists/readTextFile throws), or it does not parse and the backup copy fails, the app runs on defaults. No later settings change may replace the file on disk until its bytes are safe. Today the next toggle, or an auto-check writing updates.lastCheckedAt, overwrites it. Fix at the seam between load and persistence. loadSettings (src/lib/core/settings/settings.service.ts:36-75) returns a load outcome, for example 'loaded' | 'defaults-written' | 'file-protected'. initializeVault (src/lib/app/lifecycle/app-lifecycle.service.ts:199-211) passes that outcome on. settings-persistence.svelte.ts never writes settings.json for the rest of a session whose outcome is 'file-protected', including the flush on vault switch. Update the loadSettings docstring (:27-34), the lifecycle comment (:207-210) and the toast wording, so 'left unchanged' stays true.

**Blocked by:** none

**Status:** wontfix

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing test first, in src/tests/lib/core/settings/settings-persistence.test.ts. Mock only @tauri-apps/plugin-fs and svelte-sonner, and use the real settingsStore, loadSettings and startSettingsPersistence. readTextFile rejects, then await loadSettings('/vault'), startSettingsPersistence('/vault'), settingsStore.updateLayout({ railPanelsVisible: false }), and advance timers 500 ms. Expect writeTextFile never called with '/vault/.kokobrain/settings.json' for the rest of the session. It fails today.
- [ ] The same test with readTextFile resolving to '{"periodicNotes": ' and copyFile rejecting gives the same assertion.
- [ ] A launch-time mutation (settingsStore.updateUpdates({ lastCheckedAt: 1 })) after an unreadable load does not overwrite settings.json.
- [ ] Happy path still holds: a valid settings.json that loaded writes the change after 500 ms (existing settings-persistence tests stay green unchanged).
- [ ] A missing or blank settings.json still gets defaults written (settings.service.test.ts existing cases stay green).
- [ ] The toast text matches what will actually happen to the file for the rest of the session.
- [ ] Frontend gate: pnpm check, pnpm vitest run and pnpm build all pass.

## Notes

- **Source:** audit 2026-11-04 (`.scratch/audit-2026-11-04/findings.md`), deep dive by an opus verifier the same day. Wave 1 of the parallel plan.
- **Finding `settings-unreadable`:** real, medium. Root cause: startSettingsPersistence takes the current store as the on-disk baseline without checking how loadSettings ended. When the read failed, the store holds defaults the file never contained, so the first settings mutation writes defaults plus that change over the unread file.
  Evidence: src/lib/core/settings/settings.service.ts:40-47: the exists/readTextFile catch calls useDefaultSettings(), toasts 'the file was left unchanged' and returns. loadSettings returns void, so the caller cannot tell this case apart. src/lib/app/lifecycle/app-lifecycle.service.ts:199 awaits loadSettings, then :211 calls startSettingsPersistence(vaultPath) unconditionally. The comment at :207-210 assumes the file was read. src/lib/core/settings/settings-persistence.svelte.ts:49 sets lastWritten = serialize(), which is the defaults. The effect at :57 arms the 500 ms timer on any diff, and flush at :82 calls writeSettingsFile, which runs writeTextFile at settings.service.ts:258 with no guard or backup. Test gap: settings.service.test.ts:423-449 stops at loadSettings.
- **Finding `settings-backup-failed`:** real, low. Root cause: Same root cause as settings-unreadable: resetBrokenSettingsFile returns early when the backup copy fails, leaving defaults in the store, and persistence then starts with defaults as its baseline. The first mutation overwrites the only copy of the broken file.
  Evidence: src/lib/core/settings/settings.service.ts:209-218: useDefaultSettings(), then copyFile, then a catch that toasts 'left unchanged' and returns. Back in loadSettings :62-66 it returns normally. app-lifecycle.service.ts:211 starts persistence, settings-persistence.svelte.ts:49 takes the baseline, and :82 writes. Low because it needs copyFile to fail while writeTextFile on the same directory succeeds. Test settings.service.test.ts:393-405 stops at loadSettings.
- **Owner decision (2026-11-04):** D3 (a): a session whose settings.json could not be read, or could not be backed up, never writes settings.json; the toast says changes in this session will not be saved.
- Use the real stores, never mock settings.store or settings.logic. stopSettingsPersistence on a vault switch (settings-persistence.svelte.ts:88-101) flushes through the same path, so the guard must cover flush as well as the debounced write. update-check.service.ts:27 is a mutation trigger with no user action when autoCheck is on. Unverified: whether plugin-fs readTextFile rejects invalid UTF-8 (from memory only).
- **Size:** M.

## Comments

- 2026-11-06: migrated to `.scratch/open-itens/issues/030-session-whose-settings-json-was-never-loaded.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
