# 23: Month view

**What to build:** the Calendar tab's Month view renders `EventMonthGrid.svelte`: a month grid whose weekday headers follow `weekStartsOn`, with dimmed out-of-month cells, a today highlight from the clock, and up to three event chips per day (colored through `eventColorStyle`, which replaces the prototype's `eventStyle` used on the chip at `month-view.tsx:130`) plus a "+N more" that opens day view. Clicking a cell selects its date, and clicking the day number of the already selected day opens day view. Chips are buttons that carry `data-event-path` and `data-pending`, two attributes the prototype's chips lacked. The prototype's mobile dot branch is not ported.

**Plan reference:** Task 22 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 526-537). The plan task is the full spec (files, line anchors, test cases); this ticket is the definition of done.

**Blocked by:** 22

**Status:** ready-for-agent

**Touches:**
- `src/lib/features/event-calendar/EventMonthGrid.svelte` (new)
- `src/lib/features/event-calendar/EventCalendarView.svelte` (modify)
- `src/tests/lib/features/event-calendar/EventMonthGrid.test.ts` (new)
- `e2e/specs/event-calendar.spec.ts` (modify)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` + `bash scripts/e2e.sh e2e/specs/event-calendar.spec.ts`

- [ ] Cells come from `buildMonthCells`; weekday headers follow `weekStartsOn`; out-of-month cells are dimmed; the today highlight comes from the clock
- [ ] Each cell shows up to `MONTH_MAX_CHIPS` chips from `itemsForDay`, plus "+N more", which opens day view
- [ ] A cell click sets the date; a day-number click on the selected day opens day view (`month-view.tsx:93-97`)
- [ ] Chips are buttons with `data-event-path` and `data-pending` (the prototype chips at `month-view.tsx:121-133` had neither attribute)
- [ ] The mobile dot branch of the prototype is dropped (D17)
- [ ] `EventMonthGrid.test.ts` covers the chip text, the "+N more" count and the weekend filter, and passes
- [ ] `e2e/specs/event-calendar.spec.ts` switches to Month and asserts the chip is visible
- [ ] Gate green; one commit in the full CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges)

## Comments

- 2026-10-28 13:57 — discovery — plan in work/23/discovery.md: EventMonthGrid (store-driven, no props) + view wiring + unit and E2E tests in one feat commit; out-of-month chips not faded — 0fe4b371
- 2026-10-28 13:59 — implement — EventMonthGrid + view wiring + generic itemsForDay (pending reaches chips) + unit and E2E tests in one feat commit; pnpm check 0 errors, vitest event-calendar 499/499, E2E event-calendar 10/10; full gate left to deliver — 4ac46fb3
- 2026-10-28 14:02 — review — VERDICT: APPROVED; all criteria met except the gate (pending deliver); 2 low findings (per-cell itemsForDay over all events, class branches and selected-cell click untested), 1 nit (short pane clips "+N more") — da18ee43
