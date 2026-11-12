import { describe, it, expect } from 'vitest';
import {
	DEFAULT_QUICK,
	applyEditedCutoff,
	applyQuickFilters,
	buildTaskRows,
	describeTaskRule,
	explainEmptyTasks,
	isQuickFieldDefault,
	rowsByNote,
	statusFilterLabel,
	taskCountText,
	toggleQuickStatus,
	type TaskQuickFilters,
	type TaskRow,
	type VisibleRow,
} from '#lib/features/tasks/task-query.logic.js';
import type { TaskStatus } from '#lib/features/tasks/task-metadata.types.js';
import type { FileTaskGroup, TaskItem } from '#lib/features/tasks/tasks.types.js';
import { sevenStatusGroup, taskGroupV2, taskV2 } from '../../../fixtures/tasks.fixture';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-02-11T12:00:00Z').getTime();

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
		expect(statuses(applyQuickFilters(seven(), { show: 'open' }))).toEqual([
			'todo',
			'in-progress',
			'question',
			'important',
			'forwarded',
		]);
	});

	it('keeps only done and cancelled under Closed', () => {
		expect(statuses(applyQuickFilters(seven(), { show: 'closed' }))).toEqual(['done', 'cancelled']);
	});

	it('keeps every row under All', () => {
		expect(statuses(applyQuickFilters(seven(), { show: 'all' }))).toHaveLength(7);
	});

	it('lets chosen statuses win over show', () => {
		expect(statuses(applyQuickFilters(seven(), { show: 'closed', statuses: ['in-progress', 'done'] }))).toEqual([
			'in-progress',
			'done',
		]);
	});

	it('falls back to show when statuses is empty', () => {
		expect(statuses(applyQuickFilters(seven(), { show: 'closed', statuses: [] }))).toEqual(['done', 'cancelled']);
	});

	it('keeps a done parent with an in-progress child, both sent checked, dimming the parent', () => {
		const rows = rowsOf([
			taskV2('Parent', { status: 'done', checked: true, indent: 0, lineNumber: 1 }),
			taskV2('Child', { status: 'in-progress', checked: true, indent: 1, lineNumber: 2 }),
		]);
		expect(shown(applyQuickFilters(rows, DEFAULT_QUICK))).toEqual([
			['Parent', true],
			['Child', false],
		]);
	});

	it('returns new objects and leaves the input rows untouched', () => {
		const rows = rowsOf([task('todo', 0, 1)]);
		const [visible] = applyQuickFilters(rows, DEFAULT_QUICK);
		expect(visible).not.toBe(rows[0]);
		expect(rows[0]).not.toHaveProperty('dimmed');
	});

	it('returns nothing for no rows', () => {
		expect(applyQuickFilters([], DEFAULT_QUICK)).toEqual([]);
	});
});

describe('applyQuickFilters: dimming', () => {
	it('dims each failing ancestor of a passing row', () => {
		const rows = rowsOf([task('done', 0, 1), task('done', 1, 2), task('todo', 2, 3)]);
		expect(shown(applyQuickFilters(rows, DEFAULT_QUICK))).toEqual([
			['done 1', true],
			['done 2', true],
			['todo 3', false],
		]);
	});

	it('keeps a done parent with an open in-progress child dimmed', () => {
		const rows = rowsOf([task('done', 0, 1), task('in-progress', 1, 2)]);
		expect(shown(applyQuickFilters(rows, DEFAULT_QUICK))).toEqual([
			['done 1', true],
			['in-progress 2', false],
		]);
	});

	it('drops a done row followed by a todo row at the same indent', () => {
		const rows = rowsOf([task('done', 0, 1), task('todo', 0, 2)]);
		expect(shown(applyQuickFilters(rows, DEFAULT_QUICK))).toEqual([['todo 2', false]]);
	});

	it('drops a done row whose subtree ends before a later todo at a smaller or equal indent', () => {
		const rows = rowsOf([task('done', 1, 1), task('done', 2, 2), task('todo', 0, 3), task('done', 1, 4), task('todo', 1, 5)]);
		expect(shown(applyQuickFilters(rows, DEFAULT_QUICK))).toEqual([
			['todo 3', false],
			['todo 5', false],
		]);
	});

	it('never keeps a done row for a passing row of another note', () => {
		const rows = buildTaskRows(
			[group('/vault/a.md', [task('done', 0, 1)]), group('/vault/b.md', [task('todo', 1, 1)])],
			'/vault',
		);
		expect(applyQuickFilters(rows, DEFAULT_QUICK).map((r) => [r.filePath, r.text])).toEqual([['/vault/b.md', 'todo 1']]);
	});

	it('drops a done parent whose whole subtree is closed, with its subtree', () => {
		const rows = rowsOf([task('done', 0, 1), task('done', 1, 2), task('cancelled', 2, 3)]);
		expect(applyQuickFilters(rows, DEFAULT_QUICK)).toEqual([]);
	});

	it('dims an open parent of a passing done row under Closed', () => {
		const rows = rowsOf([task('todo', 0, 1), task('done', 1, 2)]);
		expect(shown(applyQuickFilters(rows, { show: 'closed' }))).toEqual([
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
		const notes = rowsByNote(applyQuickFilters(twoNotes(), { show: 'all' }));
		expect(notes.map((n) => [n.filePath, n.noteTitle, n.folder, n.modifiedAt, n.rows.length])).toEqual([
			['/vault/Projects/b.md', 'b', 'Projects', 5, 3],
			['/vault/a.md', 'a', '', 9, 1],
		]);
	});

	it('keeps total and open whatever show hides', () => {
		const [b] = rowsByNote(applyQuickFilters(twoNotes(), { show: 'closed' }));
		expect([b.total, b.open]).toEqual([3, 2]);
		expect(b.rows.map((r) => r.lineNumber)).toEqual([3]);
	});

	it('leaves out a note with no visible row', () => {
		expect(rowsByNote(applyQuickFilters(twoNotes(), { show: 'closed' })).map((n) => n.filePath)).toEqual([
			'/vault/Projects/b.md',
		]);
	});

	it('gives no note for no rows', () => {
		expect(rowsByNote([])).toEqual([]);
	});
});

describe('applyEditedCutoff', () => {
	const rows = buildTaskRows(
		[
			group('/vault/a.md', [task('todo', 0, 1)], NOW - 1 * DAY),
			group('/vault/b.md', [task('todo', 0, 1)], NOW - 10 * DAY),
			group('/vault/c.md', [task('todo', 0, 1)], NOW - 60 * DAY),
		],
		'/vault',
	);

	it('returns the input for all', () => {
		expect(applyEditedCutoff(rows, 'all', NOW)).toBe(rows);
	});

	it('keeps notes edited in the last 7 days', () => {
		expect(applyEditedCutoff(rows, 'last7days', NOW).map((r) => r.filePath)).toEqual(['/vault/a.md']);
	});

	it('keeps notes edited in the last 30 days', () => {
		expect(applyEditedCutoff(rows, 'last30days', NOW).map((r) => r.filePath)).toEqual(['/vault/a.md', '/vault/b.md']);
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
		[OPEN, '#to-list', 'all', 'Open tasks under headings containing #to-list'],
		[ALL, '#to-list', 'all', 'All tasks under headings containing #to-list'],
		[OPEN, '', 'all', 'Open tasks from every note'],
		[ALL, '', 'all', 'All tasks from every note'],
		[OPEN, '#to-list', 'last7days', 'Open tasks under headings containing #to-list, in notes edited in the last 7 days'],
		[ALL, '#to-list', 'last30days', 'All tasks under headings containing #to-list, in notes edited in the last 30 days'],
		[OPEN, '', 'last30days', 'Open tasks from every note, in notes edited in the last 30 days'],
		[ALL, '', 'last7days', 'All tasks from every note, in notes edited in the last 7 days'],
	] as const)('quick=%j, tag=%j, date=%s gives %j', (quick, sectionTag, dateFilter, expected) => {
		expect(describeTaskRule({ sectionTag, quick, dateFilter })).toBe(expected);
	});

	it('starts with Closed tasks under Closed', () => {
		expect(describeTaskRule({ sectionTag: '', quick: { show: 'closed' }, dateFilter: 'all' })).toBe('Closed tasks from every note');
	});

	it('names the chosen statuses in TASK_STATUSES order, joined with or', () => {
		expect(describeTaskRule({ sectionTag: '#work', quick: { show: 'open', statuses: ['in-progress', 'done'] }, dateFilter: 'last7days' })).toBe(
			'Tasks that are in progress or done under headings containing #work, in notes edited in the last 7 days',
		);
	});

	it('adds the # to a tag typed without one', () => {
		expect(describeTaskRule({ sectionTag: 'work', quick: OPEN, dateFilter: 'all' })).toBe('Open tasks under headings containing #work');
	});

	it('trims a tag with surrounding spaces', () => {
		expect(describeTaskRule({ sectionTag: '  #work  ', quick: OPEN, dateFilter: 'all' })).toBe(
			'Open tasks under headings containing #work',
		);
	});

	it('treats a whitespace-only tag as no tag', () => {
		expect(describeTaskRule({ sectionTag: '   ', quick: OPEN, dateFilter: 'all' })).toBe('Open tasks from every note');
	});

	it('joins several tags with or', () => {
		expect(describeTaskRule({ sectionTag: '#to-list #work', quick: OPEN, dateFilter: 'all' })).toBe(
			'Open tasks under headings containing #to-list or #work',
		);
		expect(describeTaskRule({ sectionTag: 'a, b c', quick: ALL, dateFilter: 'all' })).toBe(
			'All tasks under headings containing #a or #b or #c',
		);
	});

	it('treats separators with no tag as no tag', () => {
		expect(describeTaskRule({ sectionTag: ' , ', quick: OPEN, dateFilter: 'all' })).toBe('Open tasks from every note');
	});
});

describe('explainEmptyTasks', () => {
	const OPEN: TaskQuickFilters = { show: 'open' };
	const ALL: TaskQuickFilters = { show: 'all' };
	const SHOW_ALL = { kind: 'showAllStatuses', label: 'Show all' };
	const ALL_TIME = { kind: 'allTime', label: 'All time' };

	/** Rows of one or more notes, each `[tasks, modifiedAt]`. */
	function rows(...notes: [TaskItem[], number?][]): TaskRow[] {
		return buildTaskRows(
			notes.map(([tasks, modifiedAt], i) => group(`/vault/n${i}.md`, tasks, modifiedAt ?? 0)),
			'/vault',
		);
	}

	const open = (lineNumber: number) => task('todo', 0, lineNumber);
	const done = (lineNumber: number) => task('done', 0, lineNumber);
	const explain = (r: TaskRow[], quick: TaskQuickFilters, sectionTag = '', dateFilter: 'all' | 'last7days' | 'last30days' = 'all') =>
		explainEmptyTasks({ rows: r, sectionTag, quick, dateFilter, now: NOW });

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
			expect(explain([], { show: 'closed', statuses: ['done'] }, '#to-list', 'last7days')).toEqual({
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

		it('comes before the date filter when both would empty the list', () => {
			expect(explain(rows([[done(1)], 0]), OPEN, '', 'last7days')).toEqual({ message: 'The only task is closed', action: SHOW_ALL });
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

	describe('stage 3: the date filter', () => {
		it('names open tasks at the default status, when the recent notes hold only closed tasks', () => {
			expect(explain(rows([[done(1)], NOW], [[open(2)], 0]), OPEN, '', 'last7days')).toEqual({
				message: 'No open task is in a note edited in the last 7 days',
				action: ALL_TIME,
			});
		});

		it('names the date stage when a [/] task sits in an old note', () => {
			const r = rows([[taskV2('Shipped', { status: 'done', lineNumber: 1 }), taskV2('Draft plan', { status: 'in-progress', lineNumber: 2 })], 0]);
			expect(explain(r, OPEN, '', 'last7days')).toEqual({
				message: 'No open task is in a note edited in the last 7 days',
				action: ALL_TIME,
			});
		});

		it('gives the date stage, not the status stage, for an old open task and a recent closed one', () => {
			expect(explain(rows([[open(1)], NOW - 10 * DAY], [[done(1)], NOW - DAY]), OPEN, '', 'last7days')).toEqual({
				message: 'No open task is in a note edited in the last 7 days',
				action: ALL_TIME,
			});
		});

		it('uses the 30-day wording at the default status', () => {
			expect(explain(rows([[open(1)]]), OPEN, '', 'last30days')).toEqual({
				message: 'No open task is in a note edited in the last 30 days',
				action: ALL_TIME,
			});
		});

		it('names notes with tasks under All with no status chosen', () => {
			expect(explain(rows([[done(1)]]), ALL, '', 'last7days')).toEqual({
				message: 'No note with tasks was edited in the last 7 days',
				action: ALL_TIME,
			});
			expect(explain(rows([[open(1)]]), ALL, '', 'last30days')).toEqual({
				message: 'No note with tasks was edited in the last 30 days',
				action: ALL_TIME,
			});
		});

		it('names the chosen status otherwise', () => {
			expect(explain(rows([[done(1)]]), { show: 'closed' }, '', 'last7days')).toEqual({
				message: 'No task with the chosen status is in a note edited in the last 7 days',
				action: ALL_TIME,
			});
			expect(explain(rows([[open(1)]]), { show: 'all', statuses: ['todo'] }, '', 'last30days')).toEqual({
				message: 'No task with the chosen status is in a note edited in the last 30 days',
				action: ALL_TIME,
			});
		});
	});

	it('falls back to "No tasks found" with no action when the date filter is all time', () => {
		expect(explain(rows([[open(1)]]), OPEN)).toEqual({ message: 'No tasks found' });
	});
});
