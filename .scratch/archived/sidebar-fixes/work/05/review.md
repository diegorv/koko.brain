VERDICT: APPROVED

## Acceptance criteria

- [met] Test first: after the clock passes midnight, the today cell moves without changing month — `CalendarPanel.test.ts` "moves the today cell when the clock passes midnight, without changing month" fakes `Date`/`setInterval` at 2026-11-10 23:59:50, advances 30 s and asserts the only `ring-1` cell is `2026-11-11` while `calendarStore.currentMonth`/`currentYear` stay 10/2026. Probe: with `CalendarPanel.svelte` reverted to `main` the test fails (`expected [ '2026-11-10' ] to deeply equal [ '2026-11-11' ]`), with the branch it passes. Mechanism: `CalendarPanel.svelte:25` holds `acquireCalendarClock()` (30 s tick + focus/visibilitychange, `event-calendar.service.ts:302`) and `CalendarPanel.svelte:28-33` feeds `eventCalendarViewStore.todayKey` into the `$derived` grid; `buildMonthGrid` takes `todayKey` (`calendar.logic.ts:57-62`), covered by `calendar.logic.test.ts` "marks the cell of the given todayKey as today".
- [met] Double-clicking the month label opens the monthly note at most once and never creates it twice; going to today still works — `handleMonthClick` returns when `event.detail > 1` (`CalendarPanel.svelte:53-56`), so of the click(1), click(2), dblclick sequence only the first click calls `openOrCreatePeriodicNoteForDate`; `ondblclick` still calls `calendarStore.goToToday()`. Test "opens the monthly note at most once on a double-click and still goes to today" starts a year back and asserts `openOrCreateNote` called once plus year, month and selected day equal today. Probe: on `main` it fails with "called 1 times, but got 2 times".
- [met] A single click on the month label still opens the monthly note — test "opens the monthly note on a single click" asserts one `openOrCreateNote` call with a `/vault/` path. Keyboard activation dispatches `detail: 0`, which the `> 1` guard lets through.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/plugins/calendar/ src/tests/lib/features/event-calendar/event-calendar.service.test.ts`: exit 0, 6 files, 297 tests passed. The test verdict rests on `CalendarPanel.test.ts`, `calendar.logic.test.ts`, `CalendarGrid.test.ts` (the other `buildMonthGrid` caller) and the rest of `src/tests/lib/plugins/calendar/`, plus `event-calendar.service.test.ts` (the clock's own tests, since the panel is a new clock holder).
- Fail-first probe described above (branch tests against `main`'s `CalendarPanel.svelte`): both new panel tests fail for the expected reasons; file restored, worktree clean.
- Full suite and `pnpm build`: not run, deliver's to run.
- Layering: `plugins/calendar` importing `features/event-calendar` is the allowed direction (ADR 0003 line 50); the panel already imported from that service.
- Scope: the diff touches only the panel, `buildMonthGrid`, their tests and the discovery note. No creep.

## Findings

1. minor — src/lib/features/event-calendar/event-calendar.service.ts:296-301 — The `acquireCalendarClock` JSDoc says "The mounted view owns it", and `openNewEventDialog` (line 271-273) says "The clock only ticks while the view is mounted". The sidebar `CalendarPanel` now holds the clock too, so the first sentence is wrong and the second is incomplete. CLAUDE.md asks to update comments a change makes wrong. Fix: change it to say the clock's holders are the mounted Calendar view and the sidebar calendar panel (or "each mounted consumer"), and adjust the `openNewEventDialog` sentence to match.
2. nit — src/lib/plugins/calendar/CalendarPanel.svelte:28-33 — `nowMs` starts at module load (`event-calendar-view.store.svelte.ts:35`) and the clock's first `tick()` runs in an effect after the first render. If the panel remounts after midnight while no other holder kept the clock running (for example, switching sidebar modes the next morning), the first frame can still mark yesterday, and the next frame moves it. Visible for one frame only, and it recovers. No change needed; noted so a later reader knows it is expected.
3. nit — src/tests/lib/plugins/calendar/CalendarPanel.test.ts:165-167 — The inner `afterEach(vi.useRealTimers)` runs before the file-level `afterEach` that unmounts the panel. The clock release therefore calls the real `clearInterval` on a fake timer id. That is harmless, because the fake clock is thrown away, but the order is backwards. Fix: unmount inside the inner `afterEach` before `vi.useRealTimers()`, or call `vi.useRealTimers()` after the outer teardown.
4. nit — src/lib/plugins/calendar/CalendarPanel.svelte:53-56 — On a double-click, the first click still opens (and may create) the monthly note for the month being shown before the grid jumps to today. The criterion ("at most once") allows this, and discovery.md records it as a deliberate choice: a click-delay timer would slow every single click. A user who double-clicks from another month to get back to today can still create that month's note without meaning to. It is a product call; no change is required for this Issue.

## Resolution

1. Fixed: the `acquireCalendarClock` JSDoc now names each mounted consumer (the Calendar view and the sidebar calendar panel) as holders, and the `openNewEventDialog` comment says the clock ticks only while a consumer holds it.
2. No change, as the review says: a one-frame stale mark on a remount after midnight that recovers on the first tick.
3. Fixed: the `CalendarPanel today` afterEach unmounts the panel before `vi.useRealTimers()`, so the clock release clears the fake timer id.
4. No change: product call already recorded in discovery.md; a click-delay timer would slow every single click.
