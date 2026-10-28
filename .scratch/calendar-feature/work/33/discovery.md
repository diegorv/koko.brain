# Issue 33 discovery: sidebar month panel opens the Calendar tab

## C12 Pre-Change Checklist
1. Stores written: none directly. `openEventCalendarTab` (`features/event-calendar/event-calendar.service.ts:99-114`) writes `eventCalendarViewStore` (`setDate`, `setView`) and `editorStore` (`addTab` / `setActiveIndex`). `calendarStore` is only read (`selectedDateKey`); its existing day click still calls `setSelectedDateKey`.
2. Getters: `eventCalendarViewStore.focusedDate` / `view` / `rangeLabel`; `editorStore.activeTab`. Covered by `event-calendar-view.store.test.ts` and `event-calendar.service.test.ts`.
3. Readers: `EventCalendarView.svelte` (header title), `EditorTabs.svelte` (tab strip).
4. `calendar.store.test.ts` covers `selectedDateKey`; no change there.

## Files that change
- `src/lib/plugins/calendar/CalendarPanel.svelte`
  - imports (`:1-16`): `CalendarRange` icon, `openEventCalendarTab`, `toDateKey`.
  - header (`:44-50`): an icon button titled "Open Calendar" before `DailyNoteButton`, calling `openEventCalendarTab({ date: calendarStore.selectedDateKey ?? toDateKey(new Date()) })`.
  - `CalendarGrid` call (`:103-109`): `onDayDblClick={(k) => openEventCalendarTab({ date: k, view: 'day' })}`.
- `src/lib/plugins/calendar/CalendarGrid.svelte`: `Props` (`:4-12`) gains optional `onDayDblClick`; day button (`:55-61`) gains `data-date={day.dateKey}` and `ondblclick`.
- `e2e/specs/calendar-plugin.spec.ts`: test 3 (`:28-43`) rewritten; new bridge test.
- New tests: `src/tests/lib/plugins/calendar/CalendarGrid.test.ts`, `CalendarPanel.test.ts` (no component tests exist for either).

## Plan
1. E2E first: pin the clock (`test.use({ clockTime })`, as `event-calendar.spec.ts:78`) to 2026-11-10. Test 3 clicks `[data-date="2026-11-03"]`, asserts the label "3 Nov 2026", then clicks `[data-date="2026-11-10"]` (today) and asserts "10 Nov 2026" (today is preselected, so a today-only click would pass on a no-op). Run it on the current tree and record the failure.
2. Grid + panel change; vitest mounts: grid renders `data-date` on all 42 cells, dblclick calls `onDayDblClick` with the key, missing prop is harmless; panel bridge button opens the Calendar tab at the selected date (real `editorStore` / `eventCalendarViewStore`), falls back to today when `selectedDateKey` is null, dblclick opens day view on that day.
3. New E2E: click `button[title="Open Calendar"]`, assert the active tab "Calendar" and `[data-calendar-title]` "November, 2026".

## Prior art
- Mount pattern: `src/tests/lib/features/event-calendar/EventMonthGrid.test.ts` (jsdom, `mount`/`flushSync`, real stores, localStorage fixture).
- E2E: `openCalendar` assertions in `e2e/specs/event-calendar.spec.ts:94-106`.

## Risks / defaults
- `svg.lucide-calendar` must still match only the toggle: `calendar-range` renders `lucide-calendar-range`, a different class token, so the CSS class selector does not match it.
- Panel mount pulls `DailyNoteButton` (periodic-notes service) and the editor service; mock only Tauri APIs / `openFileInEditor` if needed.
- "today" default: `toDateKey(new Date())` from `calendar.logic.ts:75`, the same clock the panel already uses.
