# 04 discovery: eventCalendar settings slice

## Files that change

- `src/lib/core/settings/settings.logic.ts`: add `EVENT_CALENDAR_COLORS`, `EVENT_CALENDAR_VIEW_MODES`, `clampDayStartHour`, `clampEventDuration`, `normalizeEventTypeName` after the `clamp*` helpers (`:5-39`); add `normalizeEventCalendar` and call it from `normalizeSettings` (`:60-81`).
- `src/lib/core/settings/settings.types.ts`: `import type { EVENT_CALENDAR_COLORS, EVENT_CALENDAR_VIEW_MODES } from './settings.logic'` at the top; `EventCalendarColor`, `EventCalendarViewMode`, `EventCalendarSettings` before `AppSettings`; `eventCalendar` field in `AppSettings` (`:299-353`).
- `src/lib/core/settings/settings.store.svelte.ts`: `DEFAULT_SETTINGS.eventCalendar` after `autoMove` (`:98-101`); getter after `autoMove` (`:150`); `updateEventCalendar` after `updateAutoMove` (`:283-288`).
- `src/lib/core/settings/settings.service.ts`: merge line after `autoMove` (`:130-133`).
- Tests: `src/tests/lib/core/settings/settings.{logic,store,service}.test.ts`.

## Plan (TDD order)

1. Service test "missing `eventCalendar` yields defaults" first; confirm it fails (`eventCalendar` undefined) before the merge line exists.
2. Logic + types + defaults + store + merge in one feat commit (the ticket asks for one commit), with all three test files.

## Prior art

- Logic: `normalizeSettings` describe block (`settings.logic.test.ts`), the `fixture()` helper and the "carries unrelated branches by reference" test.
- Store: `updateAutoMove merges with existing` (`settings.store.test.ts:187`).
- Service: `merges search settings with defaults` (`settings.service.test.ts:331`).

## Defaults taken for open questions

- "Valid input keeps its identity": `normalizeEventCalendar` returns the same object when every field is already valid, so the `eventCalendar` branch keeps identity like `appearance` / `tagColors`.
- Non-finite numbers (a string in a hand-edited file gives `NaN` after `Math.round`): the clamps fall back to the lower bound (0 for `dayStartHour`, 15 for duration), since `.logic.ts` cannot read `DEFAULT_SETTINGS` from the store. Existing clamps do not guard `NaN`; this one does because the value feeds grid math.
- `showWeekends` is not normalized (the ticket lists no rule for it).
- p2p-sync Task 3 has not landed (no `sync` key in the three spots), so nothing to rebase.

## Risks

- Every literal typed `AppSettings` outside `DEFAULT_SETTINGS` / `loadSettings` breaks `pnpm check` once the field is required; `pnpm check` finds them.
- `import type` from `settings.logic.ts` into `settings.types.ts` while `settings.logic.ts` imports types from `settings.types.ts`: type-only both ways, erased at compile time.
