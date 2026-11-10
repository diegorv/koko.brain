import { describe, it, expect } from 'vitest';
import type { TodoistTaskLink } from '#lib/contracts/index.js';
import {
	ackedLink,
	addAnchor,
	pairPendingAdds,
	parsePendingAdd,
	planCreates,
	syncOwnsTaskLine,
	type CreateInput,
	type PendingAdd,
} from '#lib/features/todoist-sync/create.logic.js';
import { excludedLabelSet, type PullItem, type ScannedLine, type ScannedNote } from '#lib/features/todoist-sync/pull.logic.js';

const EXCLUDED = excludedLabelSet('');

function line(text: string, extra: Partial<ScannedLine> = {}): ScannedLine {
	return {
		relPath: 'Todoist/Work.md',
		lineNumber: 4,
		line: text,
		status: ' ',
		fields: { description: text, dueDate: null, priority: null, tags: [] },
		indent: 0,
		recurrence: null,
		...extra,
	};
}

function fields(description: string, extra: Partial<NonNullable<ScannedLine['fields']>> = {}): ScannedLine['fields'] {
	return { description, dueDate: null, priority: null, tags: [], ...extra };
}

const WORK_NOTE: ScannedNote = { relPath: 'Todoist/Work.md', projectId: 'work' };

function input(lines: ScannedLine[], extra: Partial<CreateInput> = {}): CreateInput {
	let n = 0;
	let a = 0;
	return {
		lines,
		notes: [WORK_NOTE, { relPath: 'Todoist/Acme.md', projectId: 'acme' }, { relPath: 'Notes/Day.md', projectId: null }],
		links: [],
		treeIds: new Set(['work', 'acme']),
		rootId: 'work',
		pendingProjects: new Map(),
		excludedLabels: EXCLUDED,
		syncContext: 'work',
		occurrences: new Map(),
		takenAnchors: new Set(),
		newUuid: () => `uuid-${++n}`,
		newAnchor: () => `td-0000000${++a}`,
		...extra,
	};
}

function pendingLink(anchor: string, command: PendingAdd, extra: Partial<TodoistTaskLink> = {}): TodoistTaskLink {
	return {
		anchor,
		todoistId: null,
		noteRelPath: 'Todoist/Work.md',
		localBase: JSON.stringify({ description: command.args.content, status: ' ', dueDate: null, priority: null, tags: [] }),
		remoteBase: null,
		pendingUuid: command.uuid,
		pendingCmd: JSON.stringify(command),
		missCount: 0,
		frozen: false,
		...extra,
	};
}

function add(anchor: string, content: string, projectId = 'work'): PendingAdd {
	return {
		type: 'item_add',
		uuid: `u-${anchor}`,
		tempId: anchor,
		args: { content, description: `kokobrain:${anchor}`, projectId, priority: 1, labels: [], autoParseLabels: false },
	};
}

function item(id: string, extra: Partial<PullItem> = {}): PullItem {
	return {
		id,
		projectId: 'work',
		sectionId: null,
		parentId: null,
		content: id,
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

describe('planCreates: scope', () => {
	it('creates an open top-level line of a project note in that project, with its anchor and pending link', () => {
		const plan = planCreates(input([line('Call Bob', { relPath: 'Todoist/Acme.md' })]));

		expect(plan.creates).toHaveLength(1);
		const [create] = plan.creates;
		expect(create.anchor).toBe('td-00000001');
		expect(create.command).toEqual({
			type: 'item_add',
			uuid: 'uuid-1',
			tempId: 'td-00000001',
			args: {
				content: 'Call Bob',
				description: 'kokobrain:td-00000001',
				projectId: 'acme',
				priority: 1,
				labels: [],
				autoParseLabels: false,
			},
		});
		expect(create.link).toEqual({
			anchor: 'td-00000001',
			todoistId: null,
			noteRelPath: 'Todoist/Acme.md',
			localBase: JSON.stringify({ description: 'Call Bob', dueDate: null, priority: null, tags: [], status: ' ' }),
			remoteBase: null,
			pendingUuid: 'uuid-1',
			pendingCmd: JSON.stringify(create.command),
			missCount: 0,
			frozen: false,
		});
		expect(plan.log).toEqual([]);
	});

	it('creates a #todoist line outside project notes in the root project, without the scope tag as a label', () => {
		const l = line('Call Bob #todoist', { relPath: 'Notes/Day.md', fields: fields('Call Bob', { tags: ['todoist'] }) });

		const [create] = planCreates(input([l])).creates;

		expect(create.command.args).toMatchObject({ content: 'Call Bob', projectId: 'work', labels: [] });
		expect(create.link.noteRelPath).toBe('Notes/Day.md');
	});

	it('creates a line of a brain-born project note with its temp id as project', () => {
		const l = line('Plan', { relPath: 'Todoist/Launch.md' });

		const [create] = planCreates(input([l], { pendingProjects: new Map([['Todoist/Launch.md', 'tmp-p']]) })).creates;

		expect(create.command.args.projectId).toBe('tmp-p');
	});

	it('creates no #todoist line while the root project is frozen', () => {
		const l = line('Call Bob #todoist', { relPath: 'Notes/Day.md', fields: fields('Call Bob', { tags: ['todoist'] }) });

		expect(planCreates(input([l], { treeIds: new Set(['acme']) })).creates).toEqual([]);
	});

	it('leaves out lines in other notes without #todoist, closed lines, indented subtasks and lines the index has not parsed', () => {
		const plan = planCreates(
			input([
				line('Elsewhere', { relPath: 'Notes/Day.md' }),
				line('Done', { status: 'x' }),
				line('Cancelled', { status: '-' }),
				line('Sub', { indent: 1 }),
				line('Edited', { fields: null }),
			]),
		);

		expect(plan.creates).toEqual([]);
		expect(plan.log).toEqual([]);
	});

	it('creates lines whose status char is open but not a space', () => {
		expect(planCreates(input([line('Doing', { status: '/' })])).creates).toHaveLength(1);
	});

	it('leaves out a note whose project is outside the tree, and one of two notes naming the same project', () => {
		const plan = planCreates(
			input([line('Other', { relPath: 'P.md' }), line('Twin', { relPath: 'Twin.md' })], {
				notes: [WORK_NOTE, { relPath: 'P.md', projectId: 'personal' }, { relPath: 'Twin.md', projectId: 'acme' }, { relPath: 'Twin 2.md', projectId: 'acme' }],
			}),
		);

		expect(plan.creates).toEqual([]);
	});

	it('never creates a line that carries any 🆔, and logs a user 🆔 without td-', () => {
		const plan = planCreates(
			input([
				line('Linked 🆔 td-w1', { fields: fields('Linked') }),
				line('Detached 🆔 td-abcdefgh', { fields: fields('Detached') }),
				line('Mine 🆔 abc', { fields: fields('Mine') }),
			]),
		);

		expect(plan.creates).toEqual([]);
		expect(plan.log).toEqual([expect.objectContaining({ kind: 'create-skipped', anchor: null, message: expect.stringContaining('Todoist/Work.md:4') })]);
	});

	it('logs and leaves out content over 500 characters or that would not survive a parse back', () => {
		const long = 'x'.repeat(501);
		const plan = planCreates(input([line(long), line('see [[a#b]]'), line('ok', { lineNumber: 9, fields: fields('x'.repeat(500)) })]));

		expect(plan.creates.map((c) => c.command.args.content)).toEqual(['x'.repeat(500)]);
		expect(plan.log).toEqual([
			expect.objectContaining({ kind: 'create-skipped', message: expect.stringContaining('over 500 characters') }),
			expect.objectContaining({ kind: 'create-skipped', message: expect.stringContaining('hash') }),
		]);
	});

	it('gives each created line its own anchor, unique against the vault', () => {
		const plan = planCreates(
			input([line('A', { lineNumber: 1 }), line('A', { lineNumber: 2 })], {
				takenAnchors: new Set(['td-taken00']),
				newAnchor: (taken) => (taken.has('td-taken00') && !taken.has('td-first00') ? 'td-first00' : 'td-secnd000'),
			}),
		);

		expect(plan.creates.map((c) => c.anchor)).toEqual(['td-first00', 'td-secnd000']);
	});
});

describe('planCreates: fields', () => {
	it('sends the priority and the tags as labels, minus excluded labels', () => {
		const l = line('Plan', { fields: fields('Plan', { priority: 'high', tags: ['deep', 'Work', 'todoist', 'deep'] }) });

		const [create] = planCreates(input([l])).creates;

		expect(create.command.args).toMatchObject({ priority: 3, labels: ['deep'] });
	});

	it('adds the personal label in a personal vault, and nothing extra in a work vault', () => {
		const l = line('Plan', { fields: fields('Plan', { tags: ['deep'] }) });

		expect(planCreates(input([l], { syncContext: 'personal' })).creates[0].command.args.labels).toEqual(['deep', 'personal']);
		expect(planCreates(input([l], { syncContext: 'work' })).creates[0].command.args.labels).toEqual(['deep']);
	});

	it('sends a plain 📅 as a date', () => {
		const l = line('Pay', { fields: fields('Pay', { dueDate: '2026-11-16' }) });

		expect(planCreates(input([l])).creates[0].command.args.due).toEqual({ date: '2026-11-16' });
	});

	it('sends a recurring line with its 📅 as date + rule, never a "starting" rule', () => {
		const l = line('Pay', { fields: fields('Pay', { dueDate: '2026-11-16' }), recurrence: 'every week' });

		expect(planCreates(input([l])).creates[0].command.args.due).toEqual({ date: '2026-11-16', string: 'every week', lang: 'en' });
	});

	it('sends a recurring line without a 📅 as the rule alone', () => {
		const l = line('Pay', { recurrence: 'every month' });

		expect(planCreates(input([l])).creates[0].command.args.due).toEqual({ string: 'every month' });
	});

	it('leaves a trailing block id out of the content, and keeps it in local_base as the line has it', () => {
		const plan = planCreates(input([line('Call Bob ^abc-1'), line('^only', { lineNumber: 9 })]));

		expect(plan.creates.map((c) => c.command.args.content)).toEqual(['Call Bob']);
		expect(JSON.parse(plan.creates[0].link.localBase!).description).toBe('Call Bob ^abc-1');
		expect(plan.log).toEqual([expect.objectContaining({ kind: 'create-skipped', message: expect.stringContaining('Todoist/Work.md:9') })]);
	});

	it('sends no due without a 📅 or a rule', () => {
		expect(planCreates(input([line('Pay')])).creates[0].command.args).not.toHaveProperty('due');
	});
});

describe('planCreates: pending adds', () => {
	it('resends a stored pending add byte for byte, and never creates its line again', () => {
		const command = add('td-pending1', 'Call Bob');
		const link = pendingLink('td-pending1', command);

		const anchored = line('Call Bob 🆔 td-pending1', { fields: fields('Call Bob') });

		const plan = planCreates(input([anchored], { links: [link], occurrences: new Map([['td-pending1', [anchored]]]) }));

		expect(plan.creates).toEqual([]);
		expect(plan.resends).toEqual([{ link, command }]);
	});

	it('does not resend a frozen, detached or acknowledged link, or one whose line is gone', () => {
		const command = add('td-pending1', 'Call Bob');
		const links = [
			pendingLink('td-frozen01', add('td-frozen01', 'F'), { frozen: true }),
			pendingLink('td-detach01', add('td-detach01', 'D'), { missCount: 3 }),
			{ ...pendingLink('td-acked001', add('td-acked001', 'A')), todoistId: '42' },
			pendingLink('td-gone0001', command),
		];

		const occurrences = new Map(['td-frozen01', 'td-detach01', 'td-acked001'].map((a) => [a, [line(`X 🆔 ${a}`)]]));

		const plan = planCreates(input([], { links, occurrences }));

		expect(plan.resends).toEqual([]);
	});
});

describe('parsePendingAdd', () => {
	it('reads an item_add pending_cmd, and nothing else', () => {
		const command = add('td-a', 'A');

		expect(parsePendingAdd(JSON.stringify(command))).toEqual(command);
		expect(parsePendingAdd(JSON.stringify({ uuid: 'u', type: 'item_close' }))).toBeNull();
		expect(parsePendingAdd('not json')).toBeNull();
		expect(parsePendingAdd(null)).toBeNull();
	});
});

describe('ackedLink', () => {
	it('stores the Todoist id and the sent values as remote_base, clearing the pending add', () => {
		const command: PendingAdd = {
			...add('td-a', 'Pay'),
			args: { ...add('td-a', 'Pay').args, priority: 3, labels: ['deep', 'personal'], due: { date: '2026-11-16', string: 'every week', lang: 'en' } },
		};

		const link = ackedLink(pendingLink('td-a', command), command, '1001', EXCLUDED);

		expect(link).toMatchObject({ anchor: 'td-a', todoistId: '1001', pendingUuid: null, pendingCmd: null });
		expect(JSON.parse(link.remoteBase!)).toEqual({
			content: 'Pay',
			projectId: 'work',
			sectionId: null,
			parentId: null,
			checked: false,
			priority: 3,
			due: { date: '2026-11-16', string: 'every week', isRecurring: true, datetime: null, timezone: null, lang: 'en' },
			labels: ['deep', 'personal'],
			unmappedLabels: ['personal'],
			contentProblem: null,
		});
	});

	it('stores a plain date as a non-recurring due, and a rule without a date as no due (the next pull brings the date)', () => {
		const dated = { ...add('td-a', 'Pay'), args: { ...add('td-a', 'Pay').args, due: { date: '2026-11-16' } } };
		const ruleOnly = { ...add('td-a', 'Pay'), args: { ...add('td-a', 'Pay').args, due: { string: 'every week' } } };

		expect(JSON.parse(ackedLink(pendingLink('td-a', dated), dated, '1', EXCLUDED).remoteBase!).due).toEqual({
			date: '2026-11-16',
			string: '2026-11-16',
			isRecurring: false,
			datetime: null,
			timezone: null,
			lang: null,
		});
		expect(JSON.parse(ackedLink(pendingLink('td-a', ruleOnly), ruleOnly, '1', EXCLUDED).remoteBase!).due).toBeNull();
	});
});

describe('pairPendingAdds', () => {
	const command = add('td-pending1', 'Call Bob');
	const link = pendingLink('td-pending1', command);

	it('pairs a pulled item with the pending add its description names, as if acknowledged', () => {
		const pulled = item('1001', { content: 'Call Bob', description: 'kokobrain:td-pending1' });

		const out = pairPendingAdds({ links: [link], items: [pulled], excludedLabels: EXCLUDED });

		expect(out.links).toEqual([ackedLink(link, command, '1001', EXCLUDED)]);
		expect(out.heldItemIds.size).toBe(0);
	});

	it('stores the project the item is in, for an add sent with a brain-born project temp id', () => {
		const sent = add('td-pending2', 'Plan', 'tmp-p');
		const pulled = item('1002', { content: 'Plan', description: 'kokobrain:td-pending2', projectId: 'p77' });

		const out = pairPendingAdds({ links: [pendingLink('td-pending2', sent)], items: [pulled], excludedLabels: EXCLUDED });

		expect(JSON.parse(out.links[0].remoteBase!).projectId).toBe('p77');
	});

	it('falls back to content + project when the description lost its kokobrain: line', () => {
		const out = pairPendingAdds({ links: [link], items: [item('1001', { content: 'Call Bob' })], excludedLabels: EXCLUDED });

		expect(out.links.map((l) => l.todoistId)).toEqual(['1001']);
	});

	it('holds, without pairing, items that match a pending add ambiguously', () => {
		const items = [item('1001', { content: 'Call Bob' }), item('1002', { content: 'Call Bob' })];

		const out = pairPendingAdds({ links: [link], items, excludedLabels: EXCLUDED });

		expect(out.links).toEqual([]);
		expect([...out.heldItemIds].sort()).toEqual(['1001', '1002']);
		expect(out.log).toEqual([expect.objectContaining({ kind: 'anchor-conflict', anchor: 'td-pending1' })]);
	});

	it('holds two items whose descriptions name the same pending add', () => {
		const items = [item('1001', { description: 'kokobrain:td-pending1' }), item('1002', { description: 'kokobrain:td-pending1' })];

		const out = pairPendingAdds({ links: [link], items, excludedLabels: EXCLUDED });

		expect(out.links).toEqual([]);
		expect([...out.heldItemIds].sort()).toEqual(['1001', '1002']);
	});

	it('leaves items already linked, other projects and detached pending adds alone', () => {
		const linked = { ...pendingLink('td-w1', add('td-w1', 'Plan')), todoistId: 'w1', pendingCmd: null, pendingUuid: null };
		const detached = pendingLink('td-detach01', add('td-detach01', 'Call Bob'), { missCount: 3 });
		const items = [item('w1', { content: 'Call Bob' }), item('1001', { content: 'Call Bob', projectId: 'acme' })];

		const out = pairPendingAdds({ links: [linked, detached, link], items, excludedLabels: EXCLUDED });

		expect(out.links).toEqual([]);
		expect(out.heldItemIds.size).toBe(0);
	});
});

describe('addAnchor', () => {
	it('appends the anchor token to a task line, before trailing whitespace', () => {
		expect(addAnchor('- [ ] Call Bob', 'td-a')).toBe('- [ ] Call Bob 🆔 td-a');
		expect(addAnchor('\t1. [/] Pay 🔁 every week  ', 'td-a')).toBe('\t1. [/] Pay 🔁 every week 🆔 td-a  ');
	});

	it('writes the anchor before a trailing block id, which only counts at the end of the line', () => {
		expect(addAnchor('- [ ] Call Bob ^abc-1', 'td-a')).toBe('- [ ] Call Bob 🆔 td-a ^abc-1');
		expect(addAnchor('- [ ] Call Bob ^abc-1  ', 'td-a')).toBe('- [ ] Call Bob 🆔 td-a ^abc-1  ');
		expect(addAnchor('- [ ] Call ^abc Bob', 'td-a')).toBe('- [ ] Call ^abc Bob 🆔 td-a');
	});

	it('returns null for a line that is no task', () => {
		expect(addAnchor('Call Bob', 'td-a')).toBeNull();
	});
});

describe('syncOwnsTaskLine', () => {
	const on = { syncOn: true, inSyncScope: true, projectNote: false };

	it('is true for an anchored line, whatever the settings', () => {
		expect(syncOwnsTaskLine('Plan 🆔 td-w1', [], { syncOn: false, inSyncScope: false, projectNote: false })).toBe(true);
	});

	it('is true, with sync on, for a line of a project note or a #todoist line', () => {
		expect(syncOwnsTaskLine('Plan', [], { ...on, projectNote: true })).toBe(true);
		expect(syncOwnsTaskLine('Plan #Todoist', ['Todoist'], on)).toBe(true);
	});

	it('is false with sync off, outside the sync scope, or for any other line', () => {
		expect(syncOwnsTaskLine('Plan #todoist', ['todoist'], { ...on, syncOn: false })).toBe(false);
		expect(syncOwnsTaskLine('Plan #todoist', ['todoist'], { ...on, inSyncScope: false })).toBe(false);
		expect(syncOwnsTaskLine('Plan', [], on)).toBe(false);
	});
});
