import dayjs from 'dayjs';
import '#lib/utils/date.js';
import type { WeekStart } from '#lib/features/event-calendar/event-calendar-dates.logic.js';

/** Short weekday labels, Sunday first (index = `Date.getDay()`). */
const WEEKDAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/** A cell in the calendar grid */
export interface CalendarDay {
	/** Day of the month (1-31) */
	day: number;
	/** Whether it belongs to the month being displayed */
	isCurrentMonth: boolean;
	/** Whether it is today */
	isToday: boolean;
	/** Whether it falls on a Saturday or Sunday */
	isWeekend: boolean;
	/** ISO key 'YYYY-MM-DD' for lookups and keying */
	dateKey: string;
}

/** A weekday column header */
export interface DayHeader {
	/** Short label (e.g. "MON") */
	label: string;
	/** Whether the column is Saturday or Sunday */
	isWeekend: boolean;
}

/** Complete month grid ready to render */
export interface MonthGrid {
	/** Year (e.g. 2026) */
	year: number;
	/** Month (0-11) */
	month: number;
	/** Display label (e.g. "February 2026") */
	label: string;
	/** Quarter of the year (1-4) */
	quarter: number;
	/** Weekday column headers, in grid column order */
	dayHeaders: DayHeader[];
	/** ISO week numbers, one per week row, taken from the row's Monday */
	weekNumbers: number[];
	/** Date key of each row's Monday: the day its week number and weekly note come from */
	weekKeys: string[];
	/** 2D array: 6 weeks x 7 days */
	weeks: CalendarDay[][];
}

/**
 * Builds a MonthGrid for a given year/month.
 * Rows start on `weekStartsOn` (1 = Monday, 0 = Sunday). Week numbers stay
 * ISO: a Sunday-first row reports the ISO week of its Monday, which holds six
 * of its seven days.
 */
export function buildMonthGrid(year: number, month: number, weekStartsOn: WeekStart = 1): MonthGrid {
	const firstOfMonth = dayjs(new Date(year, month, 1));
	const todayKey = toDateKey(new Date());

	// Back up to the configured first weekday on or before the 1st (day(): 0=Sun..6=Sat)
	const firstOfMonthDay = firstOfMonth.startOf('day');
	let cursor = firstOfMonthDay.subtract((firstOfMonthDay.day() - weekStartsOn + 7) % 7, 'day');
	const mondayOffset = (1 - weekStartsOn + 7) % 7;

	const weeks: CalendarDay[][] = [];
	const weekNumbers: number[] = [];
	const weekKeys: string[] = [];
	for (let w = 0; w < 6; w++) {
		const week: CalendarDay[] = [];
		const monday = cursor.add(mondayOffset, 'day');
		weekNumbers.push(monday.isoWeek());
		weekKeys.push(monday.format('YYYY-MM-DD'));
		for (let d = 0; d < 7; d++) {
			const dateKey = cursor.format('YYYY-MM-DD');
			const weekday = cursor.day();
			week.push({
				day: cursor.date(),
				isCurrentMonth: cursor.month() === month,
				isToday: dateKey === todayKey,
				isWeekend: weekday === 0 || weekday === 6,
				dateKey,
			});
			cursor = cursor.add(1, 'day');
		}
		weeks.push(week);
	}

	const dayHeaders = Array.from({ length: 7 }, (_, i) => {
		const weekday = (weekStartsOn + i) % 7;
		return { label: WEEKDAY_LABELS[weekday], isWeekend: weekday === 0 || weekday === 6 };
	});
	const label = firstOfMonth.format('MMMM YYYY');
	const quarter = Math.floor(month / 3) + 1;

	return { year, month, label, quarter, dayHeaders, weekNumbers, weekKeys, weeks };
}

/**
 * Converts a Date to a dateKey string 'YYYY-MM-DD'.
 */
export function toDateKey(date: Date): string {
	return dayjs(date).format('YYYY-MM-DD');
}

/**
 * Converts a Unix timestamp in milliseconds to a dateKey string 'YYYY-MM-DD'.
 */
export function timestampToDateKey(timestampMs: number): string {
	return dayjs(timestampMs).format('YYYY-MM-DD');
}

/**
 * Parses a frontmatter `created` value (string, number, or Date) into a dateKey.
 * Returns null if the value cannot be parsed into a valid date.
 */
export function parseDateToKey(value: unknown): string | null {
	if (value === null || value === undefined) return null;
	const parsed = dayjs(value as string | number | Date);
	if (!parsed.isValid()) return null;
	return parsed.format('YYYY-MM-DD');
}

/**
 * Extracts the display name (filename without extension) from a full file path.
 */
export function extractDisplayName(filePath: string): string {
	const fileName = filePath.split('/').pop() ?? '';
	const dotIndex = fileName.lastIndexOf('.');
	return dotIndex > 0 ? fileName.substring(0, dotIndex) : fileName;
}

/**
 * Formats a dateKey as a human-readable date label (e.g. "11 Feb 2026").
 */
export function formatDateLabel(dateKey: string): string {
	return dayjs(dateKey, 'YYYY-MM-DD').format('D MMM YYYY');
}
