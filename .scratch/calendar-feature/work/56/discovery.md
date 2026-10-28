# 56 discovery: open an event on the Calendar from search and backlinks

## Files that change
- `src/lib/features/event-calendar/event-calendar-view.store.svelte.ts`: new `focusRequest` state (`{ path, seq } | null`), `requestFocus(path)`, `clearFocusRequest()`; `setView` / `setDate` / `step` / `goToToday` / `closeTransient` / `reset` drop it (same rule as the popover).
- `src/lib/features/event-calendar/event-calendar-view.logic.ts`: pure `focusViewFor(view, date, weekStartsOn, showWeekends)`: keeps the view when it shows `date`, else `day` (weekend hidden).
- `src/lib/features/event-calendar/event-calendar.service.ts:103` area: `findCalendarEvent(path)` (store hit first, else a projection of `getVaultEntries()` memoized per entries array + projection settings) and `openEventInCalendar(path)` (applies `initFromSettings`, picks `focusViewFor`, `openEventCalendarTab({ date, view })`, then `requestFocus`). `resetEventCalendar` drops the projection memo.
- New `src/lib/features/event-calendar/ShowInCalendarButton.svelte`: icon button "Show in Calendar", rendered only when the path resolves to an event (re-resolved on `vaultIndexVersion` and store events change).
- `src/lib/features/search/SearchResult.svelte` and `src/lib/features/backlinks/LinkItem.svelte`: wrap in a `relative` container and add the button as a sibling of the existing card button (no nested buttons).
- `src/lib/features/event-calendar/EventCalendarView.svelte`: `$effect` on `focusRequest` + events + view/date: after `tick()`, find `[data-event-path]` in the root, `scrollIntoView`, `focus({ preventScroll })`, set `data-event-pulse` (removed after the animation), clear the request. Pulse keyframes in a `:global` style, reduced-motion aware. No change to EventBlock / EventMonthGrid / EventAllDayLane: they already carry `data-event-path`.

## Plan (one commit each)
1. Store + logic + service, test-first (`event-calendar-view.store.test.ts`, `event-calendar-view.logic.test.ts`, `event-calendar.service.test.ts`).
2. View focus + pulse (`EventCalendarView.test.ts`).
3. Entry points: `ShowInCalendarButton` + SearchResult + LinkItem (`ShowInCalendarButton.test.ts`, `SearchResult.test.ts`, a LinkItem test).
4. E2E `e2e/specs/event-calendar-focus.spec.ts` (Playwright `testDir` is `e2e/specs`; not run here).

## Prior art
- `event-calendar.service.test.ts` "Calendar tab openers" + `loadEvents` (invoke mock of `get_all_vault_entries_v2`, `eventEntry` fixture).
- `EventCalendarView.test.ts` mount + `settle()`; `EventPopover` focus-return query `[data-event-path="${CSS.escape(path)}"]`.
- E2E: `e2e/specs/event-calendar.spec.ts` `seedEvents` / clock; `search.spec.ts` search input.

## Defaults taken
- "Backlinks for event notes": the action sits on a backlink entry whose SOURCE note is an event (the entry is the note the action opens).
- Entry point: an always-visible icon button on event rows only (not a context menu): discoverable and keyboard reachable.
- View: keep the current view (default view on first open) unless it hides the day, then `day`.
- Month view with the chip under "+N more": the request stays pending until the chip renders or the view changes; no forced view switch.
- A path that is not an event when clicked (index moved on): no-op returning false, with a toast.

## Risks
- The view's own `onMount` focuses the root; the focus effect runs after `tick()`, so it wins.
- `EventTimeGrid` sets `scrollTop` on mount; the block's `scrollIntoView` runs after it.
