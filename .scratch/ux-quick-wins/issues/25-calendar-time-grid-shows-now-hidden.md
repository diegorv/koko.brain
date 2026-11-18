# 25: Calendar time grid shows what is now and what is hidden

**Origin:** design review 2026-11-17, proposals P65 (part) and P127 (part), prototype `.scratch/design-review/prototypes/calendar-tasks.html` (sections `P65`, `P127`), research `.scratch/ux-quick-wins/research/verdict-calendar-tasks.md` and `breakdown.md` (old ticket 42).

**What to build:**

1. **Task lane overflow in week view.** A day with more than 3 dated tasks (`ALL_DAY_MAX_ROWS`, `event-calendar-view.logic.ts:46`) shows 2 chips and a "+N" button that opens that day in day view, the pattern of `buildAllDayChips` (`:364-371`) and the all-day lane's `[data-all-day-more]` button (`EventAllDayLane.svelte:92-99`). A new pure `taskLaneCells(tasks, days)` in `src/lib/features/event-calendar/event-calendar-tasks.logic.ts` returns one `{ day, chips, overflow }` per day and caps only when more than one day is visible. `EventTaskLane.svelte` renders it (the per-day list is at `:41-43`, the row count at `:23`, which keeps the lane at 3 rows: 2 chips and the "+N" button). The button's name is "3 more tasks, open day view" (count filled in) and it carries `data-task-lane-more`.
2. **Day view keeps the scroll.** With one visible day every task renders and the lane keeps its inner scroll; the "Tasks" label (`:31`) shows the count ("Tasks 5") so a scrolled lane never hides how many there are.
3. **Open at the now-line.** On mount, when today is among the visible days and the now-line would sit below the visible body after the start-hour scroll, scroll so the line sits a third of the visible body down; otherwise keep today's behaviour (`dayStartHour * HOUR_HEIGHT`, `EventTimeGrid.svelte:98-101`). The decision is a pure `mountScrollTop` in `event-calendar-layout.logic.ts` (`HOUR_HEIGHT` is 64 at `:11`). It reads `Date.now()` itself and never the store clock: the clock is acquired in the parent's `$effect` (`EventCalendarView.svelte:220`, `acquireCalendarClock` at `event-calendar.service.ts:310`) and can be hours stale at the child's `onMount`. The tasks lane loads after mount and can grow the header by one lane; a line a third down stays on screen. The focus-request effect runs after `tick()` and still wins for "Show in calendar".
4. **Doc.** `help/documentation/27-calendar.md:35` (the grid scrolls to Day starts at) and `:41` ("A busy day scrolls inside its cell") match the new behaviour.

Not in this ticket: in-place expansion of the day-view task lane (needs a max-height design for the sticky header); a Today button that scrolls to now (needs a store signal, the grid does not remount within the same week); a "Now" pill; the day view's two stacked headers (P128, deferred); the month grid (ticket 26).

**Size:** S.

**Blocked by:** 24

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`; `e2e/specs/event-calendar-tasks.spec.ts` uses one task per day and is untouched, run it once with `bash scripts/e2e.sh event-calendar-tasks.spec.ts`

- [ ] Failing test first, `src/tests/lib/features/event-calendar/event-calendar-tasks.logic.test.ts`: `taskLaneCells` with 5 tasks on one day of several visible days returns 2 chips and overflow 3; with 3 tasks returns 3 and 0; with one visible day and 5 tasks returns all 5 and 0.
- [ ] `EventTaskLane.test.ts`: week view, 5 tasks on a day: 2 `[data-calendar-task]` and one `[data-task-lane-more]` reading "+3" named "3 more tasks, open day view"; clicking it sets that date and the `day` view through the real `eventCalendarViewStore`. Day view: no "+N", the label shows the count and every task renders.
- [ ] `event-calendar-layout.logic.test.ts`: with viewport 600, header 90 and start hour 8, a now of 17:40 (line at 1130.7 px of body, below the 1022 px bottom after the start-hour scroll) returns the scroll that puts the line a third of the 510 px visible body down; a now of 09:30 and a now of 15:40 (both visible) return `8 * HOUR_HEIGHT`; a now before the start hour, or no visible today, returns the start-hour scroll.
- [ ] `EventTimeGrid.test.ts`: with the store clock at a stale 08:00 and `vi.setSystemTime` at 22:15, the mounted scroller's `scrollTop` equals the 22:15 value (the mount read the instant itself); `:287` ("scrolls to dayStartHour on mount") still passes at a morning clock.
- [ ] Tests use the real `eventCalendarViewStore` and `settingsStore`; nothing mocks `event-calendar-*.logic.ts`. The real pixel result is checked by eye once: a late-evening Today opens with the line visible, a morning one at the start hour (jsdom has no layout).
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P65.** The week and day Tasks lane hides tasks with no overflow cue: the lane caps its rows and scrolls inside the cell with nothing to say more tasks exist. Show a "+N" like the all-day lane. Validation: week view only; day view keeps its scroll and gets the count.
- **P127.** The time grid and Today never scroll to the now-line. Open at the now-line when it would otherwise start below the viewport. Validation: the mount only; the Today button and the "Now" pill wait.

## Problem

In the week view a busy day clips its tasks inside a 3-row lane that scrolls on its own, with no count, so the person cannot tell tasks are missing. An evening visit always opens at the start-hour scroll, with the now-line off screen below.

## Evidence

Checked at `085b23c5d`.

- `EventTaskLane.svelte:23` (rows cap at `ALL_DAY_MAX_ROWS`), `:38` (`overflow-y-auto` cell), `:41-43` (one chip per task, no overflow); the file's own comment says "a busier day scrolls inside its cell". `tasksByDay` at `event-calendar-tasks.logic.ts:74-84`. Only `EventTimeGrid.svelte:256` renders the lane.
- `event-calendar-view.logic.ts:364-371`: `buildAllDayChips` slices to `ALL_DAY_MAX_ROWS - 1` and reports `overflow`.
- `EventTimeGrid.svelte:98-101`: the only mount scroll is `dayStartHour * HOUR_HEIGHT`.
- `event-calendar.service.ts:310-316` and `EventCalendarView.svelte:220`: the store clock ticks only while a consumer holds it, acquired in the parent's `$effect`; `event-calendar-view.store.svelte.ts:87-92` reads it.
- `help/documentation/27-calendar.md:35,41`. `EventTimeGrid.test.ts:287` pins the start-hour scroll at a morning clock.
- `e2e/specs/event-calendar-tasks.spec.ts:38-56` seeds one task per day, so it never meets the overflow path.

## Why blocked

- Ticket 24 edits `help/documentation/27-calendar.md` (the creation table, other lines) and `src/tests/lib/features/event-calendar/EventTimeGrid.test.ts` (read-only block names). This ticket edits the same two files on other lines, so it runs after 24 to avoid a rebase on both.

## Sequence with

Ticket 26 (month grid) edits `event-calendar-tasks.logic.ts` and its test, `event-calendar-view.logic.ts` and doc 27: it is blocked by this ticket and runs after it. Shell-sidebars-ux has no live Issue on these files.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping. Defaults (not individually answered): this ticket had no owner question in the old breakdown. The old ticket's `mountScrollTop` example used a 15:40 now, which is still visible under its own rule; the acceptance above uses 17:40 for the scrolled case.
