import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { tasksStore } from '#lib/features/tasks/tasks.store.svelte.js';
import {
	DEFAULT_QUICK,
	DEFAULT_TASK_SORT,
	buildTaskRows,
	defaultTaskExcludes,
	defaultTaskQuery,
	headingSources,
} from '#lib/features/tasks/task-query.logic.js';
import type { FileTaskGroupV2 } from '#lib/types/vault-v2.types.js';
import { taskEntryV2, taskGroupV2, taskV2 } from '../../../fixtures/tasks.fixture';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

/** `buildTaskRows` over `groups`, whose `modifiedAt` is in ms as the rows carry it; no section tag, no overlay. */
const rowsFrom = (groups: FileTaskGroupV2[], vaultPath: string) =>
	buildTaskRows(groups.map((g) => taskEntryV2({ ...g, modifiedAt: g.modifiedAt / 1000 })), vaultPath, new Map());

describe('tasksStore', () => {
	beforeEach(() => {
		tasksStore.reset();
	});

	it('starts with default state', () => {
		expect(tasksStore.fileTaskGroups).toEqual([]);
		expect(tasksStore.quick).toEqual(DEFAULT_QUICK);
		expect(tasksStore.query).toEqual(defaultTaskQuery());
		expect(tasksStore.rows).toEqual([]);
		expect(tasksStore.sourceRows).toEqual([]);
		expect(tasksStore.visibleRows).toEqual([]);
		expect(tasksStore.isLoading).toBe(false);
		expect(tasksStore.hasLoaded).toBe(false);
	});

	it('setFileTaskGroups updates groups', () => {
		const groups = [{ filePath: '/a.md', tasks: [] }] as any;
		tasksStore.setFileTaskGroups(groups);
		expect(tasksStore.fileTaskGroups).toBe(groups);
	});

	it('setSources replaces the cards and keeps the excludes and quick filters', () => {
		tasksStore.setQuick({ show: 'all' });
		tasksStore.setSources(headingSources(['#a', '#b']));
		expect(tasksStore.query.sources).toEqual(headingSources(['#a', '#b']));
		tasksStore.setSources([]);
		expect(tasksStore.query.sources).toEqual([]);
		expect(tasksStore.query.exclude).toEqual(defaultTaskExcludes());
		expect(tasksStore.quick).toEqual({ show: 'all' });
	});

	it('the quick getter follows setQuick and reads query.quick', () => {
		tasksStore.setQuick({ show: 'all' });
		expect(tasksStore.quick).toEqual({ show: 'all' });
		expect(tasksStore.query.quick).toBe(tasksStore.quick);
		expect(tasksStore.query.sources).toEqual(headingSources(['#to-list']));
	});

	describe('sources and excludes', () => {
		beforeEach(() => {
			settingsStore.reset();
		});

		afterEach(() => {
			settingsStore.reset();
		});

		/** One open task per note, its text the vault-relative path; one under `## Inbox #to-list`. */
		const vaultRows = () =>
			buildTaskRows(
				[
					entryV2('/vault/Projects/a.md', { tasks: [taskV2('Projects/a.md')] }),
					entryV2('/vault/_system/templates/T.md', { tasks: [taskV2('_system/templates/T.md')] }),
					entryV2('/vault/X/n.md', { tasks: [taskV2('X/n.md')] }),
					entryV2('/vault/Inbox.md', {
						taskHeadings: [{ level: 2, text: 'Inbox #to-list', line: 1 }],
						tasks: [taskV2('Inbox.md', { lineNumber: 2, heading: 0 })],
					}),
				],
				'/vault',
				new Map(),
			);
		const visible = () => tasksStore.visibleRows.map((r) => r.text);

		it('visibleRows and sourceRows follow setSources', () => {
			tasksStore.setRows(vaultRows());
			expect(visible()).toEqual(['Inbox.md']);
			tasksStore.setSources([{ clauses: [{ kind: 'folder', path: 'Projects' }] }]);
			expect(visible()).toEqual(['Projects/a.md']);
			expect(tasksStore.sourceRows.map((r) => r.text)).toEqual(['Projects/a.md']);
			tasksStore.setSources([]);
			expect(visible()).toEqual(['Inbox.md', 'Projects/a.md', 'X/n.md']);
		});

		it('visibleRows follows setExclude', () => {
			tasksStore.setRows(vaultRows());
			tasksStore.setSources([]);
			tasksStore.setExclude({ ...defaultTaskExcludes(), templatesFolder: false, systemFolder: false });
			expect(visible()).toEqual(['_system/templates/T.md', 'Inbox.md', 'Projects/a.md', 'X/n.md']);
			expect(tasksStore.query.exclude.templatesFolder).toBe(false);
		});

		it('visibleRows follows a template folder setting change', () => {
			tasksStore.setRows(vaultRows());
			tasksStore.setSources([]);
			tasksStore.setExclude({ ...defaultTaskExcludes(), systemFolder: false });
			expect(visible()).toEqual(['Inbox.md', 'Projects/a.md', 'X/n.md']);
			settingsStore.updateTemplates({ folder: 'X' });
			expect(visible()).toEqual(['_system/templates/T.md', 'Inbox.md', 'Projects/a.md']);
		});

		it('recounts the note counts over the kept rows', () => {
			tasksStore.setRows(
				buildTaskRows(
					[
						entryV2('/vault/s.md', {
							taskHeadings: [{ level: 2, text: 'List #to-list', line: 1 }, { level: 2, text: 'Other', line: 4 }],
							tasks: [taskV2('in', { lineNumber: 2, heading: 0 }), taskV2('out', { lineNumber: 5, heading: 1 })],
						}),
					],
					'/vault',
					new Map(),
				),
			);
			expect(tasksStore.rows.map((r) => r.noteTaskCount)).toEqual([2, 2]);
			expect(tasksStore.visibleRows.map((r) => [r.text, r.noteTaskCount, r.noteOpenCount])).toEqual([['in', 1, 1]]);
		});
	});

	it('setQuick merges into the quick filters', () => {
		tasksStore.setQuick({ statuses: ['done'] });
		expect(tasksStore.quick).toEqual({ show: 'open', statuses: ['done'] });
		tasksStore.setQuick({ show: 'all' });
		expect(tasksStore.quick).toEqual({ show: 'all', statuses: ['done'] });
		tasksStore.setQuick({ statuses: undefined });
		expect(tasksStore.quick).toEqual({ show: 'all' });
	});

	it('resetQuick gives DEFAULT_QUICK', () => {
		tasksStore.setQuick({ show: 'closed', statuses: ['todo'] });
		tasksStore.resetQuick();
		expect(tasksStore.quick).toEqual(DEFAULT_QUICK);
	});

	it('setRows replaces the rows', () => {
		const rows = rowsFrom([{ ...taskGroupV2('/vault/a.md', [taskV2('x')]), modifiedAt: Date.now() }], '/vault');
		tasksStore.setRows(rows);
		expect(tasksStore.rows).toBe(rows);
	});

	describe('visibleRows', () => {
		beforeEach(() => {
			// The rows below have no heading: list every note.
			tasksStore.setSources([]);
		});

		const DAY = 24 * 60 * 60 * 1000;
		const rowsOf = () =>
			rowsFrom(
				[
					{ ...taskGroupV2('/vault/new.md', [taskV2('Ship', { lineNumber: 1 }), taskV2('Shipped', { status: 'done', lineNumber: 2 })]), modifiedAt: Date.now() - DAY },
					{ ...taskGroupV2('/vault/old.md', [taskV2('Old', { lineNumber: 1 })]), modifiedAt: Date.now() - 10 * DAY },
				],
				'/vault',
			);
		const texts = () => tasksStore.visibleRows.map((r) => r.text);

		it('follows a setRows change', () => {
			expect(texts()).toEqual([]);
			tasksStore.setRows(rowsOf());
			expect(texts()).toEqual(['Ship', 'Old']);
			tasksStore.setRows([]);
			expect(texts()).toEqual([]);
		});

		it('follows a setQuick change', () => {
			tasksStore.setRows(rowsOf());
			tasksStore.setQuick({ show: 'closed' });
			expect(texts()).toEqual(['Shipped']);
			tasksStore.setQuick({ show: 'all' });
			expect(texts()).toEqual(['Ship', 'Shipped', 'Old']);
			expect(tasksStore.visibleRows.every((r) => !r.dimmed)).toBe(true);
		});

		it('follows a quick.due change to a Note edited option', () => {
			tasksStore.setRows(rowsOf());
			tasksStore.setQuick({ due: 'edited7' });
			expect(texts()).toEqual(['Ship']);
			tasksStore.setQuick({ due: 'edited30' });
			expect(texts()).toEqual(['Ship', 'Old']);
		});

		describe('priority, tag and search', () => {
			const metaRows = () =>
				rowsFrom(
					[
						{
							...taskGroupV2('/vault/Plan.md', [
								taskV2('Call Ana', { lineNumber: 1, metadata: { description: 'Call Ana', tags: ['work/client'], priority: 'high' } }),
								taskV2('Paint', { lineNumber: 2, metadata: { description: 'Paint', tags: ['home'] } }),
							]),
							modifiedAt: Date.now(),
						},
					],
					'/vault',
				);

			it('follows a priorities change', () => {
				tasksStore.setRows(metaRows());
				tasksStore.setQuick({ priorities: ['high'] });
				expect(texts()).toEqual(['Call Ana']);
				tasksStore.setQuick({ priorities: ['none'] });
				expect(texts()).toEqual(['Paint']);
			});

			it('follows a tags change', () => {
				tasksStore.setRows(metaRows());
				tasksStore.setQuick({ tags: ['work'] });
				expect(texts()).toEqual(['Call Ana']);
				tasksStore.setQuick({ tags: undefined });
				expect(texts()).toEqual(['Call Ana', 'Paint']);
			});

			it('follows a search change', () => {
				tasksStore.setRows(metaRows());
				tasksStore.setQuick({ search: 'pai' });
				expect(texts()).toEqual(['Paint']);
				tasksStore.setQuick({ search: undefined });
				expect(texts()).toEqual(['Call Ana', 'Paint']);
			});

			it('resetQuick and reset each put all three back to DEFAULT_QUICK', () => {
				tasksStore.setQuick({ priorities: ['high'], tags: ['work'], search: 'x' });
				tasksStore.resetQuick();
				expect(tasksStore.quick).toEqual(DEFAULT_QUICK);

				tasksStore.setQuick({ priorities: ['high'], tags: ['work'], search: 'x' });
				tasksStore.reset();
				expect(tasksStore.quick).toEqual(DEFAULT_QUICK);
			});
		});

		describe('on a clock faked to 2026-11-05', () => {
			beforeEach(() => {
				vi.useFakeTimers({ toFake: ['Date'] });
				vi.setSystemTime(new Date(2026, 10, 5, 12));
			});

			afterEach(() => {
				vi.useRealTimers();
			});

			const dueRows = () =>
				rowsFrom(
					[
						{
							...taskGroupV2('/vault/due.md', [
								taskV2('Late', { lineNumber: 1, metadata: { description: 'Late', tags: [], dueDate: '2026-11-04' } }),
								taskV2('Later', { lineNumber: 2, metadata: { description: 'Later', tags: [], dueDate: '2026-11-20' } }),
								taskV2('Someday', { lineNumber: 3 }),
							]),
							modifiedAt: Date.now(),
						},
					],
					'/vault',
				);

			it('setQuick({ due: overdue }) keeps only the overdue row, and reset clears it', () => {
				tasksStore.setRows(dueRows());
				tasksStore.setQuick({ due: 'overdue' });
				expect(texts()).toEqual(['Late']);

				tasksStore.reset();
				expect(tasksStore.quick.due).toBeUndefined();
				tasksStore.setSources([]);
				tasksStore.setRows(dueRows());
				expect(texts()).toEqual(['Late', 'Later', 'Someday']);
			});
		});
	});

	describe('collapsedGroups', () => {
		it('is empty by default', () => {
			expect(tasksStore.collapsedGroups.size).toBe(0);
		});

		it('toggleGroupCollapsed adds a key and a second call removes it, returning a new set each time', () => {
			const before = tasksStore.collapsedGroups;
			tasksStore.toggleGroupCollapsed('note:/vault/a.md');
			const added = tasksStore.collapsedGroups;
			expect(added).not.toBe(before);
			expect([...added]).toEqual(['note:/vault/a.md']);
			tasksStore.toggleGroupCollapsed('note:/vault/a.md');
			expect(tasksStore.collapsedGroups).not.toBe(added);
			expect(tasksStore.collapsedGroups.size).toBe(0);
		});

		it('keeps two keys independent', () => {
			tasksStore.toggleGroupCollapsed('due:overdue');
			tasksStore.toggleGroupCollapsed('note:/vault/a.md');
			tasksStore.toggleGroupCollapsed('due:overdue');
			expect([...tasksStore.collapsedGroups]).toEqual(['note:/vault/a.md']);
		});

		it('reset() clears it', () => {
			tasksStore.toggleGroupCollapsed('folder:');
			tasksStore.reset();
			expect(tasksStore.collapsedGroups.size).toBe(0);
		});
	});

	describe('grouping', () => {
		beforeEach(() => {
			tasksStore.setSources([]);
			vi.useFakeTimers({ toFake: ['Date'] });
			vi.setSystemTime(new Date('2026-11-05T12:00:00'));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		/** A due task on `lineNumber`. */
		const due = (text: string, lineNumber: number, dueDate?: string) =>
			taskV2(text, { lineNumber, metadata: { description: text, tags: [], ...(dueDate ? { dueDate } : {}) } });

		const groupedRows = () =>
			rowsFrom(
				[
					{ ...taskGroupV2('/vault/b.md', [due('Later', 1, '2026-11-20'), due('Late', 2, '2026-11-04')]), modifiedAt: Date.now() },
					{ ...taskGroupV2('/vault/a.md', [due('Now', 1, '2026-11-05')]), modifiedAt: Date.now() },
				],
				'/vault',
			);

		/** `[key, row texts]` per group. */
		const groups = () => tasksStore.groups.map((g) => [g.key, g.rows.map((r) => r.text)]);

		it("defaults groupBy to 'note' and sort to ['due', 'priority', 'path']", () => {
			expect(tasksStore.groupBy).toBe('note');
			expect(tasksStore.sort).toEqual(['due', 'priority', 'path']);
			expect(tasksStore.sort).not.toBe(DEFAULT_TASK_SORT);
			expect(tasksStore.groups).toEqual([]);
		});

		it('groups follow a setRows change and a setGroupBy change', () => {
			tasksStore.setRows(groupedRows());
			// `buildTaskRows` puts the notes in path order.
			expect(groups()).toEqual([
				['/vault/a.md', ['Now']],
				['/vault/b.md', ['Later', 'Late']],
			]);

			tasksStore.setGroupBy('due');
			expect(tasksStore.groupBy).toBe('due');
			expect(groups()).toEqual([
				['overdue', ['Late']],
				['today', ['Now']],
				['later', ['Later']],
			]);

			tasksStore.setRows(groupedRows().filter((r) => r.text !== 'Late'));
			expect(groups()).toEqual([
				['today', ['Now']],
				['later', ['Later']],
			]);
		});

		it('setGroupBy with the current value keeps the same groups', () => {
			tasksStore.setRows(groupedRows());
			tasksStore.setGroupBy('status');
			const before = tasksStore.groups;
			tasksStore.setGroupBy('status');
			expect(tasksStore.groupBy).toBe('status');
			expect(tasksStore.groups).toEqual(before);
		});

		it('reset restores groupBy and sort', () => {
			tasksStore.setGroupBy('priority');
			tasksStore.reset();
			expect(tasksStore.groupBy).toBe('note');
			expect(tasksStore.sort).toEqual(['due', 'priority', 'path']);
		});
	});

	it('setLoading updates loading state', () => {
		tasksStore.setLoading(true);
		expect(tasksStore.isLoading).toBe(true);
	});

	it('setHasLoaded updates the loaded flag', () => {
		tasksStore.setHasLoaded(true);
		expect(tasksStore.hasLoaded).toBe(true);
	});

	it('starts with no error and the scroll offset at the top', () => {
		expect(tasksStore.error).toBeNull();
		expect(tasksStore.scrollOffset).toBe(0);
	});

	it('setError updates and clears the error', () => {
		tasksStore.setError('Tasks could not be refreshed.');
		expect(tasksStore.error).toBe('Tasks could not be refreshed.');
		tasksStore.setError(null);
		expect(tasksStore.error).toBeNull();
	});

	it('setScrollOffset updates the scroll offset', () => {
		tasksStore.setScrollOffset(120);
		expect(tasksStore.scrollOffset).toBe(120);
	});

	it('starts with no current row', () => {
		expect(tasksStore.currentRow).toBeNull();
	});

	it('setCurrentRow sets a copy of the row and clears it', () => {
		const row = { filePath: '/vault/a.md', lineNumber: 3 };
		tasksStore.setCurrentRow(row);
		expect(tasksStore.currentRow).toEqual({ filePath: '/vault/a.md', lineNumber: 3 });
		row.lineNumber = 9;
		expect(tasksStore.currentRow).toEqual({ filePath: '/vault/a.md', lineNumber: 3 });

		tasksStore.setCurrentRow(null);
		expect(tasksStore.currentRow).toBeNull();
	});

	it('setCurrentRow keeps the stored object when the row is equal', () => {
		tasksStore.setCurrentRow({ filePath: '/vault/a.md', lineNumber: 3 });
		const before = tasksStore.currentRow;
		tasksStore.setCurrentRow({ filePath: '/vault/a.md', lineNumber: 3 });
		expect(tasksStore.currentRow).toBe(before);
	});

	it('reset restores defaults', () => {
		tasksStore.setFileTaskGroups([{}] as any);
		tasksStore.setRows(rowsFrom([taskGroupV2('/vault/a.md', [taskV2('x')])], '/vault'));
		tasksStore.setQuick({ show: 'all', statuses: ['done'], due: 'overdue' });
		tasksStore.setSources([{ clauses: [{ kind: 'folder', path: 'Projects' }] }]);
		tasksStore.setExclude({ ...defaultTaskExcludes(), archived: false });
		tasksStore.setLoading(true);
		tasksStore.setHasLoaded(true);
		tasksStore.setError('failed');
		tasksStore.setScrollOffset(120);
		tasksStore.setCurrentRow({ filePath: '/vault/a.md', lineNumber: 1 });

		tasksStore.reset();

		expect(tasksStore.fileTaskGroups).toEqual([]);
		expect(tasksStore.rows).toEqual([]);
		expect(tasksStore.quick).toEqual(DEFAULT_QUICK);
		expect(tasksStore.query).toEqual(defaultTaskQuery());
		expect(tasksStore.isLoading).toBe(false);
		expect(tasksStore.hasLoaded).toBe(false);
		expect(tasksStore.error).toBeNull();
		expect(tasksStore.scrollOffset).toBe(0);
		expect(tasksStore.currentRow).toBeNull();
	});
});
