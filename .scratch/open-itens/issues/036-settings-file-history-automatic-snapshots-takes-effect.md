# 036: Settings > File History > Automatic snapshots takes effect on the next save, with no vault reopen

**Origin:** `audit-2026-11-05` Issue 46, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** The switch (src/lib/core/settings/sections/FileHistorySection.svelte:20-24) calls settingsStore.updateHistory (settings.store.svelte.ts:276), which only stores the value. The after-save observer is registered once, during vault init, and only when the flag is on (src/lib/app/lifecycle/app-lifecycle.service.ts:269-274). Nothing else reads history.enabled. Neither saveSnapshotForFile (src/lib/features/file-history/file-history.service.ts:111-124) nor the observer (:190-196) checks it. So turning snapshots off keeps writing note text to .kokobrain/kokobrain.db until the vault reopens, and turning them on records nothing for that session. Simplest fix: always register the hook and read settingsStore.history.enabled when a save happens, in the observer or at the start of saveSnapshotForFile. Manual snapshot paths, if any, keep their own behavior.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/features/file-history/file-history.service.test.ts (the registerFileHistoryHook block at :262): register the hook with history.enabled true, then call settingsStore.updateHistory({ enabled: false }) and fire the captured observer. Assert that invoke was not called with 'save_snapshot'. It fails today.
- [ ] Turning the setting back on in the same session makes the next save record a snapshot.
- [ ] Vault init with history.enabled false records no snapshot on save (src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts or the service test).
- [ ] Use the real settingsStore; do not mock it.
- [ ] Gate: pnpm check, pnpm vitest run.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Ux/low. This is a setting that is rarely toggled.
- **Trigger:** With a vault open, turn Automatic snapshots off (or on), then keep editing and saving notes in the same session.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/core/settings/sections/FileHistorySection.svelte:20-24 (switch) -> src/lib/core/settings/settings.store.svelte.ts:276 (updateHistory only stores the value) -> src/lib/app/lifecycle/app-lifecycle.service.ts:269-274 (only reader of history.enabled, at init) -> src/lib/features/file-history/file-history.service.ts:190-196 (observer has no flag check) and :111-124 (saveSnapshotForFile reads only snapshotBackupEnabled). help/documentation/15-file-history.md:42 does not mention a restart. Earlier scout noted it but no Issue was filed: .scratch/archived/file-io-audit/raw/scout-history.md:191.
- **Source:** audit 2026-11-05, domain `file-io`, finding `N-file-io-10` (from file-io-spec-3). Size S.

**Second opinion (audit 2026-11-05, round 2):** upheld (ux, low). The only reader of history.enabled is app-lifecycle.service.ts:269, at vault init. The FileHistorySection switch only calls updateHistory. registerFileHistoryHook (file-history.service.ts:190-196) and saveSnapshotForFile (:111-124) never read the flag. saveSnapshotForFile has one caller (the observer), so putting the check in it does not affect any manual path.

## Comments
