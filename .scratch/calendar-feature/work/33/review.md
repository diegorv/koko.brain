VERDICT: APPROVED

# Review: Issue 33, sidebar month panel opens the Calendar tab

Reviewed `git diff main...HEAD` at 85ae7d28 (commits 4f2dd41a, 26d2a7bf, 85ae7d28).

## Checks run by the reviewer

- `pnpm check`: 0 errors, 0 warnings (204 files).
- `pnpm vitest run src/tests/lib/plugins/calendar src/tests/lib/features/event-calendar`: 21 files, 677/677 passed.
  The test verdict rests on `src/tests/lib/plugins/calendar/CalendarGrid.test.ts` (new),
  `src/tests/lib/plugins/calendar/CalendarPanel.test.ts` (new) and
  `src/tests/lib/features/event-calendar/event-calendar.service.test.ts` (2 new tests), plus the rest of
  those two folders as regression cover (`event-calendar-view.store.test.ts` covers `initFromSettings`).
- E2E not run by the reviewer: another worktree (calendar-feature-29) had a Playwright run live on the
  shared port 1421, and `scripts/e2e.sh` kills whatever listens there before it starts. The E2E spec was
  checked statically instead (selectors and expected strings traced to source, below). Deliver's Issue
  gate runs `e2e/specs/calendar-plugin.spec.ts` + `e2e/specs/event-calendar.spec.ts`.

## Acceptance criteria

- [x] **Header "Open Calendar" button, `calendar-range` icon, calls `openEventCalendarTab({ date: selectedDateKey ?? today })`; `svg.lucide-calendar` still matches only the toggle.** Met.
  `CalendarPanel.svelte:44-47` (handler), `:59-68` (button). The icon renders class `lucide-calendar-range`,
  a different token from `lucide-calendar`; `CalendarPanel.test.ts` asserts both. The spec's toggle
  selector (`calendar-plugin.spec.ts:4`) runs in files mode, where the panel is not mounted. Fallback to
  today is tested ("falls back to today when no date is selected").
- [x] **`data-date={day.dateKey}` on day buttons, optional `onDayDblClick` prop, panel passes `(k) => openEventCalendarTab({ date: k, view: 'day' })`.** Met.
  `CalendarGrid.svelte:10-11, 14, 62, 64`; `CalendarPanel.svelte:49-52, 132`. Week-number buttons carry no
  `data-date` (tested). `data-date` is unique in `src/lib` (grep), so the E2E locators are not ambiguous.
  The service fix (`event-calendar.service.ts:103-106`) makes day view stick on a first mount:
  without it, `EventCalendarView.svelte:29` `initFromSettings()` would overwrite the view with `defaultView`.
  Covered by the new service test "keeps an explicit view when the tab first mounts".
- [x] **Assertion-free test 3 replaced; clicks `[data-date="<today>"]` and asserts the label; written first, seen failing without `data-date`.** Met.
  `calendar-plugin.spec.ts:30-37`. The clock is pinned (`:10`), it selects 11-03 first (today is
  preselected, `calendar.store.svelte.ts:8`, so a today-only click would pass on a no-op) and then
  today, asserting `formatDateLabel` output `D MMM YYYY` (`calendar.logic.ts:109-111`). On main
  `CalendarGrid.svelte` has no `data-date` (0 matches), so the locator cannot resolve there; the
  observed failure is recorded in the feat commit message.
- [x] **A new E2E test asserts the bridge button opens the Calendar tab.** Met.
  `calendar-plugin.spec.ts:39-48`: selects 11-24, clicks the button, asserts the active "Calendar" tab,
  `November, 2026`, `Week 48` (`event-calendar-view.logic.ts:163`, ISO week of 2026-11-23) and the
  11-24 column (`EventTimeGrid.svelte:108`). Week 48 differs from today's week 46, so the test fails if
  the date were dropped. A second new test covers the double-click (one day column).
- [x] **No production code removed; `calendarStore` untouched; plugin-to-feature import allowed by ADR-0003.** Met.
  The diff only adds lines in `src/lib` apart from the one-line `setView` branch in the service, which
  is extended, not removed. `calendar.store.svelte.ts` is not in the diff. ADR-0003 (`:50`) lets
  `plugins/` import `features/`; the panel already imported `features/type-definitions`.
- [ ] **Gate green; one commit in the full CLAUDE.md format.** Pending deliver (the full gate is deliver's).
  The feat commit 26d2a7bf has Context, Problem, Solution, Behavior and Files with line ranges, and the
  Co-Authored-By trailer.

## Scope

`event-calendar.service.ts` is outside the Issue's Touches list. Accepted: AC 2 does not work without it
(the double-click would show week view on the first open of a session), the change is additive, scoped
to calls that pass `view` (the palette and `toggleEventCalendarTab` pass none and are unchanged), the
JSDoc says why, and a test reproduces the bug. `initFromSettings` stays idempotent per session, and
`resetEventCalendar` clears `initialized` on vault switch, so the default view still applies in the
next vault.

## Findings

1. **Low**, `src/lib/plugins/calendar/CalendarPanel.svelte:59-68`. The new header button uses a native
   `title` tooltip, while its siblings in the same header (`DailyNoteButton.svelte:8-23`,
   `SidebarModeToggle.svelte:17-60`) wrap `Button` in `Tooltip.Root` / `Tooltip.Trigger` /
   `Tooltip.Content`, and the panel already mounts a `Tooltip.Provider`. Hovering gives the OS tooltip on
   one icon and the styled one on the others. Fix: wrap the button in the same `Tooltip.Root` pattern
   with `Tooltip.Content` "Open Calendar", keep `aria-label="Open Calendar"`, and switch the selectors in
   `calendar-plugin.spec.ts:43` and `CalendarPanel.test.ts:35` to `button[aria-label="Open Calendar"]`.
   Optional; nothing breaks as is.
2. **Low (nit)**, `src/lib/plugins/calendar/CalendarPanel.svelte:13-14`. The new
   `$lib/features/event-calendar` import sits after the `$lib/plugins/periodic-notes` import; CLAUDE.md
   orders `$lib/` imports core, then features, then plugins. The `DailyNoteButton` line was already out of
   order before this change. Fix: move the `openEventCalendarTab` import (and, if touching it anyway, the
   `DailyNoteButton` import below `SidebarModeToggle`). Optional.
