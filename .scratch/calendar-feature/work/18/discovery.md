# 18 discovery: event-calendar view store

Template: none in `work/` (first store of the feature). Store shape copies `src/lib/plugins/calendar/calendar.store.svelte.ts:1-60` (module `$state`, one exported object of getters + methods, `reset()`); test style copies `src/tests/lib/plugins/calendar/calendar.store.test.ts:1-10` (`beforeEach` reset).

## Files that change (both new)

- `src/lib/features/event-calendar/event-calendar-view.store.svelte.ts`. Imports `settingsStore` (`src/lib/core/settings/settings.store.svelte.ts:161`, `eventCalendar` getter), `toKey` (`event-calendar-dates.logic.ts:57`), and `visibleDays` / `stepDate` / `rangeLabel` / `buildMonthCells` / `nowOffsetMinutes` (`event-calendar-view.logic.ts:112, 134, 151, 190, 256`).
- `src/tests/lib/features/event-calendar/event-calendar-view.store.test.ts`.

## Plan (one feat commit, test-first)

- State: `view` (`'week'`), `focusedDate` (`toKey(new Date())` at module load), `popover: { path; rect } | null` (`$state.raw`), `dialog: { mode; payload; session } | null` (`$state.raw`), `nowMs` (`Date.now()` at module load), `initialized` (false), plus a module counter `dialogSession`.
- Getters: `view`, `focusedDate`, `popover`, `dialog`, `nowMs`, `initialized`, `visibleDays`, `monthCells`, `rangeLabel`, `todayKey` (`toKey(new Date(nowMs))`), `nowMinutes` (`nowOffsetMinutes(nowMs, todayKey) ?? 0`, wall-clock so DST-correct), `isDialogOpen`, `selectedEventPath`.
- Methods: `setView`, `setDate`, `step(dir)` (`stepDate`), `goToToday` (`toKey(new Date())`), each clearing the popover; `openPopover(path, rect)` / `closePopover`; `openDialog(payload)` / `closeDialog`; `closeTransient`; `setNow(ms)`; `remapPath(from, to)`; `initFromSettings()`; `reset()`.

## Defaults taken for open questions

- Dialog payload: `EventDialogPayload = { mode: 'create'; date; start?; end?; allDay? } | { mode: 'edit'; path }`. The create half mirrors `EventCreatePayload` of ticket 10's form logic (not on main yet: worktree `calendar-feature-10-event-form-logic`), declared locally so this ticket does not depend on it. `dialog = { mode: payload.mode, payload, session }`.
- `session` is a monotonic counter (never reset, so every `openDialog` remounts the `{#key}` block, even across `reset()`).
- `rect` is a plain `{ x; y; width; height }` (prototype `calendar-store.ts:15`).
- `goToToday` reads the real clock (`new Date()`), not `nowMs`, so it is right even when no clock is mounted. `todayKey` / `nowMinutes` read `nowMs`.
- `reset()` restores view `'week'`, focusedDate today, popover / dialog null, `initialized` false; it does not touch `nowMs` (D24: the clock belongs to the mounted view).
- `initFromSettings()` sets `view = settingsStore.eventCalendar.defaultView` only while `initialized` is false, then sets it true.
- `remapPath` rewrites the popover path and an edit dialog's path; a create dialog and other paths are untouched.

## Tests

- Real `settingsStore` (`updateEventCalendar`, `reset()` in `beforeEach`), `vi.useFakeTimers` + `vi.setSystemTime` for today / now, `vi.resetModules` + dynamic import for the module-load `focusedDate` case, `withTimeZone` (`src/tests/fixtures/timezone.fixture.ts:20`) for the DST `nowMinutes` case.

## Risks

- `settingsStore.reset()` replaces the whole settings object; getters read `settingsStore.eventCalendar` on every access, so no stale capture.
