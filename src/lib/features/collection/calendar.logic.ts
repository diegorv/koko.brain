import type { NoteRecord } from './collection.types';
import { getPropertyValue } from './collection.logic';

/** A single day cell in the calendar grid */
export interface CalendarDay {
	/** The date this cell represents */
	date: Date;
	/** Whether this day belongs to the currently displayed month */
	isCurrentMonth: boolean;
	/** Whether this day is today */
	isToday: boolean;
}

/** A note record placed on a specific calendar date */
export interface CalendarEvent {
	/** The source note record */
	record: NoteRecord;
	/** Parsed start date */
	startDate: Date;
	/** Parsed end date (if multi-day) */
	endDate?: Date;
}

/**
 * Generates a 6×7 calendar grid for the given month.
 * Each row is a week, starting from the specified weekStartDay.
 * @param year — Full year (e.g. 2026)
 * @param month — 0-indexed month (0=January, 11=December)
 * @param weekStartDay — 0=Sunday, 1=Monday, ..., 6=Saturday. Default: 1
 */
export function getCalendarGrid(year: number, month: number, weekStartDay = 1): CalendarDay[][] {
	const today = new Date();
	const todayStr = formatDateKey(today);

	const firstOfMonth = new Date(year, month, 1);
	const dayOfWeek = firstOfMonth.getDay(); // 0=Sunday

	// How many days from the grid start to the 1st of the month
	const offset = (dayOfWeek - weekStartDay + 7) % 7;

	// The grid starts this many days before the 1st
	const gridStart = new Date(year, month, 1 - offset);

	const grid: CalendarDay[][] = [];
	for (let week = 0; week < 6; week++) {
		const row: CalendarDay[] = [];
		for (let day = 0; day < 7; day++) {
			const cellDate = new Date(gridStart.getTime());
			cellDate.setDate(gridStart.getDate() + week * 7 + day);
			row.push({
				date: cellDate,
				isCurrentMonth: cellDate.getMonth() === month && cellDate.getFullYear() === year,
				isToday: formatDateKey(cellDate) === todayStr,
			});
		}
		grid.push(row);
	}

	return grid;
}

/**
 * Extracts a Date from a record's property value.
 * Handles Date objects, ISO date strings (YYYY-MM-DD), and numeric timestamps.
 * Returns null if the value cannot be parsed as a date.
 */
export function extractDateFromRecord(record: NoteRecord, dateProperty: string): Date | null {
	const value = getPropertyValue(record, dateProperty);
	if (value === null || value === undefined) return null;

	if (value instanceof Date) {
		return isNaN(value.getTime()) ? null : value;
	}

	if (typeof value === 'number') {
		const d = new Date(value);
		return isNaN(d.getTime()) ? null : d;
	}

	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (!trimmed) return null;
		// Parse YYYY-MM-DD as local date (not UTC) to avoid timezone shift
		const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
		if (dateOnly) {
			const d = new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
			return isNaN(d.getTime()) ? null : d;
		}
		const d = new Date(trimmed);
		return isNaN(d.getTime()) ? null : d;
	}

	return null;
}

/**
 * Groups note records by date for calendar display.
 * Records with a start date are placed on each day they span.
 * Returns a map of date key (YYYY-MM-DD) to arrays of CalendarEvent.
 */
export function groupRecordsByDate(
	records: NoteRecord[],
	dateProperty: string,
	endDateProperty?: string,
): Map<string, CalendarEvent[]> {
	const groups = new Map<string, CalendarEvent[]>();

	for (const record of records) {
		const startDate = extractDateFromRecord(record, dateProperty);
		if (!startDate) continue;

		const endDate = endDateProperty
			? extractDateFromRecord(record, endDateProperty)
			: undefined;

		const event: CalendarEvent = { record, startDate, endDate: endDate ?? undefined };
		const startKey = formatDateKey(startDate);

		if (endDate && endDate.getTime() > startDate.getTime()) {
			// Multi-day: place on each day from start to end (inclusive)
			const current = new Date(startDate);
			const endTime = endDate.getTime();
			while (current.getTime() <= endTime) {
				const key = formatDateKey(current);
				const list = groups.get(key) ?? [];
				list.push(event);
				groups.set(key, list);
				current.setDate(current.getDate() + 1);
			}
		} else {
			// Single day
			const list = groups.get(startKey) ?? [];
			list.push(event);
			groups.set(startKey, list);
		}
	}

	return groups;
}

/**
 * Navigates to a different month by applying a delta.
 * Handles year boundaries correctly.
 */
export function navigateMonth(year: number, month: number, delta: number): { year: number; month: number } {
	const d = new Date(year, month + delta, 1);
	return { year: d.getFullYear(), month: d.getMonth() };
}

/**
 * Formats a year and month as a human-readable string (e.g. "March 2026").
 */
export function formatMonthYear(year: number, month: number): string {
	const d = new Date(year, month, 1);
	return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Returns the day-of-week labels starting from the given weekStartDay.
 * @param weekStartDay — 0=Sunday, 1=Monday, ..., 6=Saturday
 */
export function getWeekDayLabels(weekStartDay = 1): string[] {
	const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const labels: string[] = [];
	for (let i = 0; i < 7; i++) {
		labels.push(days[(weekStartDay + i) % 7]);
	}
	return labels;
}

/**
 * Formats a Date as a YYYY-MM-DD string for use as a map key.
 */
export function formatDateKey(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}
