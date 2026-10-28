/**
 * View math the Calendar tab renders from: which days each view shows, how
 * the arrows step, the header labels, events grouped per day, month cells
 * and chips, the all-day lane, the now-line and the default create slot.
 * Ported from the prototype's `calender-app-design/src/components/calendar/`
 * (`calendar.tsx`, `calendar-header.tsx`, `month-view.tsx`,
 * `all-day-row.tsx`, `time-grid.tsx`) without the compact 3-day branch.
 *
 * Days are `YYYY-MM-DD` keys and times are minutes from midnight (0..1440).
 * Pure logic: no framework imports.
 */

import {
	addDays,
	addMonths,
	daysInMonth,
	dayOfWeek,
	formatRange,
	formatShort,
	formatTime,
	formatWeekday,
	fromKey,
	isoWeek,
	isWeekend,
	monthGrid,
	monthName,
	startOfMonth,
	toKey,
	weekDays,
	type TimeFormat,
	type WeekStart,
} from './event-calendar-dates.logic';
import { floorToSnap, MIN_EVENT_MINUTES } from './event-calendar-layout.logic';
import type { CalendarViewMode, EventNote } from './event-calendar.types';

const MINUTES_PER_DAY = 1440;

/** Most chips a month cell shows before "+N more". */
export const MONTH_MAX_CHIPS = 3;

/** Most rows the all-day lane grows to, the "+N" row included. */
export const ALL_DAY_MAX_ROWS = 3;

/** Header labels of the current range. */
export interface RangeLabel {
	/** `"<Month>, <year>"` of the first visible day. */
	title: string;
	/** Week number and span (week, day) or the month span (month). */
	subtitle: string;
}

/** Events of the visible days, split by lane. */
export interface EventsByDay {
	/** Timed events per day key, in input order. */
	timed: Map<string, EventNote[]>;
	/** All-day events per day key, in input order. */
	allDay: Map<string, EventNote[]>;
}

/** One cell of the month grid. */
export interface MonthCell {
	/** Day key of the cell. */
	day: string;
	/** Whether the day belongs to the displayed month (others are dimmed). */
	inMonth: boolean;
}

/** One chip of a month cell. */
export interface DayItem {
	/** The event the chip opens. */
	event: EventNote;
	/** Chip text: the title, prefixed by the start time for a timed event. */
	label: string;
}

/** One day of the all-day lane. */
export interface AllDayCell {
	/** Day key of the cell. */
	day: string;
	/** Chips that render, sorted by title. */
	chips: EventNote[];
	/** All-day events of the day that do not render (shown as "+N"). */
	overflow: number;
}

/** Date and time a new event starts with. */
export interface CreateSlot {
	/** Day key of the new event. */
	date: string;
	/** Start in minutes from midnight. */
	start: number;
	/** End in minutes from midnight. */
	end: number;
}

/** Compares strings by code unit, so the order does not depend on the host locale. */
function compareText(a: string, b: string): number {
	return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Days a view shows.
 * @param view - `day`, `week` or `month`
 * @param date - the selected day
 * @param weekStartsOn - 0 for Sunday-first, 1 for Monday-first weeks
 * @param showWeekends - when false, Saturdays and Sundays are left out of
 *   week and month views
 * @returns `[date]` in day view (always, even on a hidden weekend day); the
 *   week holding `date` in week view; every day of `date`'s month in month
 *   view (the grid with its neighbour-month days is `buildMonthCells`)
 */
export function visibleDays(
	view: CalendarViewMode,
	date: string,
	weekStartsOn: WeekStart,
	showWeekends: boolean,
): string[] {
	if (view === 'day') return [date];
	const all =
		view === 'week'
			? weekDays(date, weekStartsOn)
			: Array.from({ length: daysInMonth(date) }, (_, i) => addDays(startOfMonth(date), i));
	return showWeekends ? all : all.filter((d) => !isWeekend(d));
}

/**
 * The date the previous / next arrow moves to.
 * @param view - `day` steps one day, `week` seven days, `month` one month
 *   (the day is clamped to the target month's length)
 * @param date - the selected day
 * @param dir - `1` for next, `-1` for previous
 * @returns the new selected day
 */
export function stepDate(view: CalendarViewMode, date: string, dir: 1 | -1): string {
	if (view === 'day') return addDays(date, dir);
	if (view === 'week') return addDays(date, 7 * dir);
	return addMonths(date, dir);
}

/**
 * Header title and subtitle of the current range.
 * @param view - the active view
 * @param date - the selected day
 * @param days - the visible days, as `visibleDays` returns them
 * @returns the title from the first visible day (not from `date`'s month, so
 *   a week that starts in November reads "November"), and a subtitle of
 *   `Week <n> · <span>` (week: `n` is the ISO week of the visible week's
 *   Monday, also for Sunday-first weeks), `Week <n> · <Weekday>, <Mon d>`
 *   (day) or the month's span (month)
 */
export function rangeLabel(view: CalendarViewMode, date: string, days: string[]): RangeLabel {
	const first = days[0] ?? date;
	const title = `${monthName(first)}, ${fromKey(first).getFullYear()}`;
	if (view === 'month') {
		const start = startOfMonth(date);
		return { title, subtitle: formatRange(start, addDays(start, daysInMonth(date) - 1)) };
	}
	if (view === 'day') {
		return { title, subtitle: `Week ${isoWeek(date)} · ${formatWeekday(date)}, ${formatShort(date)}` };
	}
	const monday = addDays(first, (8 - dayOfWeek(first)) % 7);
	const last = days[days.length - 1] ?? first;
	return { title, subtitle: `Week ${isoWeek(monday)} · ${formatRange(first, last)}` };
}

/**
 * Groups events by day and lane.
 * @param events - any events; those outside `days` are dropped
 * @param days - the visible days
 * @returns one (possibly empty) list per visible day in each lane, keyed in
 *   `days` order
 */
export function groupEventsByDay(events: EventNote[], days: string[]): EventsByDay {
	const timed = new Map<string, EventNote[]>(days.map((d) => [d, []]));
	const allDay = new Map<string, EventNote[]>(days.map((d) => [d, []]));
	for (const e of events) {
		(e.allDay ? allDay : timed).get(e.date)?.push(e);
	}
	return { timed, allDay };
}

/**
 * Cells of the month grid: six weeks around `date`'s month.
 * @param date - any day of the month
 * @param weekStartsOn - 0 for Sunday-first, 1 for Monday-first weeks
 * @param showWeekends - when false, weekend cells are left out (6 rows of 5)
 * @returns 42 cells (30 without weekends), neighbour-month days marked
 *   `inMonth: false`
 */
export function buildMonthCells(date: string, weekStartsOn: WeekStart, showWeekends: boolean): MonthCell[] {
	const month = date.slice(0, 7);
	return monthGrid(date, weekStartsOn)
		.filter((d) => showWeekends || !isWeekend(d))
		.map((day) => ({ day, inMonth: day.startsWith(month) }));
}

/**
 * Chips of one month cell.
 * @param events - any events; only those on `day` are kept
 * @param day - the cell's day key
 * @param timeFormat - format of the start time in timed labels
 * @returns all-day events first, then timed ones by start, ties by title
 */
export function itemsForDay(events: EventNote[], day: string, timeFormat: TimeFormat): DayItem[] {
	return events
		.filter((e) => e.date === day)
		.sort(
			(a, b) =>
				Number(b.allDay) - Number(a.allDay) ||
				(a.allDay ? 0 : a.start - b.start) ||
				compareText(a.title, b.title),
		)
		.map((event) => ({
			event,
			label: event.allDay ? event.title : `${formatTime(event.start, timeFormat)} ${event.title}`,
		}));
}

/**
 * Chips of the all-day lane, capped so no day needs more than
 * `ALL_DAY_MAX_ROWS` rows: a day with more all-day events than that shows
 * one row fewer of chips and reserves the last row for "+N".
 * @param days - the visible days
 * @param events - any events; only all-day events on `days` are kept
 * @returns one cell per day, in `days` order
 */
export function buildAllDayChips(days: string[], events: EventNote[]): AllDayCell[] {
	const { allDay } = groupEventsByDay(events, days);
	return days.map((day) => {
		const all = [...(allDay.get(day) ?? [])].sort((a, b) => compareText(a.title, b.title));
		const shown = all.length > ALL_DAY_MAX_ROWS ? all.slice(0, ALL_DAY_MAX_ROWS - 1) : all;
		return { day, chips: shown, overflow: all.length - shown.length };
	});
}

/**
 * Height of the all-day lane in rows.
 * @param maxChips - the largest number of all-day events on any visible day
 * @returns 1 through `ALL_DAY_MAX_ROWS` (the lane keeps one row when empty)
 */
export function laneRows(maxChips: number): number {
	return Math.min(ALL_DAY_MAX_ROWS, Math.max(1, maxChips));
}

/**
 * Position of the now-line in a day column, from the local wall clock. It
 * never uses elapsed milliseconds since midnight, which are an hour off on
 * a DST transition day.
 * @param nowMs - the current instant (`Date.now()`)
 * @param dayKey - the column's day key
 * @returns minutes from midnight (0..1439) when `nowMs` falls on `dayKey`,
 *   else `null`
 */
export function nowOffsetMinutes(nowMs: number, dayKey: string): number | null {
	const d = new Date(nowMs);
	return toKey(d) === dayKey ? d.getHours() * 60 + d.getMinutes() : null;
}

/**
 * Slot a new event opens with when no time was picked on the grid. The
 * caps match the drag create rule: the start leaves room for the shortest
 * event and the end never passes midnight.
 * @param date - the day of the new event
 * @param todayKey - today's day key
 * @param nowMinutes - the current time in minutes from midnight
 * @param dayStartHour - hour the grid scrolls to (`dayStartHour` setting)
 * @param duration - default length in minutes
 * @returns today: the 15-minute slot holding now; another day:
 *   `dayStartHour`; start at most `1440 - MIN_EVENT_MINUTES`, end
 *   `min(start + duration, 1440)`
 */
export function defaultCreateSlot(
	date: string,
	todayKey: string,
	nowMinutes: number,
	dayStartHour: number,
	duration: number,
): CreateSlot {
	const anchor = date === todayKey ? floorToSnap(nowMinutes) : dayStartHour * 60;
	const start = Math.min(anchor, MINUTES_PER_DAY - MIN_EVENT_MINUTES);
	return { date, start, end: Math.min(start + duration, MINUTES_PER_DAY) };
}
