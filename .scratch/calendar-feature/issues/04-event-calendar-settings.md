# 04: eventCalendar settings slice with defaults, clamps and normalization

**What to build:** `AppSettings` gets an `eventCalendar` slice (`weekStartsOn`, `timeFormat`, `dayStartHour`, `showWeekends`, `defaultView`, `defaultDurationMinutes`, `defaultColor`, `eventTypeName`). The slice has defaults. At load time a merge fills a missing or partial block on disk from those defaults, and normalization clamps or replaces invalid values. Code reads the slice through `settingsStore.eventCalendar` and changes it through `updateEventCalendar`. The color list and the view-mode list exist only once at runtime, in `settings.logic.ts`. Their union types are derived in `settings.types.ts`, so the event-calendar feature imports them and never re-declares them (D15). There is no folder setting (D18). `eventTypeName` is D25.

**Plan reference:** Task 3 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 71-96). The plan task is the full spec (files, line anchors, test cases); this ticket is the definition of done. Its Pre-Change Checklist answers are Notes C1 (lines 959-964). Task 3 of `.scratch/p2p-sync/plan-2026-08-25.md` edits the same three spots (`settings.types.ts`, `DEFAULT_SETTINGS` and the `loadSettings` merge); whichever of the two lands second rebases its lines (Notes > Dependencies, line 937).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Touches:**
- `src/lib/core/settings/settings.logic.ts` (modify)
- `src/lib/core/settings/settings.types.ts` (modify)
- `src/lib/core/settings/settings.store.svelte.ts` (modify)
- `src/lib/core/settings/settings.service.ts` (modify)
- `src/tests/lib/core/settings/settings.logic.test.ts` (modify)
- `src/tests/lib/core/settings/settings.store.test.ts` (modify)
- `src/tests/lib/core/settings/settings.service.test.ts` (modify)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend only)

- [ ] `settings.logic.ts` exports `EVENT_CALENDAR_COLORS = ['green', 'purple', 'cyan', 'orange', 'pink', 'blue'] as const` and `EVENT_CALENDAR_VIEW_MODES = ['day', 'week', 'month'] as const` next to the `clamp*` helpers, and these are the only runtime copies of the two lists
- [ ] `settings.types.ts` derives `EventCalendarColor = (typeof EVENT_CALENDAR_COLORS)[number]` and `EventCalendarViewMode = (typeof EVENT_CALENDAR_VIEW_MODES)[number]` through an `import type` from `./settings.logic` (erased at compile time, so no runtime cycle), not through the `import()` precedent at `:319`
- [ ] `settings.types.ts` declares `EventCalendarSettings { weekStartsOn: 0 | 1; timeFormat: '24h' | '12h'; dayStartHour: number; showWeekends: boolean; defaultView: EventCalendarViewMode; defaultDurationMinutes: number; defaultColor: EventCalendarColor; eventTypeName: string }` and adds `eventCalendar: EventCalendarSettings` to `AppSettings`; there is no folder setting
- [ ] `clampDayStartHour(n)` returns an integer within 0..12, and `clampEventDuration(n)` rounds to a multiple of 15 within 15..480
- [ ] `normalizeEventTypeName(s)` trims its input and returns `Event` for an empty value, a non-string or `Type` in any case (`'  '` and `'type'` give `Event`, `' Meeting '` gives `Meeting`)
- [ ] `normalizeSettings` calls `normalizeEventCalendar()`: a `weekStartsOn` other than 0 or 1 becomes 1; after normalization `timeFormat` is `'24h'` or `'12h'`, `defaultView` is a member of `EVENT_CALENDAR_VIEW_MODES` and `defaultColor` is a member of `EVENT_CALENDAR_COLORS`; `dayStartHour`, `defaultDurationMinutes` and `eventTypeName` go through their helpers; valid input keeps its identity, and so do the other branches
- [ ] `DEFAULT_SETTINGS.eventCalendar` is `{ weekStartsOn: 1, timeFormat: '24h', dayStartHour: 7, showWeekends: true, defaultView: 'week', defaultDurationMinutes: 60, defaultColor: 'blue', eventTypeName: 'Event' }`
- [ ] `settingsStore` has an `eventCalendar` getter and an `updateEventCalendar(Partial<EventCalendarSettings>)` that merges, placed next to `autoMove` / `updateAutoMove`; `settings.store.test.ts` covers the getter and the merge
- [ ] `loadSettings` merges `eventCalendar: { ...DEFAULT_SETTINGS.eventCalendar, ...parsed.eventCalendar }`; `settings.service.test.ts` covers `eventCalendar` missing, partial and full on disk, and the test where a missing block yields the defaults is written first and fails before the merge line exists
- [ ] `settings.logic.test.ts` covers every clamp and normalize rule, identity for valid input, and both constant arrays
- [ ] If p2p-sync Task 3 has already landed, its `sync` keys in the three shared spots stay unchanged (this ticket only rebases its own lines)
- [ ] Gate green; one commit in the full CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges)

## Comments

- 2026-10-28 11:39 — discovery — plan in work/04/discovery.md: four settings files plus three tests, missing-block service test written first — 15cd919c
- 2026-10-28 11:42 — implement — eventCalendar slice landed; settings tests 300/300 and pnpm check green, full gate left to deliver — 51805550
- 2026-10-28 11:44 — review — CHANGES_REQUESTED: missing-block service test passes without the merge line (falls through the error fallback); pin the exact fallback values — 74c52ec6
