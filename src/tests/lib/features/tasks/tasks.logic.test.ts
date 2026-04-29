import { describe, it, expect } from 'vitest';
import {
	filterByDate,
	filterCompleted,
	filterCompletedTasks,
	computeTaskStats,
} from '$lib/features/tasks/tasks.logic';
import type { TaskItem, FileTaskGroup } from '$lib/features/tasks/tasks.types';
import { parseTaskMetadata } from '$lib/features/tasks/task-metadata.logic';

/** Helper to build a TaskItem with sensible defaults for status and metadata */
function makeTask(
	overrides: Partial<TaskItem> & Pick<TaskItem, 'text' | 'checked' | 'indent' | 'lineNumber'>,
): TaskItem {
	return {
		status: overrides.checked ? 'done' : 'todo',
		metadata: parseTaskMetadata(overrides.text),
		...overrides,
	};
}

describe('filterCompletedTasks', () => {
	it('keeps unchecked tasks', () => {
		const tasks: TaskItem[] = [
			makeTask({ text: 'Pending', checked: false, indent: 0, lineNumber: 1 }),
		];
		expect(filterCompletedTasks(tasks)).toHaveLength(1);
	});

	it('removes completed tasks with no descendants', () => {
		const tasks: TaskItem[] = [
			makeTask({ text: 'Done', checked: true, indent: 0, lineNumber: 1 }),
			makeTask({ text: 'Pending', checked: false, indent: 0, lineNumber: 2 }),
		];
		const result = filterCompletedTasks(tasks);
		expect(result).toHaveLength(1);
		expect(result[0].text).toBe('Pending');
	});

	it('keeps completed parent when it has unchecked children', () => {
		const tasks: TaskItem[] = [
			makeTask({ text: 'Parent', checked: true, indent: 0, lineNumber: 1 }),
			makeTask({ text: 'Child pending', checked: false, indent: 1, lineNumber: 2 }),
			makeTask({ text: 'Child done', checked: true, indent: 1, lineNumber: 3 }),
		];
		const result = filterCompletedTasks(tasks);
		expect(result).toHaveLength(2);
		expect(result[0].text).toBe('Parent');
		expect(result[1].text).toBe('Child pending');
	});

	it('hides entire family when parent and all children are completed', () => {
		const tasks: TaskItem[] = [
			makeTask({ text: 'Parent', checked: true, indent: 0, lineNumber: 1 }),
			makeTask({ text: 'Child 1', checked: true, indent: 1, lineNumber: 2 }),
			makeTask({ text: 'Child 2', checked: true, indent: 1, lineNumber: 3 }),
		];
		expect(filterCompletedTasks(tasks)).toEqual([]);
	});

	it('handles mixed families correctly', () => {
		const tasks: TaskItem[] = [
			makeTask({ text: 'Parent A', checked: true, indent: 0, lineNumber: 1 }),
			makeTask({ text: 'Child A1', checked: true, indent: 1, lineNumber: 2 }),
			makeTask({ text: 'Parent B', checked: true, indent: 0, lineNumber: 3 }),
			makeTask({ text: 'Child B1', checked: false, indent: 1, lineNumber: 4 }),
		];
		const result = filterCompletedTasks(tasks);
		expect(result).toHaveLength(2);
		expect(result[0].text).toBe('Parent B');
		expect(result[1].text).toBe('Child B1');
	});

	it('handles deeply nested hierarchy', () => {
		const tasks: TaskItem[] = [
			makeTask({ text: 'Root', checked: true, indent: 0, lineNumber: 1 }),
			makeTask({ text: 'Mid', checked: true, indent: 1, lineNumber: 2 }),
			makeTask({ text: 'Deep pending', checked: false, indent: 2, lineNumber: 3 }),
		];
		const result = filterCompletedTasks(tasks);
		expect(result).toHaveLength(3);
		expect(result[0].text).toBe('Root');
		expect(result[1].text).toBe('Mid');
		expect(result[2].text).toBe('Deep pending');
	});
});

describe('filterCompleted', () => {
	it('removes completed sibling tasks from groups', () => {
		const groups: FileTaskGroup[] = [
			{
				filePath: '/a.md',
				fileName: 'a',
				modifiedAt: 1000,
				tasks: [
					makeTask({ text: 'Done', checked: true, indent: 0, lineNumber: 1 }),
					makeTask({ text: 'Pending', checked: false, indent: 0, lineNumber: 2 }),
				],
			},
		];

		const filtered = filterCompleted(groups);
		expect(filtered).toHaveLength(1);
		expect(filtered[0].tasks).toHaveLength(1);
		expect(filtered[0].tasks[0].text).toBe('Pending');
	});

	it('excludes groups where all tasks are completed', () => {
		const groups: FileTaskGroup[] = [
			{
				filePath: '/a.md',
				fileName: 'a',
				modifiedAt: 1000,
				tasks: [
					makeTask({ text: 'Done 1', checked: true, indent: 0, lineNumber: 1 }),
					makeTask({ text: 'Done 2', checked: true, indent: 0, lineNumber: 2 }),
				],
			},
			{
				filePath: '/b.md',
				fileName: 'b',
				modifiedAt: 2000,
				tasks: [
					makeTask({ text: 'Pending', checked: false, indent: 0, lineNumber: 1 }),
				],
			},
		];

		const filtered = filterCompleted(groups);
		expect(filtered).toHaveLength(1);
		expect(filtered[0].filePath).toBe('/b.md');
	});

	it('returns empty array when all tasks are completed', () => {
		const groups: FileTaskGroup[] = [
			{
				filePath: '/a.md',
				fileName: 'a',
				modifiedAt: 1000,
				tasks: [makeTask({ text: 'Done', checked: true, indent: 0, lineNumber: 1 })],
			},
		];

		expect(filterCompleted(groups)).toEqual([]);
	});

	it('keeps completed parent in group when children are unchecked', () => {
		const groups: FileTaskGroup[] = [
			{
				filePath: '/a.md',
				fileName: 'a',
				modifiedAt: 1000,
				tasks: [
					makeTask({ text: 'Parent', checked: true, indent: 0, lineNumber: 1 }),
					makeTask({ text: 'Child', checked: false, indent: 1, lineNumber: 2 }),
				],
			},
		];

		const filtered = filterCompleted(groups);
		expect(filtered).toHaveLength(1);
		expect(filtered[0].tasks).toHaveLength(2);
		expect(filtered[0].tasks[0].text).toBe('Parent');
		expect(filtered[0].tasks[1].text).toBe('Child');
	});
});

describe('filterByDate', () => {
	const now = new Date('2026-02-11T12:00:00Z').getTime();
	const groups: FileTaskGroup[] = [
		{ filePath: '/a.md', fileName: 'a', modifiedAt: now - 1 * 24 * 60 * 60 * 1000, tasks: [] },
		{ filePath: '/b.md', fileName: 'b', modifiedAt: now - 10 * 24 * 60 * 60 * 1000, tasks: [] },
		{ filePath: '/c.md', fileName: 'c', modifiedAt: now - 60 * 24 * 60 * 60 * 1000, tasks: [] },
	];

	it('returns all groups for "all" filter', () => {
		expect(filterByDate(groups, 'all', now)).toHaveLength(3);
	});

	it('filters to last 7 days', () => {
		const filtered = filterByDate(groups, 'last7days', now);
		expect(filtered).toHaveLength(1);
		expect(filtered[0].filePath).toBe('/a.md');
	});

	it('filters to last 30 days', () => {
		const filtered = filterByDate(groups, 'last30days', now);
		expect(filtered).toHaveLength(2);
		expect(filtered.map((g) => g.filePath)).toEqual(['/a.md', '/b.md']);
	});
});

describe('computeTaskStats', () => {
	it('computes correct stats', () => {
		const groups: FileTaskGroup[] = [
			{
				filePath: '/a.md',
				fileName: 'a',
				modifiedAt: 1000,
				tasks: [
					makeTask({ text: 'Done', checked: true, indent: 0, lineNumber: 1 }),
					makeTask({ text: 'Not done', checked: false, indent: 0, lineNumber: 2 }),
				],
			},
			{
				filePath: '/b.md',
				fileName: 'b',
				modifiedAt: 2000,
				tasks: [
					makeTask({ text: 'Also done', checked: true, indent: 0, lineNumber: 1 }),
				],
			},
		];

		const stats = computeTaskStats(groups);
		expect(stats.total).toBe(3);
		expect(stats.completed).toBe(2);
		expect(stats.pending).toBe(1);
		expect(stats.fileCount).toBe(2);
	});

	it('returns zeros for empty groups', () => {
		const stats = computeTaskStats([]);
		expect(stats).toEqual({ total: 0, completed: 0, pending: 0, fileCount: 0 });
	});
});

