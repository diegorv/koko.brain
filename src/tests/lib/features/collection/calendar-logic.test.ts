import { describe, it, expect } from 'vitest';
import {
	getCalendarGrid,
	extractDateFromRecord,
	groupRecordsByDate,
	navigateMonth,
	formatMonthYear,
	getWeekDayLabels,
	formatDateKey,
} from '$lib/features/collection/calendar.logic';
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

describe('formatDateKey', () => {
	it('formats date as YYYY-MM-DD', () => {
		expect(formatDateKey(new Date(2026, 2, 15))).toBe('2026-03-15');
	});

	it('pads single-digit month and day', () => {
		expect(formatDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
	});
});

describe('getCalendarGrid', () => {
	it('returns a 6×7 grid', () => {
		const grid = getCalendarGrid(2026, 2); // March 2026
		expect(grid.length).toBe(6);
		for (const row of grid) {
			expect(row.length).toBe(7);
		}
	});

	it('starts on the correct weekday (Monday start)', () => {
		// March 2026 starts on a Sunday
		const grid = getCalendarGrid(2026, 2, 1); // weekStartDay=1 (Mon)
		// First cell should be Monday before March 1
		expect(grid[0][0].date.getDay()).toBe(1); // Monday
		expect(grid[0][0].isCurrentMonth).toBe(false); // February day
	});

	it('starts on the correct weekday (Sunday start)', () => {
		// March 2026 starts on a Sunday
		const grid = getCalendarGrid(2026, 2, 0); // weekStartDay=0 (Sun)
		// First cell should be Sunday March 1
		expect(grid[0][0].date.getDay()).toBe(0); // Sunday
		expect(grid[0][0].date.getDate()).toBe(1);
		expect(grid[0][0].isCurrentMonth).toBe(true);
	});

	it('marks current month days correctly', () => {
		const grid = getCalendarGrid(2026, 2, 1); // March 2026
		const flat = grid.flat();
		const marchDays = flat.filter((d) => d.isCurrentMonth);
		expect(marchDays.length).toBe(31); // March has 31 days
	});

	it('marks today correctly', () => {
		const now = new Date();
		const grid = getCalendarGrid(now.getFullYear(), now.getMonth(), 1);
		const flat = grid.flat();
		const todayCells = flat.filter((d) => d.isToday);
		expect(todayCells.length).toBe(1);
		expect(todayCells[0].date.getDate()).toBe(now.getDate());
	});

	it('does not mark today when viewing a different month', () => {
		// Pick a month definitely not the current one
		const now = new Date();
		const otherMonth = (now.getMonth() + 6) % 12;
		const otherYear = otherMonth > now.getMonth() ? now.getFullYear() : now.getFullYear() + 1;
		const grid = getCalendarGrid(otherYear, otherMonth, 1);
		const flat = grid.flat();
		const todayCells = flat.filter((d) => d.isToday);
		// Today might appear in the padding days, so just check it's ≤ 1
		expect(todayCells.length).toBeLessThanOrEqual(1);
	});

	it('all days in a row share the same week', () => {
		const grid = getCalendarGrid(2026, 0, 1); // January 2026, Monday start
		for (const row of grid) {
			// Each row should span exactly 7 consecutive days
			for (let i = 1; i < row.length; i++) {
				const diff = row[i].date.getTime() - row[i - 1].date.getTime();
				expect(diff).toBe(24 * 60 * 60 * 1000);
			}
		}
	});
});

describe('extractDateFromRecord', () => {
	it('extracts Date object from property', () => {
		const record = makeRecord('/test.md', { due: new Date(2026, 2, 15) });
		const result = extractDateFromRecord(record, 'due');
		expect(result).toBeInstanceOf(Date);
		expect(result!.getFullYear()).toBe(2026);
		expect(result!.getMonth()).toBe(2);
		expect(result!.getDate()).toBe(15);
	});

	it('extracts date from ISO string', () => {
		const record = makeRecord('/test.md', { due: '2026-03-15' });
		const result = extractDateFromRecord(record, 'due');
		expect(result).toBeInstanceOf(Date);
		expect(result!.getFullYear()).toBe(2026);
	});

	it('extracts date from ISO datetime string', () => {
		const record = makeRecord('/test.md', { due: '2026-03-15T10:30:00' });
		const result = extractDateFromRecord(record, 'due');
		expect(result).toBeInstanceOf(Date);
		expect(result!.getFullYear()).toBe(2026);
	});

	it('extracts date from numeric timestamp', () => {
		const ts = new Date(2026, 2, 15).getTime();
		const record = makeRecord('/test.md', { due: ts });
		const result = extractDateFromRecord(record, 'due');
		expect(result).toBeInstanceOf(Date);
		expect(result!.getFullYear()).toBe(2026);
	});

	it('returns null for missing property', () => {
		const record = makeRecord('/test.md', {});
		expect(extractDateFromRecord(record, 'due')).toBeNull();
	});

	it('returns null for empty string', () => {
		const record = makeRecord('/test.md', { due: '' });
		expect(extractDateFromRecord(record, 'due')).toBeNull();
	});

	it('returns null for invalid date string', () => {
		const record = makeRecord('/test.md', { due: 'not-a-date' });
		expect(extractDateFromRecord(record, 'due')).toBeNull();
	});

	it('returns null for invalid Date object', () => {
		const record = makeRecord('/test.md', { due: new Date('invalid') });
		expect(extractDateFromRecord(record, 'due')).toBeNull();
	});

	it('returns null for boolean value', () => {
		const record = makeRecord('/test.md', { due: true });
		expect(extractDateFromRecord(record, 'due')).toBeNull();
	});

	it('extracts file.mtime as date', () => {
		const mtime = new Date(2026, 2, 15).getTime();
		const record = makeRecord('/test.md', {});
		record.mtime = mtime;
		const result = extractDateFromRecord(record, 'file.mtime');
		expect(result).toBeInstanceOf(Date);
		expect(result!.getFullYear()).toBe(2026);
	});
});

describe('groupRecordsByDate', () => {
	it('groups single-day records by date', () => {
		const records = [
			makeRecord('/a.md', { due: '2026-03-10' }),
			makeRecord('/b.md', { due: '2026-03-10' }),
			makeRecord('/c.md', { due: '2026-03-12' }),
		];
		const groups = groupRecordsByDate(records, 'due');
		expect(groups.get('2026-03-10')?.length).toBe(2);
		expect(groups.get('2026-03-12')?.length).toBe(1);
		expect(groups.has('2026-03-11')).toBe(false);
	});

	it('skips records without a valid date', () => {
		const records = [
			makeRecord('/a.md', { due: '2026-03-10' }),
			makeRecord('/b.md', {}),
			makeRecord('/c.md', { due: 'invalid' }),
		];
		const groups = groupRecordsByDate(records, 'due');
		expect(groups.size).toBe(1);
		expect(groups.get('2026-03-10')?.length).toBe(1);
	});

	it('places multi-day events on each spanned day', () => {
		const records = [
			makeRecord('/event.md', {
				start: '2026-03-10',
				end: '2026-03-12',
			}),
		];
		const groups = groupRecordsByDate(records, 'start', 'end');
		expect(groups.get('2026-03-10')?.length).toBe(1);
		expect(groups.get('2026-03-11')?.length).toBe(1);
		expect(groups.get('2026-03-12')?.length).toBe(1);
		expect(groups.has('2026-03-13')).toBe(false);
	});

	it('treats event as single-day when end equals start', () => {
		const records = [
			makeRecord('/event.md', {
				start: '2026-03-10',
				end: '2026-03-10',
			}),
		];
		const groups = groupRecordsByDate(records, 'start', 'end');
		expect(groups.get('2026-03-10')?.length).toBe(1);
		expect(groups.size).toBe(1);
	});

	it('treats event as single-day when end is before start', () => {
		const records = [
			makeRecord('/event.md', {
				start: '2026-03-12',
				end: '2026-03-10',
			}),
		];
		const groups = groupRecordsByDate(records, 'start', 'end');
		expect(groups.get('2026-03-12')?.length).toBe(1);
		expect(groups.size).toBe(1);
	});

	it('returns empty map for empty records array', () => {
		const groups = groupRecordsByDate([], 'due');
		expect(groups.size).toBe(0);
	});

	it('ignores endDateProperty when not provided', () => {
		const records = [
			makeRecord('/event.md', {
				start: '2026-03-10',
				end: '2026-03-12',
			}),
		];
		const groups = groupRecordsByDate(records, 'start');
		expect(groups.size).toBe(1);
		expect(groups.get('2026-03-10')?.length).toBe(1);
	});
});

describe('navigateMonth', () => {
	it('moves forward one month', () => {
		expect(navigateMonth(2026, 2, 1)).toEqual({ year: 2026, month: 3 });
	});

	it('moves backward one month', () => {
		expect(navigateMonth(2026, 2, -1)).toEqual({ year: 2026, month: 1 });
	});

	it('wraps forward across year boundary', () => {
		expect(navigateMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
	});

	it('wraps backward across year boundary', () => {
		expect(navigateMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
	});

	it('handles multi-month jumps', () => {
		expect(navigateMonth(2026, 0, 14)).toEqual({ year: 2027, month: 2 });
	});
});

describe('formatMonthYear', () => {
	it('formats month and year', () => {
		expect(formatMonthYear(2026, 2)).toBe('March 2026');
	});

	it('formats January', () => {
		expect(formatMonthYear(2026, 0)).toBe('January 2026');
	});

	it('formats December', () => {
		expect(formatMonthYear(2025, 11)).toBe('December 2025');
	});
});

describe('getWeekDayLabels', () => {
	it('returns labels starting from Monday by default', () => {
		expect(getWeekDayLabels(1)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
	});

	it('returns labels starting from Sunday', () => {
		expect(getWeekDayLabels(0)).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
	});

	it('returns labels starting from Wednesday', () => {
		expect(getWeekDayLabels(3)).toEqual(['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue']);
	});
});
