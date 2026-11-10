import { describe, it, expect } from 'vitest';
import type { TodoistTaskLink } from '#lib/contracts/index.js';
import {
	excludedLabelSet,
	extractTaskLines,
	formatPullResult,
	kokobrainAnchor,
	normalizeSyncFolder,
	planPull,
	projectNoteBaseName,
	pulledTask,
	type PullInput,
	type PullItem,
	type ScannedLine,
} from '#lib/features/todoist-sync/pull.logic.js';
import type { ScopeProject } from '#lib/features/todoist-sync/sync-scope.logic.js';

function project(id: string, name: string, extra: Partial<ScopeProject> = {}): ScopeProject {
	return { id, name, parentId: null, childOrder: 1, isDeleted: false, isArchived: false, inboxProject: false, ...extra };
}

function item(id: string, projectId: string, content: string, extra: Partial<PullItem> = {}): PullItem {
	return {
		id,
		projectId,
		sectionId: null,
		parentId: null,
		content,
		description: '',
		labels: [],
		priority: 1,
		due: null,
		checked: false,
		isDeleted: false,
		childOrder: 1,
		...extra,
	};
}

function link(anchor: string, todoistId: string, extra: Partial<TodoistTaskLink> = {}): TodoistTaskLink {
	return {
		anchor,
		todoistId,
		noteRelPath: 'Todoist/Work.md',
		localBase: null,
		remoteBase: null,
		pendingUuid: null,
		pendingCmd: null,
		missCount: 0,
		frozen: false,
		...extra,
	};
}

function occurrences(lines: ScannedLine[]): Map<string, ScannedLine[]> {
	const map = new Map<string, ScannedLine[]>();
	for (const l of lines) {
		const anchor = /🆔 (td-\S+)/u.exec(l.line)?.[1];
		if (!anchor) continue;
		map.set(anchor, [...(map.get(anchor) ?? []), l]);
	}
	return map;
}

const EXCLUDED = excludedLabelSet('');

function input(extra: Partial<PullInput> = {}): PullInput {
	return {
		folder: 'Todoist',
		projects: [project('inbox', 'Inbox', { inboxProject: true }), project('work', 'Work'), project('ops', 'Ops', { parentId: 'work' })],
		items: [],
		rootId: 'work',
		includeInbox: false,
		links: [],
		occurrences: new Map(),
		notes: [],
		excludedLabels: EXCLUDED,
		...extra,
	};
}

describe('normalizeSyncFolder', () => {
	it('trims and drops trailing slashes', () => {
		expect(normalizeSyncFolder('  Todoist/  ')).toBe('Todoist');
		expect(normalizeSyncFolder('Areas/Todoist//')).toBe('Areas/Todoist');
	});

	it('falls back to Todoist for an empty value', () => {
		expect(normalizeSyncFolder('')).toBe('Todoist');
		expect(normalizeSyncFolder(' / ')).toBeNull();
	});

	it('refuses absolute paths', () => {
		for (const raw of ['/Users/me/Todoist', '\\share', '~/Todoist', 'C:\\Todoist', 'c:/x']) {
			expect(normalizeSyncFolder(raw)).toBeNull();
		}
	});

	it('refuses a .. segment but keeps dots inside a name', () => {
		expect(normalizeSyncFolder('../Todoist')).toBeNull();
		expect(normalizeSyncFolder('a/../b')).toBeNull();
		expect(normalizeSyncFolder('a\\..\\b')).toBeNull();
		expect(normalizeSyncFolder('Todo..ist')).toBe('Todo..ist');
	});

	it('drops . and empty segments', () => {
		expect(normalizeSyncFolder('./Todoist')).toBe('Todoist');
		expect(normalizeSyncFolder('Areas//./Todoist')).toBe('Areas/Todoist');
		expect(normalizeSyncFolder('.')).toBe('Todoist');
	});
});

describe('projectNoteBaseName', () => {
	it('replaces illegal filename characters', () => {
		expect(projectNoteBaseName('Work/Life: "Q4" <a|b>?*\\')).toBe('Work-Life- -Q4- -a-b----');
	});

	it('drops leading dots and surrounding spaces, collapses whitespace', () => {
		expect(projectNoteBaseName('  .hidden   project. ')).toBe('hidden project');
	});

	it('names an empty result Untitled', () => {
		expect(projectNoteBaseName(' .. ')).toBe('Untitled');
	});
});

describe('extractTaskLines', () => {
	it('returns the text of every task line outside code fences, 1-based', () => {
		const content = ['# Head', '- [ ] One 🆔 td-a', '```', '- [ ] Fenced', '```', '  1. [x] Two', 'plain'].join('\n');
		expect(extractTaskLines(content)).toEqual([
			{ lineNumber: 2, text: 'One 🆔 td-a' },
			{ lineNumber: 6, text: 'Two' },
		]);
	});

	it('returns nothing for empty content', () => {
		expect(extractTaskLines('')).toEqual([]);
	});
});

describe('kokobrainAnchor', () => {
	it('reads the kokobrain: line of a description', () => {
		expect(kokobrainAnchor('notes\nkokobrain:td-ab12cd34')).toBe('td-ab12cd34');
	});

	it('returns null without one', () => {
		expect(kokobrainAnchor('')).toBeNull();
		expect(kokobrainAnchor('kokobrain:td-')).toBeNull();
		expect(kokobrainAnchor('see kokobrain:td-x')).toBeNull();
	});
});

describe('pulledTask', () => {
	it('writes only the fields that exist', () => {
		expect(pulledTask(item('t1', 'work', 'Plan'), EXCLUDED).line).toBe('- [ ] Plan 🆔 td-t1');
	});

	it('writes priority, due date, recurrence, tags and anchor in order', () => {
		const out = pulledTask(
			item('t2', 'work', 'Pay rent', {
				priority: 4,
				labels: ['home', 'Work', 'two words', 'todoist', 'personal'],
				due: { date: '2026-12-01T09:00:00', string: 'every month', isRecurring: true, lang: 'en' },
			}),
			EXCLUDED,
		);

		expect(out.line).toBe('- [ ] Pay rent 🔺 📅 2026-12-01 🔁 every month #home 🆔 td-t2');
		expect(out.localBase).toEqual({ description: 'Pay rent', status: ' ', dueDate: '2026-12-01', priority: 'highest', tags: ['home'] });
		expect(out.remoteBase).toMatchObject({
			content: 'Pay rent',
			priority: 4,
			labels: ['home', 'Work', 'two words', 'todoist', 'personal'],
			unmappedLabels: ['Work', 'two words', 'todoist', 'personal'],
			due: { date: '2026-12-01T09:00:00', string: 'every month', isRecurring: true, lang: 'en' },
			contentProblem: null,
		});
	});

	it('maps Todoist priorities 3 and 2, and leaves a one-off due string out', () => {
		const high = pulledTask(item('a', 'work', 'A', { priority: 3, due: { date: '2026-11-10', string: 'tomorrow', isRecurring: false } }), EXCLUDED);
		expect(high.line).toBe('- [ ] A ⏫ 📅 2026-11-10 🆔 td-a');
		expect(pulledTask(item('b', 'work', 'B', { priority: 2 }), EXCLUDED).line).toBe('- [ ] B 🔼 🆔 td-b');
	});

	it('keeps the defaultLabel out of the tags, case-insensitively', () => {
		const out = pulledTask(item('c', 'work', 'C', { labels: ['Brain', 'next'] }), excludedLabelSet('brain'));
		expect(out.line).toBe('- [ ] C #next 🆔 td-c');
		expect(out.remoteBase.unmappedLabels).toEqual(['Brain']);
	});

	it('writes content that fails the round trip as-is and flags it', () => {
		const out = pulledTask(item('d', 'work', 'Fix #42 now'), EXCLUDED);
		expect(out.line).toBe('- [ ] Fix #42 now 🆔 td-d');
		expect(out.contentProblem).toBe('hash');
		expect(out.remoteBase.contentProblem).toBe('hash');
	});

	it('turns a newline into a space, since a line cannot hold one', () => {
		const out = pulledTask(item('e', 'work', 'One\ntwo'), EXCLUDED);
		expect(out.line).toBe('- [ ] One two 🆔 td-e');
		expect(out.contentProblem).toBe('newline');
	});
});

describe('formatPullResult', () => {
	it('lists what was written, singular or plural', () => {
		expect(formatPullResult({ mode: 'normal', notesCreated: 1, tasksInserted: 2, linksPaired: 0, linesUnmatched: 0 })).toBe(
			'Todoist sync done: 1 note created, 2 tasks added.',
		);
		expect(formatPullResult({ mode: 'normal', notesCreated: 0, tasksInserted: 1, linksPaired: 1, linesUnmatched: 0 })).toBe(
			'Todoist sync done: 1 task added, 1 link paired.',
		);
	});

	it('says nothing new when nothing was written', () => {
		expect(formatPullResult({ mode: 'normal', notesCreated: 0, tasksInserted: 0, linksPaired: 0, linesUnmatched: 0 })).toBe(
			'Todoist sync done: nothing new.',
		);
	});

	it('reports a rebuild by its paired links', () => {
		expect(formatPullResult({ mode: 'rebuild', notesCreated: 0, tasksInserted: 0, linksPaired: 1, linesUnmatched: 2 })).toBe(
			'Todoist sync rebuilt 1 link from the vault; nothing was created.',
		);
	});

	it('says why new tasks stay out when a rebuild paired nothing but left anchored lines unmatched', () => {
		expect(formatPullResult({ mode: 'rebuild', notesCreated: 0, tasksInserted: 0, linksPaired: 0, linesUnmatched: 2 })).toBe(
			'Todoist sync rebuilt 0 links from the vault; nothing was created. 2 anchored lines have no open Todoist task: ' +
				'new Todoist tasks come in only after a line pairs or those 🆔 anchors are removed.',
		);
	});
});

describe('planPull', () => {
	it('creates one note per tree project and inserts open tasks in child order', () => {
		const plan = planPull(
			input({
				items: [
					item('b', 'work', 'Second', { childOrder: 2 }),
					item('a', 'work', 'First', { childOrder: 1 }),
					item('c', 'ops', 'Ops task'),
					item('x', 'inbox', 'Not in tree'),
					item('d', 'work', 'Done', { checked: true }),
				],
			}),
		);

		expect(plan.mode).toBe('normal');
		expect(plan.createNotes).toEqual([
			{ projectId: 'work', relPath: 'Todoist/Work.md', content: '---\ntodoist_project: work\n---\n' },
			{ projectId: 'ops', relPath: 'Todoist/Ops.md', content: '---\ntodoist_project: ops\n---\n' },
		]);
		expect(plan.inserts.map((i) => [i.relPath, i.lines])).toEqual([
			['Todoist/Work.md', ['- [ ] First 🆔 td-a', '- [ ] Second 🆔 td-b']],
			['Todoist/Ops.md', ['- [ ] Ops task 🆔 td-c']],
		]);
		expect(plan.inserts[0].links.map((l) => [l.anchor, l.todoistId, l.noteRelPath])).toEqual([
			['td-a', 'a', 'Todoist/Work.md'],
			['td-b', 'b', 'Todoist/Work.md'],
		]);
		expect(JSON.parse(plan.inserts[0].links[0].localBase!)).toMatchObject({ description: 'First' });
	});

	it('writes each subtask after its parent, since childOrder counts among siblings', () => {
		const plan = planPull(
			input({
				items: [
					item('b', 'work', 'Second', { childOrder: 2 }),
					item('s2', 'work', 'Sub two', { parentId: 'a', childOrder: 1 }),
					item('a', 'work', 'First', { childOrder: 1 }),
					item('s1', 'work', 'Sub one', { parentId: 'a', childOrder: 0 }),
				],
			}),
		);

		expect(plan.inserts[0].lines).toEqual([
			'- [ ] First 🆔 td-a',
			'- [ ] Sub one 🆔 td-s1',
			'- [ ] Sub two 🆔 td-s2',
			'- [ ] Second 🆔 td-b',
		]);
	});

	it('names the Inbox Inbox.md and suffixes a colliding name', () => {
		const plan = planPull(
			input({
				includeInbox: true,
				projects: [
					project('work', 'Work'),
					project('dup', 'Inbox', { parentId: 'work' }),
					project('other', 'Ops', { parentId: 'work', childOrder: 2 }),
					project('in', 'My Inbox', { inboxProject: true }),
				],
				notes: [{ relPath: 'Todoist/ops.md', projectId: null }],
			}),
		);

		expect(plan.createNotes.map((n) => n.relPath)).toEqual(['Todoist/Inbox.md', 'Todoist/Work.md', 'Todoist/Inbox 2.md', 'Todoist/Ops 2.md']);
	});

	it('finds a project note by its frontmatter id, wherever it is and however it is named', () => {
		const plan = planPull(
			input({
				items: [item('a', 'work', 'A')],
				notes: [
					{ relPath: 'Areas/Job.md', projectId: 'work' },
					{ relPath: 'Todoist/Ops.md', projectId: 'ops' },
				],
			}),
		);

		expect(plan.createNotes).toEqual([]);
		expect(plan.inserts.map((i) => i.relPath)).toEqual(['Areas/Job.md']);
	});

	it('writes nothing for a project with two notes and logs it', () => {
		const plan = planPull(
			input({
				items: [item('a', 'work', 'A')],
				notes: [
					{ relPath: 'Todoist/Work.md', projectId: 'work' },
					{ relPath: 'Todoist/Work 2.md', projectId: 'work' },
				],
			}),
		);

		expect(plan.inserts).toEqual([]);
		expect(plan.log).toContainEqual(expect.objectContaining({ kind: 'duplicate-project-note' }));
	});

	it('plans nothing on a re-run where every item is linked', () => {
		const plan = planPull(
			input({
				items: [item('a', 'work', 'A')],
				links: [link('td-a', 'a')],
				occurrences: occurrences([{ relPath: 'Todoist/Work.md', lineNumber: 4, line: 'A 🆔 td-a' }]),
				notes: [
					{ relPath: 'Todoist/Work.md', projectId: 'work' },
					{ relPath: 'Todoist/Ops.md', projectId: 'ops' },
				],
			}),
		);

		expect(plan).toEqual({ mode: 'normal', createNotes: [], inserts: [], pairedLinks: [], updatedLinks: [], linesUnmatched: 0, log: [] });
	});

	it('pairs an unlinked item with its anchored line instead of inserting it', () => {
		const plan = planPull(
			input({
				items: [item('a', 'work', 'A'), item('b', 'work', 'B')],
				links: [link('td-b', 'b')],
				occurrences: occurrences([
					{ relPath: 'Notes/Day.md', lineNumber: 2, line: 'A 🆔 td-a' },
					{ relPath: 'Todoist/Work.md', lineNumber: 4, line: 'B 🆔 td-b' },
				]),
				notes: [
					{ relPath: 'Todoist/Work.md', projectId: 'work' },
					{ relPath: 'Todoist/Ops.md', projectId: 'ops' },
				],
			}),
		);

		expect(plan.inserts).toEqual([]);
		expect(plan.pairedLinks).toEqual([
			expect.objectContaining({ anchor: 'td-a', todoistId: 'a', noteRelPath: 'Notes/Day.md', localBase: null, frozen: false }),
		]);
		expect(JSON.parse(plan.pairedLinks[0].remoteBase!)).toMatchObject({ content: 'A' });
	});

	it('freezes a link whose anchor occurs twice, logs it once, and unfreezes it later', () => {
		const twice = occurrences([
			{ relPath: 'Todoist/Work.md', lineNumber: 4, line: 'A 🆔 td-a' },
			{ relPath: 'Notes/Copy.md', lineNumber: 1, line: 'A 🆔 td-a' },
		]);
		const notes = [
			{ relPath: 'Todoist/Work.md', projectId: 'work' },
			{ relPath: 'Todoist/Ops.md', projectId: 'ops' },
		];
		const first = planPull(input({ items: [item('a', 'work', 'A')], links: [link('td-a', 'a')], occurrences: twice, notes }));
		expect(first.updatedLinks).toEqual([expect.objectContaining({ anchor: 'td-a', frozen: true })]);
		expect(first.log).toEqual([expect.objectContaining({ kind: 'frozen', anchor: 'td-a' })]);

		const again = planPull(input({ items: [item('a', 'work', 'A')], links: [link('td-a', 'a', { frozen: true })], occurrences: twice, notes }));
		expect(again.updatedLinks).toEqual([]);
		expect(again.log).toEqual([]);

		const once = occurrences([{ relPath: 'Todoist/Work.md', lineNumber: 4, line: 'A 🆔 td-a' }]);
		const thaw = planPull(input({ items: [item('a', 'work', 'A')], links: [link('td-a', 'a', { frozen: true })], occurrences: once, notes }));
		expect(thaw.updatedLinks).toEqual([expect.objectContaining({ anchor: 'td-a', frozen: false })]);
	});

	it('rebuilds an empty link table from anchored lines: pairs, creates nothing, logs the unmatched', () => {
		const plan = planPull(
			input({
				items: [item('a', 'work', 'A'), item('new', 'ops', 'New'), item('kb', 'work', 'Brain-born', { description: 'kokobrain:td-zz' })],
				occurrences: occurrences([
					{ relPath: 'Todoist/Work.md', lineNumber: 4, line: 'A 🆔 td-a' },
					{ relPath: 'Notes/Day.md', lineNumber: 2, line: 'Brain-born 🆔 td-zz' },
					{ relPath: 'Notes/Day.md', lineNumber: 3, line: 'Orphan 🆔 td-gone' },
				]),
				notes: [{ relPath: 'Todoist/Work.md', projectId: 'work' }],
			}),
		);

		expect(plan.mode).toBe('rebuild');
		expect(plan.createNotes).toEqual([]);
		expect(plan.inserts).toEqual([]);
		expect(plan.pairedLinks.map((l) => [l.anchor, l.todoistId])).toEqual([
			['td-a', 'a'],
			['td-zz', 'kb'],
		]);
		expect(plan.log.filter((e) => e.kind === 'unmatched').map((e) => e.anchor)).toEqual(['td-new', 'td-gone']);
		expect(plan.linesUnmatched).toBe(1);
	});

	it('enters rebuild mode for a kokobrain: item even with no anchored line', () => {
		const plan = planPull(input({ items: [item('kb', 'work', 'B', { description: 'kokobrain:td-zz' }), item('a', 'work', 'A')] }));

		expect(plan.mode).toBe('rebuild');
		expect(plan.createNotes).toEqual([]);
		expect(plan.inserts).toEqual([]);
	});

	it('never inserts a kokobrain: item whose line is missing in normal mode', () => {
		const plan = planPull(
			input({
				items: [item('kb', 'work', 'B', { description: 'kokobrain:td-zz' })],
				links: [link('td-a', 'a')],
				notes: [
					{ relPath: 'Todoist/Work.md', projectId: 'work' },
					{ relPath: 'Todoist/Ops.md', projectId: 'ops' },
				],
			}),
		);

		expect(plan.inserts).toEqual([]);
		expect(plan.log).toEqual([expect.objectContaining({ kind: 'unmatched', anchor: 'td-zz' })]);
	});

	it('logs content that fails the round trip', () => {
		const plan = planPull(input({ items: [item('a', 'work', 'Fix #1')] }));
		expect(plan.log).toEqual([expect.objectContaining({ kind: 'content-roundtrip', anchor: 'td-a' })]);
	});

	it('does not take over an anchor another link owns', () => {
		const plan = planPull(
			input({
				items: [item('a', 'work', 'A')],
				links: [link('td-a', 'other')],
				occurrences: occurrences([{ relPath: 'Todoist/Work.md', lineNumber: 4, line: 'A 🆔 td-a' }]),
				notes: [
					{ relPath: 'Todoist/Work.md', projectId: 'work' },
					{ relPath: 'Todoist/Ops.md', projectId: 'ops' },
				],
			}),
		);

		expect(plan.pairedLinks).toEqual([]);
		expect(plan.inserts).toEqual([]);
		expect(plan.log).toEqual([expect.objectContaining({ kind: 'anchor-conflict', anchor: 'td-a' })]);
	});
});
