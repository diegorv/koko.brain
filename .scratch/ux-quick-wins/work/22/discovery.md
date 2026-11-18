# Issue 22 discovery: dependent switches disable, failed starts turn back off

No `spec.md` in `.scratch/ux-quick-wins/` (README.md only); the Issue file is the spec.

## Files that change

- `src/lib/core/settings/sections/PeriodicNotesSection.svelte:58-63`: Auto-pin `Switch` gets `aria-label="Auto-pin"` and `disabled={!autoPin && !autoOpen}` (both read from `settingsStore.periodicNotes.daily`, `?? false`).
- `src/lib/core/settings/sections/TroubleshootingSection.svelte`:
  - `:65-80` Heartbeat and `:93-102` Profile decoration plugins: `aria-label` = row label, `disabled={!value && !(debugLogToFile || debugTauriLogToFile)}`.
  - `:35-50` and `:140-155`: one local `startLogSession(turnOff)` helper: `await initLogSession()`; if `!isLogSessionActive()`, `toast.error(...)`, `turnOff()` (`updateDebugLogToFile(false)` / `updateDebugTauriLogToFile(false)`), return; else start the heartbeat when `debugHeartbeat` is on. Import `toast` from `svelte-sonner`.
- `src/lib/app/LabsSection.svelte:27-29`: the `.catch` also calls `toast.error('Could not start vault mods')`, `modsEnabledStore.setEnabled(false)`, `stopModsHost()`.

## Tests (test-first, real stores)

- New `src/tests/lib/core/settings/PeriodicNotesSection.test.ts`: mount/flushSync/`settingsStore.reset()` helper copied from `TroubleshootingSection.test.ts:14-39`. No Tauri call in the tree, no mock.
- `src/tests/lib/core/settings/TroubleshootingSection.test.ts`: add `vi.mock('svelte-sonner')`; the log switches have no `aria-label`, so the test finds them by row label; drive `vi.mocked(isLogSessionActive)` / `initLogSession` (already automocked). Disabled tests for Heartbeat and Profile; failure tests for both log switches; "other log already active" keeps the switch on, no toast. Consent test `:41-60` untouched.
- `src/tests/lib/app/LabsSection.test.ts`: `startModsHost.mockRejectedValueOnce`, click, await a microtask, assert store false, `stopModsHost` ran, `toast.error` with the message.

## Risks

- The log.service automock returns `undefined` for `initLogSession`; tests that turn a log switch on must set `mockResolvedValue(undefined)`.
- bits-ui `Switch` passes `disabled` to the button, so `.click()` does nothing while disabled (asserted via `disabled` attribute and store state).
- A user flipping the switch off and on during a slow `initLogSession` or mods start is not handled (rare, visible, recoverable).

## Defaults taken

- Log failure toast text: "Could not start the log file" for both switches, since both open the same session file (the Issue names no text).
- `aria-label` added only to the three dependent switches, per item 3.
