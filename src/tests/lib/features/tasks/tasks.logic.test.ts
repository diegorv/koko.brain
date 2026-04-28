import { describe, it, expect } from 'vitest';
import {
	extractTasks,
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

describe('extractTasks', () => {
	it('extracts unchecked tasks', () => {
		const content = '# Title\n- [ ] Buy groceries\n- [ ] Walk the dog';
		const tasks = extractTasks(content);
		expect(tasks).toHaveLength(2);
		expect(tasks[0]).toMatchObject({ text: 'Buy groceries', checked: false, indent: 0, lineNumber: 2, status: 'todo' });
		expect(tasks[1]).toMatchObject({ text: 'Walk the dog', checked: false, indent: 0, lineNumber: 3, status: 'todo' });
	});

	it('extracts checked tasks', () => {
		const content = '- [x] Done task\n- [X] Also done';
		const tasks = extractTasks(content);
		expect(tasks).toHaveLength(2);
		expect(tasks[0].checked).toBe(true);
		expect(tasks[0].status).toBe('done');
		expect(tasks[1].checked).toBe(true);
		expect(tasks[1].status).toBe('done');
	});

	it('extracts mixed checked and unchecked tasks', () => {
		const content = '- [x] Done\n- [ ] Not done';
		const tasks = extractTasks(content);
		expect(tasks[0].checked).toBe(true);
		expect(tasks[1].checked).toBe(false);
	});

	it('computes indent levels', () => {
		const content = '- [ ] Top level\n  - [ ] Indent 1\n    - [ ] Indent 2';
		const tasks = extractTasks(content);
		expect(tasks[0].indent).toBe(0);
		expect(tasks[1].indent).toBe(1);
		expect(tasks[2].indent).toBe(2);
	});

	it('supports * and + markers', () => {
		const content = '* [ ] Asterisk task\n+ [ ] Plus task';
		const tasks = extractTasks(content);
		expect(tasks).toHaveLength(2);
		expect(tasks[0].text).toBe('Asterisk task');
		expect(tasks[1].text).toBe('Plus task');
	});

	it('skips tasks inside fenced code blocks', () => {
		const content = '- [ ] Real task\n```\n- [ ] Code task\n```\n- [ ] Another real';
		const tasks = extractTasks(content);
		expect(tasks).toHaveLength(2);
		expect(tasks[0].text).toBe('Real task');
		expect(tasks[1].text).toBe('Another real');
	});

	it('skips tasks inside tilde code blocks', () => {
		const content = '- [ ] Real task\n~~~\n- [ ] Code task\n~~~\n- [ ] Another real';
		const tasks = extractTasks(content);
		expect(tasks).toHaveLength(2);
	});

	it('does not close a tilde fence with backticks', () => {
		const content = '~~~python\n# Backtick example:\n```\n- [ ] Should NOT be extracted\n~~~\n- [ ] Should be extracted';
		const tasks = extractTasks(content);
		expect(tasks).toHaveLength(1);
		expect(tasks[0].text).toBe('Should be extracted');
	});

	it('does not close a backtick fence with tildes', () => {
		const content = '```python\n~~~\n- [ ] Should NOT be extracted\n```\n- [ ] Should be extracted';
		const tasks = extractTasks(content);
		expect(tasks).toHaveLength(1);
		expect(tasks[0].text).toBe('Should be extracted');
	});

	it('handles nested fence characters inside a block correctly', () => {
		const content = '~~~\n```\n- [ ] Inside tilde block\n```\n~~~\n- [ ] Outside';
		const tasks = extractTasks(content);
		expect(tasks).toHaveLength(1);
		expect(tasks[0].text).toBe('Outside');
	});

	it('skips blank tasks with empty text', () => {
		const content = '- [ ] \n- [ ] Real task\n- [x] \n1. [ ] ';
		const tasks = extractTasks(content);
		expect(tasks).toHaveLength(1);
		expect(tasks[0].text).toBe('Real task');
	});

	it('skips tasks with only whitespace text', () => {
		const content = '- [ ]   \n- [ ] Real task';
		const tasks = extractTasks(content);
		expect(tasks).toHaveLength(1);
		expect(tasks[0].text).toBe('Real task');
	});

	it('returns empty array for content with no tasks', () => {
		const content = '# Title\nSome text\n- Not a task';
		expect(extractTasks(content)).toEqual([]);
	});

	it('returns empty array for empty content', () => {
		expect(extractTasks('')).toEqual([]);
	});

	it('assigns correct line numbers', () => {
		const content = 'Line 1\nLine 2\n- [ ] Task on line 3\nLine 4\n- [x] Task on line 5';
		const tasks = extractTasks(content);
		expect(tasks[0].lineNumber).toBe(3);
		expect(tasks[1].lineNumber).toBe(5);
	});

	it('extracts ordered list tasks (1. [ ] format)', () => {
		const content = '1. [ ] First task\n2. [x] Second task\n3. [ ] Third task';
		const tasks = extractTasks(content);
		expect(tasks).toHaveLength(3);
		expect(tasks[0]).toMatchObject({ text: 'First task', checked: false, indent: 0, lineNumber: 1, status: 'todo' });
		expect(tasks[1]).toMatchObject({ text: 'Second task', checked: true, indent: 0, lineNumber: 2, status: 'done' });
	});

	it('extracts indented ordered list tasks', () => {
		const content = '1. [ ] Top\n  1. [ ] Nested';
		const tasks = extractTasks(content);
		expect(tasks[0].indent).toBe(0);
		expect(tasks[1].indent).toBe(1);
	});

	it('computes indent levels with tab indentation', () => {
		const content = '- [ ] Top level\n\t- [ ] Indent 1\n\t\t- [ ] Indent 2';
		const tasks = extractTasks(content);
		expect(tasks[0].indent).toBe(0);
		expect(tasks[1].indent).toBe(1);
		expect(tasks[2].indent).toBe(2);
	});

	it('computes indent levels for tab-indented ordered list tasks', () => {
		const content = '1. [ ] Top\n\t1. [x] Nested 1\n\t2. [ ] Nested 2\n\t\t1. [ ] Deep nested';
		const tasks = extractTasks(content);
		expect(tasks[0].indent).toBe(0);
		expect(tasks[1].indent).toBe(1);
		expect(tasks[2].indent).toBe(1);
		expect(tasks[3].indent).toBe(2);
	});

	it('computes indent levels with mixed tabs and spaces', () => {
		const content = '- [ ] Top\n\t  - [ ] Tab + 2 spaces';
		const tasks = extractTasks(content);
		expect(tasks[0].indent).toBe(0);
		expect(tasks[1].indent).toBe(2);
	});

	it('parses metadata from task text', () => {
		const content = '- [ ] Buy milk 📅 2026-02-20 🔺 #shopping';
		const tasks = extractTasks(content);
		expect(tasks).toHaveLength(1);
		expect(tasks[0].metadata.description).toBe('Buy milk');
		expect(tasks[0].metadata.dueDate).toBe('2026-02-20');
		expect(tasks[0].metadata.priority).toBe('highest');
		expect(tasks[0].metadata.tags).toEqual(['shopping']);
	});

	it('extracts custom status chars', () => {
		const content = '- [-] Cancelled\n- [/] In progress\n- [?] Question\n- [>] Forwarded\n- [!] Important';
		const tasks = extractTasks(content);
		expect(tasks).toHaveLength(5);
		expect(tasks[0]).toMatchObject({ status: 'cancelled', checked: true });
		expect(tasks[1]).toMatchObject({ status: 'in-progress', checked: true });
		expect(tasks[2]).toMatchObject({ status: 'question', checked: true });
		expect(tasks[3]).toMatchObject({ status: 'forwarded', checked: true });
		expect(tasks[4]).toMatchObject({ status: 'important', checked: true });
	});
});

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

