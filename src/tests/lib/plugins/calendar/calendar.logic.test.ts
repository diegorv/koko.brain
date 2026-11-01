import { describe, it, expect } from 'vitest';
import {
	buildMonthGrid,
	toDateKey,
	extractDisplayName,
	formatDateLabel,
	periodicNoteEntries,
} from '#lib/plugins/calendar/calendar.logic.js';

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

	it('marks the cell of the given todayKey as today', () => {
		const grid = buildMonthGrid(2026, 10, 1, '2026-11-11');
		const todayCells = grid.weeks.flat().filter((d) => d.isToday);
		expect(todayCells.map((d) => d.dateKey)).toEqual(['2026-11-11']);
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

	it('defaults to a Monday-first grid with Monday-first headers', () => {
		const grid = buildMonthGrid(2026, 1);
		expect(grid.dayHeaders.map((h) => h.label)).toEqual(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']);
		expect(grid.dayHeaders.map((h) => h.isWeekend)).toEqual([false, false, false, false, false, true, true]);
		expect(grid.weekKeys).toEqual(grid.weeks.map((w) => w[0].dateKey));
		expect(buildMonthGrid(2026, 1, 1)).toEqual(grid);
	});

	it('marks Saturday and Sunday cells as weekend', () => {
		const week = buildMonthGrid(2026, 1, 1).weeks[1]; // Mon Feb 2 .. Sun Feb 8
		expect(week.map((d) => d.isWeekend)).toEqual([false, false, false, false, false, true, true]);
	});
});

describe('buildMonthGrid with a Sunday week start', () => {
	it('starts on the Sunday on or before the 1st', () => {
		// Feb 1 2026 is a Sunday, so the grid starts on it
		const feb = buildMonthGrid(2026, 1, 0);
		expect(feb.weeks[0][0].dateKey).toBe('2026-02-01');
		expect(feb.weeks[0][0].isCurrentMonth).toBe(true);
		expect(feb.weeks[5][6].dateKey).toBe('2026-03-14');
		// Jan 1 2024 is a Monday, so the grid starts on Sun Dec 31 2023
		expect(buildMonthGrid(2024, 0, 0).weeks[0][0].dateKey).toBe('2023-12-31');
	});

	it('keeps 6 weeks of 7 days and every day of the month', () => {
		for (let m = 0; m < 12; m++) {
			const grid = buildMonthGrid(2026, m, 0);
			expect(grid.weeks).toHaveLength(6);
			for (const week of grid.weeks) {
				expect(week).toHaveLength(7);
				expect(new Date(`${week[0].dateKey}T00:00:00`).getDay()).toBe(0);
			}
			const days = grid.weeks.flat().filter((d) => d.isCurrentMonth).map((d) => d.day);
			expect(days).toEqual(Array.from({ length: days.length }, (_, i) => i + 1));
		}
	});

	it('puts Sunday first in the headers and marks the weekend columns', () => {
		const grid = buildMonthGrid(2026, 1, 0);
		expect(grid.dayHeaders.map((h) => h.label)).toEqual(['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']);
		expect(grid.dayHeaders.map((h) => h.isWeekend)).toEqual([true, false, false, false, false, false, true]);
		expect(grid.weeks[0].map((d) => d.isWeekend)).toEqual([true, false, false, false, false, false, true]);
	});

	it('numbers each row by the ISO week of its Monday', () => {
		// Row 0 is Sun Feb 1 .. Sat Feb 7: Feb 1 is in ISO week 5, Mon Feb 2 .. Sat Feb 7 in week 6
		expect(buildMonthGrid(2026, 1, 0).weekNumbers).toEqual([6, 7, 8, 9, 10, 11]);
		// Row 0 is Sun Dec 31 2023 .. Sat Jan 6 2024: Mon Jan 1 opens ISO week 1
		expect(buildMonthGrid(2024, 0, 0).weekNumbers[0]).toBe(1);
		// Row 0 is Sun Dec 27 2026 .. Sat Jan 2 2027: Mon Dec 28 is in ISO week 53 of 2026
		expect(buildMonthGrid(2027, 0, 0).weekNumbers[0]).toBe(53);
	});

	it('gives each row the key of its Monday for the weekly note', () => {
		const grid = buildMonthGrid(2026, 1, 0);
		expect(grid.weekKeys).toEqual(grid.weeks.map((w) => w[1].dateKey));
		expect(grid.weekKeys[0]).toBe('2026-02-02');
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

describe('periodicNoteEntries', () => {
	it('lists the picked day\'s week and the shown month, quarter and year', () => {
		// 2026-10-28 is a Wednesday in ISO week 44.
		expect(periodicNoteEntries(2026, 9, '2026-10-28', 1)).toEqual([
			{ period: 'weekly', label: 'Week 44', dateKey: '2026-10-26' },
			{ period: 'monthly', label: 'October 2026', dateKey: '2026-10-01' },
			{ period: 'quarterly', label: 'Q4 2026', dateKey: '2026-10-01' },
			{ period: 'yearly', label: '2026', dateKey: '2026-10-01' },
		]);
	});

	it('numbers a Sunday-first week by its Monday, as the grid does', () => {
		// Sunday 2026-11-01 starts the row whose Monday is 2026-11-02 (ISO week 45).
		const sundayFirst = periodicNoteEntries(2026, 10, '2026-11-01', 0)[0];
		expect(sundayFirst).toEqual({ period: 'weekly', label: 'Week 45', dateKey: '2026-11-02' });
		const grid = buildMonthGrid(2026, 10, 0);
		expect(grid.weekKeys[0]).toBe(sundayFirst.dateKey);
		expect(grid.weekNumbers[0]).toBe(45);
		// Monday-first, the same Sunday ends ISO week 44.
		expect(periodicNoteEntries(2026, 10, '2026-11-01', 1)[0]).toEqual({ period: 'weekly', label: 'Week 44', dateKey: '2026-10-26' });
	});

	it('uses the ISO week across a year boundary', () => {
		// 2027-01-01 is a Friday in ISO week 53 of 2026.
		expect(periodicNoteEntries(2027, 0, '2027-01-01', 1)[0]).toEqual({ period: 'weekly', label: 'Week 53', dateKey: '2026-12-28' });
	});

	it('follows the shown month even when the picked day is in another month', () => {
		const entries = periodicNoteEntries(2027, 1, '2026-10-28', 1);
		expect(entries.map((e) => e.label)).toEqual(['Week 44', 'February 2027', 'Q1 2027', '2027']);
		expect(entries.slice(1).map((e) => e.dateKey)).toEqual(['2027-02-01', '2027-02-01', '2027-02-01']);
	});

	it('leaves the week out without a valid picked day', () => {
		expect(periodicNoteEntries(2026, 9, null, 1).map((e) => e.period)).toEqual(['monthly', 'quarterly', 'yearly']);
		expect(periodicNoteEntries(2026, 9, '2026-13-40', 1).map((e) => e.period)).toEqual(['monthly', 'quarterly', 'yearly']);
		expect(periodicNoteEntries(2026, 9, '', 1).map((e) => e.period)).toEqual(['monthly', 'quarterly', 'yearly']);
	});
});
