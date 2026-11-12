import { describe, it, expect } from 'vitest';
import {
	filterByDate,
	filterCompleted,
	filterCompletedTasks,
	computeTaskStats,
	parseTaskTextSegments,
	describeTaskRule,
	explainEmptyTasks,
	parseSectionTags,
	compareTaskPaths,
	parseTasksView,
	withSectionTag,
} from '#lib/features/tasks/tasks.logic.js';
import type { TaskItem, FileTaskGroup } from '#lib/features/tasks/tasks.types.js';
import { sevenStatusGroup, taskGroupV2, taskV2 } from '../../../fixtures/tasks.fixture';

/** Helper to build a TaskItem with sensible defaults for status and metadata */
function makeTask(
	overrides: Partial<TaskItem> & Pick<TaskItem, 'text' | 'checked' | 'indent' | 'lineNumber'>,
): TaskItem {
	return {
		status: overrides.checked ? 'done' : 'todo',
		metadata: { description: overrides.text, tags: [] },
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


describe('parseTaskTextSegments', () => {
	it('returns plain text as a single text segment', () => {
		expect(parseTaskTextSegments('Reply to email')).toEqual([{ type: 'text', value: 'Reply to email' }]);
	});

	it('returns an empty array for empty input', () => {
		expect(parseTaskTextSegments('')).toEqual([]);
	});

	it('parses wikilinks with alias and heading', () => {
		expect(parseTaskTextSegments('[[Dante]] and [[Notes#Plan|the plan]]')).toEqual([
			{ type: 'wikilink', target: 'Dante', display: 'Dante' },
			{ type: 'text', value: ' and ' },
			{ type: 'wikilink', target: 'Notes', heading: 'Plan', display: 'the plan' },
		]);
	});

	it('parses markdown links into label and url', () => {
		expect(
			parseTaskTextSegments('[[Dante]] · [CC Eng MBR](https://docs.google.com/x/edit?disco=A_b) — Thu Oct 15'),
		).toEqual([
			{ type: 'wikilink', target: 'Dante', display: 'Dante' },
			{ type: 'text', value: ' · ' },
			{ type: 'link', label: 'CC Eng MBR', url: 'https://docs.google.com/x/edit?disco=A_b' },
			{ type: 'text', value: ' — Thu Oct 15' },
		]);
	});

	it('keeps a link with an unsafe protocol as plain text', () => {
		expect(parseTaskTextSegments('[x](javascript:alert(1))')).toEqual([
			{ type: 'text', value: '[x](javascript:alert(1))' },
		]);
	});

	it('leaves an unclosed link as plain text', () => {
		expect(parseTaskTextSegments('see [label](https://a.com')).toEqual([
			{ type: 'text', value: 'see [label](https://a.com' },
		]);
	});
});

describe('parseSectionTags', () => {
	it.each([
		['#to-list #work', ['#to-list', '#work']],
		['#to-list,work', ['#to-list', '#work']],
		['  #a   ,  b ', ['#a', '#b']],
		['#a #a', ['#a']],
		['a #a', ['#a']],
		['#Work #work', ['#Work', '#work']],
		['#to-list #', ['#to-list']],
		['', []],
		['   ', []],
		[' , ,', []],
	] as const)('%j gives %j', (text, expected) => {
		expect(parseSectionTags(text)).toEqual(expected);
	});
});

describe('parseTasksView', () => {
	it.each([
		[undefined],
		[{}],
		[{ version: 1 }],
		[{ version: 1, sectionTag: '' }],
		[{ version: 1, sectionTag: ' , ' }],
		[{ version: 1, sectionTag: '#' }],
	])('%j is valid and gives #to-list', (raw) => {
		expect(parseTasksView(raw)).toEqual({ sectionTag: '#to-list', valid: true });
	});

	it('restores a saved string as typed, untrimmed', () => {
		expect(parseTasksView({ version: 1, sectionTag: ' #a, b ' })).toEqual({ sectionTag: ' #a, b ', valid: true });
	});

	it('does not check the version, so a newer build keeps the field', () => {
		expect(parseTasksView({ version: 2, sectionTag: '#work', more: true })).toEqual({ sectionTag: '#work', valid: true });
	});

	it.each([[42], [null], [[]], ['x'], [true], [{ sectionTag: 5 }], [{ sectionTag: null }], [{ sectionTag: ['#a'] }]])(
		'%j is invalid and gives #to-list',
		(raw) => {
			expect(parseTasksView(raw)).toEqual({ sectionTag: '#to-list', valid: false });
		},
	);
});

describe('withSectionTag', () => {
	it('writes version 1 and the text when nothing was saved', () => {
		expect(withSectionTag(undefined, '#work')).toEqual({ version: 1, sectionTag: '#work' });
	});

	it('keeps every other key and a numeric version', () => {
		const raw = { version: 2, sectionTag: '#a', extra: { x: 1 }, globalExcludes: ['b'] };

		expect(withSectionTag(raw, '#b')).toEqual({ version: 2, sectionTag: '#b', extra: { x: 1 }, globalExcludes: ['b'] });
		expect(raw.sectionTag).toBe('#a');
	});

	it('writes version 1 over a non-numeric version', () => {
		expect(withSectionTag({ version: '1', sectionTag: '#a' }, '#b')).toEqual({ version: 1, sectionTag: '#b' });
	});

	it('stores the text as typed, empty included', () => {
		expect(withSectionTag({ version: 1, sectionTag: '#a' }, '')).toEqual({ version: 1, sectionTag: '' });
		expect(withSectionTag(undefined, ' #a, b ')).toEqual({ version: 1, sectionTag: ' #a, b ' });
	});

	it.each([[42], [null], [[]], ['x']])('replaces a non-object %j wholesale', (raw) => {
		expect(withSectionTag(raw, '#work')).toEqual({ version: 1, sectionTag: '#work' });
	});
});

describe('compareTaskPaths', () => {
	const sorted = (paths: string[]) => [...paths].sort(compareTaskPaths);

	it('compares numbers in a path as numbers', () => {
		expect(sorted(['/vault/note 10.md', '/vault/note 9.md'])).toEqual(['/vault/note 9.md', '/vault/note 10.md']);
	});

	it('orders a folder path against a root note as the collator does, ignoring case', () => {
		// "Projects/Z.md" against "a.md": base sensitivity compares "p" with "a".
		expect(compareTaskPaths('/vault/Projects/Z.md', '/vault/a.md')).toBeGreaterThan(0);
		expect(compareTaskPaths('/vault/a.md', '/vault/Projects/Z.md')).toBeLessThan(0);
	});

	it('gives paths the collator calls equal a fixed order, whichever comes first', () => {
		expect(sorted(['/vault/a.md', '/vault/A.md'])).toEqual(sorted(['/vault/A.md', '/vault/a.md']));
		expect(sorted(['/vault/a.md', '/vault/A.md'])).toEqual(['/vault/A.md', '/vault/a.md']);
		expect(sorted(['/vault/résumé.md', '/vault/resume.md'])).toEqual(sorted(['/vault/resume.md', '/vault/résumé.md']));
		expect(compareTaskPaths('/vault/a.md', '/vault/a.md')).toBe(0);
	});
});

describe('describeTaskRule', () => {
	it.each([
		[true, '#to-list', 'all', 'Open tasks under headings containing #to-list'],
		[false, '#to-list', 'all', 'All tasks under headings containing #to-list'],
		[true, '', 'all', 'Open tasks from every note'],
		[false, '', 'all', 'All tasks from every note'],
		[true, '#to-list', 'last7days', 'Open tasks under headings containing #to-list, in notes edited in the last 7 days'],
		[false, '#to-list', 'last30days', 'All tasks under headings containing #to-list, in notes edited in the last 30 days'],
		[true, '', 'last30days', 'Open tasks from every note, in notes edited in the last 30 days'],
		[false, '', 'last7days', 'All tasks from every note, in notes edited in the last 7 days'],
	] as const)('hideCompleted=%s, tag=%j, date=%s gives %j', (hideCompleted, sectionTag, dateFilter, expected) => {
		expect(describeTaskRule({ sectionTag, hideCompleted, dateFilter })).toBe(expected);
	});

	it('adds the # to a tag typed without one', () => {
		expect(describeTaskRule({ sectionTag: 'work', hideCompleted: true, dateFilter: 'all' })).toBe(
			'Open tasks under headings containing #work',
		);
	});

	it('trims a tag with surrounding spaces', () => {
		expect(describeTaskRule({ sectionTag: '  #work  ', hideCompleted: true, dateFilter: 'all' })).toBe(
			'Open tasks under headings containing #work',
		);
	});

	it('treats a whitespace-only tag as no tag', () => {
		expect(describeTaskRule({ sectionTag: '   ', hideCompleted: true, dateFilter: 'all' })).toBe('Open tasks from every note');
	});

	it('joins several tags with or', () => {
		expect(describeTaskRule({ sectionTag: '#to-list #work', hideCompleted: true, dateFilter: 'all' })).toBe(
			'Open tasks under headings containing #to-list or #work',
		);
		expect(describeTaskRule({ sectionTag: 'a, b c', hideCompleted: false, dateFilter: 'all' })).toBe(
			'All tasks under headings containing #a or #b or #c',
		);
	});

	it('treats separators with no tag as no tag', () => {
		expect(describeTaskRule({ sectionTag: ' , ', hideCompleted: true, dateFilter: 'all' })).toBe('Open tasks from every note');
	});
});

describe('explainEmptyTasks', () => {
	/** A note holding the given tasks. */
	function note(tasks: TaskItem[], modifiedAt = 0): FileTaskGroup {
		return { filePath: '/vault/a.md', fileName: 'a', modifiedAt, tasks };
	}

	const open = (lineNumber: number) => makeTask({ text: `open ${lineNumber}`, checked: false, indent: 0, lineNumber });
	const done = (lineNumber: number) => makeTask({ text: `done ${lineNumber}`, checked: true, indent: 0, lineNumber });

	describe('stage 1: no task', () => {
		it('names the tag and offers to clear it', () => {
			expect(explainEmptyTasks({ groups: [], sectionTag: '#to-list', hideCompleted: false, dateFilter: 'all' })).toEqual({
				message: 'No task sits under a heading containing #to-list',
				action: { kind: 'clearTag', label: 'Clear tag' },
			});
		});

		it('displays the tag as the sentence does', () => {
			expect(explainEmptyTasks({ groups: [], sectionTag: ' work ', hideCompleted: false, dateFilter: 'all' }).message).toBe(
				'No task sits under a heading containing #work',
			);
		});

		it('says the vault has no tasks without a tag, with no action', () => {
			expect(explainEmptyTasks({ groups: [], sectionTag: '', hideCompleted: true, dateFilter: 'all' })).toEqual({
				message: 'No tasks in this vault yet',
			});
		});

		it('treats a whitespace-only tag as no tag', () => {
			expect(explainEmptyTasks({ groups: [], sectionTag: '  ', hideCompleted: true, dateFilter: 'all' })).toEqual({
				message: 'No tasks in this vault yet',
			});
		});

		it('names several tags joined with or, and offers to clear them', () => {
			expect(explainEmptyTasks({ groups: [], sectionTag: '#to-list #work', hideCompleted: false, dateFilter: 'all' })).toEqual({
				message: 'No task sits under a heading containing #to-list or #work',
				action: { kind: 'clearTag', label: 'Clear tag' },
			});
		});

		it('treats separators with no tag as no tag, with no action', () => {
			expect(explainEmptyTasks({ groups: [], sectionTag: ' , ', hideCompleted: true, dateFilter: 'all' })).toEqual({
				message: 'No tasks in this vault yet',
			});
		});

		it('counts a group that holds no task as no task', () => {
			expect(explainEmptyTasks({ groups: [note([])], sectionTag: '', hideCompleted: false, dateFilter: 'all' })).toEqual({
				message: 'No tasks in this vault yet',
			});
		});

		it('names the tag, not hide-completed, for an empty result with hide-completed on', () => {
			expect(explainEmptyTasks({ groups: [], sectionTag: '#to-list', hideCompleted: true, dateFilter: 'last7days' })).toEqual({
				message: 'No task sits under a heading containing #to-list',
				action: { kind: 'clearTag', label: 'Clear tag' },
			});
		});
	});

	describe('stage 2: every task closed', () => {
		it('counts the closed tasks', () => {
			expect(
				explainEmptyTasks({ groups: [note([done(1), done(2)]), note([done(3)])], sectionTag: '', hideCompleted: true, dateFilter: 'all' }),
			).toEqual({ message: 'All 3 tasks are closed', action: { kind: 'showCompleted', label: 'Show closed' } });
		});

		it('words a single task on its own', () => {
			expect(explainEmptyTasks({ groups: [note([done(1)])], sectionTag: '', hideCompleted: true, dateFilter: 'all' })).toEqual({
				message: 'The only task is closed',
				action: { kind: 'showCompleted', label: 'Show closed' },
			});
		});

		it('comes before the date filter when both would empty the list', () => {
			expect(
				explainEmptyTasks({ groups: [note([done(1)], 0)], sectionTag: '', hideCompleted: true, dateFilter: 'last7days' }),
			).toEqual({ message: 'The only task is closed', action: { kind: 'showCompleted', label: 'Show closed' } });
		});
	});

	describe('stage 3: the date filter', () => {
		it('names open tasks with hide-completed on, when the recent notes hold only checked tasks', () => {
			const groups = [note([done(1)], Date.now()), note([open(2)], 0)];
			expect(explainEmptyTasks({ groups, sectionTag: '', hideCompleted: true, dateFilter: 'last7days' })).toEqual({
				message: 'No open task is in a note edited in the last 7 days',
				action: { kind: 'allTime', label: 'All time' },
			});
		});

		it('uses the 30-day wording with hide-completed on', () => {
			expect(explainEmptyTasks({ groups: [note([open(1)])], sectionTag: '', hideCompleted: true, dateFilter: 'last30days' })).toEqual({
				message: 'No open task is in a note edited in the last 30 days',
				action: { kind: 'allTime', label: 'All time' },
			});
		});

		it('names notes with tasks with hide-completed off', () => {
			expect(explainEmptyTasks({ groups: [note([done(1)])], sectionTag: '', hideCompleted: false, dateFilter: 'last7days' })).toEqual({
				message: 'No note with tasks was edited in the last 7 days',
				action: { kind: 'allTime', label: 'All time' },
			});
		});

		it('uses the 30-day wording with hide-completed off', () => {
			expect(explainEmptyTasks({ groups: [note([open(1)])], sectionTag: '', hideCompleted: false, dateFilter: 'last30days' })).toEqual({
				message: 'No note with tasks was edited in the last 30 days',
				action: { kind: 'allTime', label: 'All time' },
			});
		});
	});

	it('falls back to "No tasks found" with no action when the date filter is all time', () => {
		expect(explainEmptyTasks({ groups: [note([open(1)])], sectionTag: '', hideCompleted: true, dateFilter: 'all' })).toEqual({
			message: 'No tasks found',
		});
	});
});

describe('the open rule: done and cancelled are closed, every other status is open', () => {
	const statuses = (groups: FileTaskGroup[]) => groups.flatMap((g) => g.tasks.map((t) => t.status));

	it('filterCompleted keeps the five open statuses and drops done and cancelled', () => {
		expect(statuses(filterCompleted([sevenStatusGroup()]))).toEqual(['todo', 'in-progress', 'question', 'important', 'forwarded']);
	});

	it('computeTaskStats counts done and cancelled as completed, the rest as pending', () => {
		expect(computeTaskStats([sevenStatusGroup()])).toEqual({ total: 7, completed: 2, pending: 5, fileCount: 1 });
	});

	it('keeps a done parent with an in-progress child, both sent checked', () => {
		const tasks = [
			taskV2('Parent', { status: 'done', checked: true, indent: 0, lineNumber: 1 }),
			taskV2('Child', { status: 'in-progress', checked: true, indent: 1, lineNumber: 2 }),
		];
		expect(filterCompletedTasks(tasks).map((t) => t.text)).toEqual(['Parent', 'Child']);
	});

	describe('explainEmptyTasks with hide-closed on', () => {
		const note = (...tasks: TaskItem[]) => taskGroupV2('/vault/a.md', tasks, 0);

		it('names the date stage when a [/] task sits in an old note', () => {
			const groups = [note(taskV2('Shipped', { status: 'done', lineNumber: 1 }), taskV2('Draft plan', { status: 'in-progress', lineNumber: 2 }))];
			expect(explainEmptyTasks({ groups, sectionTag: '', hideCompleted: true, dateFilter: 'last7days' })).toEqual({
				message: 'No open task is in a note edited in the last 7 days',
				action: { kind: 'allTime', label: 'All time' },
			});
		});

		it('says every task is closed for only [x] and [-] tasks', () => {
			const groups = [note(taskV2('Shipped', { status: 'done', lineNumber: 1 }), taskV2('Old idea', { status: 'cancelled', lineNumber: 2 }))];
			expect(explainEmptyTasks({ groups, sectionTag: '', hideCompleted: true, dateFilter: 'all' })).toEqual({
				message: 'All 2 tasks are closed',
				action: { kind: 'showCompleted', label: 'Show closed' },
			});
		});

		it('says the only task is closed for one [x] task', () => {
			const groups = [note(taskV2('Shipped', { status: 'done' }))];
			expect(explainEmptyTasks({ groups, sectionTag: '', hideCompleted: true, dateFilter: 'all' })).toEqual({
				message: 'The only task is closed',
				action: { kind: 'showCompleted', label: 'Show closed' },
			});
		});
	});
});
