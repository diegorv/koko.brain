import { describe, expect, it } from 'vitest';

import { toDateKey } from '$lib/plugins/calendar/calendar.logic';
import {
	addDays,
	addMonths,
	dayOfWeek,
	daysInMonth,
	diffDays,
	formatDuration,
	formatLong,
	formatRange,
	formatShort,
	formatTime,
	formatTimeRange,
	formatWeekday,
	fromKey,
	isoWeek,
	isValidDayKey,
	isWeekend,
	MONTHS,
	MONTHS_SHORT,
	monthGrid,
	monthName,
	parseTimeStrict,
	rangeKeys,
	startOfMonth,
	startOfWeek,
	timeInputValue,
	toKey,
	WEEKDAYS,
	WEEKDAYS_SHORT,
	weekDays,
} from '$lib/features/event-calendar/event-calendar-dates.logic';
import { runtimeTimeZoneSwitchWorks, withTimeZone } from '../../../fixtures/timezone.fixture';

describe('event-calendar dates (prototype cases)', () => {
	it("builds the design's Sunday-first week around Tue Nov 10, 2026", () => {
		expect(weekDays('2026-11-10', 0)).toEqual([
			'2026-11-08',
			'2026-11-09',
			'2026-11-10',
			'2026-11-11',
			'2026-11-12',
			'2026-11-13',
			'2026-11-14',
		]);
		expect(startOfWeek('2026-11-10', 1)).toBe('2026-11-09');
	});

	it('reports ISO week 46 for that week', () => {
		expect(isoWeek('2026-11-09')).toBe(46);
		expect(isoWeek('2026-01-01')).toBe(1);
		expect(isoWeek('2027-01-01')).toBe(53);
	});

	it('formats ranges within and across months', () => {
		expect(formatRange('2026-11-08', '2026-11-14')).toBe('Nov 8 – 14');
		expect(formatRange('2026-10-25', '2026-10-31')).toBe('Oct 25 – 31');
		expect(formatRange('2026-11-29', '2026-12-05')).toBe('Nov 29 – Dec 5');
	});

	it('adds days and months without drifting', () => {
		expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
		expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
		expect(diffDays('2026-11-08', '2026-11-14')).toBe(6);
	});

	it('returns a 6×7 month grid starting on the week start', () => {
		const grid = monthGrid('2026-11-10', 0);
		expect(grid).toHaveLength(42);
		expect(grid[0]).toBe('2026-11-01');
	});

	it('formats and parses times in 24h and 12h', () => {
		expect(formatTime(7 * 60)).toBe('07:00');
		expect(formatTime(13 * 60 + 30, '12h')).toBe('1:30 PM');
		expect(formatTime(0, '12h')).toBe('12:00 AM');
		expect(parseTimeStrict('09:45')).toBe(585);
	});
});

describe('event-calendar dates: name constants', () => {
	it('MONTHS lists the twelve English month names from January', () => {
		expect(MONTHS).toEqual([
			'January',
			'February',
			'March',
			'April',
			'May',
			'June',
			'July',
			'August',
			'September',
			'October',
			'November',
			'December',
		]);
	});

	it('MONTHS_SHORT is the first three letters of each month', () => {
		expect(MONTHS_SHORT).toEqual(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
	});

	it('WEEKDAYS lists the long names from Sunday', () => {
		expect(WEEKDAYS).toEqual(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
	});

	it('WEEKDAYS_SHORT is the upper-case grid column heading from Sunday', () => {
		expect(WEEKDAYS_SHORT).toEqual(['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']);
		expect(WEEKDAYS_SHORT[dayOfWeek('2026-11-10')]).toBe('TUE');
	});
});

describe('event-calendar dates: keys', () => {
	it('toKey uses local date components with zero padding', () => {
		expect(toKey(new Date(2026, 0, 5))).toBe('2026-01-05');
		expect(toKey(new Date(2026, 10, 10, 23, 59, 59))).toBe('2026-11-10');
		expect(toKey(new Date(2026, 10, 10, 0, 0, 0))).toBe('2026-11-10');
		expect(toKey(new Date(999, 0, 1))).toBe('0999-01-01');
	});

	it('fromKey gives local midnight of that day', () => {
		const d = fromKey('2026-11-10');
		expect(d.getFullYear()).toBe(2026);
		expect(d.getMonth()).toBe(10);
		expect(d.getDate()).toBe(10);
		expect(d.getHours()).toBe(0);
		expect(d.getMinutes()).toBe(0);
		expect(toKey(fromKey('2027-01-01'))).toBe('2027-01-01');
	});

	it('isValidDayKey round-trips and rejects impossible or malformed keys', () => {
		expect(isValidDayKey('2026-11-10')).toBe(true);
		expect(isValidDayKey('2028-02-29')).toBe(true);
		expect(isValidDayKey('2026-02-30')).toBe(false);
		expect(isValidDayKey('2026-02-29')).toBe(false);
		expect(isValidDayKey('2026-13-01')).toBe(false);
		expect(isValidDayKey('2026-00-10')).toBe(false);
		expect(isValidDayKey('2026-1-10')).toBe(false);
		expect(isValidDayKey('2026-11-10T09:30')).toBe(false);
		expect(isValidDayKey('')).toBe(false);
		expect(isValidDayKey(null)).toBe(false);
		expect(isValidDayKey(20261110)).toBe(false);
	});

	it('toKey matches the calendar plugin toDateKey', () => {
		const dates = [
			new Date(2026, 0, 1),
			new Date(2026, 1, 28, 23, 59),
			new Date(2026, 2, 8, 2, 30),
			new Date(2026, 10, 1, 1, 30),
			new Date(2026, 11, 31, 12),
			new Date(1999, 8, 9, 9, 9),
			new Date(999, 0, 1),
		];
		for (const d of dates) {
			expect(toKey(d)).toBe(toDateKey(d));
		}
	});
});

describe('event-calendar dates: arithmetic', () => {
	it('dayOfWeek is 0 for Sunday through 6 for Saturday', () => {
		expect(dayOfWeek('2026-11-08')).toBe(0);
		expect(dayOfWeek('2026-11-10')).toBe(2);
		expect(dayOfWeek('2026-11-14')).toBe(6);
	});

	it('startOfMonth and daysInMonth', () => {
		expect(startOfMonth('2026-11-10')).toBe('2026-11-01');
		expect(startOfMonth('2026-11-01')).toBe('2026-11-01');
		expect(daysInMonth('2026-11-10')).toBe(30);
		expect(daysInMonth('2026-12-31')).toBe(31);
		expect(daysInMonth('2026-02-01')).toBe(28);
		expect(daysInMonth('2028-02-10')).toBe(29);
	});

	it('monthGrid with a Monday start for a month whose 1st is not a Sunday', () => {
		// 2026-10-01 is a Thursday.
		const grid = monthGrid('2026-10-20', 1);
		expect(grid).toHaveLength(42);
		expect(grid[0]).toBe('2026-09-28');
		expect(dayOfWeek(grid[0])).toBe(1);
		expect(grid[3]).toBe('2026-10-01');
		expect(grid[41]).toBe('2026-11-08');
		expect(monthGrid('2026-10-20', 0)[0]).toBe('2026-09-27');
		// 2026-11-01 is a Sunday: a Monday start begins the week before.
		expect(monthGrid('2026-11-10', 1)[0]).toBe('2026-10-26');
	});

	it('adds days and months across month and year boundaries', () => {
		expect(addDays('2026-11-10', 1)).toBe('2026-11-11');
		expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
		expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
		expect(addDays('2026-11-10', 0)).toBe('2026-11-10');
		expect(addMonths('2026-11-10', 1)).toBe('2026-12-10');
		expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
		expect(addMonths('2026-01-15', -1)).toBe('2025-12-15');
		expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
	});

	it('diffDays counts whole days from a to b (b minus a)', () => {
		expect(diffDays('2026-11-10', '2026-11-15')).toBe(5);
		expect(diffDays('2026-11-15', '2026-11-10')).toBe(-5);
		expect(diffDays('2026-12-31', '2027-01-01')).toBe(1);
		expect(diffDays('2026-11-10', '2026-11-10')).toBe(0);
	});

	it('isoWeek handles the 53-week years', () => {
		expect(isoWeek('2026-11-10')).toBe(46);
		expect(isoWeek('2026-12-28')).toBe(53);
		expect(isoWeek('2027-01-03')).toBe(53);
		expect(isoWeek('2027-01-04')).toBe(1);
		expect(isoWeek('2021-01-01')).toBe(53);
	});

	it('weeks and month grids for both week starts', () => {
		expect(startOfWeek('2026-11-10', 0)).toBe('2026-11-08');
		expect(startOfWeek('2026-11-08', 1)).toBe('2026-11-02');
		expect(startOfWeek('2026-11-08', 0)).toBe('2026-11-08');
		expect(weekDays('2026-11-10', 1)).toEqual([
			'2026-11-09',
			'2026-11-10',
			'2026-11-11',
			'2026-11-12',
			'2026-11-13',
			'2026-11-14',
			'2026-11-15',
		]);
		expect(monthGrid('2026-11-10', 0)[41]).toBe('2026-12-12');
	});

	it('rangeKeys is inclusive, ascending, and empty when reversed', () => {
		expect(rangeKeys('2026-11-30', '2026-12-02')).toEqual(['2026-11-30', '2026-12-01', '2026-12-02']);
		expect(rangeKeys('2026-11-10', '2026-11-10')).toEqual(['2026-11-10']);
		expect(rangeKeys('2026-11-12', '2026-11-10')).toEqual([]);
	});

	it('isWeekend is true on Saturday and Sunday only', () => {
		expect(isWeekend('2026-11-14')).toBe(true);
		expect(isWeekend('2026-11-15')).toBe(true);
		expect(isWeekend('2026-11-13')).toBe(false);
		expect(isWeekend('2026-11-16')).toBe(false);
	});
});

describe('event-calendar dates: formatting', () => {
	it('monthName, formatWeekday, formatShort and formatLong', () => {
		expect(monthName('2026-01-15')).toBe('January');
		expect(monthName('2026-11-10')).toBe('November');
		expect(formatWeekday('2026-11-10')).toBe('Tuesday');
		expect(formatWeekday('2026-11-08')).toBe('Sunday');
		expect(formatShort('2026-11-10')).toBe('Nov 10');
		expect(formatShort('2026-01-05')).toBe('Jan 5');
		expect(formatLong('2026-11-10')).toBe('November 10, 2026');
		expect(formatLong('2026-01-05')).toBe('January 5, 2026');
	});

	it('formatRange carries no year in any branch, like the prototype', () => {
		expect(formatRange('2026-12-28', '2027-01-03')).toBe('Dec 28 – Jan 3');
		expect(formatRange('2026-11-10', '2026-11-10')).toBe('Nov 10 – 10');
	});

	it('formatTime covers 24h midnight and the 12h noon and evening', () => {
		expect(formatTime(570)).toBe('09:30');
		expect(formatTime(570, '24h')).toBe('09:30');
		expect(formatTime(0)).toBe('00:00');
		expect(formatTime(570, '12h')).toBe('9:30 AM');
		expect(formatTime(720, '12h')).toBe('12:00 PM');
		expect(formatTime(1395, '12h')).toBe('11:15 PM');
	});

	it('formatTime(1440) is end of day in both formats', () => {
		expect(formatTime(1440)).toBe('24:00');
		expect(formatTime(1440, '12h')).toBe('12:00 AM');
	});

	it('formatTimeRange joins two times in the chosen format', () => {
		expect(formatTimeRange(570, 630)).toBe('09:30 – 10:30');
		expect(formatTimeRange(780, 1440, '12h')).toBe('1:00 PM – 12:00 AM');
	});

	it('formatDuration uses hours and minutes', () => {
		expect(formatDuration(45)).toBe('45m');
		expect(formatDuration(60)).toBe('1h');
		expect(formatDuration(90)).toBe('1h 30m');
		expect(formatDuration(1440)).toBe('24h');
		expect(formatDuration(0)).toBe('0m');
	});
});

describe('event-calendar dates: time input', () => {
	it('parseTimeStrict rejects what the prototype turned into 0', () => {
		expect(parseTimeStrict('')).toBeNull();
		expect(parseTimeStrict('   ')).toBeNull();
		expect(parseTimeStrict('1:30 PM')).toBeNull();
		expect(parseTimeStrict('25:00')).toBeNull();
		expect(parseTimeStrict('24:01')).toBeNull();
		expect(parseTimeStrict('12:60')).toBeNull();
		expect(parseTimeStrict('9:5')).toBeNull();
		expect(parseTimeStrict('009:30')).toBeNull();
		expect(parseTimeStrict('09:30:00')).toBeNull();
		expect(parseTimeStrict('2026-11-10T09:30')).toBeNull();
		expect(parseTimeStrict('-1:00')).toBeNull();
	});

	it('parseTimeStrict accepts H:mm and HH:mm from 0:00 through 24:00', () => {
		expect(parseTimeStrict('09:30')).toBe(570);
		expect(parseTimeStrict('9:30')).toBe(570);
		expect(parseTimeStrict('0:00')).toBe(0);
		expect(parseTimeStrict('23:59')).toBe(1439);
		expect(parseTimeStrict('24:00')).toBe(1440);
	});

	it('parseTimeStrict ignores surrounding whitespace', () => {
		expect(parseTimeStrict(' 09:30 ')).toBe(570);
	});

	it('timeInputValue gives HH:mm clamped to the input range', () => {
		expect(timeInputValue(570)).toBe('09:30');
		expect(timeInputValue(0)).toBe('00:00');
		expect(timeInputValue(1439)).toBe('23:59');
		expect(timeInputValue(1440)).toBe('23:59');
		expect(timeInputValue(5000)).toBe('23:59');
		expect(timeInputValue(-30)).toBe('00:00');
		expect(timeInputValue(569.6)).toBe('09:30');
		expect(timeInputValue(NaN)).toBe('00:00');
		expect(timeInputValue(Infinity)).toBe('00:00');
	});
});

describe.runIf(runtimeTimeZoneSwitchWorks())('event-calendar dates across DST (America/New_York)', () => {
	it('spring forward (2026-03-08, a 23 h day) shifts no key or count', () => {
		withTimeZone('America/New_York', () => {
			expect(fromKey('2026-03-09').getTimezoneOffset()).not.toBe(fromKey('2026-03-07').getTimezoneOffset());
			expect(addDays('2026-03-07', 1)).toBe('2026-03-08');
			expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
			expect(addDays('2026-03-09', -1)).toBe('2026-03-08');
			expect(addDays('2026-03-01', 14)).toBe('2026-03-15');
			expect(diffDays('2026-03-08', '2026-03-09')).toBe(1);
			expect(diffDays('2026-03-01', '2026-03-15')).toBe(14);
			expect(isoWeek('2026-03-08')).toBe(10);
			expect(isoWeek('2026-03-09')).toBe(11);
			expect(rangeKeys('2026-03-07', '2026-03-10')).toEqual([
				'2026-03-07',
				'2026-03-08',
				'2026-03-09',
				'2026-03-10',
			]);
		});
	});

	it('fall back (2026-11-01, a 25 h day) shifts no key or count', () => {
		withTimeZone('America/New_York', () => {
			expect(fromKey('2026-11-02').getTimezoneOffset()).not.toBe(fromKey('2026-10-31').getTimezoneOffset());
			expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
			expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
			expect(addDays('2026-11-02', -1)).toBe('2026-11-01');
			expect(addDays('2026-10-25', 14)).toBe('2026-11-08');
			expect(diffDays('2026-11-01', '2026-11-02')).toBe(1);
			expect(diffDays('2026-10-25', '2026-11-08')).toBe(14);
			expect(isoWeek('2026-11-01')).toBe(44);
			expect(isoWeek('2026-11-02')).toBe(45);
			expect(rangeKeys('2026-10-31', '2026-11-03')).toEqual([
				'2026-10-31',
				'2026-11-01',
				'2026-11-02',
				'2026-11-03',
			]);
		});
	});
});
