# 25 discovery: drain in-flight calendar writes before vault teardown and window close

## Files that change
- `src/lib/core/app-lifecycle/app-lifecycle.service.ts:64` (extend the existing `resetEventCalendar` import with `drainEventCalendarWrites`) and `:170-175` (`await drainEventCalendarWrites()` between `await saveAllDirtyTabs()` and `teardownVault()`, inside the `if (unsubscribeFileChange)` switch branch).
- `src/lib/core/layout/tauri-listeners.service.ts:10-17` (new `$lib/features/event-calendar/event-calendar.service` import) and `:63-66` (`await drainEventCalendarWrites()` after the discard prompt, before `await flushSettingsPersistence()`). Only change to this file (D3).
- `src/tests/lib/core/app-lifecycle/app-lifecycle.service.test.ts:151-153` (extend the mock with `drainEventCalendarWrites: vi.fn(() => Promise.resolve())`), new cases beside "saves all dirty tabs before tearing down previous vault on switch" (`:1221-1243`) and "does not tear down when no vault was previously initialized" (`:1310-1320`).
- `src/tests/lib/core/layout/tauri-listeners.service.test.ts:52-74` (new `vi.mock` for the event-calendar service) and new cases in `describe('registerCloseHandler')` (`:185+`).

## Plan
1. Regression cases already exist and are green: `app-lifecycle` "saves all dirty tabs before tearing down previous vault on switch" (the ticket's `:1169-1185` anchor drifted to `:1221-1243`) and `tauri-listeners` "saves all dirty tabs before destroying the window" (`:203`).
2. Tests first (red): switch-path order `saveAllDirtyTabs` < `drainEventCalendarWrites` < `resetEditor`; first open never drains; close order `saveAllDirtyTabs` < `drainEventCalendarWrites` < `flushSettingsPersistence` < `destroy`; cancelled discard never drains nor destroys.
3. Add the two awaits; tests green. One feat commit (the ticket asks for one).

## Defaults taken
- `flushSettingsPersistence` stays real (it is not on the mock allowlist and the existing flush test uses it real). Its position is observed through the mocked `writeSettingsFile` boundary with a pending settings change, the same way `:270-288` does.
- Specifier: main still imports `$lib` (the kit-3 `#lib` branch is unmerged), so the new import and `vi.mock` both use `$lib/features/event-calendar/event-calendar.service`.
- The listeners mock exposes only `drainEventCalendarWrites`; nothing else in that test's import graph links against the service (only `app-lifecycle` and `command-palette` import it).

## Prior art
- `app-lifecycle.service.test.ts:290-300` (`invocationCallOrder` comparisons), `:318-320` (`resetEventCalendar` ordering).
- `tauri-listeners.service.test.ts:270-288` (flush before destroy via `writeSettingsFile`).

## Risks
- None beyond ordering: the awaits write no store (Notes C9). `drainEventCalendarWrites` never rejects, so no try/catch is needed.
