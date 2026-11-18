# 22: Settings switches: dependents disable while their parent is off, and a switch that failed to start turns back off

**Origin:** design review 2026-11-17, proposals P53 (part) and P16 (items 2 and 4), prototypes `.scratch/design-review/prototypes/settings-auto-organize.html` (section `P53`) and `.scratch/design-review/prototypes/feedback-components.html` (section `P16`), research `.scratch/ux-quick-wins/research/verdict-settings-a.md`, `verdict-feedback-a.md` and `breakdown.md` (old ticket 29).

**What to build:**

1. **Auto-pin.** `disabled={!autoPin && !autoOpen}` on the switch (`src/lib/core/settings/sections/PeriodicNotesSection.svelte:58-63`). Auto-pin does nothing while Auto-open is off (`src/lib/plugins/periodic-notes/periodic-notes.service.ts:93-94,131` return early).
2. **Heartbeat and Profile decoration plugins.** Each switch gets `disabled={!value && !(debugLogToFile || debugTauriLogToFile)}` (`src/lib/core/settings/sections/TroubleshootingSection.svelte:65-80` and `:93-102`). Both need a log file to write to, as their descriptions say.
3. **A switch that is on is never disabled**, so it can always be turned off. Stored values never change when a parent flips. These three switches get an `aria-label` equal to their row label.
4. **Vault mods start failure** (`src/lib/app/LabsSection.svelte:26-29`). When `startModsHost` rejects: toast "Could not start vault mods", `modsEnabledStore.setEnabled(false)` and `stopModsHost()`. The stop is needed because `startModsHost` registers its file-change listener before its first await (`src/lib/plugins/mods/mods-host.service.ts:1077`), so a failed start leaves a live listener.
5. **Debug log start failure** (`TroubleshootingSection.svelte:35-50` and `:140-155`). `initLogSession()` catches its own errors and resolves (`src/lib/utils/log.service.ts:70-72`), so the switch stays on with no session. After it resolves with `!isLogSessionActive()`: toast, set the switch that started it back to false (`settingsStore.updateDebugLogToFile(false)` or `updateDebugTauriLogToFile(false)`), and do not start the heartbeat. When the other log already holds a session, `initLogSession` is a no-op and the new switch stays on.

Not in this ticket: "Save mod run messages to file" stays as it is. It is a separate consent (mods-observability Issue 02), `TroubleshootingSection.test.ts:41-60` and `e2e/specs/settings.spec.ts:73-100` assert that it toggles with "Save debug log to file" off, and disabling it would also block revoking a privacy consent. Also out: the `help/documentation/19-settings.md` rows (mvp-claude changes that file).

**Size:** S.

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh settings.spec.ts` and `bash scripts/e2e.sh vault-mods.spec.ts`

- [x] Failing test first, new `src/tests/lib/core/settings/PeriodicNotesSection.test.ts` (real `settingsStore`): with Auto-open and Auto-pin off, Auto-pin is disabled; turning Auto-open on enables it; Auto-pin stored on with Auto-open off is enabled, clicking turns it off and then it is disabled. Its `aria-label` is "Auto-pin".
- [x] `src/tests/lib/core/settings/TroubleshootingSection.test.ts`: both log options off, Heartbeat and Profile decoration plugins are disabled; either log option on enables both; a stored-on Heartbeat with both logs off is enabled and can be turned off.
- [x] Failing test first, `src/tests/lib/app/LabsSection.test.ts` (mocks only `mods-host.service` and `svelte-sonner`, as it does now): `startModsHost` rejects; `modsEnabledStore.enabled` is false, `stopModsHost` ran and `toast.error` fired.
- [x] `TroubleshootingSection.test.ts` with `isLogSessionActive` false after `initLogSession`: `debugLogToFile` ends false, a toast fired and `startHeartbeat` was not called; same for the Tauri log switch. With the other log already active, turning one on keeps it on and fires no toast.
- [x] The consent test at `TroubleshootingSection.test.ts:41-60` passes unchanged, and so does the consent E2E at `e2e/specs/settings.spec.ts:73-100`.
- [x] No test mocks `settingsStore`; mocks are limited to `log.service`, `mods-host.service` and `svelte-sonner` (side-effect services).
- [x] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P53.** Dependent settings are described in text but never disabled. Disable a dependent control while its parent is off. Validation: revise (three switches only, and only while off).
- **P16.** Errors go to the wrong channel, to both channels, or nowhere. Item 2: the Vault mods switch stays on when the host fails to start. Item 4: the debug log switch stays on when no log session could start. Item 1 is done (`0de35de11`); item 3 (File History restore) is in ticket 23.

## Problem

Auto-pin, Heartbeat and Profile decoration plugins can be switched on with nothing behind them, so the person believes a feature runs that does not. Vault mods shows on after a failed start and the person gets no word of it. "Save debug log to file" shows on although no log file exists.

## Evidence

Checked at `085b23c5d`.

- `PeriodicNotesSection.svelte:58-63`: Auto-pin has no `disabled`. `periodic-notes.service.ts:93-94` and `:130-131`: `if (!autoOpen) return;`.
- `TroubleshootingSection.svelte:65-80` (Heartbeat) and `:93-102` (Profile decoration plugins): no `disabled`; the log switches start the session at `:35-50` and `:140-155` and ignore its outcome.
- `src/lib/utils/log.service.ts:60-72,218-220`: `initLogSession` catches and `console.error`s; `isLogSessionActive` reports the outcome.
- `LabsSection.svelte:26-29`: the `.catch` only calls `error()`. `mods-host.service.ts:1072-1077`: listener registered before the first await. `stopModsHost` at `:1142`.
- No E2E reaches Auto-pin, Heartbeat or Profile decoration plugins (`e2e/specs` has no mention of them).

## Sequence with

Ticket 36 (periodic notes path examples) edits `PeriodicNotesSection.svelte` and the test file this ticket creates; it is blocked by this ticket. Ticket 31 names controls in the Auto Organize section only: no shared file. Ticket 38 (settings text you can select) edits `SettingItem.svelte`, `BuildInfo.svelte`, `UpdateSection.svelte`: no shared file. Ticket 37 (mods) edits the mods plugin files, not `LabsSection.svelte`.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping. Defaults (not individually answered): this ticket had no owner question in the old breakdown.
- 2026-11-18, deliver (issue/22-settings-switches-dependents-disable-while-parent): Auto-pin disables while Auto-open is off; Heartbeat and Profile decoration plugins disable while both log options are off; a log switch whose session failed to start turns back off with a toast; Vault mods turn back off (host stopped first, toast) when the host fails to start. Tests: pnpm check exit 0; full suite at 14b49e3d0 exit 0 (661 files, 17634 passed, 56 skipped). Reviews: round 1 APPROVED, round 2 APPROVED (one nit, no change).
