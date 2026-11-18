/**
 * Dated tasks on the Calendar: projects the Rust task index
 * (`get_all_tasks_v2`) onto calendar days. A task lands on its due date
 * (📅); tasks without one, or with an invalid one, are left out.
 */

import type { FileTaskGroupV2, TaskStatusV2 } from '#lib/types/vault-v2.types.js';
import { isValidDayKey } from './event-calendar-dates.logic';
import { ALL_DAY_MAX_ROWS, MONTH_MAX_CHIPS } from './event-calendar-view.logic';

/** A dated task as the Calendar shows it. */
export interface CalendarTask {
	/** Absolute path of the note holding the task. */
	path: string;
	/** Note name without extension. */
	fileName: string;
	/** 1-based line of the task in its note. */
	line: number;
	/** Task text with its signifiers stripped. */
	description: string;
	/** Status from the checkbox character; only `done` and `cancelled` close the task. */
	status: TaskStatusV2;
	/** Due day key (`YYYY-MM-DD`). */
	date: string;
}

/** How a month cell splits its chip slots between events and tasks. */
export interface MonthCellSlots {
	/** Event chips shown. */
	events: number;
	/** Task chips shown. */
	tasks: number;
	/** Items behind "+N more". */
	hidden: number;
}

/** Orders tasks by due date, note path, then line. */
function compareTasks(a: CalendarTask, b: CalendarTask): number {
	if (a.date !== b.date) return a.date < b.date ? -1 : 1;
	if (a.path !== b.path) return a.path < b.path ? -1 : 1;
	return a.line - b.line;
}

/**
 * Flattens the task index into the dated tasks the Calendar shows, sorted
 * by due date, path and line.
 * @param groups - result of `get_all_tasks_v2`
 */
export function tasksFromGroups(groups: FileTaskGroupV2[]): CalendarTask[] {
	const tasks: CalendarTask[] = [];
	for (const group of groups) {
		for (const task of group.tasks) {
			const date = task.metadata.dueDate;
			if (!isValidDayKey(date)) continue;
			tasks.push({
				path: group.filePath,
				fileName: group.fileName,
				line: task.lineNumber,
				description: task.metadata.description || task.text,
				status: task.status,
				date,
			});
		}
	}
	return tasks.sort(compareTasks);
}

/**
 * Groups `tasks` under the visible day they are due on. Days with no task
 * get no entry; tasks due outside `days` are dropped.
 * @param tasks - dated tasks, in display order
 * @param days - the visible day keys
 */
export function tasksByDay(tasks: CalendarTask[], days: string[]): Map<string, CalendarTask[]> {
	const visible = new Set(days);
	const byDay = new Map<string, CalendarTask[]>();
	for (const task of tasks) {
		if (!visible.has(task.date)) continue;
		const list = byDay.get(task.date);
		if (list) list.push(task);
		else byDay.set(task.date, [task]);
	}
	return byDay;
}

/** One day's cell of the week and day Tasks lane. */
export interface TaskLaneCell {
	/** Day key. */
	day: string;
	/** Tasks shown as chips, in display order. */
	chips: CalendarTask[];
	/** Tasks behind "+N". */
	overflow: number;
}

/**
 * Cells of the Tasks lane. With more than one visible day, a day with more
 * than `ALL_DAY_MAX_ROWS` tasks shows one row fewer of chips and leaves the
 * last row to "+N", like `buildAllDayChips`. With one visible day nothing is
 * capped: the cell scrolls instead.
 * @param tasks - dated tasks, in display order
 * @param days - the visible day keys
 * @returns one cell per day, in `days` order
 */
export function taskLaneCells(tasks: CalendarTask[], days: string[]): TaskLaneCell[] {
	const byDay = tasksByDay(tasks, days);
	const cap = days.length > 1;
	return days.map((day) => {
		const all = byDay.get(day) ?? [];
		const chips = cap && all.length > ALL_DAY_MAX_ROWS ? all.slice(0, ALL_DAY_MAX_ROWS - 1) : all;
		return { day, chips, overflow: all.length - chips.length };
	});
}

/** How many chips fit in a month cell. */
export interface MonthChipCapacity {
	/** Chips that fit when the cell needs no "+N more" footer. */
	all: number;
	/** Chips that fit beside the "+N more" footer. */
	withFooter: number;
}

// Heights in px of the parts of a month cell in `EventMonthGrid.svelte`:
// `p-1.5` plus the `border-b`, the `h-6` day row, a 22 px chip and the
// `py-1 text-xs` footer. Each chip and the footer follow a `gap-1`.
const MONTH_CELL_CHROME = 6 * 2 + 1 + 24;
const MONTH_GAP = 4;
const MONTH_CHIP = 22;
const MONTH_FOOTER = 4 * 2 + 16;

/**
 * Chips a month cell of `rowHeightPx` holds, with and without the "+N more"
 * footer, from the cell's layout.
 * @param rowHeightPx - measured height of one week row
 * @returns at least one chip in each case, even when the row is too short
 */
export function monthChipCapacity(rowHeightPx: number): MonthChipCapacity {
	const room = rowHeightPx - MONTH_CELL_CHROME;
	const fit = (px: number) => Math.max(1, Math.floor(px / (MONTH_GAP + MONTH_CHIP)));
	return { all: fit(room), withFooter: fit(room - MONTH_GAP - MONTH_FOOTER) };
}

/**
 * Splits a month cell's chip slots: events first, tasks fill what is left,
 * and everything else is counted behind "+N more". A day that fits in
 * `capacity.all` shows everything; a busier day shows `capacity.withFooter`
 * chips and leaves the rest of the cell to the footer.
 * @param eventCount - events on the day
 * @param taskCount - dated tasks on the day
 * @param capacity - the measured capacity; without it the cell shows
 *   `MONTH_MAX_CHIPS` chips with or without the footer
 */
export function monthCellSlots(
	eventCount: number,
	taskCount: number,
	capacity: MonthChipCapacity = { all: MONTH_MAX_CHIPS, withFooter: MONTH_MAX_CHIPS },
): MonthCellSlots {
	const slots = eventCount + taskCount <= capacity.all ? capacity.all : capacity.withFooter;
	const events = Math.min(eventCount, slots);
	const tasks = Math.min(taskCount, slots - events);
	return { events, tasks, hidden: eventCount + taskCount - events - tasks };
}
