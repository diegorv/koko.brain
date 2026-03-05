import { describe, it, expect } from 'vitest';
import {
	extractTasks,
	extractTasksFromSection,
	aggregateFileTasks,
	buildGroupsFromIndex,
	buildModifiedAtMap,
	filterByDate,
	filterCompleted,
	filterCompletedTasks,
	computeTaskStats,
	tasksEqual,
	toggleTaskInContent,
} from '$lib/features/tasks/tasks.logic';
import type { FileTreeNode } from '$lib/core/filesystem/fs.types';
import type { TaskItem, FileTaskGroup } from '$lib/features/tasks/tasks.types';
import { parseTaskMetadata } from '$lib/features/tasks/task-metadata.logic';
import type { TaskStatus } from '$lib/features/tasks/task-metadata.types';

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

describe('extractTasksFromSection', () => {
	const content = [
		'# Daily Note',
		'',
		'Some text here.',
		'',
		'### Tasks Operacionais #to-list',
		'1. [ ] App Excellence',
		'  1. [ ] Marcar 1:1',
		'  2. [ ] Resolver board',
		'2. [x] Obsidian',
		'',
		'### Other Section',
		'- [ ] Should not appear',
		'',
		'## Another H2',
		'- [ ] Also should not appear',
	].join('\n');

	it('extracts only tasks under the matching heading', () => {
		const tasks = extractTasksFromSection(content, '#to-list');
		expect(tasks).toHaveLength(4);
		expect(tasks[0].text).toBe('App Excellence');
		expect(tasks[1].text).toBe('Marcar 1:1');
		expect(tasks[2].text).toBe('Resolver board');
		expect(tasks[3].text).toBe('Obsidian');
	});

	it('stops at same-level heading', () => {
		const tasks = extractTasksFromSection(content, '#to-list');
		const texts = tasks.map((t) => t.text);
		expect(texts).not.toContain('Should not appear');
	});

	it('stops at higher-level heading', () => {
		const tasks = extractTasksFromSection(content, '#to-list');
		const texts = tasks.map((t) => t.text);
		expect(texts).not.toContain('Also should not appear');
	});

	it('falls back to all tasks when tag is empty', () => {
		const tasks = extractTasksFromSection(content, '');
		expect(tasks.length).toBeGreaterThan(4); // includes tasks from all sections
	});

	it('returns empty array when tag not found in any heading', () => {
		const tasks = extractTasksFromSection(content, '#nonexistent');
		expect(tasks).toEqual([]);
	});

	it('works with tag without # prefix', () => {
		const tasks = extractTasksFromSection(content, 'to-list');
		expect(tasks).toHaveLength(4);
	});

	it('handles multiple matching sections', () => {
		const multiContent = [
			'## Work #to-list',
			'- [ ] Work task',
			'## Personal',
			'- [ ] Personal task',
			'## Side Project #to-list',
			'- [ ] Side task',
		].join('\n');

		const tasks = extractTasksFromSection(multiContent, '#to-list');
		expect(tasks).toHaveLength(2);
		expect(tasks[0].text).toBe('Work task');
		expect(tasks[1].text).toBe('Side task');
	});

	it('skips tasks in code blocks within matching section', () => {
		const codeContent = [
			'## Tasks #to-list',
			'- [ ] Real task',
			'```',
			'- [ ] Code task',
			'```',
			'- [ ] Another real',
		].join('\n');

		const tasks = extractTasksFromSection(codeContent, '#to-list');
		expect(tasks).toHaveLength(2);
		expect(tasks[0].text).toBe('Real task');
		expect(tasks[1].text).toBe('Another real');
	});
});

describe('buildModifiedAtMap', () => {
	it('builds flat map from file tree', () => {
		const tree: FileTreeNode[] = [
			{ name: 'note1.md', path: '/vault/note1.md', isDirectory: false, modifiedAt: 1000 },
			{ name: 'note2.md', path: '/vault/note2.md', isDirectory: false, modifiedAt: 2000 },
		];
		const map = buildModifiedAtMap(tree);
		expect(map.get('/vault/note1.md')).toBe(1000);
		expect(map.get('/vault/note2.md')).toBe(2000);
	});

	it('recurses into directories', () => {
		const tree: FileTreeNode[] = [
			{
				name: 'folder',
				path: '/vault/folder',
				isDirectory: true,
				children: [
					{ name: 'nested.md', path: '/vault/folder/nested.md', isDirectory: false, modifiedAt: 3000 },
				],
			},
		];
		const map = buildModifiedAtMap(tree);
		expect(map.get('/vault/folder/nested.md')).toBe(3000);
		expect(map.has('/vault/folder')).toBe(false);
	});

	it('handles empty tree', () => {
		expect(buildModifiedAtMap([])).toEqual(new Map());
	});
});

describe('aggregateFileTasks', () => {
	it('groups tasks by file sorted by modifiedAt descending', () => {
		const noteContents = new Map([
			['/vault/old.md', '- [ ] Old task'],
			['/vault/new.md', '- [ ] New task'],
		]);
		const modifiedAtMap = new Map([
			['/vault/old.md', 1000],
			['/vault/new.md', 2000],
		]);

		const groups = aggregateFileTasks(noteContents, modifiedAtMap);
		expect(groups).toHaveLength(2);
		expect(groups[0].filePath).toBe('/vault/new.md');
		expect(groups[1].filePath).toBe('/vault/old.md');
	});

	it('excludes files with no tasks', () => {
		const noteContents = new Map([
			['/vault/tasks.md', '- [ ] A task'],
			['/vault/empty.md', '# No tasks here'],
		]);
		const modifiedAtMap = new Map([
			['/vault/tasks.md', 1000],
			['/vault/empty.md', 2000],
		]);

		const groups = aggregateFileTasks(noteContents, modifiedAtMap);
		expect(groups).toHaveLength(1);
		expect(groups[0].filePath).toBe('/vault/tasks.md');
	});

	it('extracts display name without extension', () => {
		const noteContents = new Map([['/vault/my-note.md', '- [ ] Task']]);
		const modifiedAtMap = new Map([['/vault/my-note.md', 1000]]);

		const groups = aggregateFileTasks(noteContents, modifiedAtMap);
		expect(groups[0].fileName).toBe('my-note');
	});

	it('filters by sectionTag when provided', () => {
		const noteContents = new Map([
			['/vault/a.md', '## Work #to-list\n- [ ] Filtered task\n## Other\n- [ ] Not filtered'],
			['/vault/b.md', '- [ ] No section task'],
		]);
		const modifiedAtMap = new Map([
			['/vault/a.md', 1000],
			['/vault/b.md', 2000],
		]);

		const groups = aggregateFileTasks(noteContents, modifiedAtMap, '#to-list');
		expect(groups).toHaveLength(1);
		expect(groups[0].filePath).toBe('/vault/a.md');
		expect(groups[0].tasks).toHaveLength(1);
		expect(groups[0].tasks[0].text).toBe('Filtered task');
	});
});

describe('buildGroupsFromIndex', () => {
	it('builds groups from pre-computed task index sorted by modifiedAt', () => {
		const index = new Map<string, TaskItem[]>([
			['/vault/old.md', [makeTask({ text: 'Old task', checked: false, indent: 0, lineNumber: 1 })]],
			['/vault/new.md', [makeTask({ text: 'New task', checked: false, indent: 0, lineNumber: 1 })]],
		]);
		const modifiedAtMap = new Map([
			['/vault/old.md', 1000],
			['/vault/new.md', 2000],
		]);

		const groups = buildGroupsFromIndex(index, modifiedAtMap);
		expect(groups).toHaveLength(2);
		expect(groups[0].filePath).toBe('/vault/new.md');
		expect(groups[1].filePath).toBe('/vault/old.md');
	});

	it('extracts display name without extension', () => {
		const index = new Map<string, TaskItem[]>([
			['/vault/my-note.md', [makeTask({ text: 'Task', checked: false, indent: 0, lineNumber: 1 })]],
		]);
		const modifiedAtMap = new Map([['/vault/my-note.md', 1000]]);

		const groups = buildGroupsFromIndex(index, modifiedAtMap);
		expect(groups[0].fileName).toBe('my-note');
	});

	it('returns empty array for empty index', () => {
		const groups = buildGroupsFromIndex(new Map(), new Map());
		expect(groups).toEqual([]);
	});

	it('defaults modifiedAt to 0 when file is not in modifiedAtMap', () => {
		const index = new Map<string, TaskItem[]>([
			['/vault/unknown.md', [makeTask({ text: 'Task', checked: false, indent: 0, lineNumber: 1 })]],
		]);

		const groups = buildGroupsFromIndex(index, new Map());
		expect(groups[0].modifiedAt).toBe(0);
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

describe('tasksEqual', () => {
	const taskA: TaskItem = makeTask({ text: 'Task', checked: false, indent: 0, lineNumber: 1 });
	const taskB: TaskItem = makeTask({ text: 'Task', checked: false, indent: 0, lineNumber: 1 });
	const taskC: TaskItem = makeTask({ text: 'Task', checked: true, indent: 0, lineNumber: 1 });
	const taskD: TaskItem = makeTask({ text: 'Different', checked: false, indent: 0, lineNumber: 1 });

	it('returns true for identical arrays', () => {
		expect(tasksEqual([taskA], [taskB])).toBe(true);
	});

	it('returns false for different lengths', () => {
		expect(tasksEqual([taskA], [taskA, taskB])).toBe(false);
	});

	it('returns false for different checked states', () => {
		expect(tasksEqual([taskA], [taskC])).toBe(false);
	});

	it('returns false for different text', () => {
		expect(tasksEqual([taskA], [taskD])).toBe(false);
	});

	it('returns true for empty arrays', () => {
		expect(tasksEqual([], [])).toBe(true);
	});

	it('returns false for different status', () => {
		const cancelled: TaskItem = { ...taskA, status: 'cancelled' as TaskStatus };
		expect(tasksEqual([taskA], [cancelled])).toBe(false);
	});
});

describe('toggleTaskInContent', () => {
	it('toggles unchecked to checked', () => {
		const content = '# Title\n- [ ] My task\nMore text';
		const result = toggleTaskInContent(content, 2);
		expect(result).toBe('# Title\n- [x] My task\nMore text');
	});

	it('toggles checked to unchecked', () => {
		const content = '- [x] Done task';
		const result = toggleTaskInContent(content, 1);
		expect(result).toBe('- [ ] Done task');
	});

	it('toggles uppercase X to unchecked', () => {
		const content = '- [X] Done task';
		const result = toggleTaskInContent(content, 1);
		expect(result).toBe('- [ ] Done task');
	});

	it('returns unchanged content for invalid line number', () => {
		const content = '- [ ] Task';
		expect(toggleTaskInContent(content, 0)).toBe(content);
		expect(toggleTaskInContent(content, 5)).toBe(content);
	});

	it('preserves indentation when toggling', () => {
		const content = '  - [ ] Indented task';
		const result = toggleTaskInContent(content, 1);
		expect(result).toBe('  - [x] Indented task');
	});

	it('toggles in-progress [/] to unchecked', () => {
		const content = '- [/] In progress task';
		const result = toggleTaskInContent(content, 1);
		expect(result).toBe('- [ ] In progress task');
	});

	it('toggles cancelled [-] to unchecked', () => {
		const content = '- [-] Cancelled task';
		const result = toggleTaskInContent(content, 1);
		expect(result).toBe('- [ ] Cancelled task');
	});

	it('toggles question [?] to unchecked', () => {
		const content = '- [?] Maybe task';
		const result = toggleTaskInContent(content, 1);
		expect(result).toBe('- [ ] Maybe task');
	});

	it('toggles forwarded [>] to unchecked', () => {
		const content = '- [>] Forwarded task';
		const result = toggleTaskInContent(content, 1);
		expect(result).toBe('- [ ] Forwarded task');
	});

	it('toggles important [!] to unchecked', () => {
		const content = '- [!] Important task';
		const result = toggleTaskInContent(content, 1);
		expect(result).toBe('- [ ] Important task');
	});
});
