import { describe, it, expect, beforeEach } from 'vitest';
import { tasksStore } from '$lib/features/tasks/tasks.store.svelte';

describe('tasksStore', () => {
	beforeEach(() => {
		tasksStore.reset();
	});

	it('starts with default state', () => {
		expect(tasksStore.fileTaskGroups).toEqual([]);
		expect(tasksStore.dateFilter).toBe('all');
		expect(tasksStore.sectionTag).toBe('#to-list');
		expect(tasksStore.hideCompleted).toBe(true);
		expect(tasksStore.isLoading).toBe(false);
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

	it('setHideCompleted updates hide state', () => {
		tasksStore.setHideCompleted(false);
		expect(tasksStore.hideCompleted).toBe(false);
	});

	it('setLoading updates loading state', () => {
		tasksStore.setLoading(true);
		expect(tasksStore.isLoading).toBe(true);
	});

	it('reset restores defaults', () => {
		tasksStore.setFileTaskGroups([{}] as any);
		tasksStore.setDateFilter('last7days');
		tasksStore.setSectionTag('#custom');
		tasksStore.setHideCompleted(false);
		tasksStore.setLoading(true);

		tasksStore.reset();

		expect(tasksStore.fileTaskGroups).toEqual([]);
		expect(tasksStore.dateFilter).toBe('all');
		expect(tasksStore.sectionTag).toBe('#to-list');
		expect(tasksStore.hideCompleted).toBe(true);
		expect(tasksStore.isLoading).toBe(false);
	});
});
