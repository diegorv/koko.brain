VERDICT: APPROVED

# Review: Issue 58, WeekStrip above the day view

Reviewed `git diff main...HEAD` at 668c98ef (commits 42c5b58f, 5434b264, 668c98ef).

## Checks run by the reviewer

- `pnpm vitest run src/tests/lib/features/event-calendar/EventWeekStrip.test.ts src/tests/lib/features/event-calendar/EventCalendarView.test.ts src/tests/lib/features/event-calendar/EventTimeGrid.test.ts`: 3 files, 79 tests, all passed.
- `pnpm vitest run src/tests/lib/features/event-calendar/`: 19 files, 702 tests, all passed.
- `pnpm check`: 0 errors, 0 warnings.
- Probe (temporary test file, deleted): focus a strip day on 2026-11-15 in day view, press ArrowRight. Result: `focusedDate=2026-11-16`, the focused button unmounts, `document.activeElement` is `<body>`; a further ArrowRight on `<body>` still steps to 2026-11-17 through the document fallback. See finding 1.
- The E2E spec was read, not run (the step forbids Playwright here).

The test verdict rests on `src/tests/lib/features/event-calendar/EventWeekStrip.test.ts` and `src/tests/lib/features/event-calendar/EventCalendarView.test.ts` (plus the unchanged `EventTimeGrid.test.ts` for the grid the wrapper now contains).

## Acceptance criteria

- [x] **Strip renders in day view only.** `EventCalendarView.svelte:171-173` mounts `EventWeekStrip` only when `view === 'day'`, inside the time-grid branch. Evidence: `EventCalendarView.test.ts:209-228` (absent in week, present above `[data-time-grid]` in day, absent again in month); E2E `e2e/specs/event-calendar-week-strip.spec.ts:24,44-45`.
- [x] **Follows the week-start setting.** `EventWeekStrip.svelte:8` derives `weekDays(focusedDate, settingsStore.eventCalendar.weekStartsOn)`. Evidence: `EventWeekStrip.test.ts` "Monday-first", "Sunday-first", and "re-renders when the week start setting changes while mounted"; week roll-over covered by "moves to the neighbour week".
- [x] **Changes the day on click.** `EventWeekStrip.svelte:27` calls `eventCalendarViewStore.setDate(day)` (also closes the popover, `event-calendar-view.store.svelte.ts:91-94`). Evidence: `EventWeekStrip.test.ts` "selects a clicked day and stays in day view", "closes an open popover on a click"; `EventCalendarView.test.ts:220-223` (day column moves to 2026-11-12); E2E lines 32-37.
- [x] **Changes the day by keyboard.** Native `<button type="button">`: Tab reaches each day, Enter/Space activate it; `resolveCalendarKey` (`event-calendar-keys.logic.ts:66-89`) claims neither key, and ArrowLeft/Right keep the one-day step. Evidence: `EventCalendarView.test.ts:535-554` (Enter/Space not prevented, ArrowRight from a strip day steps and moves `aria-pressed`); real Enter activation only in E2E lines 39-42 (not yet run). See finding 2.
- [x] **ARIA as the day headers (`aria-pressed`).** `EventWeekStrip.svelte:22-23`: `aria-pressed={selected}` and the label pattern of `EventDayHeaders.svelte:28` (`"<Weekday>, <Month D, YYYY>[, selected]"`, without the "open day view" tail, which does not apply here); the row is `role="group"` with `aria-label="Days of the week"`. Evidence: `EventWeekStrip.test.ts` "is a labelled group of buttons that press the selected day".
- [x] **Component test and an E2E click.** New `src/tests/lib/features/event-calendar/EventWeekStrip.test.ts` (9 tests) and new `e2e/specs/event-calendar-week-strip.spec.ts` (click on 2026-11-12, Enter on 2026-11-09). See finding 3 for the path.

## Rules and scope

- Layers: the component lives in `features/event-calendar/`, imports only `core/settings` and its own feature files. No new store, service or logic file; `$derived` is in a component, not a store, so the getter rule does not apply.
- Untouched as instructed: `EventMonthGrid.svelte`, `EventAllDayLane.svelte`, `EventDayHeaders.svelte`, projection logic. `EventCalendarView.svelte` change is limited to the import and the wrapper (`:170-179`).
- Layout: the new `flex h-full min-h-0 flex-col` wrapper with a `min-h-0 flex-1` slot keeps the `h-full` time grid from overflowing under the 64 px strip; week view goes through the same wrapper with no strip, and all `EventTimeGrid`/`EventCalendarView` tests still pass.
- Tabs used throughout; no comments narrate the session. No error paths are introduced (no IPC), so no error-handling test is required.
- No scope creep.

## Findings

1. **Low** `src/lib/features/event-calendar/EventWeekStrip.svelte:17` (with `EventCalendarView.svelte:171`). ArrowLeft/Right pressed while a strip day has focus, at the week edge, re-keys the `{#each}` and unmounts the focused button; focus falls to `<body>` (probe above). Shortcuts keep working through the `<body>` fallback in `EventCalendarView.svelte`, but the keyboard user loses the Tab position, and inside a week focus stays on the old day while `aria-pressed` moves. The week view's day headers behave the same way today, so this is parity, not a regression. Fix (optional, may be deferred): when focus was inside `[data-week-strip]` before a step, focus the newly pressed strip button after the update (e.g. an `$effect` in the strip on `focusedDate` that refocuses `[aria-pressed="true"]` when `document.activeElement` is `<body>` or a strip button), with a test.
2. **Low** `src/tests/lib/features/event-calendar/EventCalendarView.test.ts:549`. `expect(focusedDate).toBe('2026-11-10')` after Enter/Space on the 2026-11-12 button asserts jsdom's lack of synthetic activation, the opposite of what a browser does. The test name only claims the keys are not prevented, which lines 544-548 already prove. Fix: drop line 549, or add a one-line comment that jsdom does not activate buttons on keydown and Enter's real effect is covered by the E2E.
3. **Info** `e2e/specs/event-calendar-week-strip.spec.ts`. The orchestrator asked for `e2e/event-calendar-week-strip.spec.ts`, but `e2e/playwright.config.ts:6` sets `testDir: './specs'`, so the builder's path is the one that runs. No change; the orchestrator must run `e2e/specs/event-calendar-week-strip.spec.ts` after merge.
4. **Info** `src/lib/features/event-calendar/EventWeekStrip.svelte:6-8`. The prototype (`calender-app-design/src/components/calendar/calendar.tsx:35-38`) drops weekends from the strip when `showWeekends` is off and hides the single day header under the strip on narrow screens; this build keeps seven days and the header. Both choices are defensible: the Issue says "the seven days", and day-view stepping (`stepDate`, `event-calendar-view.logic.ts:135`) already visits weekend days. No change required.
