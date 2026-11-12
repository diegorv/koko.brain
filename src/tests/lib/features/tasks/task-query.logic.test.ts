import { describe, it, expect } from 'vitest';
import {
	DEFAULT_QUICK,
	applyQuickFilters,
	buildTaskRows,
	describeTaskRule,
	explainEmptyTasks,
	isQuickFieldDefault,
	rowsByNote,
	statusFilterLabel,
	taskCountText,
	toggleQuickStatus,
	type DueRange,
	type TaskQuickFilters,
	type TaskRow,
	type VisibleRow,
} from '#lib/features/tasks/task-query.logic.js';
import type { TaskStatus } from '#lib/features/tasks/task-metadata.types.js';
import type { FileTaskGroup, TaskItem } from '#lib/features/tasks/tasks.types.js';
import { sevenStatusGroup, taskGroupV2, taskV2 } from '../../../fixtures/tasks.fixture';
import { runtimeTimeZoneSwitchWorks, withTimeZone } from '../../../fixtures/timezone.fixture';

const DAY = 24 * 60 * 60 * 1000;
const TODAY = '2026-11-05';
const NOW = new Date('2026-11-05T12:00:00Z').getTime();

/** A note group in the store's shape (`modifiedAt` in ms). */
function group(filePath: string, tasks: TaskItem[], modifiedAt = NOW): FileTaskGroup {
	return { ...taskGroupV2(filePath, tasks), modifiedAt };
}

/** A task as Rust sends it, at `indent` on `lineNumber`. */
const task = (status: TaskStatus, indent: number, lineNumber: number, text = `${status} ${lineNumber}`) =>
	taskV2(text, { status, indent, lineNumber });

/** Rows of one note under `/vault`. */
const rowsOf = (tasks: TaskItem[], filePath = '/vault/a.md') => buildTaskRows([group(filePath, tasks)], '/vault');

/** `[text, dimmed]` per visible row. */
const shown = (rows: VisibleRow[]) => rows.map((r) => [r.text, r.dimmed]);

describe('applyQuickFilters: the open rule', () => {
	const statuses = (rows: VisibleRow[]) => rows.map((r) => r.status);
	const seven = () => buildTaskRows([sevenStatusGroup()], '/vault');

	it('keeps the five open statuses under Open and drops done and cancelled', () => {
		expect(statuses(applyQuickFilters(seven(), { show: 'open' }, TODAY, NOW))).toEqual([
			'todo',
			'in-progress',
			'question',
			'important',
			'forwarded',
		]);
	});

	it('keeps only done and cancelled under Closed', () => {
		expect(statuses(applyQuickFilters(seven(), { show: 'closed' }, TODAY, NOW))).toEqual(['done', 'cancelled']);
	});

	it('keeps every row under All', () => {
		expect(statuses(applyQuickFilters(seven(), { show: 'all' }, TODAY, NOW))).toHaveLength(7);
	});

	it('lets chosen statuses win over show', () => {
		expect(statuses(applyQuickFilters(seven(), { show: 'closed', statuses: ['in-progress', 'done'] }, TODAY, NOW))).toEqual([
			'in-progress',
			'done',
		]);
	});

	it('falls back to show when statuses is empty', () => {
		expect(statuses(applyQuickFilters(seven(), { show: 'closed', statuses: [] }, TODAY, NOW))).toEqual(['done', 'cancelled']);
	});

	it('keeps a done parent with an in-progress child, both sent checked, dimming the parent', () => {
		const rows = rowsOf([
			taskV2('Parent', { status: 'done', checked: true, indent: 0, lineNumber: 1 }),
			taskV2('Child', { status: 'in-progress', checked: true, indent: 1, lineNumber: 2 }),
		]);
		expect(shown(applyQuickFilters(rows, DEFAULT_QUICK, TODAY, NOW))).toEqual([
			['Parent', true],
			['Child', false],
		]);
	});

	it('returns new objects and leaves the input rows untouched', () => {
		const rows = rowsOf([task('todo', 0, 1)]);
		const [visible] = applyQuickFilters(rows, DEFAULT_QUICK, TODAY, NOW);
		expect(visible).not.toBe(rows[0]);
		expect(rows[0]).not.toHaveProperty('dimmed');
	});

	it('returns nothing for no rows', () => {
		expect(applyQuickFilters([], DEFAULT_QUICK, TODAY, NOW)).toEqual([]);
	});
});

describe('applyQuickFilters: dimming', () => {
	it('dims each failing ancestor of a passing row', () => {
		const rows = rowsOf([task('done', 0, 1), task('done', 1, 2), task('todo', 2, 3)]);
		expect(shown(applyQuickFilters(rows, DEFAULT_QUICK, TODAY, NOW))).toEqual([
			['done 1', true],
			['done 2', true],
			['todo 3', false],
		]);
	});

	it('keeps a done parent with an open in-progress child dimmed', () => {
		const rows = rowsOf([task('done', 0, 1), task('in-progress', 1, 2)]);
		expect(shown(applyQuickFilters(rows, DEFAULT_QUICK, TODAY, NOW))).toEqual([
			['done 1', true],
			['in-progress 2', false],
		]);
	});

	it('drops a done row followed by a todo row at the same indent', () => {
		const rows = rowsOf([task('done', 0, 1), task('todo', 0, 2)]);
		expect(shown(applyQuickFilters(rows, DEFAULT_QUICK, TODAY, NOW))).toEqual([['todo 2', false]]);
	});

	it('drops a done row whose subtree ends before a later todo at a smaller or equal indent', () => {
		const rows = rowsOf([task('done', 1, 1), task('done', 2, 2), task('todo', 0, 3), task('done', 1, 4), task('todo', 1, 5)]);
		expect(shown(applyQuickFilters(rows, DEFAULT_QUICK, TODAY, NOW))).toEqual([
			['todo 3', false],
			['todo 5', false],
		]);
	});

	it('never keeps a done row for a passing row of another note', () => {
		const rows = buildTaskRows(
			[group('/vault/a.md', [task('done', 0, 1)]), group('/vault/b.md', [task('todo', 1, 1)])],
			'/vault',
		);
		expect(applyQuickFilters(rows, DEFAULT_QUICK, TODAY, NOW).map((r) => [r.filePath, r.text])).toEqual([['/vault/b.md', 'todo 1']]);
	});

	it('drops a done parent whose whole subtree is closed, with its subtree', () => {
		const rows = rowsOf([task('done', 0, 1), task('done', 1, 2), task('cancelled', 2, 3)]);
		expect(applyQuickFilters(rows, DEFAULT_QUICK, TODAY, NOW)).toEqual([]);
	});

	it('dims an open parent of a passing done row under Closed', () => {
		const rows = rowsOf([task('todo', 0, 1), task('done', 1, 2)]);
		expect(shown(applyQuickFilters(rows, { show: 'closed' }, TODAY, NOW))).toEqual([
			['todo 1', true],
			['done 2', false],
		]);
	});
});

describe('buildTaskRows', () => {
	it('sets relPath and folder for a root note and a nested note', () => {
		const rows = buildTaskRows(
			[group('/vault/Root.md', [task('todo', 0, 1)]), group('/vault/Projects/Clients/B.md', [task('todo', 0, 1)])],
			'/vault',
		);
		expect(rows.map((r) => [r.relPath, r.folder])).toEqual([
			['Root.md', ''],
			['Projects/Clients/B.md', 'Projects/Clients'],
		]);
		expect(rows.map((r) => r.filePath)).toEqual(['/vault/Root.md', '/vault/Projects/Clients/B.md']);
	});

	it('keeps the absolute path as relPath and an empty folder outside the vault', () => {
		const [outside, lookalike] = buildTaskRows(
			[group('/elsewhere/x.md', [task('todo', 0, 1)]), group('/vault2/x.md', [task('todo', 0, 1)])],
			'/vault',
		);
		expect([outside.relPath, outside.folder]).toEqual(['/elsewhere/x.md', '']);
		expect([lookalike.relPath, lookalike.folder]).toEqual(['/vault2/x.md', '']);
	});

	it('keeps the absolute path as relPath and an empty folder with no vault open', () => {
		const [row] = buildTaskRows([group('/vault/Projects/x.md', [task('todo', 0, 1)])], null);
		expect([row.relPath, row.folder]).toEqual(['/vault/Projects/x.md', '']);
	});

	it('copies every task field and sets noteTitle, open and modifiedAt', () => {
		const t = taskV2('Ship 📅 2026-11-03', {
			status: 'in-progress',
			indent: 0,
			lineNumber: 4,
			metadata: { description: 'Ship', dueDate: '2026-11-03', tags: ['work'] },
		});
		const [row] = buildTaskRows([group('/vault/Plan.md', [t], 1234)], '/vault');
		expect(row).toMatchObject({ ...t, noteTitle: 'Plan', open: true, modifiedAt: 1234, filePath: '/vault/Plan.md' });
		const [closed] = rowsOf([task('cancelled', 0, 1)]);
		expect(closed.open).toBe(false);
	});

	it('counts the note\'s tasks and open tasks over the whole group', () => {
		const rows = rowsOf([task('todo', 0, 1), task('done', 0, 2), task('in-progress', 0, 3)]);
		expect(rows.map((r) => [r.noteTaskCount, r.noteOpenCount])).toEqual([
			[3, 2],
			[3, 2],
			[3, 2],
		]);
	});

	it('sets parentLine to the nearest earlier task with a smaller indent, never from another note', () => {
		const rows = buildTaskRows(
			[
				group('/vault/a.md', [task('todo', 0, 1), task('todo', 1, 2), task('todo', 2, 3), task('todo', 1, 5), task('todo', 0, 6)]),
				group('/vault/b.md', [task('todo', 1, 1)]),
			],
			'/vault',
		);
		expect(rows.map((r) => r.parentLine)).toEqual([undefined, 1, 2, 1, undefined, undefined]);
	});

	it('keeps the group order and the document order', () => {
		const rows = buildTaskRows(
			[group('/vault/z.md', [task('todo', 0, 3), task('todo', 0, 7)]), group('/vault/a.md', [task('todo', 0, 1)])],
			'/vault',
		);
		expect(rows.map((r) => `${r.relPath}:${r.lineNumber}`)).toEqual(['z.md:3', 'z.md:7', 'a.md:1']);
	});

	it('gives no rows for no groups', () => {
		expect(buildTaskRows([], '/vault')).toEqual([]);
	});
});

describe('rowsByNote', () => {
	const twoNotes = () =>
		buildTaskRows(
			[
				group('/vault/Projects/b.md', [task('todo', 0, 1), task('todo', 0, 2), task('done', 0, 3)], 5),
				group('/vault/a.md', [task('todo', 0, 1)], 9),
			],
			'/vault',
		);

	it('groups visible rows by note in first-appearance order', () => {
		const notes = rowsByNote(applyQuickFilters(twoNotes(), { show: 'all' }, TODAY, NOW));
		expect(notes.map((n) => [n.filePath, n.noteTitle, n.folder, n.modifiedAt, n.rows.length])).toEqual([
			['/vault/Projects/b.md', 'b', 'Projects', 5, 3],
			['/vault/a.md', 'a', '', 9, 1],
		]);
	});

	it('keeps total and open whatever show hides', () => {
		const [b] = rowsByNote(applyQuickFilters(twoNotes(), { show: 'closed' }, TODAY, NOW));
		expect([b.total, b.open]).toEqual([3, 2]);
		expect(b.rows.map((r) => r.lineNumber)).toEqual([3]);
	});

	it('leaves out a note with no visible row', () => {
		expect(rowsByNote(applyQuickFilters(twoNotes(), { show: 'closed' }, TODAY, NOW)).map((n) => n.filePath)).toEqual([
			'/vault/Projects/b.md',
		]);
	});

	it('gives no note for no rows', () => {
		expect(rowsByNote([])).toEqual([]);
	});
});

/** A todo task on `lineNumber`, due on `dueDate` when given (absent otherwise, as Rust sends it). */
const dueTask = (dueDate: string | undefined, lineNumber: number, indent = 0) =>
	taskV2(dueDate ?? `undated ${lineNumber}`, {
		indent,
		lineNumber,
		metadata: { description: dueDate ?? `undated ${lineNumber}`, tags: [], ...(dueDate ? { dueDate } : {}) },
	});

describe('applyQuickFilters: the Due filter', () => {
	/** The text of each visible row, under `show: 'all'` and `due`. */
	const kept = (rows: TaskRow[], due: DueRange | undefined, today = TODAY, now = NOW) =>
		applyQuickFilters(rows, { show: 'all', due }, today, now).map((r) => r.text);

	const dated = () => rowsOf([dueTask('2026-11-04', 1), dueTask('2026-11-05', 2), dueTask('2026-11-12', 3), dueTask('2026-11-13', 4), dueTask(undefined, 5)]);

	it('overdue keeps a due date before today and drops today and an undated row', () => {
		expect(kept(dated(), 'overdue')).toEqual(['2026-11-04']);
	});

	it('today keeps only a due date equal to today', () => {
		expect(kept(dated(), 'today')).toEqual(['2026-11-05']);
	});

	it('next7 keeps today through today + 7 days and drops the day before, the eighth day and an undated row', () => {
		expect(kept(dated(), 'next7')).toEqual(['2026-11-05', '2026-11-12']);
	});

	it('next7 crosses a year end', () => {
		const rows = rowsOf([dueTask('2027-01-04', 1), dueTask('2027-01-05', 2)]);
		expect(kept(rows, 'next7', '2026-12-28')).toEqual(['2027-01-04']);
	});

	describe.runIf(runtimeTimeZoneSwitchWorks())('next7 under America/Sao_Paulo', () => {
		it('crosses a year end on the local calendar', () => {
			const rows = rowsOf([dueTask('2027-01-04', 1), dueTask('2027-01-05', 2)]);
			expect(withTimeZone('America/Sao_Paulo', () => kept(rows, 'next7', '2026-12-28'))).toEqual(['2027-01-04']);
		});
	});

	it('none keeps only undated rows', () => {
		expect(kept(dated(), 'none')).toEqual(['undated 5']);
	});

	it('undefined and any keep every row', () => {
		expect(kept(dated(), undefined)).toHaveLength(5);
		expect(kept(dated(), 'any')).toHaveLength(5);
	});

	describe('the note edited options', () => {
		const notes = () =>
			buildTaskRows(
				[
					group('/vault/a.md', [dueTask(undefined, 1)], NOW - 1 * DAY),
					group('/vault/b.md', [dueTask(undefined, 1)], NOW - 10 * DAY),
					group('/vault/c.md', [dueTask('2026-11-01', 1)], NOW - 60 * DAY),
				],
				'/vault',
			);
		const files = (due: DueRange) => applyQuickFilters(notes(), { show: 'all', due }, TODAY, NOW).map((r) => r.filePath);

		it('edited7 keeps the note edited a day ago', () => {
			expect(files('edited7')).toEqual(['/vault/a.md']);
		});

		it('edited30 keeps the notes edited 1 and 10 days ago', () => {
			expect(files('edited30')).toEqual(['/vault/a.md', '/vault/b.md']);
		});

		it('keeps a row exactly at the 7-day cutoff', () => {
			const rows = buildTaskRows([group('/vault/edge.md', [dueTask(undefined, 1)], NOW - 7 * DAY)], '/vault');
			expect(kept(rows, 'edited7')).toEqual(['undated 1']);
		});

		it('drops an overdue row of a 60-day-old note and keeps an undated row of a recent one', () => {
			expect(files('edited30')).not.toContain('/vault/c.md');
			expect(files('edited7')).toEqual(['/vault/a.md']);
		});
	});

	it('keeps an undated parent of an overdue child dimmed under overdue', () => {
		const rows = rowsOf([dueTask(undefined, 1, 0), dueTask('2026-11-04', 2, 1)]);
		expect(shown(applyQuickFilters(rows, { show: 'all', due: 'overdue' }, TODAY, NOW))).toEqual([
			['undated 1', true],
			['2026-11-04', false],
		]);
	});

	it('joins the status clause: a done overdue row fails under Open', () => {
		const rows = rowsOf([taskV2('Late', { status: 'done', lineNumber: 1, metadata: { description: 'Late', tags: [], dueDate: '2026-11-04' } })]);
		expect(applyQuickFilters(rows, { show: 'open', due: 'overdue' }, TODAY, NOW)).toEqual([]);
		expect(kept(rows, 'overdue')).toEqual(['Late']);
	});
});

describe('isQuickFieldDefault', () => {
	it.each([
		[{ show: 'open' }, true],
		[{ show: 'open', statuses: [] }, true],
		[{ show: 'open', statuses: undefined }, true],
		[{ show: 'all' }, false],
		[{ show: 'closed' }, false],
		[{ show: 'open', statuses: ['todo'] }, false],
	] as [TaskQuickFilters, boolean][])('status of %j is default: %s', (quick, expected) => {
		expect(isQuickFieldDefault(quick, 'status')).toBe(expected);
	});

	it.each([
		[undefined, true],
		['any', true],
		['overdue', false],
		['today', false],
		['next7', false],
		['none', false],
		['edited7', false],
		['edited30', false],
	] as [DueRange | undefined, boolean][])('due %s is default: %s', (due, expected) => {
		expect(isQuickFieldDefault({ show: 'closed', due }, 'due')).toBe(expected);
	});
});

describe('toggleQuickStatus', () => {
	it('adds a status in TASK_STATUSES order, whatever the click order', () => {
		expect(toggleQuickStatus(toggleQuickStatus(undefined, 'done'), 'in-progress')).toEqual(['in-progress', 'done']);
		expect(toggleQuickStatus(['todo', 'done'], 'question')).toEqual(['todo', 'question', 'done']);
	});

	it('removes a chosen status', () => {
		expect(toggleQuickStatus(['in-progress', 'done'], 'in-progress')).toEqual(['done']);
	});

	it('returns undefined when the last status is removed', () => {
		expect(toggleQuickStatus(['done'], 'done')).toBeUndefined();
	});

	it('does not mutate its input', () => {
		const statuses: TaskStatus[] = ['done'];
		toggleQuickStatus(statuses, 'todo');
		expect(statuses).toEqual(['done']);
	});
});

describe('statusFilterLabel', () => {
	it.each([
		[{ show: 'open' }, 'open'],
		[{ show: 'closed' }, 'closed'],
		[{ show: 'all' }, 'all'],
		[{ show: 'closed', statuses: [] }, 'closed'],
		[{ show: 'open', statuses: ['in-progress', 'done'] }, 'in progress, done'],
		[{ show: 'all', statuses: ['cancelled'] }, 'cancelled'],
	] as [TaskQuickFilters, string][])('%j reads %j', (quick, expected) => {
		expect(statusFilterLabel(quick)).toBe(expected);
	});
});

describe('taskCountText', () => {
	const visible = (tasks: TaskItem[][], quick: TaskQuickFilters) =>
		applyQuickFilters(
			buildTaskRows(
				tasks.map((t, i) => group(`/vault/n${i}.md`, t)),
				'/vault',
			),
			quick,
			TODAY,
			NOW,
		);

	it('counts open rows and their notes at the default status', () => {
		expect(taskCountText(visible([[task('todo', 0, 1), task('done', 0, 2)], [task('question', 0, 1)]], DEFAULT_QUICK), DEFAULT_QUICK)).toBe(
			'2 open in 2 notes',
		);
	});

	it('words one open row in one note in the singular', () => {
		expect(taskCountText(visible([[task('todo', 0, 1)]], DEFAULT_QUICK), DEFAULT_QUICK)).toBe('1 open in 1 note');
	});

	it('does not count dimmed rows or a note holding only dimmed rows', () => {
		const rows: VisibleRow[] = visible([[task('done', 0, 1), task('todo', 1, 2)]], DEFAULT_QUICK);
		const onlyDimmed = rows.map((r) => ({ ...r, dimmed: true }));
		expect(taskCountText(rows, DEFAULT_QUICK)).toBe('1 open in 1 note');
		expect(taskCountText(onlyDimmed, DEFAULT_QUICK)).toBe('0 open in 0 notes');
	});

	it('says tasks when the status filter is not at its default', () => {
		const quick: TaskQuickFilters = { show: 'all' };
		expect(taskCountText(visible([[task('todo', 0, 1), task('done', 0, 2)], [task('done', 0, 1)]], quick), quick)).toBe(
			'3 tasks in 2 notes',
		);
		const closed: TaskQuickFilters = { show: 'closed' };
		expect(taskCountText(visible([[task('done', 0, 1)]], closed), closed)).toBe('1 task in 1 note');
	});

	it('reads zero for no rows', () => {
		expect(taskCountText([], DEFAULT_QUICK)).toBe('0 open in 0 notes');
		expect(taskCountText([], { show: 'all' })).toBe('0 tasks in 0 notes');
	});
});

describe('describeTaskRule', () => {
	const OPEN: TaskQuickFilters = { show: 'open' };
	const ALL: TaskQuickFilters = { show: 'all' };

	it.each([
		[OPEN, '#to-list', 'Open tasks under headings containing #to-list'],
		[ALL, '#to-list', 'All tasks under headings containing #to-list'],
		[OPEN, '', 'Open tasks from every note'],
		[ALL, '', 'All tasks from every note'],
	] as const)('quick=%j, tag=%j gives %j', (quick, sectionTag, expected) => {
		expect(describeTaskRule({ sectionTag, quick })).toBe(expected);
	});

	it.each([
		['overdue', ', overdue'],
		['today', ', due today'],
		['next7', ', due in the next 7 days'],
		['none', ', with no due date'],
		['edited7', ', in notes edited in the last 7 days'],
		['edited30', ', in notes edited in the last 30 days'],
	] as [DueRange, string][])('due %s adds %j after the heading part', (due, phrase) => {
		expect(describeTaskRule({ sectionTag: '#to-list', quick: { show: 'open', due } })).toBe(
			`Open tasks under headings containing #to-list${phrase}`,
		);
		expect(describeTaskRule({ sectionTag: '', quick: { show: 'all', due } })).toBe(`All tasks from every note${phrase}`);
	});

	it('adds nothing for any', () => {
		expect(describeTaskRule({ sectionTag: '', quick: { show: 'open', due: 'any' } })).toBe('Open tasks from every note');
	});

	it('starts with Closed tasks under Closed', () => {
		expect(describeTaskRule({ sectionTag: '', quick: { show: 'closed' } })).toBe('Closed tasks from every note');
	});

	it('names the chosen statuses in TASK_STATUSES order, joined with or', () => {
		expect(describeTaskRule({ sectionTag: '#work', quick: { show: 'open', statuses: ['in-progress', 'done'], due: 'edited7' } })).toBe(
			'Tasks that are in progress or done under headings containing #work, in notes edited in the last 7 days',
		);
	});

	it('adds the # to a tag typed without one', () => {
		expect(describeTaskRule({ sectionTag: 'work', quick: OPEN })).toBe('Open tasks under headings containing #work');
	});

	it('trims a tag with surrounding spaces', () => {
		expect(describeTaskRule({ sectionTag: '  #work  ', quick: OPEN })).toBe(
			'Open tasks under headings containing #work',
		);
	});

	it('treats a whitespace-only tag as no tag', () => {
		expect(describeTaskRule({ sectionTag: '   ', quick: OPEN })).toBe('Open tasks from every note');
	});

	it('joins several tags with or', () => {
		expect(describeTaskRule({ sectionTag: '#to-list #work', quick: OPEN })).toBe(
			'Open tasks under headings containing #to-list or #work',
		);
		expect(describeTaskRule({ sectionTag: 'a, b c', quick: ALL })).toBe(
			'All tasks under headings containing #a or #b or #c',
		);
	});

	it('treats separators with no tag as no tag', () => {
		expect(describeTaskRule({ sectionTag: ' , ', quick: OPEN })).toBe('Open tasks from every note');
	});
});

describe('explainEmptyTasks', () => {
	const OPEN: TaskQuickFilters = { show: 'open' };
	const ALL: TaskQuickFilters = { show: 'all' };
	const SHOW_ALL = { kind: 'showAllStatuses', label: 'Show all' };
	const RESET_DUE = { kind: 'resetQuick', field: 'due', label: 'Reset Due filter' };
	const DUE_MESSAGE = 'No task matches the Due filter';

	/** Rows of one or more notes, each `[tasks, modifiedAt]`. */
	function rows(...notes: [TaskItem[], number?][]): TaskRow[] {
		return buildTaskRows(
			notes.map(([tasks, modifiedAt], i) => group(`/vault/n${i}.md`, tasks, modifiedAt ?? 0)),
			'/vault',
		);
	}

	const open = (lineNumber: number) => task('todo', 0, lineNumber);
	const done = (lineNumber: number) => task('done', 0, lineNumber);
	const explain = (r: TaskRow[], quick: TaskQuickFilters, sectionTag = '') =>
		explainEmptyTasks({ rows: r, sectionTag, quick, today: TODAY, now: NOW });

	describe('stage 1: no task', () => {
		it('names the tag and offers to clear it', () => {
			expect(explain([], ALL, '#to-list')).toEqual({
				message: 'No task sits under a heading containing #to-list',
				action: { kind: 'clearTag', label: 'Clear tag' },
			});
		});

		it('displays the tag as the sentence does', () => {
			expect(explain([], ALL, ' work ').message).toBe('No task sits under a heading containing #work');
		});

		it('says the vault has no tasks without a tag, with no action', () => {
			expect(explain([], OPEN, '')).toEqual({ message: 'No tasks in this vault yet' });
		});

		it('treats a whitespace-only tag as no tag', () => {
			expect(explain([], OPEN, '  ')).toEqual({ message: 'No tasks in this vault yet' });
		});

		it('names several tags joined with or, and offers to clear them', () => {
			expect(explain([], ALL, '#to-list #work')).toEqual({
				message: 'No task sits under a heading containing #to-list or #work',
				action: { kind: 'clearTag', label: 'Clear tag' },
			});
		});

		it('treats separators with no tag as no tag, with no action', () => {
			expect(explain([], OPEN, ' , ')).toEqual({ message: 'No tasks in this vault yet' });
		});

		it('names the tag, not the status filter, for empty rows with a tag', () => {
			expect(explain([], { show: 'closed', statuses: ['done'], due: 'edited7' }, '#to-list')).toEqual({
				message: 'No task sits under a heading containing #to-list',
				action: { kind: 'clearTag', label: 'Clear tag' },
			});
		});
	});

	describe('stage 2: the status filter', () => {
		it('counts the closed tasks at the default status', () => {
			expect(explain(rows([[done(1), done(2)]], [[done(3)]]), OPEN)).toEqual({ message: 'All 3 tasks are closed', action: SHOW_ALL });
		});

		it('words a single task on its own', () => {
			expect(explain(rows([[done(1)]]), OPEN)).toEqual({ message: 'The only task is closed', action: SHOW_ALL });
		});

		it('comes before the Due filter when both would empty the list', () => {
			expect(explain(rows([[done(1)], 0]), { show: 'open', due: 'edited7' })).toEqual({ message: 'The only task is closed', action: SHOW_ALL });
		});

		it('wins when every row is closed under Status Open and Due Overdue', () => {
			const late = taskV2('Late', { status: 'done', lineNumber: 1, metadata: { description: 'Late', tags: [], dueDate: '2026-11-04' } });
			expect(explain(rows([[late, done(2)]]), { show: 'open', due: 'overdue' })).toEqual({
				message: 'All 2 tasks are closed',
				action: SHOW_ALL,
			});
		});

		it('says every task is closed for only [x] and [-] tasks', () => {
			const r = rows([[taskV2('Shipped', { status: 'done', lineNumber: 1 }), taskV2('Old idea', { status: 'cancelled', lineNumber: 2 })]]);
			expect(explain(r, OPEN)).toEqual({ message: 'All 2 tasks are closed', action: SHOW_ALL });
		});

		it('says no task has the chosen status under Closed with no closed row', () => {
			expect(explain(rows([[open(1)]]), { show: 'closed' })).toEqual({ message: 'No task has the chosen status', action: SHOW_ALL });
		});

		it('says no task has the chosen status for a status set with no match', () => {
			expect(explain(rows([[open(1), done(2)]]), { show: 'open', statuses: ['question'] })).toEqual({
				message: 'No task has the chosen status',
				action: SHOW_ALL,
			});
		});
	});

	describe('stage 3: the Due filter', () => {
		it('names the Due filter for Overdue over open undated rows', () => {
			expect(explain(rows([[open(1), open(2)]]), { show: 'open', due: 'overdue' })).toEqual({ message: DUE_MESSAGE, action: RESET_DUE });
		});

		it('names the Due filter when no row passes both Status and Due', () => {
			const late = taskV2('Late', { status: 'done', lineNumber: 2, metadata: { description: 'Late', tags: [], dueDate: '2026-11-04' } });
			expect(explain(rows([[open(1), late]]), { show: 'open', due: 'overdue' })).toEqual({ message: DUE_MESSAGE, action: RESET_DUE });
		});

		it('names the Due filter for an open task in an old note under Note edited in the last 7 days', () => {
			expect(explain(rows([[open(1)], NOW - 10 * DAY], [[done(1)], NOW - DAY]), { show: 'open', due: 'edited7' })).toEqual({
				message: DUE_MESSAGE,
				action: RESET_DUE,
			});
		});

		it('names the Due filter under All and under chosen statuses', () => {
			expect(explain(rows([[done(1)]]), { show: 'all', due: 'edited30' })).toEqual({ message: DUE_MESSAGE, action: RESET_DUE });
			expect(explain(rows([[open(1)]]), { show: 'all', statuses: ['todo'], due: 'today' })).toEqual({
				message: DUE_MESSAGE,
				action: RESET_DUE,
			});
		});
	});

	it('falls back to "No tasks found" with no action when the Due filter is any', () => {
		expect(explain(rows([[open(1)]]), OPEN)).toEqual({ message: 'No tasks found' });
	});
});
