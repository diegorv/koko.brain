# 20 discovery: event-calendar stores reset on vault init and teardown

## Files that change

- `src/lib/core/app-lifecycle/app-lifecycle.service.ts`
  - import `resetEventCalendar` from `$lib/features/event-calendar/event-calendar.service` (main still uses `$lib`; the kit-3 branch is unmerged).
  - `initializeVault` entry: call it right after `invalidateVaultEntries()` (:140), before `stopSettingsPersistence` (:145) and the teardown branch (:166-171).
  - `teardownVault` reset block: call it right after `resetCalendar()` (:600).
- `src/tests/lib/core/app-lifecycle/app-lifecycle.service.test.ts`
  - `vi.mock('$lib/features/event-calendar/event-calendar.service', () => ({ resetEventCalendar: vi.fn() }))` after the calendar mock (:145-149), plus the import.
  - Pin test first (normal + double-switch path): `stopSettingsPersistence` < `disableSentry` < `loadSettings` by `invocationCallOrder`; must pass on the current tree.
  - Then: `resetEventCalendar` before `loadSettings` on both paths (fails before the call is added); teardown test next to `resets all plugin modules` (:791-797).

## Plan

1. Pin test, run it green on the unchanged service.
2. Add the order assertions for `resetEventCalendar`, see them fail, add the mock + two calls, see them pass.
3. One feat commit (pin + change), then the implement comment.

## Prior art

- `stops any running persistence session before loading the next vault settings` (test :272-287) for the double-switch shape (leading `teardownVault()` + `vi.clearAllMocks()`).
- `starts settings persistence ... after its settings are loaded` (:253-261) for `invocationCallOrder`.

## C6 check

- `resetEventCalendar` (`event-calendar.service.ts:152-156`) bumps the service-local `loadToken` and resets `eventCalendarStore` and `eventCalendarViewStore` only; the clock and `editorStore` are untouched. No load call is added; the view loads on mount.

## Risks / defaults

- "Normal path" means a plain `initializeVault('/vault')` after `vi.clearAllMocks()`, as the tests at `:255-270` do. When an earlier test left a vault initialized, that call also runs `teardownVault`, which calls `resetEventCalendar` a second time; the assertion uses the first call (`invocationCallOrder[0]`), the entry one.
