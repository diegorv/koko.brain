import { describe, it, expect } from 'vitest';
import {
	DEFAULT_QUICK,
	GROUP_ROW_CAP,
	applyQuickFilters,
	buildTaskRows,
	collapseKey,
	describeTaskRule,
	explainEmptyTasks,
	DEFAULT_TASK_SORT,
	groupTaskRows,
	isQuickFieldDefault,
	matchesNestedTag,
	statusFilterLabel,
	tagMenuOptions,
	taskCountText,
	taskTagOptions,
	toggleQuickPriority,
	toggleQuickStatus,
	toggleQuickTag,
	type DueRange,
	type QuickFilterField,
	type TaskGroup,
	type TaskGroupKey,
	type TaskQuickFilters,
	type TaskRow,
	type VisibleRow,
} from '#lib/features/tasks/task-query.logic.js';
import type { TaskPriority, TaskStatus } from '#lib/features/tasks/task-metadata.types.js';
import { taskDisplayText } from '#lib/features/tasks/tasks.logic.js';
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

describe('groupTaskRows', () => {
	const SORT = [...DEFAULT_TASK_SORT];

	/** A todo task on `lineNumber` with `meta` merged into its metadata. */
	const t = (text: string, lineNumber: number, meta: Partial<TaskItem['metadata']> = {}, extra: Partial<TaskItem> = {}) =>
		taskV2(text, { lineNumber, metadata: { description: text, tags: [], ...meta }, ...extra });

	/**
	 * Five notes, in an order that is neither path nor `modifiedAt` order.
	 * Today is 2026-11-05.
	 */
	const mixed = () =>
		applyQuickFilters(
			buildTaskRows(
				[
					group('/vault/Projects/x.md', [
						t('B1', 1, { dueDate: '2026-11-05', priority: 'low' }),
						t('B2', 2, { priority: 'none' }),
					], 300),
					group('/vault/note 10.md', [t('A1', 1, { dueDate: '2026-11-04', priority: 'highest' }), t('A2', 2, { dueDate: '2026-11-06' })], 100),
					group('/vault/Projects/y.md', [
						t('C1', 1, { dueDate: '2026-11-07', priority: 'medium' }, { status: 'done' }),
						t('C2', 2, { dueDate: '2026-11-12', priority: 'lowest' }, { status: 'in-progress' }),
					], 500),
					group('/vault/note 9.md', [
						t('D1', 1, { dueDate: '2026-11-13', priority: 'high' }, { status: 'question' }),
						t('D2', 2, { dueDate: '2026-11-06' }, { status: 'important' }),
					], 200),
					group('/vault/Archive/z.md', [
						t('E1', 1, {}, { status: 'cancelled' }),
						t('E2', 2, { dueDate: '2026-11-06' }, { status: 'forwarded' }),
					], 400),
				],
				'/vault',
			),
			{ show: 'all' },
			TODAY,
			NOW,
		);

	/** `[key, label, row texts]` per group. */
	const summary = (groups: TaskGroup[]) => groups.map((g) => [g.key, g.label, g.rows.map((r) => r.text)]);

	it('note: one group per note in the incoming order whatever modifiedAt, rows in document order', () => {
		expect(summary(groupTaskRows(mixed(), 'note', SORT, TODAY))).toEqual([
			['/vault/Projects/x.md', 'x', ['B1', 'B2']],
			['/vault/note 10.md', 'note 10', ['A1', 'A2']],
			['/vault/Projects/y.md', 'y', ['C1', 'C2']],
			['/vault/note 9.md', 'note 9', ['D1', 'D2']],
			['/vault/Archive/z.md', 'z', ['E1', 'E2']],
		]);
	});

	it('folder: Vault root first, then folders in path order, two notes of a folder merged', () => {
		expect(summary(groupTaskRows(mixed(), 'folder', SORT, TODAY))).toEqual([
			['', 'Vault root', ['A1', 'D2', 'A2', 'D1']],
			['Archive', 'Archive', ['E2', 'E1']],
			['Projects', 'Projects', ['B1', 'C1', 'C2', 'B2']],
		]);
	});

	it('due: buckets in order, 11-04 overdue, 11-05 today, 11-06 tomorrow, 11-07 and 11-12 this week, 11-13 later', () => {
		expect(summary(groupTaskRows(mixed(), 'due', SORT, TODAY))).toEqual([
			['overdue', 'Overdue', ['A1']],
			['today', 'Today', ['B1']],
			// Same due date and priority: path order, `note 9` before `note 10`.
			['tomorrow', 'Tomorrow', ['E2', 'D2', 'A2']],
			['week', 'This week', ['C1', 'C2']],
			['later', 'Later', ['D1']],
			['none', 'No date', ['E1', 'B2']],
		]);
	});

	it("priority: No priority between Medium and Low, holding a 'none' row and a row with no priority", () => {
		expect(summary(groupTaskRows(mixed(), 'priority', SORT, TODAY))).toEqual([
			['highest', 'Highest', ['A1']],
			['high', 'High', ['D1']],
			['medium', 'Medium', ['C1']],
			['none', 'No priority', ['E2', 'D2', 'A2', 'E1', 'B2']],
			['low', 'Low', ['B1']],
			['lowest', 'Lowest', ['C2']],
		]);
	});

	it('status: one group per status in TASK_STATUSES order, labelled with the capitalised word', () => {
		expect(summary(groupTaskRows(mixed(), 'status', SORT, TODAY))).toEqual([
			['todo', 'Todo', ['A1', 'B1', 'A2', 'B2']],
			['in-progress', 'In progress', ['C2']],
			['question', 'Question', ['D1']],
			['important', 'Important', ['D2']],
			['forwarded', 'Forwarded', ['E2']],
			['done', 'Done', ['C1']],
			['cancelled', 'Cancelled', ['E1']],
		]);
	});

	it("sorts by priority first under ['priority', 'due', 'path']", () => {
		const [todo] = groupTaskRows(mixed(), 'status', ['priority', 'due', 'path'], TODAY);
		expect(todo.rows.map((r) => r.text)).toEqual(['A1', 'A2', 'B2', 'B1']);
	});

	it('falls back to path then line after the sort keys, so an empty sort still gives one order', () => {
		const [todo] = groupTaskRows(mixed(), 'status', [], TODAY);
		expect(todo.rows.map((r) => r.text)).toEqual(['A1', 'A2', 'B1', 'B2']);
	});

	it('leaves out empty groups', () => {
		const rows = mixed().filter((r) => r.text === 'A1');
		expect(summary(groupTaskRows(rows, 'due', SORT, TODAY))).toEqual([['overdue', 'Overdue', ['A1']]]);
	});

	it('gives no group for no rows', () => {
		for (const by of ['note', 'folder', 'due', 'priority', 'status'] as TaskGroupKey[]) {
			expect(groupTaskRows([], by, SORT, TODAY)).toEqual([]);
		}
	});

	describe('note group fields and counts', () => {
		const twoNotes = () =>
			buildTaskRows(
				[
					group('/vault/Projects/b.md', [task('todo', 0, 1), task('todo', 0, 2), task('done', 0, 3)], 5),
					group('/vault/a.md', [task('todo', 0, 1)], 9),
				],
				'/vault',
			);

		it('carries filePath, folder and modifiedAt from the first row', () => {
			const groups = groupTaskRows(applyQuickFilters(twoNotes(), { show: 'all' }, TODAY, NOW), 'note', SORT, TODAY);
			expect(groups.map((g) => [g.filePath, g.label, g.folder, g.modifiedAt, g.rows.length])).toEqual([
				['/vault/Projects/b.md', 'b', 'Projects', 5, 3],
				['/vault/a.md', 'a', '', 9, 1],
			]);
		});

		it('reads total from noteTaskCount and open from noteOpenCount, so total stays 3 with 2 rows passing', () => {
			const [b] = groupTaskRows(applyQuickFilters(twoNotes(), { show: 'open' }, TODAY, NOW), 'note', SORT, TODAY);
			expect(b.rows.map((r) => r.lineNumber)).toEqual([1, 2]);
			expect([b.total, b.open]).toEqual([3, 2]);
		});

		it('keeps total and open whatever show hides, and leaves out a note with no visible row', () => {
			const groups = groupTaskRows(applyQuickFilters(twoNotes(), { show: 'closed' }, TODAY, NOW), 'note', SORT, TODAY);
			expect(groups.map((g) => g.filePath)).toEqual(['/vault/Projects/b.md']);
			expect([groups[0].total, groups[0].open]).toEqual([3, 2]);
			expect(groups[0].rows.map((r) => r.lineNumber)).toEqual([3]);
		});

		const parentAndChildren = () =>
			applyQuickFilters(rowsOf([task('done', 0, 1), task('todo', 1, 2), task('todo', 1, 3)]), { show: 'open' }, TODAY, NOW);

		it('counts a dimmed parent out of count but keeps it in rows', () => {
			const [note] = groupTaskRows(parentAndChildren(), 'note', SORT, TODAY);
			expect(note.count).toBe(2);
			expect(note.rows.map((r) => [r.lineNumber, r.dimmed])).toEqual([[1, true], [2, false], [3, false]]);
		});

		it('gives a flat group count equal to rows.length', () => {
			const groups = groupTaskRows(parentAndChildren(), 'status', SORT, TODAY);
			expect(groups.map((g) => [g.key, g.count, g.rows.length])).toEqual([['todo', 2, 2]]);
		});

		it('carries no note fields on a flat group', () => {
			const [g] = groupTaskRows(parentAndChildren(), 'status', SORT, TODAY);
			expect([g.filePath, g.folder, g.modifiedAt, g.total, g.open]).toEqual([undefined, undefined, undefined, undefined, undefined]);
		});
	});

	describe('breadcrumbs', () => {
		/** A done parent due 11-04 and its todo child due 11-05: different due buckets. */
		const family = () =>
			rowsOf([
				t('Plan trip ^plan1', 1, { dueDate: '2026-11-04' }, { status: 'done' }),
				t('Book train', 2, { dueDate: '2026-11-05' }, { indent: 1 }),
			]);

		it('sets the parent text on a child in another bucket and drops the dimmed parent', () => {
			const groups = groupTaskRows(applyQuickFilters(family(), { show: 'open' }, TODAY, NOW), 'due', SORT, TODAY);
			expect(groups.map((g) => [g.key, g.rows.map((r) => [r.text, r.breadcrumb])])).toEqual([
				['today', [['Book train', 'Plan trip']]],
			]);
		});

		it('sets it when the parent sits in the same group, and never in a note group', () => {
			const visible = applyQuickFilters(family(), { show: 'all' }, TODAY, NOW);
			const [parent, child] = groupTaskRows(visible, 'folder', SORT, TODAY)[0].rows;
			expect([parent.text, parent.breadcrumb]).toEqual(['Plan trip ^plan1', undefined]);
			expect(child.breadcrumb).toBe(taskDisplayText(family()[0]));
			expect(child.breadcrumb).toBe('Plan trip');
			expect(groupTaskRows(visible, 'note', SORT, TODAY)[0].rows.map((r) => r.breadcrumb)).toEqual([undefined, undefined]);
		});

		it('gives no breadcrumb for a parentLine with no matching row', () => {
			const orphan = applyQuickFilters(family(), { show: 'all' }, TODAY, NOW).filter((r) => r.lineNumber === 2);
			expect(orphan[0].parentLine).toBe(1);
			const [today] = groupTaskRows(orphan, 'due', SORT, TODAY);
			expect(today.rows.map((r) => r.breadcrumb)).toEqual([undefined]);
		});
	});
});

describe('collapseKey', () => {
	it('joins the grouping and the raw group key', () => {
		expect(collapseKey('note', '/vault/A.md')).toBe('note:/vault/A.md');
		expect(collapseKey('due', 'overdue')).toBe('due:overdue');
	});

	it('keys the vault-root folder as `folder:`', () => {
		expect(collapseKey('folder', '')).toBe('folder:');
	});

	it('keeps the same raw key apart under two groupings', () => {
		expect(collapseKey('due', 'none')).not.toBe(collapseKey('priority', 'none'));
	});
});

describe('GROUP_ROW_CAP', () => {
	it('is 50', () => {
		expect(GROUP_ROW_CAP).toBe(50);
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

/** A todo task on `lineNumber` with `priority` (absent when undefined, as Rust sends it) and `tags`. */
const metaTask = (text: string, lineNumber: number, meta: { priority?: TaskPriority; tags?: string[] } = {}, indent = 0) =>
	taskV2(text, {
		indent,
		lineNumber,
		metadata: { description: text, tags: meta.tags ?? [], ...(meta.priority ? { priority: meta.priority } : {}) },
	});

describe('applyQuickFilters: the Priority filter', () => {
	const kept = (rows: TaskRow[], priorities: TaskPriority[] | undefined) =>
		applyQuickFilters(rows, { show: 'all', priorities }, TODAY, NOW).map((r) => r.text);
	const levels = () =>
		rowsOf([
			metaTask('high', 1, { priority: 'high' }),
			metaTask('low', 2, { priority: 'low' }),
			metaTask('absent', 3),
			metaTask('none', 4, { priority: 'none' }),
			metaTask('highest', 5, { priority: 'highest' }),
		]);

	it('keeps only high under [high]', () => {
		expect(kept(levels(), ['high'])).toEqual(['high']);
	});

	it('keeps an absent priority and an explicit none under [none]', () => {
		const rows = levels();
		expect(rows[2].metadata).not.toHaveProperty('priority');
		expect(kept(rows, ['none'])).toEqual(['absent', 'none']);
	});

	it('keeps both levels under [high, low]', () => {
		expect(kept(levels(), ['high', 'low'])).toEqual(['high', 'low']);
	});

	it('keeps every row for an empty or absent set', () => {
		expect(kept(levels(), [])).toHaveLength(5);
		expect(kept(levels(), undefined)).toHaveLength(5);
	});

	it('keeps a low parent of a high child dimmed under [high]', () => {
		const rows = rowsOf([metaTask('parent', 1, { priority: 'low' }, 0), metaTask('child', 2, { priority: 'high' }, 1)]);
		expect(shown(applyQuickFilters(rows, { show: 'all', priorities: ['high'] }, TODAY, NOW))).toEqual([
			['parent', true],
			['child', false],
		]);
	});
});

describe('toggleQuickPriority', () => {
	it('stores levels in menu order whatever the click order', () => {
		expect(toggleQuickPriority(toggleQuickPriority(undefined, 'none'), 'high')).toEqual(['high', 'none']);
		expect(toggleQuickPriority(['highest', 'lowest'], 'low')).toEqual(['highest', 'low', 'lowest']);
	});

	it('returns undefined when the last level is removed', () => {
		expect(toggleQuickPriority(['high'], 'high')).toBeUndefined();
	});
});

describe('matchesNestedTag', () => {
	it.each([
		['work', 'work', true],
		['work', 'work/client', true],
		['work', 'workshop', false],
		['work', 'Work', true],
		['Work', 'work/Client', true],
		['#work', 'work', true],
		['#work', 'work/client', true],
		['work/client', 'work', false],
		['work', 'home', false],
	] as const)('chosen %j matches %j: %s', (chosen, tag, expected) => {
		expect(matchesNestedTag(chosen, tag)).toBe(expected);
	});
});

describe('applyQuickFilters: the Tag filter', () => {
	const kept = (rows: TaskRow[], tags: string[] | undefined) =>
		applyQuickFilters(rows, { show: 'all', tags }, TODAY, NOW).map((r) => r.text);
	const tagged = () =>
		rowsOf([
			metaTask('work', 1, { tags: ['work'] }),
			metaTask('client', 2, { tags: ['work/client'] }),
			metaTask('workshop', 3, { tags: ['workshop'] }),
			metaTask('home', 4, { tags: ['Home'] }),
			metaTask('untagged', 5),
		]);

	it('keeps work and work/client under [work], dropping workshop', () => {
		expect(kept(tagged(), ['work'])).toEqual(['work', 'client']);
	});

	it('keeps a task carrying any of two tags', () => {
		expect(kept(tagged(), ['workshop', 'home'])).toEqual(['workshop', 'home']);
	});

	it('matches a different case', () => {
		expect(kept(tagged(), ['HOME'])).toEqual(['home']);
	});

	it('ignores a leading # on the chosen tag', () => {
		expect(kept(tagged(), ['#work'])).toEqual(['work', 'client']);
	});

	it('keeps every row for an empty or absent set', () => {
		expect(kept(tagged(), [])).toHaveLength(5);
		expect(kept(tagged(), undefined)).toHaveLength(5);
	});
});

describe('taskTagOptions', () => {
	it('returns tags without #, de-duplicated by case keeping the first spelling, sorted case-insensitively', () => {
		const rows = rowsOf([
			metaTask('a', 1, { tags: ['work', 'Zeta'] }),
			metaTask('b', 2, { tags: ['Work', 'alpha'] }),
			metaTask('c', 3, { tags: ['work/client'] }),
		]);
		expect(taskTagOptions(rows)).toEqual(['alpha', 'work', 'work/client', 'Zeta']);
	});

	it('returns [] for rows with no tags', () => {
		expect(taskTagOptions(rowsOf([metaTask('a', 1)]))).toEqual([]);
		expect(taskTagOptions([])).toEqual([]);
	});
});

describe('tagMenuOptions', () => {
	const rows = () => rowsOf([metaTask('a', 1, { tags: ['work'] })]);

	it('is taskTagOptions when every chosen tag is present', () => {
		expect(tagMenuOptions(rows(), ['work'])).toEqual(['work']);
		expect(tagMenuOptions(rows(), undefined)).toEqual(['work']);
	});

	it('keeps a chosen tag no longer in the rows, in sorted place', () => {
		expect(tagMenuOptions(rows(), ['alpha'])).toEqual(['alpha', 'work']);
		expect(tagMenuOptions([], ['home'])).toEqual(['home']);
	});
});

describe('toggleQuickTag', () => {
	const options = ['alpha', 'home', 'work'];

	it('stores chosen tags in option order whatever the click order', () => {
		expect(toggleQuickTag(toggleQuickTag(undefined, 'work', options), 'alpha', options)).toEqual(['alpha', 'work']);
	});

	it('returns undefined when the last tag is removed', () => {
		expect(toggleQuickTag(['home'], 'home', options)).toBeUndefined();
	});
});

describe('applyQuickFilters: the search', () => {
	const kept = (rows: TaskRow[], search: string | undefined) =>
		applyQuickFilters(rows, { show: 'all', search }, TODAY, NOW).map((r) => r.text);

	// Rust's output for these lines, copied from Issue 109's pinned pairs in tasks.logic.test.ts.
	const chapter = () => taskV2('read [[Book#Chapter 2]]', { lineNumber: 1, metadata: { description: 'read [[Book 2]]', tags: ['Chapter'] } });
	const invoice = () =>
		taskV2('Send invoice 📅 2026-11-03 ⏫ #work', {
			lineNumber: 2,
			metadata: { description: 'Send invoice', dueDate: '2026-11-03', priority: 'high', tags: ['work'] },
		});

	it('finds a row by what it shows when that is the raw text', () => {
		expect(kept(rowsOf([chapter(), invoice()]), 'chapter')).toEqual(['read [[Book#Chapter 2]]']);
	});

	it('searches the description, not the raw text with its due date', () => {
		const rows = rowsOf([chapter(), invoice()]);
		expect(kept(rows, 'INVOICE')).toEqual(['Send invoice 📅 2026-11-03 ⏫ #work']);
		expect(kept(rows, '2026-11-03')).toEqual([]);
	});

	it('finds a row by a substring of its note title alone', () => {
		const rows = buildTaskRows([group('/vault/Quarterly Plan.md', [metaTask('Ship', 1)]), group('/vault/b.md', [metaTask('Ship', 1)])], '/vault');
		expect(applyQuickFilters(rows, { show: 'all', search: '  terly pl ' }, TODAY, NOW).map((r) => r.filePath)).toEqual([
			'/vault/Quarterly Plan.md',
		]);
	});

	it('keeps every row for a blank or whitespace-only search', () => {
		const rows = rowsOf([chapter(), invoice()]);
		expect(kept(rows, '')).toHaveLength(2);
		expect(kept(rows, '   ')).toHaveLength(2);
		expect(kept(rows, undefined)).toHaveLength(2);
	});
});

describe('isQuickFieldDefault', () => {
	it.each([
		['priority', {}, true],
		['priority', { priorities: [] }, true],
		['priority', { priorities: ['high'] }, false],
		['tag', {}, true],
		['tag', { tags: [] }, true],
		['tag', { tags: ['work'] }, false],
		['search', {}, true],
		['search', { search: '' }, true],
		['search', { search: '  ' }, true],
		['search', { search: 'a' }, false],
	] as [QuickFilterField, Partial<TaskQuickFilters>, boolean][])('%s of %j is default: %s', (field, partial, expected) => {
		expect(isQuickFieldDefault({ show: 'closed', ...partial }, field)).toBe(expected);
	});

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

	it.each([
		[{ priorities: ['high', 'none'] }, ', priority high or no priority'],
		[{ tags: ['work', 'home/x'] }, ', tagged #work or #home/x'],
		[{ search: '  invoice ' }, ', matching "invoice"'],
	] as [Partial<TaskQuickFilters>, string][])('%j adds %j after the heading part', (partial, phrase) => {
		expect(describeTaskRule({ sectionTag: '#to-list', quick: { show: 'open', ...partial } })).toBe(
			`Open tasks under headings containing #to-list${phrase}`,
		);
	});

	it('puts priority, tag and search in that order after the due part', () => {
		expect(
			describeTaskRule({
				sectionTag: '',
				quick: { show: 'all', due: 'overdue', priorities: ['highest'], tags: ['work'], search: 'call' },
			}),
		).toBe('All tasks from every note, overdue, priority highest, tagged #work, matching "call"');
	});

	it('adds nothing for empty priority, tag and search values', () => {
		expect(describeTaskRule({ sectionTag: '', quick: { show: 'open', priorities: [], tags: [], search: '  ' } })).toBe(
			'Open tasks from every note',
		);
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

	describe('stages 4 to 6: Priority, Tag and Search', () => {
		const RESET_PRIORITY = { kind: 'resetQuick', field: 'priorities', label: 'Reset Priority filter' };
		const RESET_TAG = { kind: 'resetQuick', field: 'tags', label: 'Reset Tag filter' };
		const RESET_SEARCH = { kind: 'resetQuick', field: 'search', label: 'Reset Search filter' };
		const PRIORITY = { message: 'No task matches the Priority filter', action: RESET_PRIORITY };
		const TAG = { message: 'No task matches the Tag filter', action: RESET_TAG };
		const SEARCH = { message: 'No task matches the Search filter', action: RESET_SEARCH };

		/** A high open task tagged work, and a done low one tagged home. */
		const two = () => rows([[metaTask('Call Ana', 1, { priority: 'high', tags: ['work'] }), taskV2('Paint', { status: 'done', lineNumber: 2, metadata: { description: 'Paint', priority: 'low', tags: ['home'] } })]]);

		it('names each filter when it alone empties the list', () => {
			expect(explain(two(), { show: 'open', priorities: ['low'] })).toEqual(PRIORITY);
			expect(explain(two(), { show: 'open', tags: ['home'] })).toEqual(TAG);
			expect(explain(two(), { show: 'open', search: 'paint' })).toEqual(SEARCH);
		});

		it('is cumulative: a filter that empties the list only with the ones before it is named', () => {
			// Priority low keeps Paint under All, then Search "call" drops it.
			expect(explain(two(), { show: 'all', priorities: ['low'], search: 'call' })).toEqual(SEARCH);
		});

		it('names Priority when Priority and Search would each empty the list', () => {
			expect(explain(two(), { show: 'open', priorities: ['lowest'], search: 'nothing' })).toEqual(PRIORITY);
		});

		it('names Tag when Tag and Search would each empty the list', () => {
			expect(explain(two(), { show: 'open', tags: ['nope'], search: 'nothing' })).toEqual(TAG);
		});

		it('lets Status and Due win over all three', () => {
			const rest: Partial<TaskQuickFilters> = { priorities: ['lowest'], tags: ['nope'], search: 'nothing' };
			expect(explain(rows([[done(1)]]), { show: 'open', ...rest })).toEqual({
				message: 'The only task is closed',
				action: SHOW_ALL,
			});
			expect(explain(two(), { show: 'open', due: 'overdue', ...rest })).toEqual({
				message: DUE_MESSAGE,
				action: RESET_DUE,
			});
		});
	});

	it('falls back to "No tasks found" with no action when the Due filter is any', () => {
		expect(explain(rows([[open(1)]]), OPEN)).toEqual({ message: 'No tasks found' });
	});
});
