import { describe, it, expect, beforeEach } from 'vitest';
import { tasksStore } from '#lib/features/tasks/tasks.store.svelte.js';

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

	it('setHideCompleted updates hide state', () => {
		tasksStore.setHideCompleted(false);
		expect(tasksStore.hideCompleted).toBe(false);
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
		tasksStore.setHideCompleted(false);
		tasksStore.setLoading(true);
		tasksStore.setHasLoaded(true);
		tasksStore.setError('failed');
		tasksStore.setScrollOffset(120);

		tasksStore.reset();

		expect(tasksStore.fileTaskGroups).toEqual([]);
		expect(tasksStore.dateFilter).toBe('all');
		expect(tasksStore.sectionTag).toBe('#to-list');
		expect(tasksStore.hideCompleted).toBe(true);
		expect(tasksStore.isLoading).toBe(false);
		expect(tasksStore.hasLoaded).toBe(false);
		expect(tasksStore.error).toBeNull();
		expect(tasksStore.scrollOffset).toBe(0);
	});
});
