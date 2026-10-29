/**
 * Dated tasks on the Calendar: projects the Rust task index
 * (`get_all_tasks_v2`) onto calendar days. A task lands on its due date
 * (📅); tasks without one, or with an invalid one, are left out.
 */

import type { FileTaskGroupV2, TaskStatusV2 } from '#lib/types/vault-v2.types.js';
import { isValidDayKey } from './event-calendar-dates.logic';
import { MONTH_MAX_CHIPS } from './event-calendar-view.logic';

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

/**
 * Splits a month cell's `MONTH_MAX_CHIPS` slots: events first, tasks fill
 * what is left, and everything else is counted behind "+N more".
 * @param eventCount - events on the day
 * @param taskCount - dated tasks on the day
 */
export function monthCellSlots(eventCount: number, taskCount: number): MonthCellSlots {
	const events = Math.min(eventCount, MONTH_MAX_CHIPS);
	const tasks = Math.min(taskCount, MONTH_MAX_CHIPS - events);
	return { events, tasks, hidden: eventCount + taskCount - events - tasks };
}
