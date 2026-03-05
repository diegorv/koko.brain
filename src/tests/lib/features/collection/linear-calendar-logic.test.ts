import { describe, it, expect } from 'vitest';
import {
	getDaysInMonth,
	getLinearYearGrid,
	clampDateToMonth,
	extractEventsForYear,
	layoutEventsInMonth,
	buildLinearYearLayout,
	buildColorMapping,
	getColorForValue,
	COLOR_PALETTE,
} from '$lib/features/collection/linear-calendar.logic';
import type { NoteRecord } from '$lib/features/collection/collection.types';

function makeRecord(
	path: string,
	props: Record<string, unknown> = {},
): NoteRecord {
	const name = path.split('/').pop() ?? path;
	const ext = name.includes('.') ? '.' + name.split('.').pop() : '';
	const basename = ext ? name.slice(0, -ext.length) : name;
	const folder = path.substring(0, path.lastIndexOf('/'));
	return {
		path,
		name,
		basename,
		folder,
		ext,
		mtime: 0,
		ctime: 0,
		size: 0,
		properties: new Map(Object.entries(props)),
	};
}

// ── getDaysInMonth ─────────────────────────────────────────────────────

describe('getDaysInMonth', () => {
	it('returns 31 for January', () => {
		expect(getDaysInMonth(2026, 0)).toBe(31);
	});

	it('returns 28 for February in non-leap year', () => {
		expect(getDaysInMonth(2025, 1)).toBe(28);
	});

	it('returns 29 for February in leap year', () => {
		expect(getDaysInMonth(2024, 1)).toBe(29);
	});

	it('returns 30 for April', () => {
		expect(getDaysInMonth(2026, 3)).toBe(30);
	});

	it('returns 31 for December', () => {
		expect(getDaysInMonth(2026, 11)).toBe(31);
	});
});

// ── getLinearYearGrid ──────────────────────────────────────────────────

describe('getLinearYearGrid', () => {
	it('returns 12 month rows', () => {
		const grid = getLinearYearGrid(2026);
		expect(grid).toHaveLength(12);
	});

	it('each month has correct daysInMonth', () => {
		const grid = getLinearYearGrid(2026);
		expect(grid[0].daysInMonth).toBe(31); // Jan
		expect(grid[1].daysInMonth).toBe(28); // Feb (2026 is not leap)
		expect(grid[3].daysInMonth).toBe(30); // Apr
		expect(grid[11].daysInMonth).toBe(31); // Dec
	});

	it('handles leap year correctly', () => {
		const grid = getLinearYearGrid(2024);
		expect(grid[1].daysInMonth).toBe(29); // Feb 2024
	});

	it('has correct month labels', () => {
		const grid = getLinearYearGrid(2026);
		expect(grid[0].label).toBe('Jan');
		expect(grid[5].label).toBe('Jun');
		expect(grid[11].label).toBe('Dec');
	});

	it('starts with empty events and maxLane -1', () => {
		const grid = getLinearYearGrid(2026);
		for (const row of grid) {
			expect(row.events).toEqual([]);
			expect(row.maxLane).toBe(-1);
		}
	});

	it('has correct month indices', () => {
		const grid = getLinearYearGrid(2026);
		for (let i = 0; i < 12; i++) {
			expect(grid[i].month).toBe(i);
		}
	});
});

// ── clampDateToMonth ───────────────────────────────────────────────────

describe('clampDateToMonth', () => {
	it('returns same date when within month', () => {
		const date = new Date(2026, 2, 15); // Mar 15
		const result = clampDateToMonth(date, 2026, 2);
		expect(result.getDate()).toBe(15);
		expect(result.getMonth()).toBe(2);
	});

	it('clamps date before month to first of month', () => {
		const date = new Date(2026, 1, 20); // Feb 20
		const result = clampDateToMonth(date, 2026, 2); // clamp to March
		expect(result.getDate()).toBe(1);
		expect(result.getMonth()).toBe(2);
	});

	it('clamps date after month to last of month', () => {
		const date = new Date(2026, 3, 10); // Apr 10
		const result = clampDateToMonth(date, 2026, 2); // clamp to March
		expect(result.getDate()).toBe(31);
		expect(result.getMonth()).toBe(2);
	});

	it('handles leap year February boundary', () => {
		const date = new Date(2024, 2, 5); // Mar 5
		const result = clampDateToMonth(date, 2024, 1); // clamp to Feb
		expect(result.getDate()).toBe(29); // leap year
		expect(result.getMonth()).toBe(1);
	});
});

// ── extractEventsForYear ───────────────────────────────────────────────

describe('extractEventsForYear', () => {
	it('extracts single-day events within the year', () => {
		const records = [
			makeRecord('notes/a.md', { date: '2026-03-15' }),
			makeRecord('notes/b.md', { date: '2026-07-20' }),
		];
		const events = extractEventsForYear(records, 2026, 'date');
		expect(events).toHaveLength(2);
		expect(events[0].startDate.getMonth()).toBe(2);
		expect(events[1].startDate.getMonth()).toBe(6);
	});

	it('extracts multi-day events', () => {
		const records = [
			makeRecord('notes/trip.md', { start: '2026-03-10', end: '2026-03-15' }),
		];
		const events = extractEventsForYear(records, 2026, 'start', 'end');
		expect(events).toHaveLength(1);
		expect(events[0].startDate.getDate()).toBe(10);
		expect(events[0].endDate.getDate()).toBe(15);
	});

	it('skips records without valid dates', () => {
		const records = [
			makeRecord('notes/no-date.md', {}),
			makeRecord('notes/bad-date.md', { date: 'not-a-date' }),
		];
		const events = extractEventsForYear(records, 2026, 'date');
		expect(events).toHaveLength(0);
	});

	it('skips events entirely outside the year', () => {
		const records = [
			makeRecord('notes/old.md', { date: '2025-12-31' }),
			makeRecord('notes/future.md', { date: '2027-01-01' }),
		];
		const events = extractEventsForYear(records, 2026, 'date');
		expect(events).toHaveLength(0);
	});

	it('includes events that partially overlap the year', () => {
		const records = [
			makeRecord('notes/cross-year.md', { start: '2025-12-28', end: '2026-01-05' }),
		];
		const events = extractEventsForYear(records, 2026, 'start', 'end');
		expect(events).toHaveLength(1);
	});

	it('extracts colorValue from color property', () => {
		const records = [
			makeRecord('notes/a.md', { date: '2026-03-15', category: 'work' }),
			makeRecord('notes/b.md', { date: '2026-04-01', category: 'personal' }),
		];
		const events = extractEventsForYear(records, 2026, 'date', undefined, 'category');
		expect(events[0].colorValue).toBe('work');
		expect(events[1].colorValue).toBe('personal');
	});

	it('returns null colorValue when property missing', () => {
		const records = [
			makeRecord('notes/a.md', { date: '2026-03-15' }),
		];
		const events = extractEventsForYear(records, 2026, 'date', undefined, 'category');
		expect(events[0].colorValue).toBeNull();
	});

	it('returns empty array for empty records', () => {
		const events = extractEventsForYear([], 2026, 'date');
		expect(events).toEqual([]);
	});

	it('uses startDate as endDate when endDate is before startDate', () => {
		const records = [
			makeRecord('notes/a.md', { start: '2026-03-15', end: '2026-03-10' }),
		];
		const events = extractEventsForYear(records, 2026, 'start', 'end');
		expect(events).toHaveLength(1);
		expect(events[0].startDate.getTime()).toBe(events[0].endDate.getTime());
	});
});

// ── layoutEventsInMonth ────────────────────────────────────────────────

describe('layoutEventsInMonth', () => {
	const makeRawEvent = (startDay: number, endDay: number, month = 2, year = 2026) => ({
		record: makeRecord(`notes/${startDay}-${endDay}.md`, {}),
		startDate: new Date(year, month, startDay),
		endDate: new Date(year, month, endDay),
		colorValue: null,
	});

	it('assigns lane 0 to a single event', () => {
		const raw = [makeRawEvent(5, 10)];
		const { events, maxLane } = layoutEventsInMonth(raw, 2, 2026);
		expect(events).toHaveLength(1);
		expect(events[0].lane).toBe(0);
		expect(maxLane).toBe(0);
	});

	it('stacks overlapping events in separate lanes', () => {
		const raw = [
			makeRawEvent(5, 10),
			makeRawEvent(8, 15),
		];
		const { events, maxLane } = layoutEventsInMonth(raw, 2, 2026);
		expect(events).toHaveLength(2);
		expect(events[0].lane).toBe(0);
		expect(events[1].lane).toBe(1);
		expect(maxLane).toBe(1);
	});

	it('reuses lanes when events do not overlap', () => {
		const raw = [
			makeRawEvent(1, 5),
			makeRawEvent(10, 15),
		];
		const { events, maxLane } = layoutEventsInMonth(raw, 2, 2026);
		expect(events).toHaveLength(2);
		expect(events[0].lane).toBe(0);
		expect(events[1].lane).toBe(0); // reused
		expect(maxLane).toBe(0);
	});

	it('handles events spanning month boundaries (clamps)', () => {
		const raw = [{
			record: makeRecord('notes/cross.md', {}),
			startDate: new Date(2026, 1, 25), // Feb 25
			endDate: new Date(2026, 2, 10),   // Mar 10
			colorValue: null,
		}];
		const { events } = layoutEventsInMonth(raw, 2, 2026); // layout in March
		expect(events).toHaveLength(1);
		expect(events[0].startDate.getDate()).toBe(1);  // clamped to Mar 1
		expect(events[0].endDate.getDate()).toBe(10);
	});

	it('sorts longer events first when starting same day', () => {
		const raw = [
			makeRawEvent(5, 7),   // 3 days
			makeRawEvent(5, 20),  // 16 days
		];
		const { events } = layoutEventsInMonth(raw, 2, 2026);
		// Longer event should get lane 0
		const longEvent = events.find(e => e.endDate.getDate() === 20);
		expect(longEvent?.lane).toBe(0);
	});

	it('returns maxLane -1 for month with no events', () => {
		const { events, maxLane } = layoutEventsInMonth([], 2, 2026);
		expect(events).toEqual([]);
		expect(maxLane).toBe(-1);
	});

	it('handles three overlapping events', () => {
		const raw = [
			makeRawEvent(1, 15),
			makeRawEvent(5, 10),
			makeRawEvent(8, 20),
		];
		const { events, maxLane } = layoutEventsInMonth(raw, 2, 2026);
		expect(events).toHaveLength(3);
		expect(maxLane).toBe(2);
	});

	it('preserves original dates while clamping', () => {
		const raw = [{
			record: makeRecord('notes/cross.md', {}),
			startDate: new Date(2025, 11, 28), // Dec 28, 2025
			endDate: new Date(2026, 0, 5),      // Jan 5, 2026
			colorValue: null,
		}];
		const { events } = layoutEventsInMonth(raw, 0, 2026); // January
		expect(events[0].startDate.getMonth()).toBe(0); // clamped to Jan 1
		expect(events[0].startDate.getDate()).toBe(1);
		expect(events[0].originalStartDate.getMonth()).toBe(11); // original Dec 28
		expect(events[0].originalStartDate.getDate()).toBe(28);
	});
});

// ── buildLinearYearLayout ──────────────────────────────────────────────

describe('buildLinearYearLayout', () => {
	it('returns 12 rows for any year', () => {
		const layout = buildLinearYearLayout([], 2026, 'date');
		expect(layout).toHaveLength(12);
	});

	it('places events in correct months', () => {
		const records = [
			makeRecord('notes/mar.md', { date: '2026-03-15' }),
			makeRecord('notes/jul.md', { date: '2026-07-20' }),
		];
		const layout = buildLinearYearLayout(records, 2026, 'date');
		expect(layout[2].events).toHaveLength(1);  // March
		expect(layout[6].events).toHaveLength(1);  // July
		expect(layout[0].events).toHaveLength(0);  // January (empty)
	});

	it('multi-month events appear in multiple rows', () => {
		const records = [
			makeRecord('notes/long.md', { start: '2026-02-25', end: '2026-03-10' }),
		];
		const layout = buildLinearYearLayout(records, 2026, 'start', 'end');
		expect(layout[1].events).toHaveLength(1); // February
		expect(layout[2].events).toHaveLength(1); // March
	});

	it('empty year returns 12 rows with no events', () => {
		const layout = buildLinearYearLayout([], 2026, 'date');
		for (const row of layout) {
			expect(row.events).toHaveLength(0);
			expect(row.maxLane).toBe(-1);
		}
	});

	it('events have correct lane assignments', () => {
		const records = [
			makeRecord('notes/a.md', { start: '2026-03-05', end: '2026-03-10' }),
			makeRecord('notes/b.md', { start: '2026-03-08', end: '2026-03-15' }),
		];
		const layout = buildLinearYearLayout(records, 2026, 'start', 'end');
		expect(layout[2].maxLane).toBe(1); // two overlapping → lanes 0,1
	});
});

// ── buildColorMapping ──────────────────────────────────────────────────

describe('buildColorMapping', () => {
	it('assigns unique colors to unique values', () => {
		const records = [
			makeRecord('notes/a.md', { category: 'work' }),
			makeRecord('notes/b.md', { category: 'personal' }),
			makeRecord('notes/c.md', { category: 'travel' }),
		];
		const mapping = buildColorMapping(records, 'category');
		expect(mapping.values).toHaveLength(3);
		expect(mapping.colors.size).toBe(3);
		// Each gets a different color
		const colors = new Set(mapping.colors.values());
		expect(colors.size).toBe(3);
	});

	it('produces deterministic alphabetical ordering', () => {
		const records = [
			makeRecord('notes/a.md', { category: 'zebra' }),
			makeRecord('notes/b.md', { category: 'alpha' }),
			makeRecord('notes/c.md', { category: 'mid' }),
		];
		const mapping = buildColorMapping(records, 'category');
		expect(mapping.values).toEqual(['alpha', 'mid', 'zebra']);
	});

	it('cycles through palette for many values', () => {
		const records = Array.from({ length: 15 }, (_, i) =>
			makeRecord(`notes/${i}.md`, { category: `cat-${String(i).padStart(2, '0')}` }),
		);
		const mapping = buildColorMapping(records, 'category');
		expect(mapping.values).toHaveLength(15);
		// 13th value (index 12) wraps to palette[0]
		expect(mapping.colors.get('cat-12')).toBe(COLOR_PALETTE[12 % COLOR_PALETTE.length]);
	});

	it('handles empty records', () => {
		const mapping = buildColorMapping([], 'category');
		expect(mapping.values).toEqual([]);
		expect(mapping.colors.size).toBe(0);
	});

	it('ignores null/undefined property values', () => {
		const records = [
			makeRecord('notes/a.md', { category: 'work' }),
			makeRecord('notes/b.md', {}), // no category
		];
		const mapping = buildColorMapping(records, 'category');
		expect(mapping.values).toEqual(['work']);
	});

	it('deduplicates same values from multiple records', () => {
		const records = [
			makeRecord('notes/a.md', { category: 'work' }),
			makeRecord('notes/b.md', { category: 'work' }),
			makeRecord('notes/c.md', { category: 'personal' }),
		];
		const mapping = buildColorMapping(records, 'category');
		expect(mapping.values).toHaveLength(2);
	});
});

// ── getColorForValue ───────────────────────────────────────────────────

describe('getColorForValue', () => {
	const mapping = {
		colors: new Map([
			['work', 'hsl(210, 70%, 60%)'],
			['personal', 'hsl(150, 60%, 55%)'],
		]),
		values: ['personal', 'work'],
	};

	it('returns correct color for known value', () => {
		expect(getColorForValue('work', mapping)).toBe('hsl(210, 70%, 60%)');
	});

	it('returns null for null value', () => {
		expect(getColorForValue(null, mapping)).toBeNull();
	});

	it('returns null for unknown value', () => {
		expect(getColorForValue('travel', mapping)).toBeNull();
	});
});
