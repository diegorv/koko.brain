import { describe, it, expect, beforeEach } from 'vitest';
import { tasksStore } from '#lib/features/tasks/tasks.store.svelte.js';
import { DEFAULT_QUICK, buildTaskRows } from '#lib/features/tasks/task-query.logic.js';
import { taskGroupV2, taskV2 } from '../../../fixtures/tasks.fixture';

describe('tasksStore', () => {
	beforeEach(() => {
		tasksStore.reset();
	});

	it('starts with default state', () => {
		expect(tasksStore.fileTaskGroups).toEqual([]);
		expect(tasksStore.dateFilter).toBe('all');
		expect(tasksStore.sectionTag).toBe('#to-list');
		expect(tasksStore.quick).toEqual(DEFAULT_QUICK);
		expect(tasksStore.rows).toEqual([]);
		expect(tasksStore.visibleRows).toEqual([]);
		expect(tasksStore.isLoading).toBe(false);
		expect(tasksStore.hasLoaded).toBe(false);
	});

	it('setFileTaskGroups updates groups', () => {
		const groups = [{ filePath: '/a.md', tasks: [] }] as any;
		tasksStore.setFileTaskGroups(groups);
		expect(tasksStore.fileTaskGroups).toBe(groups);
	});

	it('setDateFilter updates date filter', () => {
		tasksStore.setDateFilter('last7days');
		expect(tasksStore.dateFilter).toBe('last7days');
	});

	it('setSectionTag updates section tag', () => {
		tasksStore.setSectionTag('#work');
		expect(tasksStore.sectionTag).toBe('#work');
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
		const rows = buildTaskRows([{ ...taskGroupV2('/vault/a.md', [taskV2('x')]), modifiedAt: Date.now() }], '/vault');
		tasksStore.setRows(rows);
		expect(tasksStore.rows).toBe(rows);
	});

	describe('visibleRows', () => {
		const DAY = 24 * 60 * 60 * 1000;
		const rowsOf = () =>
			buildTaskRows(
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

		it('follows a setDateFilter change', () => {
			tasksStore.setRows(rowsOf());
			tasksStore.setDateFilter('last7days');
			expect(texts()).toEqual(['Ship']);
			tasksStore.setDateFilter('last30days');
			expect(texts()).toEqual(['Ship', 'Old']);
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

	it('reset restores defaults', () => {
		tasksStore.setFileTaskGroups([{}] as any);
		tasksStore.setDateFilter('last7days');
		tasksStore.setSectionTag('#custom');
		tasksStore.setRows(buildTaskRows([taskGroupV2('/vault/a.md', [taskV2('x')])], '/vault'));
		tasksStore.setQuick({ show: 'all', statuses: ['done'] });
		tasksStore.setLoading(true);
		tasksStore.setHasLoaded(true);
		tasksStore.setError('failed');
		tasksStore.setScrollOffset(120);

		tasksStore.reset();

		expect(tasksStore.fileTaskGroups).toEqual([]);
		expect(tasksStore.dateFilter).toBe('all');
		expect(tasksStore.sectionTag).toBe('#to-list');
		expect(tasksStore.rows).toEqual([]);
		expect(tasksStore.quick).toEqual(DEFAULT_QUICK);
		expect(tasksStore.isLoading).toBe(false);
		expect(tasksStore.hasLoaded).toBe(false);
		expect(tasksStore.error).toBeNull();
		expect(tasksStore.scrollOffset).toBe(0);
	});
});
