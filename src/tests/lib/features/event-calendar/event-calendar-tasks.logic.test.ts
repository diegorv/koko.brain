import { describe, expect, it } from 'vitest';
import {
	monthCellSlots,
	taskLaneCells,
	tasksByDay,
	tasksFromGroups,
	type CalendarTask,
} from '#lib/features/event-calendar/event-calendar-tasks.logic.js';
import { MONTH_MAX_CHIPS } from '#lib/features/event-calendar/event-calendar-view.logic.js';
import type { FileTaskGroupV2, TaskV2 } from '#lib/types/vault-v2.types.js';

function task(lineNumber: number, text: string, dueDate?: string, overrides: Partial<TaskV2> = {}): TaskV2 {
	return {
		text,
		checked: false,
		indent: 0,
		lineNumber,
		status: 'todo',
		metadata: { description: text.replace(/📅 \S+/, '').trim(), dueDate, tags: [] },
		...overrides,
	};
}

function group(filePath: string, tasks: TaskV2[]): FileTaskGroupV2 {
	const fileName = filePath.split('/').pop()!.replace(/\.md$/, '');
	return { filePath, fileName, modifiedAt: 0, tasks };
}

function calendarTask(overrides: Partial<CalendarTask> & Pick<CalendarTask, 'date'>): CalendarTask {
	return { path: '/vault/a.md', fileName: 'a', line: 1, description: 'x', status: 'todo', ...overrides };
}

describe('tasksFromGroups', () => {
	it('keeps dated tasks with their note, line, description and status', () => {
		const groups = [
			group('/vault/Projects/Q4.md', [
				task(3, 'Pay rent 📅 2026-11-12', '2026-11-12'),
				task(4, 'Undated'),
				task(7, 'Ship it 📅 2026-11-10', '2026-11-10', { checked: true, status: 'done' }),
			]),
		];

		expect(tasksFromGroups(groups)).toEqual([
			{ path: '/vault/Projects/Q4.md', fileName: 'Q4', line: 7, description: 'Ship it', status: 'done', date: '2026-11-10' },
			{ path: '/vault/Projects/Q4.md', fileName: 'Q4', line: 3, description: 'Pay rent', status: 'todo', date: '2026-11-12' },
		]);
	});

	it('keeps a status other than done that Rust reports as checked', () => {
		const groups = [group('/vault/a.md', [task(2, 'Draft 📅 2026-11-10', '2026-11-10', { checked: true, status: 'in-progress' })])];

		expect(tasksFromGroups(groups).map((t) => t.status)).toEqual(['in-progress']);
	});

	it('sorts by due date, then path, then line', () => {
		const groups = [
			group('/vault/b.md', [task(9, 'b9', '2026-11-10'), task(2, 'b2', '2026-11-10')]),
			group('/vault/a.md', [task(5, 'a5', '2026-11-11'), task(1, 'a1', '2026-11-10')]),
		];

		expect(tasksFromGroups(groups).map((t) => `${t.fileName}:${t.line}`)).toEqual(['a:1', 'b:2', 'b:9', 'a:5']);
	});

	it('drops tasks whose due date is not a real day', () => {
		const groups = [group('/vault/a.md', [task(1, 'bad', '2026-02-30'), task(2, 'short', '2026-1-5'), task(3, 'ok', '2026-02-28')])];

		expect(tasksFromGroups(groups).map((t) => t.line)).toEqual([3]);
	});

	it('falls back to the raw text when the description is empty', () => {
		const t = task(1, '📅 2026-11-10', '2026-11-10');
		t.metadata.description = '';

		expect(tasksFromGroups([group('/vault/a.md', [t])])[0].description).toBe('📅 2026-11-10');
	});

	it('returns an empty list for an empty index', () => {
		expect(tasksFromGroups([])).toEqual([]);
		expect(tasksFromGroups([group('/vault/a.md', [])])).toEqual([]);
	});
});

describe('tasksByDay', () => {
	it('groups tasks under their visible due day, in input order', () => {
		const a = calendarTask({ date: '2026-11-10', line: 1 });
		const b = calendarTask({ date: '2026-11-10', line: 2 });
		const c = calendarTask({ date: '2026-11-12', line: 3 });

		const byDay = tasksByDay([a, b, c], ['2026-11-10', '2026-11-11', '2026-11-12']);

		expect(byDay.get('2026-11-10')).toEqual([a, b]);
		expect(byDay.get('2026-11-11')).toBeUndefined();
		expect(byDay.get('2026-11-12')).toEqual([c]);
	});

	it('drops tasks due outside the visible days', () => {
		const byDay = tasksByDay([calendarTask({ date: '2026-12-01' })], ['2026-11-10']);
		expect(byDay.size).toBe(0);
	});

	it('returns an empty map for no tasks or no days', () => {
		expect(tasksByDay([], ['2026-11-10']).size).toBe(0);
		expect(tasksByDay([calendarTask({ date: '2026-11-10' })], []).size).toBe(0);
	});
});

describe('taskLaneCells', () => {
	const WEEK = ['2026-11-10', '2026-11-11', '2026-11-12'];
	/** `n` tasks due on `date`, on lines 1..n. */
	const onDay = (date: string, n: number) => Array.from({ length: n }, (_, i) => calendarTask({ date, line: i + 1 }));

	it('caps a busy day of several visible days at 2 chips and counts the rest', () => {
		const tasks = onDay('2026-11-11', 5);

		const cells = taskLaneCells(tasks, WEEK);

		expect(cells.map((c) => c.day)).toEqual(WEEK);
		expect(cells[1].chips).toEqual(tasks.slice(0, 2));
		expect(cells[1].overflow).toBe(3);
		expect(cells[0]).toEqual({ day: '2026-11-10', chips: [], overflow: 0 });
	});

	it('shows all of a day with exactly 3 tasks', () => {
		const tasks = onDay('2026-11-10', 3);

		const [cell] = taskLaneCells(tasks, WEEK);

		expect(cell.chips).toEqual(tasks);
		expect(cell.overflow).toBe(0);
	});

	it('never caps with one visible day', () => {
		const tasks = onDay('2026-11-10', 5);

		expect(taskLaneCells(tasks, ['2026-11-10'])).toEqual([{ day: '2026-11-10', chips: tasks, overflow: 0 }]);
	});

	it('drops tasks outside the visible days and returns no cells for no days', () => {
		expect(taskLaneCells([calendarTask({ date: '2026-12-01' })], WEEK).every((c) => c.chips.length === 0)).toBe(true);
		expect(taskLaneCells([calendarTask({ date: '2026-11-10' })], [])).toEqual([]);
	});
});

describe('monthCellSlots', () => {
	it('shows every item when they fit', () => {
		expect(monthCellSlots(1, 1)).toEqual({ events: 1, tasks: 1, hidden: 0 });
		expect(monthCellSlots(0, 0)).toEqual({ events: 0, tasks: 0, hidden: 0 });
	});

	it('gives events the slots first and lets tasks fill the rest', () => {
		expect(monthCellSlots(2, 4)).toEqual({ events: 2, tasks: MONTH_MAX_CHIPS - 2, hidden: 3 });
		expect(monthCellSlots(0, 5)).toEqual({ events: 0, tasks: MONTH_MAX_CHIPS, hidden: 5 - MONTH_MAX_CHIPS });
	});

	it('counts every task behind "+N more" when events fill the cell', () => {
		expect(monthCellSlots(MONTH_MAX_CHIPS + 1, 2)).toEqual({ events: MONTH_MAX_CHIPS, tasks: 0, hidden: 3 });
	});
});
