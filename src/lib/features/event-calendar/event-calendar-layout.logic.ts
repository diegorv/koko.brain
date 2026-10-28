/**
 * Time-grid geometry for the event calendar, ported from the prototype's
 * `calender-app-design/src/components/calendar/layout.ts`.
 *
 * Times are minutes from midnight (0..1440). Pure logic: no framework imports.
 */

import type { EventNote, PositionedEvent } from './event-calendar.types';

/** One hour of the time grid, in px (the design draws a line every 64 px). */
export const HOUR_HEIGHT = 64;

/** Step, in minutes, that drags and resizes snap to. */
export const SNAP_MINUTES = 15;

/** Shortest event a drag or resize can produce, in minutes. */
export const MIN_EVENT_MINUTES = 15;

/** Narrowest day column, in px; below it the week scrolls sideways. */
export const MIN_COLUMN_PX = 96;

/** Converts minutes to a vertical offset in px on the time grid. */
export const minutesToPx = (m: number): number => (m / 60) * HOUR_HEIGHT;

/** Converts a vertical offset in px on the time grid to minutes. */
export const pxToMinutes = (px: number): number => (px / HOUR_HEIGHT) * 60;

/** Rounds minutes to the nearest multiple of `step` (halves round up). */
export const snap = (m: number, step = SNAP_MINUTES): number => Math.round(m / step) * step;

/** Rounds minutes down to a multiple of `step`. */
export const floorToSnap = (m: number, step = SNAP_MINUTES): number => Math.floor(m / step) * step;

/**
 * Clamps `n` into `[min, max]`. When the bounds are inverted (`min > max`),
 * `max` wins, unlike `$lib/utils/clamp`: a resize from start 1430 with a
 * 15-minute minimum (`min` 1445) still ends at the day's end, 1440.
 */
export const clampMinutes = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n));

/**
 * Lays out a day's timed events side by side. Events are grouped into
 * clusters of transitive overlap; each event takes the first column that is
 * free at its start, and every event of a cluster shares that cluster's
 * column count (one width per cluster). An event ending exactly when another
 * starts does not overlap it. The input is not mutated; the result is in
 * start order, longer events first on a tie.
 */
export function layoutDay(events: EventNote[]): PositionedEvent[] {
	const sorted = [...events].sort((a, b) => a.start - b.start || b.end - a.end);
	const out: PositionedEvent[] = [];
	let cluster: { event: EventNote; column: number }[] = [];
	let clusterEnd = -1;
	let columnEnds: number[] = [];

	const flush = () => {
		const columns = columnEnds.length;
		for (const c of cluster) out.push({ ...c, columns });
		cluster = [];
		columnEnds = [];
	};

	for (const event of sorted) {
		if (event.start >= clusterEnd && cluster.length) flush();
		let column = columnEnds.findIndex((end) => end <= event.start);
		if (column === -1) {
			column = columnEnds.length;
			columnEnds.push(event.end);
		} else {
			columnEnds[column] = event.end;
		}
		cluster.push({ event, column });
		clusterEnd = Math.max(clusterEnd, event.end);
	}
	if (cluster.length) flush();
	return out;
}
