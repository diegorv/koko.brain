import { describe, it, expect } from 'vitest';
import {
	parseTaskTextSegments,
	parseSectionTags,
	compareTaskPaths,
	parseTasksView,
	withSectionTag,
	noteFolder,
	noteTaskCounts,
	stripTaskTrailers,
	usesRawTaskText,
	taskDisplayText,
	taskChips,
} from '#lib/features/tasks/tasks.logic.js';
import { TASK_STATUSES } from '#lib/features/tasks/task-status.logic.js';
import type { TaskItem } from '#lib/features/tasks/tasks.types.js';
import { taskV2 } from '../../../fixtures/tasks.fixture';

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

describe('noteFolder', () => {
	it('gives the vault-relative folder of a nested note', () => {
		expect(noteFolder('/vault', '/vault/Projects/Clients/ACME.md')).toBe('Projects/Clients');
	});

	it('gives an empty string for a note at the vault root', () => {
		expect(noteFolder('/vault', '/vault/Root.md')).toBe('');
	});

	it('gives an empty string for a path outside the vault', () => {
		expect(noteFolder('/vault', '/elsewhere/x.md')).toBe('');
	});

	it('gives an empty string when no vault is open', () => {
		expect(noteFolder(null, '/vault/Projects/x.md')).toBe('');
	});

	it('gives an empty string for a sibling folder sharing the vault prefix', () => {
		expect(noteFolder('/vault', '/vault2/x.md')).toBe('');
	});
});

describe('noteTaskCounts', () => {
	it('counts the open statuses and every task', () => {
		const tasks = TASK_STATUSES.map((status, i) => taskV2(status, { status, lineNumber: i + 1 }));
		expect(noteTaskCounts(tasks)).toEqual({ open: 5, total: 7 });
	});

	it('gives zero counts for no tasks', () => {
		expect(noteTaskCounts([])).toEqual({ open: 0, total: 0 });
	});
});

describe('taskChips', () => {
	const TODAY = '2026-11-05';
	const open = { tags: true, open: true };

	it('marks a due date before today overdue on an open task', () => {
		expect(taskChips({ description: 'Pay', dueDate: '2026-11-03', tags: [] }, TODAY, open)).toEqual([
			{ kind: 'due', label: 'Nov 3', title: 'Overdue, due 2026-11-03', overdue: true },
		]);
	});

	it('does not mark a due date today or later overdue', () => {
		expect(taskChips({ description: 'Pay', dueDate: '2026-11-05', tags: [] }, TODAY, open)).toEqual([
			{ kind: 'due', label: 'Nov 5', title: 'Due 2026-11-05' },
		]);
		expect(taskChips({ description: 'Pay', dueDate: '2026-11-06', tags: [] }, TODAY, open)).toEqual([
			{ kind: 'due', label: 'Nov 6', title: 'Due 2026-11-06' },
		]);
	});

	it('puts the year in a due label when it differs from today', () => {
		expect(taskChips({ description: 'Pay', dueDate: '2027-01-15', tags: [] }, TODAY, open)).toEqual([
			{ kind: 'due', label: 'Jan 15, 2027', title: 'Due 2027-01-15' },
		]);
	});

	it('does not mark a closed task overdue', () => {
		expect(taskChips({ description: 'Pay', dueDate: '2026-11-03', tags: [] }, TODAY, { tags: true, open: false })).toEqual([
			{ kind: 'due', label: 'Nov 3', title: 'Due 2026-11-03' },
		]);
	});

	it('labels scheduled and start dates, with the year rule', () => {
		expect(
			taskChips({ description: 'Pay', scheduledDate: '2026-11-03', startDate: '2025-12-01', tags: [] }, TODAY, open),
		).toEqual([
			{ kind: 'scheduled', label: 'Scheduled Nov 3' },
			{ kind: 'start', label: 'Starts Dec 1, 2025' },
		]);
	});

	it('words each priority level and shows none for none', () => {
		for (const level of ['highest', 'high', 'medium', 'low', 'lowest'] as const) {
			expect(taskChips({ description: 'Pay', priority: level, tags: [] }, TODAY, open)).toEqual([
				{ kind: 'priority', label: level },
			]);
		}
		expect(taskChips({ description: 'Pay', priority: 'none', tags: [] }, TODAY, open)).toEqual([]);
	});

	it('drops a block id the recurrence text swallowed', () => {
		expect(taskChips({ description: 'Pay', recurrence: { text: 'every week ^abc123' }, tags: [] }, TODAY, open)).toEqual([
			{ kind: 'recurrence', label: 'every week' },
		]);
	});

	it('gives one chip per tag, after every other chip, and none when tags is false', () => {
		const metadata = {
			description: 'Pay',
			dueDate: '2026-11-03',
			scheduledDate: '2026-11-04',
			startDate: '2026-11-01',
			priority: 'high' as const,
			recurrence: { text: 'every week' },
			tags: ['work', 'home'],
		};
		expect(taskChips(metadata, TODAY, open).map((c) => [c.kind, c.label])).toEqual([
			['due', 'Nov 3'],
			['scheduled', 'Scheduled Nov 4'],
			['start', 'Starts Nov 1'],
			['priority', 'high'],
			['recurrence', 'every week'],
			['tag', '#work'],
			['tag', '#home'],
		]);
		expect(taskChips(metadata, TODAY, { tags: false, open: true }).some((c) => c.kind === 'tag')).toBe(false);
	});

	it('returns no chip for a task with only a description', () => {
		expect(taskChips({ description: 'Pay', tags: [] }, TODAY, open)).toEqual([]);
	});
});

describe('stripTaskTrailers', () => {
	it('removes a trailing block id, then a Todoist anchor', () => {
		expect(stripTaskTrailers('Call Ana 🆔 td-123 ^abc')).toBe('Call Ana');
		expect(stripTaskTrailers('Call Ana ^abc')).toBe('Call Ana');
		expect(stripTaskTrailers('Call Ana 🆔td-123')).toBe('Call Ana');
		expect(stripTaskTrailers('^abc')).toBe('');
	});

	it('removes a trailing carriage return before the block id', () => {
		expect(stripTaskTrailers('Call Ana ^abc\r')).toBe('Call Ana');
	});

	it('leaves a caret inside a word and a non-Todoist id alone', () => {
		expect(stripTaskTrailers('a^b')).toBe('a^b');
		expect(stripTaskTrailers('Call Ana 🆔 42')).toBe('Call Ana 🆔 42');
	});
});

describe('taskDisplayText and usesRawTaskText', () => {
	/** A row as `parse_task_metadata` describes `text` (traced from parsing.rs). */
	const row = (text: string, description: string, tags: string[] = []): Pick<TaskItem, 'text' | 'metadata'> => ({
		text,
		metadata: { description, tags },
	});

	const cases: [string, Pick<TaskItem, 'text' | 'metadata'>, boolean, string][] = [
		['a block id after a date', row('Send invoice 📅 2026-11-03 ^abc123', 'Send invoice ^abc123'), false, 'Send invoice'],
		[
			'date, priority and tag',
			{
				text: 'Send invoice 📅 2026-11-03 ⏫ #work',
				metadata: { description: 'Send invoice', dueDate: '2026-11-03', priority: 'high', tags: ['work'] },
			},
			false,
			'Send invoice',
		],
		[
			'a Todoist anchor Rust already removed',
			{ text: 'Call Ana 🆔 td-123 ^abc123', metadata: { description: 'Call Ana ^abc123', id: 'td-123', tags: [] } },
			false,
			'Call Ana',
		],
		['C# beside a real tag', row('Fix C# bug #work', 'Fix C# bug', ['work']), false, 'Fix C# bug'],
		['a wikilink heading', row('read [[Book#Chapter 2]]', 'read [[Book 2]]', ['Chapter']), true, 'read [[Book#Chapter 2]]'],
		[
			'a markdown link anchor',
			row('see [doc](https://example.com/a#b)', 'see [doc](https://example.com/a)', ['b']),
			true,
			'see [doc](https://example.com/a#b)',
		],
		['a bare URL anchor', row('https://example.com/a#b', 'https://example.com/a', ['b']), true, 'https://example.com/a#b'],
		['a relative link anchor', row('see [doc](notes/a.md#sec)', 'see [doc](notes/a.md)', ['sec']), true, 'see [doc](notes/a.md#sec)'],
		['a tag-only task', row('#todo', '', ['todo']), true, '#todo'],
		['a tag-only task with a block id', row('#todo ^abc', '^abc', ['todo']), true, '#todo'],
		[
			'a wikilink heading with an anchor and block id',
			row('Call [[Ana#Phone]] 🆔 td-123 ^abc123', 'Call [[Ana]] ^abc123', ['Phone']),
			true,
			'Call [[Ana#Phone]]',
		],
		['a wikilink heading with an anchor', row('Call [[Ana#Phone]] 🆔 td-123', 'Call [[Ana]]', ['Phone']), true, 'Call [[Ana#Phone]]'],
		[
			'CRLF raw text',
			row('read [[Book#Chapter 2]] ^abc\r', 'read [[Book 2]] ^abc', ['Chapter']),
			true,
			'read [[Book#Chapter 2]]',
		],
	];

	for (const [name, task, raw, display] of cases) {
		it(`${raw ? 'raw text' : 'description'} for ${name}`, () => {
			expect(usesRawTaskText(task)).toBe(raw);
			expect(taskDisplayText(task)).toBe(display);
		});
	}
});
