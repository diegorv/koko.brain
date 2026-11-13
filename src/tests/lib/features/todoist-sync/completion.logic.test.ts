import { describe, it, expect } from 'vitest';
import type { TodoistTaskLink } from '#lib/contracts/index.js';
import {
	applyLineChange,
	parsePending,
	planAck,
	planCompletion,
	terminalLink,
	type CompletionInput,
	type LineChange,
} from '#lib/features/todoist-sync/completion.logic.js';
import type { LocalBase, PullDue, PullItem, RemoteBase, ScannedLine } from '#lib/features/todoist-sync/pull.logic.js';

const WEEKLY: PullDue = { date: '2026-11-13', string: 'every week', isRecurring: true, lang: 'en' };

function item(extra: Partial<PullItem> = {}): PullItem {
	return {
		id: 'a',
		projectId: 'work',
		sectionId: null,
		parentId: null,
		content: 'A',
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

function remoteBase(extra: Partial<RemoteBase> = {}): RemoteBase {
	return {
		content: 'A',
		projectId: 'work',
		sectionId: null,
		parentId: null,
		checked: false,
		priority: 1,
		due: null,
		labels: [],
		unmappedLabels: [],
		contentProblem: null,
		...extra,
	};
}

function localBase(extra: Partial<LocalBase> = {}): LocalBase {
	return { description: 'A', status: ' ', dueDate: null, priority: null, tags: [], ...extra };
}

function link(extra: { local?: LocalBase | null; remote?: RemoteBase; pendingCmd?: string | null; frozen?: boolean } = {}): TodoistTaskLink {
	const local = extra.local === undefined ? localBase() : extra.local;
	return {
		anchor: 'td-a',
		todoistId: 'a',
		noteRelPath: 'Todoist/Work.md',
		localBase: local === null ? null : JSON.stringify(local),
		remoteBase: JSON.stringify(extra.remote ?? remoteBase()),
		pendingUuid: null,
		pendingCmd: extra.pendingCmd ?? null,
		missCount: 0,
		frozen: extra.frozen ?? false,
	};
}

function line(status: string, extra: Partial<ScannedLine> = {}): ScannedLine {
	return {
		relPath: 'Todoist/Work.md',
		lineNumber: 4,
		line: 'A 🆔 td-a',
		status,
		fields: { description: 'A', dueDate: null, priority: null, tags: [] },
		indent: 0,
		recurrence: null,
		...extra,
	};
}

function input(l: TodoistTaskLink, lines: ScannedLine[], items: PullItem[], extra: Partial<CompletionInput> = {}): CompletionInput {
	let n = 0;
	return {
		links: [l],
		occurrences: new Map([['td-a', lines]]),
		items: new Map(items.map((i) => [i.id, i])),
		incremental: true,
		treeIds: new Set(['work']),
		newUuid: () => `uuid-${++n}`,
		...extra,
	};
}

const local = (l: TodoistTaskLink) => JSON.parse(l.localBase!) as LocalBase;
const remote = (l: TodoistTaskLink) => JSON.parse(l.remoteBase!) as RemoteBase;

describe('planCompletion: brain changes', () => {
	it('queues item_close for a line checked in the brain, stores the uuid as pending, and leaves the bases', () => {
		const plan = planCompletion(input(link(), [line('x')], [item()]));

		expect(plan.commands).toEqual([{ anchor: 'td-a', todoistId: 'a', pending: { uuid: 'uuid-1', type: 'item_close' } }]);
		expect(plan.lineChanges).toEqual([]);
		expect(plan.links).toHaveLength(1);
		expect(parsePending(plan.links[0].pendingCmd)).toEqual({ uuid: 'uuid-1', type: 'item_close' });
		expect(local(plan.links[0]).status).toBe(' ');
		expect(remote(plan.links[0]).checked).toBe(false);
	});

	it('counts - as closed and [/] [?] [!] [>] as open', () => {
		expect(planCompletion(input(link(), [line('-')], [item()])).commands).toHaveLength(1);
		for (const c of ['/', '?', '!', '>']) {
			expect(planCompletion(input(link(), [line(c)], [item()])).commands).toEqual([]);
		}
	});

	it('queues item_uncomplete for a line unchecked in the brain', () => {
		const plan = planCompletion(input(link({ local: localBase({ status: 'x' }), remote: remoteBase({ checked: true }) }), [line(' ')], [item({ checked: true })]));

		expect(plan.commands).toEqual([expect.objectContaining({ pending: { uuid: 'uuid-1', type: 'item_uncomplete' } })]);
	});

	it('reuses the pending uuid for the same command, and replaces it for another', () => {
		const pendingClose = JSON.stringify({ uuid: 'old', type: 'item_close' });
		expect(planCompletion(input(link({ pendingCmd: pendingClose }), [line('x')], [item()])).commands[0].pending.uuid).toBe('old');

		const pendingReopen = JSON.stringify({ uuid: 'old', type: 'item_uncomplete' });
		expect(planCompletion(input(link({ pendingCmd: pendingReopen }), [line('x')], [item()])).commands[0].pending.uuid).toBe('uuid-1');
	});

	it('drops a close when the remote due moved since the base: the line takes Todoist state and date, logged', () => {
		const l = link({ local: localBase({ dueDate: '2026-11-13' }), remote: remoteBase({ due: WEEKLY }), pendingCmd: JSON.stringify({ uuid: 'u', type: 'item_close' }) });
		const rolled = { ...WEEKLY, date: '2026-11-20' };

		const plan = planCompletion(input(l, [line('x')], [item({ due: rolled })]));

		expect(plan.commands).toEqual([]);
		expect(plan.lineChanges).toEqual([expect.objectContaining({ anchor: 'td-a', status: 'open', dueDate: '2026-11-20' })]);
		expect(plan.links[0].pendingCmd).toBeNull();
		expect(local(plan.links[0])).toMatchObject({ status: ' ', dueDate: '2026-11-20' });
		expect(remote(plan.links[0]).due).toMatchObject({ date: '2026-11-20' });
		expect(plan.log).toEqual([expect.objectContaining({ kind: 'close-dropped', anchor: 'td-a' })]);
	});

	it('still closes a non-recurring task whose due Todoist moved', () => {
		const once: PullDue = { date: '2026-11-13', string: 'Nov 13', isRecurring: false };
		const l = link({ local: localBase({ dueDate: '2026-11-13' }), remote: remoteBase({ due: once }) });

		const plan = planCompletion(input(l, [line('x')], [item({ due: { ...once, date: '2026-11-20' } })]));

		expect(plan.commands).toEqual([expect.objectContaining({ pending: expect.objectContaining({ type: 'item_close' }) })]);
		expect(plan.lineChanges).toEqual([]);
		expect(plan.log).toEqual([]);
	});

	it('logs a pending command cleared because the line no longer wants it', () => {
		const plan = planCompletion(input(link({ pendingCmd: JSON.stringify({ uuid: 'u', type: 'item_close' }) }), [line(' ')], [item()]));

		expect(plan.commands).toEqual([]);
		expect(plan.links[0].pendingCmd).toBeNull();
		expect(plan.log).toEqual([expect.objectContaining({ kind: 'pending-dropped', anchor: 'td-a', message: expect.stringContaining('item_close') })]);
	});
});

describe('planCompletion: Todoist changes', () => {
	it('checks the line for a task completed in Todoist and moves both bases', () => {
		const plan = planCompletion(input(link(), [line(' ')], [item({ checked: true })]));

		expect(plan.commands).toEqual([]);
		expect(plan.lineChanges).toEqual([expect.objectContaining({ status: 'closed' })]);
		expect(local(plan.links[0]).status).toBe('x');
		expect(remote(plan.links[0]).checked).toBe(true);
	});

	it('unchecks the line for a task reopened in Todoist, keeping the base char choice of rule 5', () => {
		const plan = planCompletion(input(link({ local: localBase({ status: '-' }), remote: remoteBase({ checked: true }) }), [line('-')], [item()]));

		expect(plan.lineChanges).toEqual([expect.objectContaining({ status: 'open' })]);
		expect(local(plan.links[0]).status).toBe(' ');
	});

	it('writes the new 📅 of a recurring task Todoist rolled forward, leaving the line open', () => {
		const l = link({ local: localBase({ dueDate: '2026-11-13' }), remote: remoteBase({ due: WEEKLY }) });

		const plan = planCompletion(input(l, [line(' ')], [item({ due: { ...WEEKLY, date: '2026-11-20' } })]));

		expect(plan.lineChanges).toEqual([{ anchor: 'td-a', relPath: 'Todoist/Work.md', expected: line(' '), status: null, dueDate: '2026-11-20' }]);
		expect(local(plan.links[0]).dueDate).toBe('2026-11-20');
		expect(remote(plan.links[0]).due).toMatchObject({ date: '2026-11-20', string: 'every week' });
	});

	it('leaves a non-recurring due change to the field sync', () => {
		const plan = planCompletion(input(link(), [line(' ')], [item({ due: { date: '2026-12-01', string: 'Dec 1', isRecurring: false } })]));

		expect(plan).toEqual({ lineChanges: [], links: [], commands: [], log: [] });
	});

	it('treats an item missing from an incremental pull as unchanged', () => {
		const closed = link({ local: localBase({ status: 'x' }), remote: remoteBase({ checked: true }) });

		const plan = planCompletion(input(closed, [line(' ')], []));

		expect(plan.commands).toEqual([expect.objectContaining({ pending: expect.objectContaining({ type: 'item_uncomplete' }) })]);
	});

	it('skips a link whose item is missing without a stored token', () => {
		const plan = planCompletion(input(link(), [line('x')], [], { incremental: false }));
		expect(plan).toEqual({ lineChanges: [], links: [], commands: [], log: [] });
	});
});

describe('planCompletion: both sides', () => {
	it('only moves the bases when both sides closed the task', () => {
		const plan = planCompletion(input(link({ pendingCmd: JSON.stringify({ uuid: 'u', type: 'item_close' }) }), [line('x')], [item({ checked: true })]));

		expect(plan.commands).toEqual([]);
		expect(plan.lineChanges).toEqual([]);
		expect(plan.links[0]).toMatchObject({ pendingCmd: null });
		expect(local(plan.links[0]).status).toBe('x');
		expect(remote(plan.links[0]).checked).toBe(true);
		expect(plan.log).toEqual([]);
	});

	it('lets Todoist win when the sides disagree and logs the brain value', () => {
		// Bases out of step: brain reopened from closed, Todoist closed from open.
		const l = link({ local: localBase({ status: 'x' }), remote: remoteBase({ checked: false }) });

		const plan = planCompletion(input(l, [line(' ')], [item({ checked: true })]));

		expect(plan.commands).toEqual([]);
		expect(plan.lineChanges).toEqual([expect.objectContaining({ status: 'closed' })]);
		expect(plan.log).toEqual([expect.objectContaining({ kind: 'conflict', message: expect.stringContaining('Brain value: open') })]);
	});
});

describe('planCompletion: guards', () => {
	it('does nothing for a duplicated anchor, a missing line, a deleted item or an item outside the tree', () => {
		expect(planCompletion(input(link(), [line('x'), line('x', { relPath: 'Notes/Copy.md' })], [item()])).commands).toEqual([]);
		expect(planCompletion(input(link(), [], [item()])).commands).toEqual([]);
		expect(planCompletion(input(link(), [line('x')], [item({ isDeleted: true })])).commands).toEqual([]);
		expect(planCompletion(input(link(), [line('x')], [item({ projectId: 'personal' })])).commands).toEqual([]);
	});

	it('fills a null local base from the line and pushes nothing that cycle', () => {
		const plan = planCompletion(input(link({ local: null }), [line('x')], [item()]));

		expect(plan.commands).toEqual([]);
		expect(local(plan.links[0])).toEqual({ description: 'A', status: 'x', dueDate: null, priority: null, tags: [] });
	});

	it('still writes a Todoist change into a link with a null local base', () => {
		const plan = planCompletion(input(link({ local: null }), [line(' ')], [item({ checked: true })]));

		expect(plan.lineChanges).toEqual([expect.objectContaining({ status: 'closed' })]);
		expect(local(plan.links[0]).status).toBe('x');
	});

	it('leaves a null local base alone when the line has no parsed fields', () => {
		const plan = planCompletion(input(link({ local: null }), [line('x', { fields: null })], [item()]));
		expect(plan).toEqual({ lineChanges: [], links: [], commands: [], log: [] });
	});

	it('stores nothing when nothing changed', () => {
		expect(planCompletion(input(link(), [line(' ')], [item()]))).toEqual({ lineChanges: [], links: [], commands: [], log: [] });
	});
});

describe('planAck', () => {
	const pending = JSON.stringify({ uuid: 'u', type: 'item_close' });

	it('moves the bases of a closed task and clears pending', () => {
		const ack = planAck(link({ pendingCmd: pending }), line('x'), item({ checked: true }));

		expect(ack.lineChange).toMatchObject({ status: 'closed' });
		expect(ack.link.pendingCmd).toBeNull();
		expect(local(ack.link).status).toBe('x');
		expect(remote(ack.link).checked).toBe(true);
		expect(ack.log).toEqual([]);
	});

	it('reopens the line with the new 📅 when a close rolled a recurring task forward', () => {
		const l = link({ local: localBase({ dueDate: '2026-11-13' }), remote: remoteBase({ due: WEEKLY }), pendingCmd: pending });

		const ack = planAck(l, line('x'), item({ due: { ...WEEKLY, date: '2026-11-20' } }));

		expect(ack.lineChange).toMatchObject({ status: 'open', dueDate: '2026-11-20' });
		expect(local(ack.link)).toMatchObject({ status: ' ', dueDate: '2026-11-20' });
		expect(remote(ack.link)).toMatchObject({ checked: false, due: { date: '2026-11-20' } });
		expect(ack.staleLink).toEqual({ ...l, pendingCmd: null });
	});

	it('logs a recurring task that the close completed for good', () => {
		const l = link({ remote: remoteBase({ due: { ...WEEKLY, string: 'every week starting 16 Nov 2026' } }), pendingCmd: pending });

		const ack = planAck(l, line('x'), item({ checked: true, due: null }));

		expect(ack.log).toEqual([expect.objectContaining({ kind: 'recurring-completed', anchor: 'td-a' })]);
		expect(ack.lineChange).toMatchObject({ status: 'closed' });
		expect(ack.lineChange).not.toHaveProperty('dueDate');
	});

	it('leaves the remote due base alone when no 📅 is written', () => {
		const old = { date: '2026-11-13', string: 'Nov 13', isRecurring: false };
		const l = link({ remote: remoteBase({ due: old }), pendingCmd: pending });

		const ack = planAck(l, line('x'), item({ checked: true, due: { ...old, date: '2026-12-01', string: 'Dec 1' } }));

		expect(ack.lineChange).not.toHaveProperty('dueDate');
		expect(remote(ack.link)).toMatchObject({ checked: true, due: old });
	});

	it('only clears pending without the item', () => {
		const l = link({ pendingCmd: pending });
		const ack = planAck(l, line('x'), undefined);

		expect(ack.lineChange).toBeNull();
		expect(ack.link).toEqual({ ...l, pendingCmd: null });
	});
});

describe('terminalLink', () => {
	it('clears pending and takes the line status as the local base', () => {
		const out = terminalLink(link({ pendingCmd: JSON.stringify({ uuid: 'u', type: 'item_close' }) }), line('x'));

		expect(out.pendingCmd).toBeNull();
		expect(local(out).status).toBe('x');
	});
});

describe('applyLineChange', () => {
	const change = (extra: Partial<LineChange> = {}): LineChange => ({ anchor: 'td-a', relPath: 'Todoist/Work.md', expected: line('x'), status: 'open', ...extra });

	it('patches the status and the 📅 and keeps the rest of the line', () => {
		expect(applyLineChange('\t- [x] A 🆔 td-a', change())).toBe('\t- [ ] A 🆔 td-a');
		expect(
			applyLineChange('- [x] A 📅 2026-11-13 🔁 every week 🆔 td-a', change({ expected: line('x', { line: 'A 📅 2026-11-13 🔁 every week 🆔 td-a' }), dueDate: '2026-11-20' })),
		).toBe('- [ ] A 📅 2026-11-20 🔁 every week 🆔 td-a');
	});

	it('removes the 📅 for a null date', () => {
		expect(applyLineChange('- [x] A 📅 2026-11-13 🆔 td-a', change({ expected: line('x', { line: 'A 📅 2026-11-13 🆔 td-a' }), dueDate: null }))).toBe('- [ ] A 🆔 td-a');
	});

	it('patches the description, priority and tags, each as one token', () => {
		const raw = '- [x] #todoist A 🔺 #old 🆔 td-a';
		const expected = line('x', { line: '#todoist A 🔺 #old 🆔 td-a' });

		expect(applyLineChange(raw, change({ expected, status: null, description: 'A and B', priority: '⏫', removeTags: ['OLD'], addTags: ['new'] }))).toBe(
			'- [x] #todoist A and B ⏫ #new 🆔 td-a',
		);
		expect(applyLineChange(raw, change({ expected, status: null, priority: null }))).toBe('- [x] #todoist A #old 🆔 td-a');
	});

	it('refuses a description that no longer fits the line', () => {
		const raw = '- [x] A #mid B 🆔 td-a';
		expect(applyLineChange(raw, change({ expected: line('x', { line: 'A #mid B 🆔 td-a' }), status: null, description: 'C' }))).toBeNull();
	});

	it('accepts X for a line scanned as x, and refuses a line edited since the scan', () => {
		expect(applyLineChange('- [X] A 🆔 td-a', change())).toBe('- [ ] A 🆔 td-a');
		expect(applyLineChange('- [ ] A 🆔 td-a', change())).toBeNull();
		expect(applyLineChange('- [x] A edited 🆔 td-a', change())).toBeNull();
		expect(applyLineChange('not a task 🆔 td-a', change())).toBeNull();
	});
});

describe('parsePending', () => {
	it('reads a stored command and refuses anything else', () => {
		expect(parsePending(JSON.stringify({ uuid: 'u', type: 'item_close' }))).toEqual({ uuid: 'u', type: 'item_close' });
		expect(parsePending(null)).toBeNull();
		expect(parsePending('nope')).toBeNull();
		expect(parsePending(JSON.stringify({ uuid: 'u', type: 'item_complete' }))).toBeNull();
	});
});
