VERDICT: APPROVED

Reviewed `git diff main...HEAD` (11489171d..0e63a4b78, 5 commits) in the worktree against the Issue. No `spec.md` exists for ux-quick-wins, so the Issue is the spec.

## Acceptance criteria

- [met] Failing test first, `src/tests/lib/features/event-calendar/event-calendar-tasks.logic.test.ts`: `taskLaneCells` with 5 tasks on one day of several visible days returns 2 chips and overflow 3; with 3 tasks returns 3 and 0; with one visible day and 5 tasks returns all 5 and 0. — `describe('taskLaneCells')` covers all three cases (5 on one of 3 days gives `tasks.slice(0, 2)` and overflow 3; 3 gives all and 0; one day with 5 gives all and 0) plus out-of-range tasks and an empty day list. The function did not exist on main, so the test was red before 82311f090. Passes.
- [met] `EventTaskLane.test.ts`: week view, 5 tasks on a day: 2 `[data-calendar-task]` and one `[data-task-lane-more]` reading "+3" named "3 more tasks, open day view"; clicking it sets that date and the `day` view through the real `eventCalendarViewStore`. Day view: no "+N", the label shows the count and every task renders. — `describe('EventTaskLane: overflow')`: week case asserts chips T1, T2, one `[data-task-lane-more]` inside the cell with text "+3" and aria-label "3 more tasks, open day view", and after click `eventCalendarViewStore.focusedDate === '2026-11-11'` and `view === 'day'` (real store, reset in `beforeEach`). Day case asserts 5 chips, no "+N", label "Tasks 5". Passes.
- [met] `event-calendar-layout.logic.test.ts`: with viewport 600, header 90 and start hour 8, a now of 17:40 (line at 1130.7 px of body, below the 1022 px bottom after the start-hour scroll) returns the scroll that puts the line a third of the 510 px visible body down; a now of 09:30 and a now of 15:40 (both visible) return `8 * HOUR_HEIGHT`; a now before the start hour, or no visible today, returns the start-hour scroll. — `describe('mountScrollTop')`: 17:40 gives 1130.67 - 170; 09:30 and 15:40 give `8 * HOUR_HEIGHT`; 06:15 and a week without today (and `[]`) give the start scroll. Passes.
- [met] `EventTimeGrid.test.ts`: with the store clock at a stale 08:00 and `vi.setSystemTime` at 22:15, the mounted scroller's `scrollTop` equals the 22:15 value (the mount read the instant itself); `:287` ("scrolls to dayStartHour on mount") still passes at a morning clock. — `describe('EventTimeGrid: mount scroll to the now-line')` sets `setNow(08:00)`, system time 22:15, stubs 600/90, and expects 1424 - 170 = 1254 (a store-clock read would give 512, so the test discriminates). The original test (now at :309) is unchanged and passes; see finding 1 on what it now proves.
- [met] Tests use the real `eventCalendarViewStore` and `settingsStore`; nothing mocks `event-calendar-*.logic.ts`. The real pixel result is checked by eye once: a late-evening Today opens with the line visible, a morning one at the start hour (jsdom has no layout). — The only `vi.mock`s in the touched tests are `editor.service` and `event-calendar.service` (services, allowed); stores are real and reset. Pixel check done by the reviewer in a real Chromium through a temporary, deleted Playwright probe run with `bash scripts/e2e.sh` (Europe/Berlin, 5 tasks today): at 22:15 the grid opened at scrollTop 1102 (browser-capped), now-line top 584 px between header bottom 262 and grid bottom 696, "+3" visible in Tuesday's cell; at 09:30 it opened at the start hour (09:00 right under the header, line at 09:30 visible); without tasks at 17:40 the scroll was exactly 955 (line a third of the 527 px body down). Screenshots viewed.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` exit 0 (0 errors, 0 warnings). Targeted vitest exit 0, 18 files / 364 tests (list below). The full suite is deliver's to run.

## Findings

1. nit, `src/tests/lib/features/event-calendar/EventTimeGrid.test.ts:309`: "scrolls to dayStartHour on mount" now passes only because the real date is outside the fixed 2026-11-10 week (the mount reads `Date.now()`, not the store's 10:00), so it no longer pins the morning path it names. discovery.md said it would get a morning system time; it did not. The new "keeps the start-hour scroll at a morning clock" covers the case, so this is cosmetic. Fix: either fake `Date` to 2026-11-10 10:00 in that test or leave it and rely on the new block.

## Checks run by the reviewer

- `pnpm check`: exit 0, 236 files, 0 errors, 0 warnings.
- `pnpm vitest run` on: `event-calendar-tasks.logic.test.ts`, `EventTaskLane.test.ts`, `event-calendar-layout.logic.test.ts`, `EventTimeGrid.test.ts`, `event-calendar-keys.logic.test.ts` (reads doc 27), `EventCalendarView.test.ts`, `src/tests/scripts/sync-wiki-docs.test.ts` (reads help docs), `src/tests/lib/architecture/` (layer rules): exit 0, 18 files, 364 tests.
- `bash scripts/e2e.sh e2e/specs/event-calendar-tasks.spec.ts` (the Issue's E2E gate) plus the temporary probe spec: exit 0, 5 passed. Probe file removed; worktree clean.

## Notes (not findings)

- Correctness of `mountScrollTop`: the header is sticky inside the scroller, so the visible body in body px is `[scrollTop, scrollTop + viewport - header]`; the rule `line > start + body` and the result `line - body / 3` match it. A Tasks lane that loads after mount only shrinks the body from the bottom, so a line a third down stays visible, as the real-browser probe showed.
- `toKey` + local `getHours/getMinutes` matches `nowOffsetMinutes`, which draws the line, so the decision and the drawn line agree, DST included.
- All calendar E2E specs pin `clockTime` at 10:00, so the new mount scroll does not make them time-of-day dependent.
- In the 09:30 run with tasks the scroller settled at 541 rather than 512 (08:00 row partly under the header). `mountScrollTop` returns 512 there, identical to main's code path, so the drift happens after mount in the browser (the Tasks lane growing the header) and is not introduced by this diff.
- No layer-baseline entry, BASELINE_SIZE change or composition root added. No scope creep: the diff touches only the files the Issue names, their tests, and the workflow's discovery record.

## Resolution

1. Fixed. "scrolls to dayStartHour on mount" now fakes `Date` to 2026-11-10 07:30, a morning on the shown week, so it no longer depends on the real date. 07:30 rather than 10:00: the test has no layout stubs (jsdom gives a 0 px body), so a 10:00 line would sit below the start-hour bottom and scroll to 640; a clock before the start hour keeps the start-hour path the test names. The morning-with-layout case stays in "keeps the start-hour scroll at a morning clock". `EventTimeGrid.test.ts` exit 0 (64 tests), `pnpm check` exit 0.
