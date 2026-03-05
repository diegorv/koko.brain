import { describe, it, expect } from 'vitest';
import { today, formatNow, formatDate, parseDate, formatDateWithOffset, formatToCapturingRegex } from '$lib/utils/date';

describe('today', () => {
	it('returns a string in default YYYY-MM-DD format', () => {
		const result = today();
		expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	it('returns a string in custom format', () => {
		const result = today('DD/MM/YYYY');
		expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
	});
});

describe('formatDate', () => {
	it('formats a Date object', () => {
		const result = formatDate(new Date(2026, 1, 9), 'YYYY-MM-DD');
		expect(result).toBe('2026-02-09');
	});

	it('formats with custom format', () => {
		const result = formatDate(new Date(2026, 11, 25), 'DD/MM/YYYY');
		expect(result).toBe('25/12/2026');
	});
});

describe('parseDate', () => {
	it('parses a date string with given format', () => {
		const result = parseDate('09-02-2026', 'DD-MM-YYYY');
		expect(result.year()).toBe(2026);
		expect(result.month()).toBe(1); // 0-indexed
		expect(result.date()).toBe(9);
	});
});

describe('formatDateWithOffset', () => {
	it('returns formatted date with zero offset', () => {
		const result = formatDateWithOffset('09-02-2026', 'DD-MM-YYYY', 'YYYY-MM-DD', 0);
		expect(result).toBe('2026-02-09');
	});

	it('adds positive offset days', () => {
		const result = formatDateWithOffset('09-02-2026', 'DD-MM-YYYY', 'DD-MM-YYYY', 1);
		expect(result).toBe('10-02-2026');
	});

	it('subtracts negative offset days', () => {
		const result = formatDateWithOffset('09-02-2026', 'DD-MM-YYYY', 'DD-MM-YYYY', -1);
		expect(result).toBe('08-02-2026');
	});

	it('handles month boundary', () => {
		const result = formatDateWithOffset('01-03-2026', 'DD-MM-YYYY', 'DD-MM-YYYY', -1);
		expect(result).toBe('28-02-2026');
	});

	it('formats output in different format', () => {
		const result = formatDateWithOffset('09-02-2026', 'DD-MM-YYYY', 'YYYY/MM-MMM/', 0);
		expect(result).toBe('2026/02-Feb/');
	});

	it('extracts date from string with prefix (e.g. filename)', () => {
		const result = formatDateWithOffset('_journal-day-12-02-2026', 'DD-MM-YYYY', 'YYYY-MM-DDTHH:mm:ss', 0);
		expect(result).toBe('2026-02-12T00:00:00');
	});

	it('extracts date from string with full path components', () => {
		const result = formatDateWithOffset('2026/02-Feb/_journal-day-12-02-2026', 'DD-MM-YYYY', 'YYYY-MM-DDTHH:mm:ss', 0);
		expect(result).toBe('2026-02-12T00:00:00');
	});

	it('extracts date with offset from prefixed string', () => {
		const result = formatDateWithOffset('_journal-day-12-02-2026', 'DD-MM-YYYY', 'YYYY-MM-DDTHH:mm:ss', 1);
		expect(result).toBe('2026-02-13T00:00:00');
	});

	it('returns original string when date is completely unparseable', () => {
		const result = formatDateWithOffset('not-a-date-at-all', 'DD-MM-YYYY', 'YYYY-MM-DD', 0);
		expect(result).toBe('not-a-date-at-all');
	});
});

describe('formatNow', () => {
	it('returns current date in the given format', () => {
		const result = formatNow('YYYY-MM-DD');
		expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	it('returns current datetime with time components', () => {
		const result = formatNow('YYYY-MM-DDTHH:mm:ss');
		expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
	});

	it('applies positive day offset', () => {
		const today = formatNow('YYYY-MM-DD', 0);
		const tomorrow = formatNow('YYYY-MM-DD', 1);
		expect(today).not.toBe(tomorrow);
	});

	it('applies negative day offset', () => {
		const today = formatNow('YYYY-MM-DD', 0);
		const yesterday = formatNow('YYYY-MM-DD', -1);
		expect(today).not.toBe(yesterday);
	});
});

describe('formatToCapturingRegex', () => {
	it('matches daily format and captures year, month, monthName, day', () => {
		const regex = formatToCapturingRegex('YYYY/MM-MMM/[_journal-day-]DD-MM-YYYY');
		const match = '2026/02-Feb/_journal-day-14-02-2026'.match(regex);
		expect(match).not.toBeNull();
		expect(match!.groups!.year).toBe('2026');
		expect(match!.groups!.month).toBe('02');
		expect(match!.groups!.monthName).toBe('Feb');
		expect(match!.groups!.day).toBe('14');
	});

	it('matches weekly format and captures year, month, monthName, week', () => {
		const regex = formatToCapturingRegex('YYYY/MM-MMM/[__journal-week-]WW[-]YYYY');
		const match = '2026/02-Feb/__journal-week-07-2026'.match(regex);
		expect(match).not.toBeNull();
		expect(match!.groups!.year).toBe('2026');
		expect(match!.groups!.month).toBe('02');
		expect(match!.groups!.monthName).toBe('Feb');
		expect(match!.groups!.week).toBe('07');
	});

	it('matches monthly format and captures year, month, monthName', () => {
		const regex = formatToCapturingRegex('YYYY/MM-MMM/MM-MMM');
		const match = '2026/02-Feb/02-Feb'.match(regex);
		expect(match).not.toBeNull();
		expect(match!.groups!.year).toBe('2026');
		expect(match!.groups!.month).toBe('02');
		expect(match!.groups!.monthName).toBe('Feb');
	});

	it('matches quarterly format and captures year, quarter', () => {
		const regex = formatToCapturingRegex('YYYY/[_journal-quarter-]YYYY[-Q]Q');
		const match = '2026/_journal-quarter-2026-Q1'.match(regex);
		expect(match).not.toBeNull();
		expect(match!.groups!.year).toBe('2026');
		expect(match!.groups!.quarter).toBe('1');
	});

	it('does not match non-matching strings', () => {
		const regex = formatToCapturingRegex('YYYY/MM-MMM/[_journal-day-]DD-MM-YYYY');
		expect('random-text'.match(regex)).toBeNull();
		expect('2026/02-Feb/some-other-file'.match(regex)).toBeNull();
	});

	it('is anchored (no partial matches)', () => {
		const regex = formatToCapturingRegex('DD-MM-YYYY');
		expect('prefix-14-02-2026'.match(regex)).toBeNull();
		expect('14-02-2026-suffix'.match(regex)).toBeNull();
		expect('14-02-2026'.match(regex)).not.toBeNull();
	});

	it('handles simple format without literals', () => {
		const regex = formatToCapturingRegex('YYYY-MM-DD');
		const match = '2026-02-14'.match(regex);
		expect(match).not.toBeNull();
		expect(match!.groups!.year).toBe('2026');
		expect(match!.groups!.month).toBe('02');
		expect(match!.groups!.day).toBe('14');
	});

	it('handles duplicate tokens (only first becomes named group)', () => {
		const regex = formatToCapturingRegex('YYYY/YYYY');
		const match = '2026/2026'.match(regex);
		expect(match).not.toBeNull();
		expect(match!.groups!.year).toBe('2026');
	});

	it('does not replace tokens inside literal escapes', () => {
		const regex = formatToCapturingRegex('[YYYY]-MM-DD');
		expect('YYYY-02-14'.match(regex)).not.toBeNull();
		expect('2026-02-14'.match(regex)).toBeNull();
	});

	it('handles single-char tokens M and D', () => {
		const regex = formatToCapturingRegex('YYYY-M-D');
		const match = '2026-2-9'.match(regex);
		expect(match).not.toBeNull();
		expect(match!.groups!.year).toBe('2026');
		expect(match!.groups!.month).toBe('2');
		expect(match!.groups!.day).toBe('9');
	});
});

describe('formatDateWithOffset — literal escape protection', () => {
	it('preserves literal text that looks like a token', () => {
		const result = formatDateWithOffset('YYYY-02-14', '[YYYY]-MM-DD', 'YYYY-MM-DD', 0);
		expect(result).toBe('2026-02-14');
	});
});
