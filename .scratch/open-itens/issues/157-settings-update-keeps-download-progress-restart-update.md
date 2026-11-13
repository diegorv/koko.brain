# 157: Settings > Update keeps the download progress and Restart to update across closing Settings or changing section, and a second check cannot start a second download

**Origin:** `audit-2026-11-05` Issue 39, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** The updater state is component-local: status, errorMessage, pendingUpdate, downloadProgress and totalBytes are $state in UpdateSection.svelte:94-99. SettingsPanel destroys the section when the panel closes (SettingsPanel.svelte:110) or the section changes (:99, :153), while the plugin:updater|download_and_install invoke (UpdateSection.svelte:178-181) keeps running with nothing left to show it. On remount the section is idle with a Check button: Restart to update (:247-250) is gone although the update is already installed, and Check (:240) runs check_for_update_on_channel again (the running app is still the old version, so it finds the same update) and downloads and installs a second time, overlapping the first if it is still running. Fix direction: hold the update flow state outside the component (a small module store next to update-check.service.ts, or in it), so a remounted section shows Checking, Downloading n% or Restart to update, and ignore or disable Check while a check or download is in flight. handleChannelChange (:63-72) keeps resetting that state.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/core/settings/UpdateSection.remount.test.ts (next to UpdateSection.restart.test.ts, same mocks): check_for_update_on_channel resolves an update and plugin:updater|download_and_install resolves; click Check, wait for Restart to update, unmount and remount UpdateSection; the remounted section shows Restart to update and no Check button. It fails today.
- [ ] With download_and_install still pending, unmount and remount: the section shows Downloading, and no second check_for_update_on_channel or download_and_install call is made.
- [ ] Changing the release channel still clears a pending Restart to update.
- [ ] Restart to update still runs the exit flush before relaunch (UpdateSection.restart.test.ts stays green).
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Ux/medium, but updates are an occasional flow, so it is placed at the end of the medium group.
- **Trigger:** Settings > Update > Check finds an update and starts Downloading; the user closes Settings or opens another section while it downloads (or after Restart to update appears), then comes back to Update.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/core/settings/sections/UpdateSection.svelte:94-99 status/errorMessage/pendingUpdate/downloadProgress/totalBytes are component $state; :142-190 checkForUpdates sets status 'checking' then 'downloading', awaits invoke('plugin:updater|download_and_install') at :178-181 and only then sets 'ready'; :239-242 idle shows Check, :247-250 ready shows Restart to update. src/lib/app/SettingsPanel.svelte:110 {#if settingsPanelStore.isOpen} and :99/:153 SectionContent destroy the section on close or section change. src/lib/core/settings/update-check.service.ts:19-37 is a launch-time check only and holds no state for the section. No other download_and_install or relaunch caller in src/lib (rg).
- **Source:** audit 2026-11-05, domain `shell`, finding `N-shell-02` (from shell-ux-5). Size M.

**Second opinion (audit 2026-11-05, round 2):** upheld (ux, low). status, pendingUpdate, downloadProgress and totalBytes are component $state (UpdateSection.svelte:94-99). checkForUpdates awaits download_and_install and only then sets 'ready'. SettingsPanel unmounts the section on close or section change. update-check.service.ts holds no state for the section. On remount the section is idle and shows Check again. Updates are an occasional flow.

## Comments
