# Issue 18 discovery: cap linear-calendar bars in the editor widget

Template: Issue 17 (`work/17/discovery.md`, `COLLECTION_ROW_CAP`). Same file, same test file, same "cap only the rendering, keep the cached QueryResult whole" rule. What differs is listed below.

## Files that change
- `src/lib/core/markdown-editor/extensions/live-preview/widgets/collection-block-widget.ts`
  - new exported constant `LINEAR_CALENDAR_LANE_CAP = 3` with JSDoc (why: the bars are rebuilt synchronously on every `toDOM()` and `buildLinearYearLayout` lanes grow without limit, so a dated vault would build one bar per record).
  - `buildLinearCalendar` (:244-348):
    - row height (:302) uses `min(row.maxLane + 1, cap)` lanes.
    - bar loop (:320) skips events with `event.lane >= cap` and counts them.
    - when the count is > 0, the month label cell gets a `div.cm-lp-collection-lane-more` reading `+N` (styled inline like the calendar view's `+N`, :226-230).
- No `styles.ts` change, no change to `linear-calendar.logic.ts` (the dedicated `CollectionLinearCalendarView.svelte` keeps every lane).

## Plan
1. Test-first in `src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/collection-block-widget.test.ts`, new describe over a real `collectionStore` index with a `linear-calendar` YAML (`dateProperty: date`), dates in the current year:
   - 20 records on the same March day: the March row holds `LINEAR_CALENDAR_LANE_CAP` bars and a `+17` marker; header still `Year (20)`.
   - 2 records (under the cap): 2 bars, no marker.
   - exactly the cap (3 records same day): 3 bars, no marker (catches a `>=` slip).
   Run, see red. Implement. Green. One commit.

## Prior-art tests
- Same file: `CollectionBlockWidget - query data cache` (real `collectionStore`, `recordAt` fixture, only `openFileInEditor` mocked).

## Risks / defaults taken
- Cap value 3 lanes (calendar shows 2 pills per day; a lane row spans the whole month, so 3 keeps short months readable). Bounded output: at most 3 lanes x 31 days x 12 months bars.
- "+N" counts hidden events (bars) in that month row, not days; it sits in the month label cell so it does not collide with bars.
- Greedy lane assignment means a hidden event's day may have free space in lane 0..2 on other days; acceptable, matches "lane cap" in the Issue.
- Not verified in the app; jsdom only.
