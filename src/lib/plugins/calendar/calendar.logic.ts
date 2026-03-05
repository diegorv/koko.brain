import dayjs from 'dayjs';
import '$lib/utils/date';

/** A cell in the calendar grid */
export interface CalendarDay {
	/** Day of the month (1-31) */
	day: number;
	/** Whether it belongs to the month being displayed */
	isCurrentMonth: boolean;
	/** Whether it is today */
	isToday: boolean;
	/** ISO key 'YYYY-MM-DD' for lookups and keying */
	dateKey: string;
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
	/** ISO week numbers, one per week row */
	weekNumbers: number[];
	/** 2D array: 6 weeks x 7 days */
	weeks: CalendarDay[][];
}

/**
 * Builds a MonthGrid for a given year/month.
 * Week starts on Monday (ISO week).
 */
export function buildMonthGrid(year: number, month: number): MonthGrid {
	const firstOfMonth = dayjs(new Date(year, month, 1));
	const todayKey = toDateKey(new Date());

	// Find the Monday on or before the first day of the month
	// dayjs isoWeekday: 1=Mon, 7=Sun
	let cursor = firstOfMonth.startOf('day');
	const isoDay = cursor.isoWeekday(); // 1-7 (Mon-Sun)
	if (isoDay !== 1) {
		cursor = cursor.subtract(isoDay - 1, 'day');
	}

	const weeks: CalendarDay[][] = [];
	const weekNumbers: number[] = [];
	for (let w = 0; w < 6; w++) {
		const week: CalendarDay[] = [];
		weekNumbers.push(cursor.isoWeek());
		for (let d = 0; d < 7; d++) {
			const dateKey = cursor.format('YYYY-MM-DD');
			week.push({
				day: cursor.date(),
				isCurrentMonth: cursor.month() === month,
				isToday: dateKey === todayKey,
				dateKey,
			});
			cursor = cursor.add(1, 'day');
		}
		weeks.push(week);
	}

	const label = firstOfMonth.format('MMMM YYYY');
	const quarter = Math.floor(month / 3) + 1;

	return { year, month, label, quarter, weekNumbers, weeks };
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
