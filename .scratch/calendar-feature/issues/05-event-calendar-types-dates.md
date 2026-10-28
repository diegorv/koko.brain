# 05: Event-calendar types and native date helpers

**What to build:** the new feature folder `src/lib/features/event-calendar/` gets its shared types and its date helpers. `event-calendar.types.ts` declares the shapes the later tickets share: `EventNote`, the field, state, patch and draft types, issues, the projection, pending writes, history ops, and drag, popover and dialog state. It has no runtime code. `event-calendar-dates.logic.ts` is a native port of the prototype's date helpers with no dependencies. It works on floating wall-clock string keys, so a DST day never shifts a key (D13). Its strict time parser rejects inputs that the prototype turned into 0. A `withTimeZone` test fixture lets DST tests switch `process.env.TZ`, and those tests skip cleanly when the runtime ignores the switch. The color and view types come from the settings slice of ticket 04.

**Plan reference:** Task 4 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 97-127). The plan task is the full spec (files, line anchors, test cases); this ticket is the definition of done. The DST block runs under `describe.runIf(runtimeTimeZoneSwitchWorks())`, so it works whatever Task 1 (f) answers, and this ticket does not wait on ticket 01.

**Blocked by:** 04

**Status:** ready-for-agent

**Touches:**
- `src/lib/features/event-calendar/event-calendar.types.ts` (new)
- `src/lib/features/event-calendar/event-calendar-dates.logic.ts` (new)
- `src/tests/fixtures/timezone.fixture.ts` (new)
- `src/tests/lib/features/event-calendar/event-calendar-dates.logic.test.ts` (new)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend only)

- [ ] `event-calendar.types.ts` has no runtime code: it re-exports `EventColor` (= `EventCalendarColor`) and `CalendarViewMode` (= `EventCalendarViewMode`) as types only, and feature code imports the runtime lists straight from `settings.logic.ts`
- [ ] It declares `EventNote { path; title; date; start; end; allDay; color; location; snippet; readOnly }`, named to avoid the `CalendarEvent` that `src/lib/features/collection/calendar.logic.ts:16` already exports with a different shape; `start` and `end` are minutes from midnight (an all-day event is 0..1440) and `title` is the display title (`event_title`, else the filename base)
- [ ] It declares `EventFields { date; start; end; allDay; color; location }`, `EventState = EventFields & { title }`, `EventPatch` (adds `eventTitle?: string | null`), `EventDraft` (adds `title`, `notes`), `EventIssueReason = 'unscheduled' | 'invalid-time' | 'crosses-midnight' | 'trailing-comment' | 'multi-day'`, `EventIssue { path; title; reason; detail?; rendered }` and `EventProjection { events; issues; archivedCount }`
- [ ] It declares the `PendingWrite` union (`update` with `state`, `create` with `event`, and `delete`, which doubles as the rename tombstone, each with `path`, `settled` and `settledAtVersion?`), the `HistoryOp` union (`update` labelled `'Move event' | 'Resize event' | 'Edit event'` with `before` / `after` of type `EventState`, `create` labelled `'Create event' | 'Duplicate event'` with `state`, `delete` labelled `'Delete event'` with `state` and `trashId?`), plus `DragState`, `PositionedEvent`, `PopoverTarget { path; rect }` and `DialogState`, with JSDoc on every field
- [ ] `event-calendar-dates.logic.ts` is a native, dependency-free port of `calender-app-design/src/lib/dates.ts:24-163` with no framework import and JSDoc on every export; it exports `toKey`, `fromKey`, `isValidDayKey`, `addDays`, `addMonths`, `dayOfWeek`, `startOfWeek`, `weekDays`, `startOfMonth`, `daysInMonth`, `monthGrid`, `isoWeek`, `diffDays`, `rangeKeys`, `isWeekend`, `monthName`, `formatLong`, `formatShort`, `formatWeekday`, `formatRange`, `formatTime`, `formatTimeRange`, `formatDuration`, `parseTimeStrict` and `timeInputValue`, and does not port `relativeTime`
- [ ] Day arithmetic goes through local `Date` components (`setDate`) and `diffDays` rounds, so a 23 h or 25 h day never shifts a key; `isValidDayKey` round-trips and rejects `2026-02-30`
- [ ] `parseTimeStrict(value): number | null` accepts `H:mm` / `HH:mm` from 0:00 to 23:59 plus `24:00`, and returns `null` for `1:30 PM`, `25:00` and `''`; `timeInputValue` clamps on both sides
- [ ] `src/tests/fixtures/timezone.fixture.ts` exports `withTimeZone(tz, fn)`, which sets `process.env.TZ`, runs `fn` and restores the previous value in a `finally`, and `runtimeTimeZoneSwitchWorks()` (the probe of Task 1 (f))
- [ ] The test ports the 6 cases of `calender-app-design/src/lib/dates.test.ts:15-59` (with `parseTime` now `parseTimeStrict`) and adds cases for `toKey`, `fromKey`, `isValidDayKey`, `dayOfWeek`, `startOfMonth`, `daysInMonth`, `rangeKeys`, `isWeekend`, `monthName`, `formatLong`, `formatShort`, `formatWeekday`, `formatTimeRange`, `formatDuration`, `timeInputValue`, the `parseTimeStrict` rejection cases, a Monday-start `monthGrid` for a month whose 1st is not a Sunday, `formatTime(1440)`, reversed `rangeKeys`, and the parity `toKey(d) === toDateKey(d)` against `src/lib/plugins/calendar/calendar.logic.ts:75`
- [ ] A DST block under `describe.runIf(runtimeTimeZoneSwitchWorks())` runs `addDays`, `diffDays`, `isoWeek` and `rangeKeys` inside `withTimeZone('America/New_York', ...)` across 2026-03-08 and 2026-11-01 (spring forward and fall back), and they give the same keys and counts as on any other day
- [ ] Import specifiers follow Notes > Dependencies: `$lib/...` until `.scratch/sveltekit-3-migration/issues/05-expand-lib-subpath-import.md` is closed, then `#lib/...` in new files
- [ ] Gate green; one commit in the full CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges)

## Comments

- 2026-10-28 11:53 — discovery — plan in work/05/discovery.md: four new files, prototype not on disk so signatures are recorded as defaults — 45e2577e
