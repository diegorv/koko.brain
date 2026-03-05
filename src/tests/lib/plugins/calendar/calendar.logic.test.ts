import { describe, it, expect } from 'vitest';
import {
	buildMonthGrid,
	toDateKey,
	extractDisplayName,
	formatDateLabel,
	timestampToDateKey,
	parseDateToKey,
} from '$lib/plugins/calendar/calendar.logic';

describe('buildMonthGrid', () => {
	it('builds correct grid for February 2026', () => {
		const grid = buildMonthGrid(2026, 1); // month 1 = February
		expect(grid.weeks).toHaveLength(6);
		// Feb 1 2026 is a Sunday, so grid starts on Monday Jan 26
		expect(grid.weeks[0][0].dateKey).toBe('2026-01-26');
		expect(grid.weeks[0][0].day).toBe(26);
		expect(grid.weeks[0][0].isCurrentMonth).toBe(false);
		// Last cell: 6 weeks * 7 days = 42 days from Jan 26 → Sun Mar 8
		expect(grid.weeks[5][6].dateKey).toBe('2026-03-08');
		expect(grid.weeks[5][6].isCurrentMonth).toBe(false);
	});

	it('builds correct grid for January 2024 (starts on Monday)', () => {
		const grid = buildMonthGrid(2024, 0); // Jan 1 2024 = Monday
		expect(grid.weeks[0][0].dateKey).toBe('2024-01-01');
		expect(grid.weeks[0][0].day).toBe(1);
		expect(grid.weeks[0][0].isCurrentMonth).toBe(true);
	});

	it('marks isToday correctly when grid contains today', () => {
		const now = new Date();
		const grid = buildMonthGrid(now.getFullYear(), now.getMonth());
		const todayCells = grid.weeks.flat().filter((d) => d.isToday);
		expect(todayCells).toHaveLength(1);
		expect(todayCells[0].dateKey).toBe(toDateKey(now));
	});

	it('marks no isToday when grid does not contain today', () => {
		// Use a month far in the past
		const grid = buildMonthGrid(2000, 0);
		const todayCells = grid.weeks.flat().filter((d) => d.isToday);
		expect(todayCells).toHaveLength(0);
	});

	it('marks isCurrentMonth correctly', () => {
		const grid = buildMonthGrid(2026, 1); // February
		const febCells = grid.weeks.flat().filter((d) => d.isCurrentMonth);
		expect(febCells).toHaveLength(28); // Feb 2026 has 28 days
		const overflowCells = grid.weeks.flat().filter((d) => !d.isCurrentMonth);
		expect(overflowCells).toHaveLength(14); // 42 - 28
	});

	it('returns correct label', () => {
		expect(buildMonthGrid(2026, 1).label).toBe('February 2026');
		expect(buildMonthGrid(2024, 11).label).toBe('December 2024');
	});

	it('always generates exactly 6 weeks', () => {
		// Test several months
		for (let m = 0; m < 12; m++) {
			const grid = buildMonthGrid(2026, m);
			expect(grid.weeks).toHaveLength(6);
			for (const week of grid.weeks) {
				expect(week).toHaveLength(7);
			}
		}
	});

	it('returns correct quarter', () => {
		expect(buildMonthGrid(2026, 0).quarter).toBe(1); // Jan
		expect(buildMonthGrid(2026, 2).quarter).toBe(1); // Mar
		expect(buildMonthGrid(2026, 3).quarter).toBe(2); // Apr
		expect(buildMonthGrid(2026, 5).quarter).toBe(2); // Jun
		expect(buildMonthGrid(2026, 6).quarter).toBe(3); // Jul
		expect(buildMonthGrid(2026, 8).quarter).toBe(3); // Sep
		expect(buildMonthGrid(2026, 9).quarter).toBe(4); // Oct
		expect(buildMonthGrid(2026, 11).quarter).toBe(4); // Dec
	});

	it('returns correct ISO week numbers for February 2026', () => {
		const grid = buildMonthGrid(2026, 1);
		expect(grid.weekNumbers).toHaveLength(6);
		// Week starting Jan 26 = ISO week 5
		expect(grid.weekNumbers[0]).toBe(5);
		// Week starting Feb 2 = ISO week 6
		expect(grid.weekNumbers[1]).toBe(6);
		// Week starting Feb 9 = ISO week 7
		expect(grid.weekNumbers[2]).toBe(7);
		// Week starting Feb 16 = ISO week 8
		expect(grid.weekNumbers[3]).toBe(8);
		// Week starting Feb 23 = ISO week 9
		expect(grid.weekNumbers[4]).toBe(9);
		// Week starting Mar 2 = ISO week 10
		expect(grid.weekNumbers[5]).toBe(10);
	});

	it('returns correct ISO week numbers for January 2024', () => {
		const grid = buildMonthGrid(2024, 0);
		// Jan 1 2024 is Monday, ISO week 1
		expect(grid.weekNumbers[0]).toBe(1);
	});
});

describe('toDateKey', () => {
	it('formats date as YYYY-MM-DD', () => {
		expect(toDateKey(new Date(2026, 1, 10))).toBe('2026-02-10');
	});

	it('zero-pads single digit month and day', () => {
		expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
	});
});

describe('parseDateToKey', () => {
	it('parses YYYY-MM-DD string', () => {
		expect(parseDateToKey('2026-02-10')).toBe('2026-02-10');
	});

	it('parses ISO datetime string', () => {
		expect(parseDateToKey('2026-02-10T14:30:00')).toBe('2026-02-10');
	});

	it('parses Date object', () => {
		expect(parseDateToKey(new Date(2026, 1, 10))).toBe('2026-02-10');
	});

	it('parses timestamp number', () => {
		const ts = new Date(2026, 1, 10).getTime();
		expect(parseDateToKey(ts)).toBe('2026-02-10');
	});

	it('returns null for null', () => {
		expect(parseDateToKey(null)).toBeNull();
	});

	it('returns null for undefined', () => {
		expect(parseDateToKey(undefined)).toBeNull();
	});

	it('returns null for invalid string', () => {
		expect(parseDateToKey('not-a-date')).toBeNull();
	});
});

describe('extractDisplayName', () => {
	it('extracts name from full path', () => {
		expect(extractDisplayName('/vault/notes/10-02-2026.md')).toBe('10-02-2026');
	});

	it('handles path without extension', () => {
		expect(extractDisplayName('/vault/notes/readme')).toBe('readme');
	});

	it('handles filename only', () => {
		expect(extractDisplayName('my-note.md')).toBe('my-note');
	});
});

describe('formatDateLabel', () => {
	it('formats dateKey as human-readable label', () => {
		expect(formatDateLabel('2026-02-11')).toBe('11 Feb 2026');
	});

	it('formats another date correctly', () => {
		expect(formatDateLabel('2026-01-05')).toBe('5 Jan 2026');
	});
});

describe('timestampToDateKey', () => {
	it('converts timestamp to dateKey', () => {
		// Feb 11, 2026 00:00:00 UTC
		const ts = new Date(2026, 1, 11).getTime();
		expect(timestampToDateKey(ts)).toBe('2026-02-11');
	});

	it('handles midnight correctly', () => {
		const ts = new Date(2026, 0, 1, 0, 0, 0).getTime();
		expect(timestampToDateKey(ts)).toBe('2026-01-01');
	});
});
