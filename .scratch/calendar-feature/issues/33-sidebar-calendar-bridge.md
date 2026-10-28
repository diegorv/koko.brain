# 33: Sidebar month panel opens the Calendar tab

**What to build:** the existing sidebar month panel (`plugins/calendar`) links to the new Calendar tab. Its header gets an "Open Calendar" button that opens the tab at the panel's selected date (or today), and double-clicking a day in the month grid opens the tab in day view on that date. Day buttons carry a `data-date` attribute, so the calendar-plugin E2E spec's day-selection test finally asserts something. The panel and `calendarStore` otherwise behave as before.

**Plan reference:** Task 32 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 762-771). The plan task is the full spec (files, line anchors, test cases); this ticket is the definition of done.

**Blocked by:** 21

**Status:** ready-for-agent

**Touches:**
- `src/lib/plugins/calendar/CalendarPanel.svelte` (modify)
- `src/lib/plugins/calendar/CalendarGrid.svelte` (modify)
- `e2e/specs/calendar-plugin.spec.ts` (modify)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`, plus `bash scripts/e2e.sh e2e/specs/calendar-plugin.spec.ts e2e/specs/event-calendar.spec.ts`

- [ ] The `CalendarPanel.svelte` header (`:44-50`) has an "Open Calendar" button with the `calendar-range` icon that calls `openEventCalendarTab({ date: calendarStore.selectedDateKey ?? today })`; `svg.lucide-calendar` in the existing spec still matches only the mode toggle
- [ ] `CalendarGrid.svelte` day buttons carry `data-date={day.dateKey}` and the component accepts an optional `onDayDblClick` prop; the panel passes `(k) => openEventCalendarTab({ date: k, view: 'day' })`
- [ ] The assertion-free test 3 in `e2e/specs/calendar-plugin.spec.ts:28-43` is replaced by one that clicks `[data-date="<today>"]` and asserts the selected-date label; it is written first and seen failing on the tree without `data-date` (C12)
- [ ] A new E2E test asserts that the bridge button opens the Calendar tab
- [ ] No production code is removed and `calendarStore` is untouched (only `selectedDateKey` is read); the plugin-to-feature import is the direction ADR-0003 allows (`docs/adr/0003-four-layer-source-taxonomy.md:50`)
- [ ] Gate green; one commit in the full CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges)
