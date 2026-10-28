# 06 discovery: time-grid layout helpers

## Files that change (both new)

- `src/lib/features/event-calendar/event-calendar-layout.logic.ts`: port of `calender-app-design/src/components/calendar/layout.ts:4-48`, typed on `EventNote` / `PositionedEvent` (`event-calendar.types.ts:23-44`, `:209-216`). Imports only `import type` from the types file.
- `src/tests/lib/features/event-calendar/event-calendar-layout.logic.test.ts`.

## Plan

One feat commit (the ticket asks for one), test-first.

- Constants `HOUR_HEIGHT` 64, `SNAP_MINUTES` 15, `MIN_EVENT_MINUTES` 15, `MIN_COLUMN_PX` 96 (`time-grid.tsx:32`, `MIN_COLUMN`).
- `minutesToPx`, `pxToMinutes`, `snap(m, step = SNAP_MINUTES)` (Math.round), `floorToSnap(m, step = SNAP_MINUTES)` (Math.floor).
- `clampMinutes(n, min, max) = Math.min(max, Math.max(min, n))`: the prototype's `clamp` (`layout.ts:11`), max wins. Renamed so it never shadows or is confused with `$lib/utils/clamp` (min wins).
- `layoutDay(events: EventNote[]): PositionedEvent[]`: the prototype algorithm unchanged (sort by start, longer first; flush a cluster when `start >= clusterEnd`; first-fit column by `columnEnd <= start`). `PositionedEvent` is not redefined (it already lives in the types file).

## Prior-art tests

- Prototype `layout.test.ts:16-33` (3 cases), ported verbatim with an `ev(id, start, end)` builder over `EventNote` (id goes in `path`).
- Style: `event-calendar-dates.logic.test.ts` (tabs, `$lib/` import, describe per area).

## Risks

- None for callers: no consumer yet (Task 8 drag logic and Task 15 time grid come later).
- `snap` of a small negative value returns `-0`; not asserted, not reachable from the grid (minutes are clamped first).

## Defaults for open questions

- Zero-length and inverted events are not normalised (the projection of Task 6 rejects invalid times). Because events are sorted by start, the prototype already treats an inverted event like a zero-length one at its start: it takes a column, never widens a later cluster, and a later event can reuse its column. The tests pin that.
- `layoutDay` does not mutate its input array (it sorts a copy) and returns events in start order; the test asserts this.
- `MIN_COLUMN_PX` is only a constant here; the time grid uses it later.
