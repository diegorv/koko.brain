VERDICT: APPROVED

# 20 review: event-calendar stores reset on vault init and teardown

Reviewed `git diff main...HEAD` (f87b6de1, 8b6bb486, aea75b56). Source diff: 6 lines in `app-lifecycle.service.ts`, 55 lines in its test file.

## Test verdict rests on

- `src/tests/lib/core/app-lifecycle/app-lifecycle.service.test.ts`: 63/63 pass.
- Every suite under `src/tests/lib/features/event-calendar/`, run together with the file above: 11 files, 456/456 pass.
- `pnpm check`: 0 errors, 0 warnings.
- Probes, each reverted with `git checkout` afterwards (worktree clean):
  - Both `resetEventCalendar()` calls removed: 2 tests fail ("resets the event calendar before loading settings, on both entry paths" and "resets the event calendar stores"), 61 pass.
  - Only the entry call (`app-lifecycle.service.ts:145`) removed: 1 test fails, on the double-switch `toHaveBeenCalledTimes(1)` ("got 0 times"). The teardown-only reset is therefore not enough to pass, which is what the Issue asks the test to prove.

The full gate and `bash scripts/e2e.sh e2e/specs/editor.spec.ts` were not run here; deliver runs them.

## Acceptance criteria

- [x] **Pin test before the source change.** Met. "runs the entry steps in order: stop persistence, disable Sentry, then load settings" (test file `:294-314`) checks `stopSettingsPersistence < disableSentry < loadSettings` by `invocationCallOrder[0]` on the normal path and on the double-switch path (leading `teardownVault()` + `vi.clearAllMocks()`, the `:272-287` pattern). It does not depend on the new call, so it passes with or without the change (confirmed by the first probe, where it stayed green).
- [x] **Import and entry call.** Met. Import at `app-lifecycle.service.ts:64`. Call at `:145`, right after `invalidateVaultEntries()` (`:141`) and before `stopSettingsPersistence` (`:150`) and the teardown branch.
- [x] **Teardown call.** Met. `app-lifecycle.service.ts:606`, right after `resetCalendar()`.
- [x] **C6.** Met. `event-calendar.service.ts:152-156` bumps the module `loadToken` and calls `eventCalendarStore.reset()` and `eventCalendarViewStore.reset()` only. `eventCalendarViewStore.reset()` (`event-calendar-view.store.svelte.ts:158-164`) resets view, focused date, popover, dialog and `initialized`, not the clock's interval or refcount. No load call is added anywhere in `app-lifecycle.service.ts`.
- [x] **Mock and specifier.** Met. `vi.mock('$lib/features/event-calendar/event-calendar.service', ...)` at test `:151-153`, right after the calendar mock, with the same `$lib` specifier as the import at service `:64`. The first probe shows the mock is the module the service gets (removing the calls turns the mock assertions red).
- [x] **`invocationCallOrder` on both paths, red first.** Met. Test `:316-335`. Red without the calls (probe 1), and the double-switch half is red when only the entry call is missing (probe 2).
- [x] **Teardown assertion.** Met. Test `:847-852`, next to "resets all plugin modules to initial state".
- [ ] **Gate green; one commit in the full format.** Partly checked. The feat commit 8b6bb486 has Context, Problem, Solution, Behavior and Files with line ranges, and its line ranges match the diff. The gate is left to deliver.

## Layer, scope and rules

- `core/app-lifecycle` importing a `features/` reset function follows the existing pattern in this file (`resetTasks`, `resetBookmarks`, `resetCalendar`, and so on). ADR-0003's registration rule covers inward dependencies of the note-change owner, not the lifecycle orchestrator's reset block.
- No scope creep: only the two files in the Issue's Touches list change, plus scratch notes.
- Tabs everywhere. The test mocks only a service, under the orchestrator exception (`docs/TESTING.md:117`). No store or `.logic.ts` is mocked.

## Findings

1. **Low (no change required).** Test file `:325-328`: on the normal path a vault is already initialized, so `teardownVault` also calls `resetEventCalendar` before `loadSettings`. The normal-path assertion would pass on the teardown call alone, which probe 2 shows. Only the double-switch half proves the entry call. The Issue asks only for "before `loadSettings` on both paths", so this is met as written. Optional fix: add a comment saying the double-switch half is what pins the entry call, or assert `toHaveBeenCalledTimes(2)` on the normal path.
2. **Nit.** `app-lifecycle.service.ts:142-144`: the comment says a mounted Calendar tab "reloads on its own". That is true only once Task 20's `EventCalendarView` effect lands. It is accurate for the planned design, so it can stay.

## Resolution

1. Fixed. The normal-path half now asserts `toHaveBeenCalledTimes(2)` (entry + teardown) with a comment saying why. Probe: removing only the entry call now fails the normal-path assertion ("expected 2 times, but got 1 times").
2. Rejected (kept as is). The comment describes the planned design; Task 20's `EventCalendarView` mount effect is the next ticket, and rewording it now would only need reverting there.
