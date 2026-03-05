import type { NoteRecord } from './collection.types';
import { extractDateFromRecord } from './calendar.logic';
import { getPropertyValue } from './collection.logic';

// ── Types ──────────────────────────────────────────────────────────────

/** A single event positioned in the linear calendar layout */
export interface LinearCalendarEvent {
	/** The source note record */
	record: NoteRecord;
	/** Start date clamped to the month being rendered */
	startDate: Date;
	/** End date clamped to the month being rendered */
	endDate: Date;
	/** Original unclamped start date */
	originalStartDate: Date;
	/** Original unclamped end date */
	originalEndDate: Date;
	/** Lane index assigned by collision detection (0-based) */
	lane: number;
	/** Value of the color property (for color assignment) */
	colorValue: string | null;
}

/** Layout information for a single month row */
export interface MonthRow {
	/** 0-indexed month (0=January) */
	month: number;
	/** Number of days in this month */
	daysInMonth: number;
	/** Short month name (e.g. "Jan") */
	label: string;
	/** Events with collision-resolved lanes */
	events: LinearCalendarEvent[];
	/** Highest lane index used (-1 if no events) */
	maxLane: number;
}

/** Deterministic color palette mapping from property values to CSS colors */
export interface ColorMapping {
	/** Map from property value to CSS color string */
	colors: Map<string, string>;
	/** Values in stable sorted order */
	values: string[];
}

/** Intermediate event before lane assignment */
interface RawEvent {
	record: NoteRecord;
	startDate: Date;
	endDate: Date;
	colorValue: string | null;
}

// ── Constants ──────────────────────────────────────────────────────────

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 12-color HSL palette for deterministic color assignment */
export const COLOR_PALETTE = [
	'hsl(210, 70%, 60%)',  // blue
	'hsl(150, 60%, 55%)',  // green
	'hsl(340, 65%, 60%)',  // pink
	'hsl(45, 75%, 60%)',   // amber
	'hsl(280, 55%, 60%)',  // purple
	'hsl(180, 55%, 55%)',  // teal
	'hsl(15, 70%, 60%)',   // orange
	'hsl(90, 50%, 55%)',   // lime
	'hsl(320, 50%, 55%)',  // magenta
	'hsl(200, 60%, 55%)',  // sky
	'hsl(60, 65%, 55%)',   // yellow
	'hsl(0, 60%, 60%)',    // red
];

// ── Pure Functions ─────────────────────────────────────────────────────

/**
 * Returns the number of days in a given month.
 * @param year — Full year (e.g. 2026)
 * @param month — 0-indexed month (0=January)
 */
export function getDaysInMonth(year: number, month: number): number {
	return new Date(year, month + 1, 0).getDate();
}

/**
 * Generates the 12-month grid skeleton for a year (no events).
 * @param year — Full year (e.g. 2026)
 */
export function getLinearYearGrid(year: number): MonthRow[] {
	const rows: MonthRow[] = [];
	for (let m = 0; m < 12; m++) {
		rows.push({
			month: m,
			daysInMonth: getDaysInMonth(year, m),
			label: MONTH_LABELS[m],
			events: [],
			maxLane: -1,
		});
	}
	return rows;
}

/**
 * Clamps a date to be within the bounds of a given month.
 * @param date — The date to clamp
 * @param year — Full year
 * @param month — 0-indexed month
 */
export function clampDateToMonth(date: Date, year: number, month: number): Date {
	const firstDay = new Date(year, month, 1);
	const lastDay = new Date(year, month, getDaysInMonth(year, month));

	if (date.getTime() < firstDay.getTime()) return firstDay;
	if (date.getTime() > lastDay.getTime()) return lastDay;
	return date;
}

/**
 * Extracts events for a given year from note records.
 * Returns raw events (without lane assignment) that overlap with the year.
 */
export function extractEventsForYear(
	records: NoteRecord[],
	year: number,
	dateProperty: string,
	endDateProperty?: string,
	colorProperty?: string,
): RawEvent[] {
	const yearStart = new Date(year, 0, 1);
	const yearEnd = new Date(year, 11, 31);
	const events: RawEvent[] = [];

	for (const record of records) {
		const startDate = extractDateFromRecord(record, dateProperty);
		if (!startDate) continue;

		let endDate: Date;
		if (endDateProperty) {
			const parsed = extractDateFromRecord(record, endDateProperty);
			endDate = parsed && parsed.getTime() >= startDate.getTime() ? parsed : startDate;
		} else {
			endDate = startDate;
		}

		// Skip events entirely outside the year
		if (endDate.getTime() < yearStart.getTime()) continue;
		if (startDate.getTime() > yearEnd.getTime()) continue;

		let colorValue: string | null = null;
		if (colorProperty) {
			const val = getPropertyValue(record, colorProperty);
			if (val !== null && val !== undefined) {
				colorValue = String(val);
			}
		}

		events.push({ record, startDate, endDate, colorValue });
	}

	return events;
}

/**
 * Assigns lanes to events within a single month using greedy collision detection.
 * Events are sorted by start day ASC, then duration DESC (longer first).
 * Returns the laid-out events and the maximum lane index used.
 */
export function layoutEventsInMonth(
	rawEvents: RawEvent[],
	month: number,
	year: number,
): { events: LinearCalendarEvent[]; maxLane: number } {
	const firstDay = new Date(year, month, 1);
	const lastDay = new Date(year, month, getDaysInMonth(year, month));

	// Filter events that overlap with this month
	const overlapping = rawEvents.filter((e) => {
		return e.endDate.getTime() >= firstDay.getTime() && e.startDate.getTime() <= lastDay.getTime();
	});

	if (overlapping.length === 0) {
		return { events: [], maxLane: -1 };
	}

	// Clamp dates and compute day ranges
	const withDays = overlapping.map((e) => {
		const clamped = {
			start: clampDateToMonth(e.startDate, year, month),
			end: clampDateToMonth(e.endDate, year, month),
		};
		return {
			raw: e,
			startDay: clamped.start.getDate(),
			endDay: clamped.end.getDate(),
			duration: clamped.end.getDate() - clamped.start.getDate() + 1,
			clampedStart: clamped.start,
			clampedEnd: clamped.end,
		};
	});

	// Sort: start day ascending, then longer events first
	withDays.sort((a, b) => {
		if (a.startDay !== b.startDay) return a.startDay - b.startDay;
		return b.duration - a.duration;
	});

	// Greedy lane assignment
	const laneBusyUntil: number[] = [];
	let maxLane = -1;

	const result: LinearCalendarEvent[] = withDays.map((item) => {
		// Find first available lane
		let lane = 0;
		while (lane < laneBusyUntil.length && laneBusyUntil[lane] >= item.startDay) {
			lane++;
		}
		if (lane >= laneBusyUntil.length) {
			laneBusyUntil.push(item.endDay);
		} else {
			laneBusyUntil[lane] = item.endDay;
		}
		if (lane > maxLane) maxLane = lane;

		return {
			record: item.raw.record,
			startDate: item.clampedStart,
			endDate: item.clampedEnd,
			originalStartDate: item.raw.startDate,
			originalEndDate: item.raw.endDate,
			lane,
			colorValue: item.raw.colorValue,
		};
	});

	return { events: result, maxLane };
}

/**
 * Builds the full linear year layout: 12 month rows with collision-resolved events.
 * Orchestrates getLinearYearGrid, extractEventsForYear, and layoutEventsInMonth.
 */
export function buildLinearYearLayout(
	records: NoteRecord[],
	year: number,
	dateProperty: string,
	endDateProperty?: string,
	colorProperty?: string,
): MonthRow[] {
	const grid = getLinearYearGrid(year);
	const rawEvents = extractEventsForYear(records, year, dateProperty, endDateProperty, colorProperty);

	for (const row of grid) {
		const { events, maxLane } = layoutEventsInMonth(rawEvents, row.month, year);
		row.events = events;
		row.maxLane = maxLane;
	}

	return grid;
}

/**
 * Builds a deterministic color mapping from property values to palette colors.
 * Values are sorted alphabetically so the same data always produces the same colors.
 */
export function buildColorMapping(records: NoteRecord[], colorProperty: string): ColorMapping {
	const valueSet = new Set<string>();

	for (const record of records) {
		const val = getPropertyValue(record, colorProperty);
		if (val !== null && val !== undefined) {
			valueSet.add(String(val));
		}
	}

	const values = Array.from(valueSet).sort();
	const colors = new Map<string, string>();
	for (let i = 0; i < values.length; i++) {
		colors.set(values[i], COLOR_PALETTE[i % COLOR_PALETTE.length]);
	}

	return { colors, values };
}

/**
 * Looks up the color for a given property value from a ColorMapping.
 * Returns null if the value is null or not in the mapping.
 */
export function getColorForValue(value: string | null, mapping: ColorMapping): string | null {
	if (value === null) return null;
	return mapping.colors.get(value) ?? null;
}
