VERDICT: CHANGES_REQUESTED

# Review: Issue 41, multi-day spans and cross-midnight events

Reviewed `git diff main...HEAD` (base 65f96aea, head 256fe1c5). Main has moved to b41e9b0c (ticket 60), which touches only `features/collection`, so it does not overlap this branch.

The behavior is correct and every acceptance criterion is met. The changes requested are small: the ADR now contradicts the code, a field is left dead, a test line is mis-indented, plus some wording and edge-case cleanups.

## Checks I ran (not taken from the build report)

- `pnpm check`: 0 errors, 0 warnings (205 files).
- `pnpm vitest run src/tests/lib/features/event-calendar/`: 18 files, 722/722 passed. This covers every test file the diff changes: `event-calendar-event.logic.test.ts`, `event-calendar-view.logic.test.ts`, `event-calendar-form.logic.test.ts`, `event-calendar.service.test.ts`, `event-calendar.store.test.ts`, `EventCalendarView.test.ts`, `EventDialog.test.ts`, `EventMonthGrid.test.ts` and `EventPopover.test.ts`. It also covers the untouched tests of the changed code: `EventTimeGrid.test.ts`, `event-calendar-drag.logic.test.ts` and `event-calendar-history.logic.test.ts`.
- `e2e/specs/event-calendar.spec.ts`: 32/32 passed.
  - It ran on an isolated `vite dev --port 1433` with a temporary copy of the Playwright config (deleted afterwards).
  - I did not use `scripts/e2e.sh` because the ticket 57 worktree is in flight, and that script force-kills port 1421.
  - Deliver should still run this spec through `scripts/e2e.sh` once port 1421 is free.

## Acceptance criteria

- [x] **`end_date` events render on every day of the span in all three views, and the `multi-day` issue is gone.** Met.
  - `segmentOnDay` / `bucketByDay` / `groupEventsByDay` (`event-calendar-view.logic.ts:187-228`) feed the time grid (day and week view, `EventTimeGrid.svelte:66`) and the all-day lane (`buildAllDayChips`).
  - `itemsByDay` / `itemsForDay` (`:254-294`) feed the month grid.
  - `multi-day` is removed from `EventIssueReason` (`event-calendar.types.ts:91`) and from `entryToEvent`.
  - Evidence:
    - Unit tests: `event-calendar-view.logic.test.ts` (segmentOnDay, groupEventsByDay, itemsForDay, itemsByDay, all-day lane span cases) and `EventMonthGrid.test.ts` "EventMonthGrid: spans" (crossing a week row).
    - `EventCalendarView.test.ts` checks that a valid span has no attention row.
    - E2E "a two-day event shows on both days in week and month view, without a Needs-attention row".
    - Day view has no dedicated assertion. It is the same `EventTimeGrid` + lane code path with `days = [day]`, so I accept it.
- [x] **Cross-midnight timed events render on both days.** Met.
  - `entryToEvent` moves `endDate` to `date + 1` when `end < start` and there is no `end_date` (`event-calendar-event.logic.ts:170-173`). `segmentOnDay` splits the event into `start..1440` and `0..end`.
  - Evidence:
    - `event-calendar-event.logic.test.ts` "renders an end before the start as a read-only event that ends the next day" and "crosses the month and year boundary".
    - `EventPopover.test.ts` (one segment in each of the two day columns).
    - E2E `Late show` on 2026-11-10 and 2026-11-11.
- [x] **Writes never desync `date` and `end_date`.** Met.
  - Every span is `readOnly` (`event-calendar-event.logic.ts:184-197`).
  - `writeEvent` refuses any `date` / `start` / `end` / `allDay` patch on a read-only event before anything is written (`event-calendar.service.ts:388, 418`). Drag, resize, the dialog (`editEvent`) and undo/redo all pass through this one guard.
  - The time grid skips `data-readonly` blocks at pointerdown, and the resize handle is not rendered.
  - Duplicate copies the note bytes, and restore brings back the trashed file, so `end_date` travels with both. The restore placeholder and `mergePending` keep `readOnly` (`:801`, `event-calendar-event.logic.ts:436`).
  - Undo of an op recorded before a note became a span is refused by `sameEventState`, which now compares `endDate`.
  - Evidence:
    - `event-calendar.service.test.ts` "refuses a timing write on a span before writing" (move, resize, allDay, dialog date; no `writeTextFile`, no history op), "writes a non-timing change of a span" and "keeps a restored span read-only".
    - `EventDialog.test.ts` (location save keeps `start`/`end`).
    - E2E "a span does not drag".
- [x] **Logic tests for span splitting and an E2E for a two-day event.** Met. The `segmentOnDay` suite and the new E2E group "Event calendar spans".

## Findings

1. **Medium:** `docs/adr/0032-calendar-events-are-event-typed-notes.md:22` and `:113`. The decision log now contradicts the code:
   - `:22` says "`end_date` is reserved: such an event renders read-only on its start day with a notice".
   - `:113` says "No cross-midnight or multi-day events in v1".
   - The build report notes this and leaves it as is.
   - **Fix:** add a dated amendment to ADR-0032 (the repo already uses amendments, see ADR 0025). Record these points:
     - spans render on every day;
     - `end < start` without `end_date` ends the next day, and `00:00` after a later start is 24:00;
     - spans are read-only on the calendar because it never writes `end_date`;
     - timed spans are drawn in the time grid.
2. **Low:** `src/lib/features/event-calendar/event-calendar.types.ts:103` (`EventIssue.rendered`) and `event-calendar-event.logic.ts:135`. Only `multi-day` ever set `rendered: true`, so the field is now always `false` and nothing reads it. The type comment at `event-calendar.types.ts:90` ("or is shown with a caveat") is stale too. CLAUDE.md says to remove what your own change made unused.
   - **Fix:** drop `rendered` from `EventIssue`, the `issue()` builder and the test fixtures (`event-calendar.store.test.ts:38` and the `rendered: false` matchers in `event-calendar-event.logic.test.ts`). Reword the comment at `:90` to "Why an event-typed note cannot be shown."
3. **Low:** `src/tests/lib/features/event-calendar/event-calendar-form.logic.test.ts:69`. `it('locks the timing of a read-only event'` is indented with two tabs inside a one-tab `describe`. A diff artifact.
   - **Fix:** one tab.
4. **Low:** `event-calendar-event.logic.ts:162-173`. `start: "24:00"` with an earlier `end` (for example `end: "01:00"`) used to raise an issue. Now it renders as a span from 24:00 on `date` to 01:00 the next day.
   - The first-day segment is empty, so `segmentOnDay` drops it. The event shows only on the next day, while the popover says it starts on `date`.
   - **Fix:** return `end-before-start` / `start` (or `invalid-time` / `start`) for a timed event whose start is 1440. Add a test next to the existing `start: '24:00'` case at `event-calendar-event.logic.test.ts:217`.
5. **Low:** `src/lib/features/event-calendar/EventForm.svelte:80` and `event-calendar.service.ts:559`. The lock notice and the `read-only` toast say "This event spans several days". By design, a note with `end_date` equal to `date` is also read-only, and it does not span several days.
   - **Fix:** use wording that fits both cases, for example "This event has an end date or crosses midnight; change its date and time in the note." Update `CALENDAR_ERROR_MESSAGES` and its test at `event-calendar.service.test.ts` ("maps an EventCalendarError").
6. **Low:** `src/lib/features/event-calendar/EventBlock.svelte:34-37`. On a span, the block's time text and `aria-label` show the clipped segment, not the event's real range: `23:00 – 24:00` on the first day, `00:00 – 24:00` on a middle day, `00:00 – 01:00` on the last day. A screen reader announces a range the event does not have.
   - **Fix (optional, polish):** keep the clipped text if that is the wanted look, but build the `aria-label` from `eventWhenLabel` (full range and days). If the visible text changes too, update the E2E assertions in `event-calendar.spec.ts` that pin the clipped text.
7. **Low:** `event-calendar-view.logic.ts:310` (`eventWhenLabel`). A timed multi-day span gets its duration from `formatDuration`, which has no day unit. 09:00 on the 10th to 17:00 on the 12th reads `09:00 – 17:00 · 56h`.
   - **Fix (optional, polish):** drop the duration for spans longer than a day, or format it as `2d 8h`. Add a case to the `eventWhenLabel` suite.

## Notes (no change requested)

- **Timed spans are drawn in the time grid, as the discovery defaults say.** A middle day gets a full-height `0..1440` block, which halves the width of every other event that day.
  - The Issue allows this and ticket 59 builds on it.
  - The Google Calendar style (timed spans of more than 24h in the all-day lane) is a candidate for the ticket 64 polish list.
- **`querySelector('[data-event-path=...]')` matches the first segment only** (focus after duplicate, the dialog/popover focus return, the popover fallback anchor). Acceptable.
- **No layer-rule, error-handling or performance problems.**
  - `bucketByDay` / `itemsByDay` loop over the visible days only for spans.
  - The `read-only` refusal is a typed `EventCalendarError` that reaches the existing toast and inline-error paths.

## Resolution

- 1 (Medium, ADR): fixed. ADR-0032 has a dated amendment (2026-10-28, issue 41) covering spans on every day, `end < start` ending the next day and `00:00` as 24:00, read-only spans with the `writeEvent` guard, and timed spans in the time grid. The `end_date` storage bullet and the Consequences line now point to it.
- 2 (Low, dead `rendered`): fixed. Removed from `EventIssue`, the `issue()` builder and the test fixtures/matchers; the type comment reads "Why an event-typed note cannot be shown."
- 3 (Low, indent): fixed.
- 4 (Low, `start: 24:00`): fixed. A timed event that starts at 24:00 is reported as `end-before-start` / `start`, with or without `end_date`; new test next to the empty-range case.
- 5 (Low, wording): fixed. Lock notice and `read-only` toast now say "This event has an end date or crosses midnight"; service test updated.
- 6 (Low, optional, segment aria-label): rejected for this ticket. The block receives the clipped `segmentOnDay` copy, which no longer carries the event's real `start` / `end`, so building the label from `eventWhenLabel` needs the original event threaded through the bucket and layout path. Candidate for the ticket 64 polish list.
- 7 (Low, optional, duration): fixed. `eventWhenLabel` formats durations of 24 hours or more as days plus the rest (`2d 8h`, `1d`, `1d 30m`); new test case.
