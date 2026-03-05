import { describe, it, expect } from 'vitest';
import { DVDateTime } from '$lib/plugins/queryjs/dv-datetime';

describe('DVDateTime', () => {
	describe('constructor', () => {
		it('creates from string', () => {
			const dt = new DVDateTime('2024-06-15');
			expect(dt.year).toBe(2024);
			expect(dt.month).toBe(6);
			expect(dt.day).toBe(15);
		});

		it('creates from number (timestamp)', () => {
			const ts = new Date(2024, 0, 1).getTime(); // local midnight Jan 1
			const dt = new DVDateTime(ts);
			expect(dt.year).toBe(2024);
			expect(dt.month).toBe(1);
			expect(dt.day).toBe(1);
		});

		it('creates from Date', () => {
			const d = new Date(2024, 2, 10); // March 10
			const dt = new DVDateTime(d);
			expect(dt.year).toBe(2024);
			expect(dt.month).toBe(3);
			expect(dt.day).toBe(10);
		});

		it('creates from another DVDateTime', () => {
			const original = new DVDateTime('2024-06-15');
			const copy = new DVDateTime(original);
			expect(copy.year).toBe(2024);
			expect(copy.month).toBe(6);
			expect(copy.day).toBe(15);
		});

		it('creates current date when no args', () => {
			const dt = new DVDateTime();
			const now = new Date();
			expect(dt.year).toBe(now.getFullYear());
		});
	});

	describe('tryParse', () => {
		it('returns null for null', () => {
			expect(DVDateTime.tryParse(null)).toBeNull();
		});

		it('returns null for undefined', () => {
			expect(DVDateTime.tryParse(undefined)).toBeNull();
		});

		it('returns copy from DVDateTime', () => {
			const original = new DVDateTime('2024-06-15');
			const result = DVDateTime.tryParse(original)!;
			expect(result).toBeInstanceOf(DVDateTime);
			expect(result.year).toBe(2024);
			expect(result.month).toBe(6);
			expect(result.day).toBe(15);
			expect(result).not.toBe(original);
		});

		it('wraps a valid Date', () => {
			const d = new Date(2024, 2, 10);
			const result = DVDateTime.tryParse(d)!;
			expect(result.year).toBe(2024);
			expect(result.month).toBe(3);
			expect(result.day).toBe(10);
		});

		it('returns null for invalid Date', () => {
			expect(DVDateTime.tryParse(new Date('invalid'))).toBeNull();
		});

		it('wraps a number (timestamp)', () => {
			const ts = new Date(2024, 0, 1).getTime();
			const result = DVDateTime.tryParse(ts)!;
			expect(result.year).toBe(2024);
			expect(result.month).toBe(1);
		});

		it('returns null for NaN number', () => {
			expect(DVDateTime.tryParse(NaN)).toBeNull();
		});

		it('parses ISO date string', () => {
			const result = DVDateTime.tryParse('2024-06-15')!;
			expect(result.year).toBe(2024);
			expect(result.month).toBe(6);
			expect(result.day).toBe(15);
		});

		it('parses ISO datetime string', () => {
			const result = DVDateTime.tryParse('2024-06-15T14:30:00')!;
			expect(result.year).toBe(2024);
			expect(result.hour).toBe(14);
		});

		it('returns null for empty string', () => {
			expect(DVDateTime.tryParse('')).toBeNull();
		});

		it('returns null for whitespace-only string', () => {
			expect(DVDateTime.tryParse('   ')).toBeNull();
		});

		it('returns null for unparseable string', () => {
			expect(DVDateTime.tryParse('not-a-date')).toBeNull();
		});

		it('constructs from object with { year, month, day }', () => {
			const result = DVDateTime.tryParse({ year: 2024, month: 6, day: 15 })!;
			expect(result.year).toBe(2024);
			expect(result.month).toBe(6);
			expect(result.day).toBe(15);
		});

		it('wraps from object with { ts }', () => {
			const ts = new Date(2024, 5, 15).getTime();
			const result = DVDateTime.tryParse({ ts })!;
			expect(result.year).toBe(2024);
			expect(result.month).toBe(6);
		});

		it('returns null for object with non-numeric ts', () => {
			expect(DVDateTime.tryParse({ ts: 'abc' })).toBeNull();
		});

		it('returns null for random object', () => {
			expect(DVDateTime.tryParse({ foo: 'bar' })).toBeNull();
		});

		it('returns null for boolean', () => {
			expect(DVDateTime.tryParse(true)).toBeNull();
		});

		it('returns null for array', () => {
			expect(DVDateTime.tryParse([2024, 6, 15])).toBeNull();
		});
	});

	describe('getters', () => {
		it('returns correct year, month (1-12), day', () => {
			const dt = new DVDateTime('2024-12-25T10:30:00');
			expect(dt.year).toBe(2024);
			expect(dt.month).toBe(12);
			expect(dt.day).toBe(25);
		});

		it('returns correct hour and minute', () => {
			const dt = new DVDateTime('2024-01-01T14:45:00');
			expect(dt.hour).toBe(14);
			expect(dt.minute).toBe(45);
		});

		it('returns timestamp in ms', () => {
			const d = new Date('2024-06-15T00:00:00Z');
			const dt = new DVDateTime(d);
			expect(dt.ts).toBe(d.getTime());
		});
	});

	describe('plus', () => {
		it('advances by days', () => {
			const dt = new DVDateTime('2024-01-15');
			const result = dt.plus({ days: 3 });
			expect(result.day).toBe(18);
			expect(result.month).toBe(1);
		});

		it('advances across month boundary', () => {
			const dt = new DVDateTime('2024-01-30');
			const result = dt.plus({ days: 5 });
			expect(result.month).toBe(2);
			expect(result.day).toBe(4);
		});

		it('advances by months', () => {
			const dt = new DVDateTime('2024-03-15');
			const result = dt.plus({ months: 2 });
			expect(result.month).toBe(5);
			expect(result.year).toBe(2024);
		});

		it('advances by years', () => {
			const dt = new DVDateTime('2024-06-15');
			const result = dt.plus({ years: 1 });
			expect(result.year).toBe(2025);
		});

		it('advances by multiple units', () => {
			const dt = new DVDateTime('2024-01-01T00:00:00');
			const result = dt.plus({ days: 1, hours: 2, minutes: 30 });
			expect(result.day).toBe(2);
			expect(result.hour).toBe(2);
			expect(result.minute).toBe(30);
		});

		it('does not mutate original', () => {
			const dt = new DVDateTime('2024-01-15');
			dt.plus({ days: 10 });
			expect(dt.day).toBe(15);
		});
	});

	describe('minus', () => {
		it('subtracts days', () => {
			const dt = new DVDateTime('2024-01-15');
			const result = dt.minus({ days: 5 });
			expect(result.day).toBe(10);
		});

		it('subtracts months', () => {
			const dt = new DVDateTime('2024-03-15');
			const result = dt.minus({ months: 1 });
			expect(result.month).toBe(2);
		});
	});

	describe('startOf', () => {
		it('startOf day sets time to midnight', () => {
			const dt = new DVDateTime('2024-06-15T14:30:45');
			const result = dt.startOf('day');
			expect(result.hour).toBe(0);
			expect(result.minute).toBe(0);
			expect(result.day).toBe(15);
		});

		it('startOf week returns Monday', () => {
			// 2024-06-19 is a Wednesday
			const dt = new DVDateTime('2024-06-19T12:00:00');
			const result = dt.startOf('week');
			expect(result.day).toBe(17); // Monday June 17
			expect(result.hour).toBe(0);
		});

		it('startOf week on Monday returns same day', () => {
			// 2024-06-17 is a Monday
			const dt = new DVDateTime('2024-06-17T12:00:00');
			const result = dt.startOf('week');
			expect(result.day).toBe(17);
		});

		it('startOf week on Sunday returns previous Monday', () => {
			// 2024-06-16 is a Sunday
			const dt = new DVDateTime('2024-06-16T12:00:00');
			const result = dt.startOf('week');
			expect(result.day).toBe(10); // Monday June 10
		});

		it('startOf month', () => {
			const dt = new DVDateTime('2024-06-15');
			const result = dt.startOf('month');
			expect(result.day).toBe(1);
			expect(result.month).toBe(6);
		});

		it('startOf year', () => {
			const dt = new DVDateTime('2024-06-15');
			const result = dt.startOf('year');
			expect(result.day).toBe(1);
			expect(result.month).toBe(1);
			expect(result.year).toBe(2024);
		});
	});

	describe('hasSame', () => {
		it('same day', () => {
			const a = new DVDateTime('2024-06-15T10:00:00');
			const b = new DVDateTime('2024-06-15T22:00:00');
			expect(a.hasSame(b, 'day')).toBe(true);
		});

		it('different day', () => {
			const a = new DVDateTime('2024-06-15');
			const b = new DVDateTime('2024-06-16');
			expect(a.hasSame(b, 'day')).toBe(false);
		});

		it('same month', () => {
			const a = new DVDateTime('2024-06-01');
			const b = new DVDateTime('2024-06-30');
			expect(a.hasSame(b, 'month')).toBe(true);
		});

		it('same year', () => {
			const a = new DVDateTime('2024-01-01');
			const b = new DVDateTime('2024-12-31');
			expect(a.hasSame(b, 'year')).toBe(true);
		});
	});

	describe('formatting', () => {
		it('toISODate returns YYYY-MM-DD', () => {
			const dt = new DVDateTime('2024-06-05');
			expect(dt.toISODate()).toBe('2024-06-05');
		});

		it('toFormat with yyyy-MM-dd', () => {
			const dt = new DVDateTime('2024-06-05');
			expect(dt.toFormat('yyyy-MM-dd')).toBe('2024-06-05');
		});

		it('toFormat replaces all occurrences of repeated tokens', () => {
			const dt = new DVDateTime('2024-06-05');
			expect(dt.toFormat('yyyy/yyyy')).toBe('2024/2024');
			expect(dt.toFormat('dd-MM dd-MM')).toBe('05-06 05-06');
		});

		it('toString returns ISO string', () => {
			const dt = new DVDateTime('2024-06-15T00:00:00Z');
			expect(dt.toString()).toContain('2024-06-15');
		});
	});

	describe('valueOf / comparison', () => {
		it('valueOf returns timestamp', () => {
			const d = new Date('2024-06-15T00:00:00Z');
			const dt = new DVDateTime(d);
			expect(dt.valueOf()).toBe(d.getTime());
		});

		it('enables numeric comparison', () => {
			const a = new DVDateTime('2024-01-01');
			const b = new DVDateTime('2024-06-01');
			expect(a < b).toBe(true);
			expect(b > a).toBe(true);
		});
	});

	describe('toJSDate', () => {
		it('returns a native Date copy', () => {
			const dt = new DVDateTime('2024-06-15');
			const d = dt.toJSDate();
			expect(d).toBeInstanceOf(Date);
			expect(d.getFullYear()).toBe(2024);
		});
	});
});
