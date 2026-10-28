import { describe, expect, it } from 'vitest';

import {
	clampMinutes,
	floorToSnap,
	HOUR_HEIGHT,
	layoutDay,
	MIN_COLUMN_PX,
	MIN_EVENT_MINUTES,
	minutesToPx,
	pxToMinutes,
	SNAP_MINUTES,
	snap,
} from '$lib/features/event-calendar/event-calendar-layout.logic';
import type { EventNote, PositionedEvent } from '$lib/features/event-calendar/event-calendar.types';

/** Builds a timed event; `id` doubles as the path and the title. */
const ev = (id: string, start: number, end: number): EventNote => ({
	path: id,
	title: id,
	date: '2026-11-10',
	start,
	end,
	allDay: false,
	color: 'blue',
	location: '',
	snippet: '',
	readOnly: false,
});

/** Indexes a layout result by event path. */
const byPath = (out: PositionedEvent[]): Record<string, PositionedEvent> =>
	Object.fromEntries(out.map((p) => [p.event.path, p]));

describe('layoutDay (prototype cases)', () => {
	it('gives non-overlapping events the full width', () => {
		const out = layoutDay([ev('a', 420, 540), ev('b', 660, 780)]);
		expect(out.map((p) => p.columns)).toEqual([1, 1]);
	});

	it('splits overlapping events into columns', () => {
		const out = layoutDay([ev('a', 540, 660), ev('b', 600, 720), ev('c', 690, 750)]);
		const map = byPath(out);
		expect(map.a.column).toBe(0);
		expect(map.b.column).toBe(1);
		expect(map.c.column).toBe(0);
		expect(out.every((p) => p.columns === 2)).toBe(true);
	});

	it('snaps to 15-minute steps', () => {
		expect(snap(607)).toBe(600);
		expect(snap(608)).toBe(615);
	});
});

describe('layoutDay', () => {
	it('returns an empty list for no events', () => {
		expect(layoutDay([])).toEqual([]);
	});

	it('treats touching events (end equals the next start) as not overlapping', () => {
		const out = layoutDay([ev('a', 540, 600), ev('b', 600, 660)]);
		const map = byPath(out);
		expect(map.a).toMatchObject({ column: 0, columns: 1 });
		expect(map.b).toMatchObject({ column: 0, columns: 1 });
	});

	it('opens a third column when three events overlap at once', () => {
		const out = layoutDay([ev('a', 540, 720), ev('b', 570, 690), ev('c', 600, 660)]);
		const map = byPath(out);
		expect([map.a.column, map.b.column, map.c.column]).toEqual([0, 1, 2]);
		expect(out.every((p) => p.columns === 3)).toBe(true);
	});

	it('gives a chained cluster one shared width even where only two events overlap', () => {
		// a overlaps b, b overlaps c and d; a and d never meet. Peak overlap is 3 (b, c, d at 690).
		const out = layoutDay([
			ev('a', 540, 630),
			ev('b', 600, 720),
			ev('c', 660, 700),
			ev('d', 690, 780),
			ev('e', 800, 860),
		]);
		const map = byPath(out);
		expect([map.a.column, map.b.column, map.c.column, map.d.column]).toEqual([0, 1, 0, 2]);
		for (const key of ['a', 'b', 'c', 'd']) expect(map[key].columns).toBe(3);
		expect(map.e).toMatchObject({ column: 0, columns: 1 });
	});

	it('places the longer event first when two start together', () => {
		const out = layoutDay([ev('short', 600, 630), ev('long', 600, 720)]);
		const map = byPath(out);
		expect(map.long.column).toBe(0);
		expect(map.short.column).toBe(1);
	});

	it('returns events in start order and leaves the input untouched', () => {
		const input = [ev('late', 900, 960), ev('early', 480, 540)];
		const out = layoutDay(input);
		expect(out.map((p) => p.event.path)).toEqual(['early', 'late']);
		expect(input.map((e) => e.path)).toEqual(['late', 'early']);
		expect(out[0].event).toBe(input[1]);
	});

	it('gives a zero-length event between two others its own one-column cluster', () => {
		const out = layoutDay([ev('before', 540, 600), ev('zero', 600, 600), ev('after', 615, 660)]);
		const map = byPath(out);
		expect(out).toHaveLength(3);
		expect(map.before).toMatchObject({ column: 0, columns: 1 });
		expect(map.zero).toMatchObject({ column: 0, columns: 1 });
		expect(map.after).toMatchObject({ column: 0, columns: 1 });
	});

	it('puts a zero-length event that starts with a longer one in the next column', () => {
		const out = layoutDay([ev('zero', 600, 600), ev('long', 600, 660)]);
		const map = byPath(out);
		expect(map.long).toMatchObject({ column: 0, columns: 2 });
		expect(map.zero).toMatchObject({ column: 1, columns: 2 });
	});

	it('treats an inverted event like a zero-length one at its start', () => {
		const out = layoutDay([ev('wide', 540, 700), ev('inverted', 600, 560), ev('after', 610, 650)]);
		const map = byPath(out);
		expect(out).toHaveLength(3);
		expect(map.wide).toMatchObject({ column: 0, columns: 2 });
		expect(map.inverted).toMatchObject({ column: 1, columns: 2 });
		// The inverted event ends before `after` starts, so `after` reuses its column.
		expect(map.after).toMatchObject({ column: 1, columns: 2 });
	});

	it('gives a lone inverted event one column and ends its cluster at its start', () => {
		const out = layoutDay([ev('inverted', 600, 500), ev('next', 620, 700)]);
		const map = byPath(out);
		expect(map.inverted).toMatchObject({ column: 0, columns: 1 });
		expect(map.next).toMatchObject({ column: 0, columns: 1 });
	});
});

describe('grid constants', () => {
	it('match the prototype', () => {
		expect(HOUR_HEIGHT).toBe(64);
		expect(SNAP_MINUTES).toBe(15);
		expect(MIN_EVENT_MINUTES).toBe(15);
		expect(MIN_COLUMN_PX).toBe(96);
	});
});

describe('minutesToPx / pxToMinutes', () => {
	it('maps an hour to HOUR_HEIGHT pixels', () => {
		expect(minutesToPx(0)).toBe(0);
		expect(minutesToPx(60)).toBe(64);
		expect(minutesToPx(90)).toBe(96);
		expect(minutesToPx(1440)).toBe(1536);
	});

	it('inverts minutesToPx', () => {
		expect(pxToMinutes(64)).toBe(60);
		expect(pxToMinutes(16)).toBe(15);
		expect(pxToMinutes(minutesToPx(735))).toBe(735);
	});
});

describe('snap / floorToSnap', () => {
	it('snap rounds to the nearest step, halves up', () => {
		expect(snap(0)).toBe(0);
		expect(snap(7.5)).toBe(15);
		expect(snap(1439)).toBe(1440);
	});

	it('snap accepts a custom step', () => {
		expect(snap(44, 30)).toBe(30);
		expect(snap(46, 30)).toBe(60);
	});

	it('floorToSnap rounds down to the step', () => {
		expect(floorToSnap(0)).toBe(0);
		expect(floorToSnap(14)).toBe(0);
		expect(floorToSnap(15)).toBe(15);
		expect(floorToSnap(608)).toBe(600);
		expect(floorToSnap(1439)).toBe(1425);
	});

	it('floorToSnap accepts a custom step', () => {
		expect(floorToSnap(59, 30)).toBe(30);
	});
});

describe('clampMinutes', () => {
	it('keeps a value inside the range', () => {
		expect(clampMinutes(600, 0, 1440)).toBe(600);
	});

	it('raises a value below min and lowers one above max', () => {
		expect(clampMinutes(-30, 0, 1440)).toBe(0);
		expect(clampMinutes(1500, 0, 1440)).toBe(1440);
	});

	it('lets max win when the bounds are inverted', () => {
		expect(clampMinutes(1000, 1445, 1440)).toBe(1440);
	});

	it('ends a resize from start 1430 at 1440, not 1445', () => {
		const start = 1430;
		const pointer = snap(1500);
		expect(clampMinutes(pointer, start + MIN_EVENT_MINUTES, 1440)).toBe(1440);
	});
});
