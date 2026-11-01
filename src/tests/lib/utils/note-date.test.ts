import { describe, it, expect } from 'vitest';
import dayjs from 'dayjs';
import { noteDateKey, parseDateKey } from '#lib/utils/note-date.js';

const DISK_30TH = new Date(2026, 9, 30, 9, 15).getTime();

describe('noteDateKey', () => {
	it('uses frontmatter date over created and the disk time', () => {
		expect(noteDateKey({ date: '2026-10-27', created: '2026-10-30', diskCreatedAt: DISK_30TH })).toBe('2026-10-27');
	});

	it('uses frontmatter created over the disk time when there is no date', () => {
		expect(noteDateKey({ created: '2026-10-20', diskCreatedAt: DISK_30TH })).toBe('2026-10-20');
	});

	it('falls back to the disk creation time when there is no frontmatter source', () => {
		expect(noteDateKey({ diskCreatedAt: DISK_30TH })).toBe('2026-10-30');
	});

	it('returns null when the note has no source', () => {
		expect(noteDateKey({})).toBeNull();
		expect(noteDateKey({ date: null, created: undefined, diskCreatedAt: null })).toBeNull();
	});

	it('treats a zero disk time as no source', () => {
		expect(noteDateKey({ diskCreatedAt: 0 })).toBeNull();
	});

	it('falls through an unparseable date to created', () => {
		expect(noteDateKey({ date: 'someday', created: '2026-10-20', diskCreatedAt: DISK_30TH })).toBe('2026-10-20');
	});

	it('falls through unparseable date and created to the disk time', () => {
		expect(noteDateKey({ date: true, created: ['2026-10-20'], diskCreatedAt: DISK_30TH })).toBe('2026-10-30');
	});

	it('returns null when every source is unparseable', () => {
		expect(noteDateKey({ date: '', created: { y: 2026 }, diskCreatedAt: Number.NaN })).toBeNull();
	});

	it('keeps the local day of a datetime value', () => {
		expect(noteDateKey({ date: '2026-10-27T23:30:00' })).toBe('2026-10-27');
	});

	it('falls through date values that are not real days to created', () => {
		for (const date of ['2026-02-30', '2026-13-01', 'Meeting 12', 'tbd 2026', 'Oct 27', '2026-10-27T25:00', '2026-10-27T12:00:00+99:99', 2026]) {
			expect(noteDateKey({ date, created: '2026-10-20', diskCreatedAt: DISK_30TH })).toBe('2026-10-20');
		}
	});

	it('falls through a numeric created, zero included, to the disk time', () => {
		expect(noteDateKey({ created: 0, diskCreatedAt: DISK_30TH })).toBe('2026-10-30');
		expect(noteDateKey({ created: 2026, diskCreatedAt: DISK_30TH })).toBe('2026-10-30');
		expect(noteDateKey({ created: 0 })).toBeNull();
	});

	it('reads the disk time as a local-time timestamp', () => {
		expect(noteDateKey({ diskCreatedAt: new Date(2026, 1, 10).getTime() })).toBe('2026-02-10');
		expect(noteDateKey({ diskCreatedAt: new Date(2026, 0, 1, 0, 0, 0).getTime() })).toBe('2026-01-01');
	});
});

describe('parseDateKey', () => {
	it('parses YYYY-MM-DD string', () => {
		expect(parseDateKey('2026-02-10')).toBe('2026-02-10');
	});

	it('parses ISO datetime string', () => {
		expect(parseDateKey('2026-02-10T14:30:00')).toBe('2026-02-10');
	});

	it('parses Date object', () => {
		expect(parseDateKey(new Date(2026, 1, 10))).toBe('2026-02-10');
	});

	it('parses a datetime with a space, seconds or milliseconds', () => {
		expect(parseDateKey('2026-10-27 14:22')).toBe('2026-10-27');
		expect(parseDateKey('2026-10-27T14:22:05')).toBe('2026-10-27');
		expect(parseDateKey('2026-10-27T14:22:05.123')).toBe('2026-10-27');
	});

	it('parses a datetime with a UTC offset to its local day', () => {
		const value = '2026-10-27T12:00:00Z';
		expect(parseDateKey(value)).toBe(dayjs(value).format('YYYY-MM-DD'));
	});

	it('returns null for a day that does not exist', () => {
		expect(parseDateKey('2026-02-30')).toBeNull();
		expect(parseDateKey('2026-13-01')).toBeNull();
		expect(parseDateKey('2026-00-10')).toBeNull();
	});

	it('returns null for text that only contains date-like parts', () => {
		expect(parseDateKey('Meeting 12')).toBeNull();
		expect(parseDateKey('tbd 2026')).toBeNull();
		expect(parseDateKey('Oct 27')).toBeNull();
		expect(parseDateKey('March 5, 2024')).toBeNull();
		expect(parseDateKey('2026-10-27 notes')).toBeNull();
	});

	it('returns null for a datetime with an impossible time', () => {
		expect(parseDateKey('2026-10-27T25:00')).toBeNull();
		expect(parseDateKey('2026-10-27T10:61')).toBeNull();
	});

	it('returns null for numbers, which frontmatter dates never are', () => {
		expect(parseDateKey(2026)).toBeNull();
		expect(parseDateKey(0)).toBeNull();
		expect(parseDateKey(new Date(2026, 1, 10).getTime())).toBeNull();
	});

	it('returns null for null and undefined', () => {
		expect(parseDateKey(null)).toBeNull();
		expect(parseDateKey(undefined)).toBeNull();
	});

	it('returns null for an invalid or empty string', () => {
		expect(parseDateKey('not-a-date')).toBeNull();
		expect(parseDateKey('')).toBeNull();
	});

	it('returns null for an invalid Date', () => {
		expect(parseDateKey(new Date('nope'))).toBeNull();
	});

	it('returns null for booleans, arrays, objects and symbols without throwing', () => {
		expect(parseDateKey(true)).toBeNull();
		expect(parseDateKey(['2026-02-10'])).toBeNull();
		expect(parseDateKey({ date: '2026-02-10' })).toBeNull();
		expect(parseDateKey(Symbol('d'))).toBeNull();
	});
});
