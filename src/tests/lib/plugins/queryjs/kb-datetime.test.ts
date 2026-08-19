import { describe, it, expect } from 'vitest';
import { KBDateTime } from '$lib/plugins/queryjs/kb-datetime';

describe('KBDateTime', () => {
	describe('constructor', () => {
		it('creates from string', () => {
			const dt = new KBDateTime('2024-06-15');
			expect(dt.year).toBe(2024);
			expect(dt.month).toBe(6);
			expect(dt.day).toBe(15);
		});

		it('creates from number (timestamp)', () => {
			const ts = new Date(2024, 0, 1).getTime(); // local midnight Jan 1
			const dt = new KBDateTime(ts);
			expect(dt.year).toBe(2024);
			expect(dt.month).toBe(1);
			expect(dt.day).toBe(1);
		});

		it('creates from Date', () => {
			const d = new Date(2024, 2, 10); // March 10
			const dt = new KBDateTime(d);
			expect(dt.year).toBe(2024);
			expect(dt.month).toBe(3);
			expect(dt.day).toBe(10);
		});

		it('creates from another KBDateTime', () => {
			const original = new KBDateTime('2024-06-15');
			const copy = new KBDateTime(original);
			expect(copy.year).toBe(2024);
			expect(copy.month).toBe(6);
			expect(copy.day).toBe(15);
		});

		it('creates current date when no args', () => {
			const dt = new KBDateTime();
			const now = new Date();
			expect(dt.year).toBe(now.getFullYear());
		});
	});

	describe('tryParse', () => {
		it('returns null for null', () => {
			expect(KBDateTime.tryParse(null)).toBeNull();
		});

		it('returns null for undefined', () => {
			expect(KBDateTime.tryParse(undefined)).toBeNull();
		});

		it('returns copy from KBDateTime', () => {
			const original = new KBDateTime('2024-06-15');
			const result = KBDateTime.tryParse(original)!;
			expect(result).toBeInstanceOf(KBDateTime);
			expect(result.year).toBe(2024);
			expect(result.month).toBe(6);
			expect(result.day).toBe(15);
			expect(result).not.toBe(original);
		});

		it('wraps a valid Date', () => {
			const d = new Date(2024, 2, 10);
			const result = KBDateTime.tryParse(d)!;
			expect(result.year).toBe(2024);
			expect(result.month).toBe(3);
			expect(result.day).toBe(10);
		});

		it('returns null for invalid Date', () => {
			expect(KBDateTime.tryParse(new Date('invalid'))).toBeNull();
		});

		it('wraps a number (timestamp)', () => {
			const ts = new Date(2024, 0, 1).getTime();
			const result = KBDateTime.tryParse(ts)!;
			expect(result.year).toBe(2024);
			expect(result.month).toBe(1);
		});

		it('returns null for NaN number', () => {
			expect(KBDateTime.tryParse(NaN)).toBeNull();
		});

		it('parses ISO date string', () => {
			const result = KBDateTime.tryParse('2024-06-15')!;
			expect(result.year).toBe(2024);
			expect(result.month).toBe(6);
			expect(result.day).toBe(15);
		});

		it('parses ISO datetime string', () => {
			const result = KBDateTime.tryParse('2024-06-15T14:30:00')!;
			expect(result.year).toBe(2024);
			expect(result.hour).toBe(14);
		});

		it('returns null for empty string', () => {
			expect(KBDateTime.tryParse('')).toBeNull();
		});

		it('returns null for whitespace-only string', () => {
			expect(KBDateTime.tryParse('   ')).toBeNull();
		});

		it('returns null for unparseable string', () => {
			expect(KBDateTime.tryParse('not-a-date')).toBeNull();
		});

		it('constructs from object with { year, month, day }', () => {
			const result = KBDateTime.tryParse({ year: 2024, month: 6, day: 15 })!;
			expect(result.year).toBe(2024);
			expect(result.month).toBe(6);
			expect(result.day).toBe(15);
		});

		it('wraps from object with { ts }', () => {
			const ts = new Date(2024, 5, 15).getTime();
			const result = KBDateTime.tryParse({ ts })!;
			expect(result.year).toBe(2024);
			expect(result.month).toBe(6);
		});

		it('returns null for object with non-numeric ts', () => {
			expect(KBDateTime.tryParse({ ts: 'abc' })).toBeNull();
		});

		it('returns null for random object', () => {
			expect(KBDateTime.tryParse({ foo: 'bar' })).toBeNull();
		});

		it('returns null for boolean', () => {
			expect(KBDateTime.tryParse(true)).toBeNull();
		});

		it('returns null for array', () => {
			expect(KBDateTime.tryParse([2024, 6, 15])).toBeNull();
		});
	});

	describe('getters', () => {
		it('returns correct year, month (1-12), day', () => {
			const dt = new KBDateTime('2024-12-25T10:30:00');
			expect(dt.year).toBe(2024);
			expect(dt.month).toBe(12);
			expect(dt.day).toBe(25);
		});

		it('returns correct hour and minute', () => {
			const dt = new KBDateTime('2024-01-01T14:45:00');
			expect(dt.hour).toBe(14);
			expect(dt.minute).toBe(45);
		});

		it('returns timestamp in ms', () => {
			const d = new Date('2024-06-15T00:00:00Z');
			const dt = new KBDateTime(d);
			expect(dt.ts).toBe(d.getTime());
		});
	});

	describe('plus', () => {
		it('advances by days', () => {
			const dt = new KBDateTime('2024-01-15');
			const result = dt.plus({ days: 3 });
			expect(result.day).toBe(18);
			expect(result.month).toBe(1);
		});

		it('advances across month boundary', () => {
			const dt = new KBDateTime('2024-01-30');
			const result = dt.plus({ days: 5 });
			expect(result.month).toBe(2);
			expect(result.day).toBe(4);
		});

		it('advances by months', () => {
			const dt = new KBDateTime('2024-03-15');
			const result = dt.plus({ months: 2 });
			expect(result.month).toBe(5);
			expect(result.year).toBe(2024);
		});

		it('advances by years', () => {
			const dt = new KBDateTime('2024-06-15');
			const result = dt.plus({ years: 1 });
			expect(result.year).toBe(2025);
		});

		it('advances by multiple units', () => {
			const dt = new KBDateTime('2024-01-01T00:00:00');
			const result = dt.plus({ days: 1, hours: 2, minutes: 30 });
			expect(result.day).toBe(2);
			expect(result.hour).toBe(2);
			expect(result.minute).toBe(30);
		});

		it('does not mutate original', () => {
			const dt = new KBDateTime('2024-01-15');
			dt.plus({ days: 10 });
			expect(dt.day).toBe(15);
		});
	});

	describe('minus', () => {
		it('subtracts days', () => {
			const dt = new KBDateTime('2024-01-15');
			const result = dt.minus({ days: 5 });
			expect(result.day).toBe(10);
		});

		it('subtracts months', () => {
			const dt = new KBDateTime('2024-03-15');
			const result = dt.minus({ months: 1 });
			expect(result.month).toBe(2);
		});
	});

	describe('plus/minus do not clamp month/year overflow', () => {
		// Behavior contract for the dayjs delegation (issue 41): plus/minus stay
		// hand-rolled. Native setMonth/setFullYear OVERFLOW into the following month
		// (Jan 31 + 1 month = Mar 2), while dayjs add/subtract CLAMP to the last valid
		// day (Feb 29). Every assertion below flips if these two methods are delegated.

		it('plus months overflows past the shorter month instead of clamping', () => {
			expect(new KBDateTime('2024-01-31').plus({ months: 1 }).toISODate()).toBe('2024-03-02');
		});

		it('minus months overflows past the shorter month instead of clamping', () => {
			expect(new KBDateTime('2024-03-31').minus({ months: 1 }).toISODate()).toBe('2024-03-02');
		});

		it('plus years overflows off a leap day instead of clamping', () => {
			expect(new KBDateTime('2024-02-29').plus({ years: 1 }).toISODate()).toBe('2025-03-01');
		});

		it('applies years then months sequentially, compounding the overflow', () => {
			expect(new KBDateTime('2024-01-31').plus({ years: 1, months: 1 }).toISODate()).toBe(
				'2025-03-03'
			);
		});

		it('plus months overflows past a 30-day month', () => {
			expect(new KBDateTime('2023-05-31').plus({ months: 1 }).toISODate()).toBe('2023-07-01');
		});
	});

	describe('startOf', () => {
		it('startOf day sets time to midnight', () => {
			const dt = new KBDateTime('2024-06-15T14:30:45');
			const result = dt.startOf('day');
			expect(result.hour).toBe(0);
			expect(result.minute).toBe(0);
			expect(result.day).toBe(15);
		});

		it('startOf week returns Monday', () => {
			// 2024-06-19 is a Wednesday
			const dt = new KBDateTime('2024-06-19T12:00:00');
			const result = dt.startOf('week');
			expect(result.day).toBe(17); // Monday June 17
			expect(result.hour).toBe(0);
		});

		it('startOf week on Monday returns same day', () => {
			// 2024-06-17 is a Monday
			const dt = new KBDateTime('2024-06-17T12:00:00');
			const result = dt.startOf('week');
			expect(result.day).toBe(17);
		});

		it('startOf week on Sunday returns previous Monday', () => {
			// 2024-06-16 is a Sunday
			const dt = new KBDateTime('2024-06-16T12:00:00');
			const result = dt.startOf('week');
			expect(result.day).toBe(10); // Monday June 10
		});

		it('startOf month', () => {
			const dt = new KBDateTime('2024-06-15');
			const result = dt.startOf('month');
			expect(result.day).toBe(1);
			expect(result.month).toBe(6);
		});

		it('startOf year', () => {
			const dt = new KBDateTime('2024-06-15');
			const result = dt.startOf('year');
			expect(result.day).toBe(1);
			expect(result.month).toBe(1);
			expect(result.year).toBe(2024);
		});
	});

	describe('hasSame', () => {
		it('same day', () => {
			const a = new KBDateTime('2024-06-15T10:00:00');
			const b = new KBDateTime('2024-06-15T22:00:00');
			expect(a.hasSame(b, 'day')).toBe(true);
		});

		it('different day', () => {
			const a = new KBDateTime('2024-06-15');
			const b = new KBDateTime('2024-06-16');
			expect(a.hasSame(b, 'day')).toBe(false);
		});

		it('same month', () => {
			const a = new KBDateTime('2024-06-01');
			const b = new KBDateTime('2024-06-30');
			expect(a.hasSame(b, 'month')).toBe(true);
		});

		it('same year', () => {
			const a = new KBDateTime('2024-01-01');
			const b = new KBDateTime('2024-12-31');
			expect(a.hasSame(b, 'year')).toBe(true);
		});
	});

	describe('formatting', () => {
		it('toISODate returns YYYY-MM-DD', () => {
			const dt = new KBDateTime('2024-06-05');
			expect(dt.toISODate()).toBe('2024-06-05');
		});

		it('toFormat with yyyy-MM-dd', () => {
			const dt = new KBDateTime('2024-06-05');
			expect(dt.toFormat('yyyy-MM-dd')).toBe('2024-06-05');
		});

		it('toFormat replaces all occurrences of repeated tokens', () => {
			const dt = new KBDateTime('2024-06-05');
			expect(dt.toFormat('yyyy/yyyy')).toBe('2024/2024');
			expect(dt.toFormat('dd-MM dd-MM')).toBe('05-06 05-06');
		});

		it('toString returns ISO string', () => {
			const dt = new KBDateTime('2024-06-15T00:00:00Z');
			expect(dt.toString()).toContain('2024-06-15');
		});
	});

	describe('valueOf / comparison', () => {
		it('valueOf returns timestamp', () => {
			const d = new Date('2024-06-15T00:00:00Z');
			const dt = new KBDateTime(d);
			expect(dt.valueOf()).toBe(d.getTime());
		});

		it('enables numeric comparison', () => {
			const a = new KBDateTime('2024-01-01');
			const b = new KBDateTime('2024-06-01');
			expect(a < b).toBe(true);
			expect(b > a).toBe(true);
		});
	});

	describe('toJSDate', () => {
		it('returns a native Date copy', () => {
			const dt = new KBDateTime('2024-06-15');
			const d = dt.toJSDate();
			expect(d).toBeInstanceOf(Date);
			expect(d.getFullYear()).toBe(2024);
		});
	});

	describe('quarter', () => {
		it.each([
			['2024-01-15', 1], ['2024-02-10', 1], ['2024-03-31', 1],
			['2024-04-01', 2], ['2024-05-15', 2], ['2024-06-30', 2],
			['2024-07-01', 3], ['2024-08-20', 3], ['2024-09-30', 3],
			['2024-10-01', 4], ['2024-11-15', 4], ['2024-12-31', 4],
		])('maps %s → Q%i', (iso, q) => {
			expect(new KBDateTime(iso).quarter).toBe(q);
		});
	});

	describe('weekNumber (ISO 8601)', () => {
		it('returns 1 for a year that starts on Monday', () => {
			// 2024-01-01 is a Monday, so it belongs to week 1 of 2024.
			expect(new KBDateTime('2024-01-01').weekNumber).toBe(1);
		});

		it('applies the 4-day rule at year boundaries', () => {
			// 2023-12-31 (Sunday) is the last day of ISO week 52 of 2023.
			expect(new KBDateTime('2023-12-31').weekNumber).toBe(52);
			// 2024-12-30 (Monday) belongs to ISO week 1 of 2025 (Jan 1–5 of 2025
			// has only 5 days in the year, but weeks are anchored to Thursday).
			expect(new KBDateTime('2024-12-30').weekNumber).toBe(1);
		});

		it('spans mid-year weeks correctly', () => {
			expect(new KBDateTime('2024-04-20').weekNumber).toBe(16);
			expect(new KBDateTime('2024-07-01').weekNumber).toBe(27);
		});
	});

	describe('startOf with quarter', () => {
		it.each([
			['2024-01-15', '2024-01-01'],
			['2024-02-29', '2024-01-01'],
			['2024-04-05', '2024-04-01'],
			['2024-06-30', '2024-04-01'],
			['2024-08-15', '2024-07-01'],
			['2024-11-20', '2024-10-01'],
		])('anchors %s to the first day of its quarter (%s)', (input, expected) => {
			expect(new KBDateTime(input).startOf('quarter').toISODate()).toBe(expected);
		});

		it('zeros the time at the start of the quarter', () => {
			const dt = new KBDateTime('2024-05-15T15:30:45').startOf('quarter');
			expect(dt.hour).toBe(0);
			expect(dt.minute).toBe(0);
		});
	});

	describe('endOf', () => {
		it('returns 23:59 of the same day for unit=day', () => {
			const end = new KBDateTime('2024-06-15T10:00:00').endOf('day');
			expect(end.toISODate()).toBe('2024-06-15');
			expect(end.hour).toBe(23);
			expect(end.minute).toBe(59);
		});

		it('returns Sunday for endOf week (Monday-based)', () => {
			// 2024-04-15 is a Monday → Sunday of that ISO week is 2024-04-21.
			expect(new KBDateTime('2024-04-15').endOf('week').toISODate()).toBe('2024-04-21');
			// A Wednesday inside the same week resolves to the same Sunday.
			expect(new KBDateTime('2024-04-17').endOf('week').toISODate()).toBe('2024-04-21');
			// Sunday itself stays as Sunday.
			expect(new KBDateTime('2024-04-21').endOf('week').toISODate()).toBe('2024-04-21');
		});

		it('returns the last day of the month (handles leap + non-leap Feb, 30/31-day)', () => {
			expect(new KBDateTime('2024-02-10').endOf('month').toISODate()).toBe('2024-02-29');
			expect(new KBDateTime('2023-02-10').endOf('month').toISODate()).toBe('2023-02-28');
			expect(new KBDateTime('2024-04-10').endOf('month').toISODate()).toBe('2024-04-30');
			expect(new KBDateTime('2024-01-10').endOf('month').toISODate()).toBe('2024-01-31');
		});

		it.each([
			['2024-01-15', '2024-03-31'],
			['2024-04-05', '2024-06-30'],
			['2024-08-15', '2024-09-30'],
			['2024-11-20', '2024-12-31'],
		])('returns the last day of the quarter for %s (%s)', (input, expected) => {
			expect(new KBDateTime(input).endOf('quarter').toISODate()).toBe(expected);
		});

		it('returns Dec 31 for endOf year', () => {
			expect(new KBDateTime('2024-06-15').endOf('year').toISODate()).toBe('2024-12-31');
		});
	});

	describe('toFormat with month-name tokens', () => {
		it('expands MMM to short English month name', () => {
			expect(new KBDateTime('2024-04-15').toFormat('MMM')).toBe('Apr');
			expect(new KBDateTime('2024-12-01').toFormat('MMM')).toBe('Dec');
		});

		it('expands MMMM to full English month name', () => {
			expect(new KBDateTime('2024-04-15').toFormat('MMMM')).toBe('April');
			expect(new KBDateTime('2024-09-01').toFormat('MMMM')).toBe('September');
		});

		it('MMMM is replaced before MM so "MM-MMMM" yields "04-April"', () => {
			expect(new KBDateTime('2024-04-15').toFormat('MM-MMMM')).toBe('04-April');
		});

		it('coexists with the existing tokens', () => {
			const dt = new KBDateTime('2024-04-15T09:05:00');
			expect(dt.toFormat('dd MMM yyyy HH:mm')).toBe('15 Apr 2024 09:05');
		});
	});
});
