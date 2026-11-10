import { describe, it, expect } from 'vitest';
import type { TodoistTaskLink } from '#lib/contracts/index.js';
import { applyLineChange, type CompletionPlan } from '#lib/features/todoist-sync/completion.logic.js';
import { planFields, type FieldsInput, type FieldsPlan } from '#lib/features/todoist-sync/fields.logic.js';
import { excludedLabelSet, type LocalBase, type PullItem, type RemoteBase, type ScannedLine } from '#lib/features/todoist-sync/pull.logic.js';

const LINE = 'Plan 🔺 📅 2026-11-13 #deep 🆔 td-a';

function item(extra: Partial<PullItem> = {}): PullItem {
	return {
		id: 'a',
		projectId: 'work',
		sectionId: null,
		parentId: null,
		content: 'Plan',
		description: '',
		labels: ['deep', 'Work'],
		priority: 4,
		due: { date: '2026-11-13', string: 'Nov 13', isRecurring: false, lang: 'en' },
		checked: false,
		isDeleted: false,
		childOrder: 1,
		...extra,
	};
}

function remoteBase(extra: Partial<RemoteBase> = {}): RemoteBase {
	return {
		content: 'Plan',
		projectId: 'work',
		sectionId: null,
		parentId: null,
		checked: false,
		priority: 4,
		due: { date: '2026-11-13', string: 'Nov 13', isRecurring: false, datetime: null, timezone: null, lang: 'en' },
		labels: ['deep', 'Work'],
		unmappedLabels: ['Work'],
		contentProblem: null,
		...extra,
	};
}

function localBase(extra: Partial<LocalBase> = {}): LocalBase {
	return { description: 'Plan', status: ' ', dueDate: '2026-11-13', priority: 'highest', tags: ['deep'], ...extra };
}

function link(extra: { local?: LocalBase; remote?: RemoteBase } = {}): TodoistTaskLink {
	return {
		anchor: 'td-a',
		todoistId: 'a',
		noteRelPath: 'Todoist/Work.md',
		localBase: JSON.stringify(extra.local ?? localBase()),
		remoteBase: JSON.stringify(extra.remote ?? remoteBase()),
		pendingUuid: null,
		pendingCmd: null,
		missCount: 0,
		frozen: false,
	};
}

/** A scanned line; its fields default to what the parser reads from {@link LINE}. */
function line(text = LINE, fields: Partial<ScannedLine['fields']> = {}, status = ' '): ScannedLine {
	return {
		relPath: 'Todoist/Work.md',
		lineNumber: 4,
		line: text,
		status,
		fields: { description: 'Plan', dueDate: '2026-11-13', priority: 'highest', tags: ['deep'], ...fields },
		indent: 0,
		recurrence: null,
	};
}

function input(l: TodoistTaskLink, lines: ScannedLine[], items: PullItem[], extra: Partial<FieldsInput> = {}): FieldsInput {
	return {
		links: [l],
		occurrences: new Map([['td-a', lines]]),
		items: new Map(items.map((i) => [i.id, i])),
		incremental: true,
		treeIds: new Set(['work']),
		excludedLabels: excludedLabelSet(''),
		newUuid: () => 'uuid-1',
		...extra,
	};
}

const EMPTY: FieldsPlan = { lineChanges: [], links: [], commands: [], log: [], updates: [], withholdToken: false };
const local = (l: TodoistTaskLink) => JSON.parse(l.localBase!) as LocalBase;
const remote = (l: TodoistTaskLink) => JSON.parse(l.remoteBase!) as RemoteBase;

/** The raw line after applying the plan's one change. */
function written(plan: CompletionPlan, text = LINE): string {
	expect(plan.lineChanges).toHaveLength(1);
	return applyLineChange(`- [ ] ${text}`, plan.lineChanges[0])!;
}

/** A second cycle on the stored links with the same item: must plan nothing. */
function rerun(plan: CompletionPlan, scanned: ScannedLine, i: PullItem): CompletionPlan {
	return planFields(input(plan.links[0], [scanned], [i]), EMPTY);
}

describe('planFields: content', () => {
	it('replaces the description, keeps the rest of the line and moves both bases', () => {
		const plan = planFields(input(link(), [line()], [item({ content: 'Plan the launch' })]), EMPTY);

		expect(written(plan)).toBe('- [ ] Plan the launch 🔺 📅 2026-11-13 #deep 🆔 td-a');
		expect(local(plan.links[0]).description).toBe('Plan the launch');
		expect(remote(plan.links[0]).content).toBe('Plan the launch');
		expect(plan.log).toEqual([]);
		expect(rerun(plan, line('Plan the launch 🔺 📅 2026-11-13 #deep 🆔 td-a', { description: 'Plan the launch' }), item({ content: 'Plan the launch' }))).toEqual(EMPTY);
	});

	it('keeps a scope tag in front of the description', () => {
		const text = '#todoist Call Bob 🆔 td-a';
		const l = link({ local: localBase({ description: 'Call Bob', dueDate: null, priority: null, tags: ['todoist'] }), remote: remoteBase({ content: 'Call Bob', priority: 1, due: null, labels: [], unmappedLabels: [] }) });
		const i = item({ content: 'Call Bob Smith', priority: 1, due: null, labels: [] });

		const plan = planFields(input(l, [line(text, { description: 'Call Bob', dueDate: null, priority: null, tags: ['todoist'] })], [i]), EMPTY);

		expect(written(plan, text)).toBe('- [ ] #todoist Call Bob Smith 🆔 td-a');
	});

	it('leaves the line alone on a mid-sentence conflict, logs it, and moves only the remote base', () => {
		const text = 'Buy #shop milk 🆔 td-a';
		const l = link({ local: localBase({ description: 'Buy milk', dueDate: null, priority: null, tags: ['shop'] }), remote: remoteBase({ content: 'Buy milk', priority: 1, due: null, labels: ['shop'], unmappedLabels: [] }) });
		const i = item({ content: 'Buy oat milk', priority: 1, due: null, labels: ['shop'] });

		const plan = planFields(input(l, [line(text, { description: 'Buy milk', dueDate: null, priority: null, tags: ['shop'] })], [i]), EMPTY);

		expect(plan.lineChanges).toEqual([]);
		expect(plan.log).toEqual([expect.objectContaining({ kind: 'description-conflict', anchor: 'td-a', message: expect.stringContaining('Buy oat milk') })]);
		expect(local(plan.links[0]).description).toBe('Buy milk');
		expect(remote(plan.links[0]).content).toBe('Buy oat milk');
	});

	it('logs a mid-sentence brain text that fails the round trip without marking the line as raw inserted', () => {
		const text = 'Fix C# #shop bug 🆔 td-a';
		const l = link({ local: localBase({ description: 'Fix bug', dueDate: null, priority: null, tags: ['shop'] }), remote: remoteBase({ content: 'Fix bug', priority: 1, due: null, labels: ['shop'], unmappedLabels: [] }) });
		const scanned = (priority: 'high' | null) => line(text, { description: 'Fix C# bug', dueDate: null, priority, tags: ['shop'] });

		const plan = planFields(input(l, [scanned(null)], [item({ content: 'Fix the bug', priority: 1, due: null, labels: ['shop'] })]), EMPTY);
		expect(local(plan.links[0])).toMatchObject({ description: 'Fix the bug', unpushedDescription: 'Fix C# bug' });

		const next = planFields(input(plan.links[0], [scanned('high')], [item({ content: 'Fix the bug', priority: 1, due: null, labels: ['shop'] })]), EMPTY);
		expect(update(next).args).toEqual({ id: 'a', priority: 3 });
		expect(next.log).toEqual([]);
	});

	it('pushes a line reverted to the old text after a mid-sentence brain text failed the round trip', () => {
		const l = link({ local: localBase({ description: 'Fix bug', dueDate: null, priority: null, tags: ['shop'] }), remote: remoteBase({ content: 'Fix bug', priority: 1, due: null, labels: ['shop'], unmappedLabels: [] }) });
		const i = item({ content: 'Fix the bug', priority: 1, due: null, labels: ['shop'] });

		const plan = planFields(input(l, [line('Fix C# #shop bug 🆔 td-a', { description: 'Fix C# bug', dueDate: null, priority: null, tags: ['shop'] })], [i]), EMPTY);
		const reverted = planFields(input(plan.links[0], [line('Fix #shop bug 🆔 td-a', { description: 'Fix bug', dueDate: null, priority: null, tags: ['shop'] })], [i]), EMPTY);

		expect(update(reverted).args).toEqual({ id: 'a', content: 'Fix bug' });
		expect(reverted.log).toEqual([]);
	});

	it('does not write content that fails the round trip, and logs it', () => {
		for (const content of ['Fix #42', 'Due 📅 2026-01-01', 'a  b', '']) {
			const plan = planFields(input(link(), [line()], [item({ content })]), EMPTY);

			expect(plan.lineChanges).toEqual([]);
			expect(plan.log).toEqual([expect.objectContaining({ kind: 'content-roundtrip', anchor: 'td-a' })]);
			expect(remote(plan.links[0])).toMatchObject({ content, contentProblem: expect.any(String) });
			expect(local(plan.links[0]).description).toBe('Plan');
		}
	});

	it('leaves a line inserted from content that failed the round trip alone on every later Todoist edit, without a both-sides conflict', () => {
		const text = 'Fix #42 🆔 td-a';
		const scanned = line(text, { description: 'Fix', dueDate: null, priority: null, tags: ['42'] });
		const l = link({
			local: localBase({ description: 'Fix #42', dueDate: null, priority: null, tags: [] }),
			remote: remoteBase({ content: 'Fix #42', priority: 1, due: null, labels: [], unmappedLabels: [], contentProblem: 'hash' }),
		});
		const i = item({ content: 'Fix issue 42', priority: 1, due: null, labels: [] });

		const plan = planFields(input(l, [scanned], [i]), EMPTY);

		expect(plan.lineChanges).toEqual([]);
		expect(plan.log).toEqual([expect.objectContaining({ kind: 'description-conflict', anchor: 'td-a', message: expect.stringContaining('Fix issue 42') })]);
		expect(local(plan.links[0]).description).toBe('Fix #42');
		expect(remote(plan.links[0])).toMatchObject({ content: 'Fix issue 42', contentProblem: null });

		const next = planFields(input(plan.links[0], [scanned], [item({ content: 'Fix issue 43', priority: 1, due: null, labels: [] })]), EMPTY);
		expect(next.lineChanges).toEqual([]);
		expect(next.log).toEqual([expect.objectContaining({ kind: 'description-conflict', message: expect.stringContaining('Fix issue 43') })]);
	});

	it('only moves the bases when the brain already has the new text', () => {
		const plan = planFields(input(link(), [line('Plan it 🔺 📅 2026-11-13 #deep 🆔 td-a', { description: 'Plan it' })], [item({ content: 'Plan it' })]), EMPTY);

		expect(plan.lineChanges).toEqual([]);
		expect(local(plan.links[0]).description).toBe('Plan it');
		expect(remote(plan.links[0]).content).toBe('Plan it');
	});

	it('lets Todoist win when both sides changed the text, logging the brain value', () => {
		const text = 'Plan B 🔺 📅 2026-11-13 #deep 🆔 td-a';
		const plan = planFields(input(link(), [line(text, { description: 'Plan B' })], [item({ content: 'Plan C' })]), EMPTY);

		expect(written(plan, text)).toBe('- [ ] Plan C 🔺 📅 2026-11-13 #deep 🆔 td-a');
		expect(plan.log).toEqual([expect.objectContaining({ kind: 'conflict', message: expect.stringContaining('Plan B') })]);
	});
});

describe('planFields: due', () => {
	it('moves the 📅 to the new date part and keeps the time in the remote base', () => {
		const due = { date: '2026-11-20T09:00:00', datetime: '2026-11-20T09:00:00', string: 'Nov 20 9am', isRecurring: false, lang: 'en' };
		const plan = planFields(input(link(), [line()], [item({ due })]), EMPTY);

		expect(written(plan)).toBe('- [ ] Plan 🔺 📅 2026-11-20 #deep 🆔 td-a');
		expect(local(plan.links[0]).dueDate).toBe('2026-11-20');
		expect(remote(plan.links[0]).due).toMatchObject({ date: '2026-11-20T09:00:00', datetime: '2026-11-20T09:00:00' });
		expect(rerun(plan, line(LINE.replace('11-13', '11-20'), { dueDate: '2026-11-20' }), item({ due }))).toEqual(EMPTY);
	});

	it('removes the 📅 when Todoist removed the due, and adds one when Todoist set it', () => {
		const removed = planFields(input(link(), [line()], [item({ due: null })]), EMPTY);
		expect(written(removed)).toBe('- [ ] Plan 🔺 #deep 🆔 td-a');
		expect(local(removed.links[0]).dueDate).toBeNull();

		const text = 'Plan 🔺 #deep 🆔 td-a';
		const added = planFields(input(link({ local: localBase({ dueDate: null }), remote: remoteBase({ due: null }) }), [line(text, { dueDate: null })], [item()]), EMPTY);
		expect(written(added, text)).toBe('- [ ] Plan 🔺 #deep 📅 2026-11-13 🆔 td-a');
	});

	it('writes nothing when only the time or the text of the due changed', () => {
		const due = { date: '2026-11-13T18:00:00', datetime: '2026-11-13T18:00:00', string: 'Nov 13 6pm', isRecurring: false, lang: 'en' };
		const plan = planFields(input(link(), [line()], [item({ due })]), EMPTY);

		expect(plan.lineChanges).toEqual([]);
		expect(remote(plan.links[0]).due).toMatchObject({ date: '2026-11-13T18:00:00', string: 'Nov 13 6pm' });
		expect(rerun(plan, line(), item({ due }))).toEqual(EMPTY);
	});

	it('updates only the 📅 of a recurring task, never its 🔁 text', () => {
		const text = 'Report 📅 2026-11-13 🔁 every week 🆔 td-a';
		const weekly = { date: '2026-11-13', string: 'every week', isRecurring: true, datetime: null, timezone: null, lang: 'en' };
		const l = link({ local: localBase({ description: 'Report', priority: null, tags: [] }), remote: remoteBase({ content: 'Report', priority: 1, labels: [], unmappedLabels: [], due: weekly }) });
		const i = item({ content: 'Report', priority: 1, labels: [], checked: true, due: { ...weekly, date: '2026-11-27', string: 'every other week' } });

		const plan = planFields(input(l, [line(text, { description: 'Report', priority: null, tags: [] })], [i]), EMPTY);

		expect(written(plan, text)).toBe('- [ ] Report 📅 2026-11-27 🔁 every week 🆔 td-a');
		expect(remote(plan.links[0]).due).toMatchObject({ string: 'every other week' });
	});

	it('logs a due that is not YYYY-MM-DD and leaves the 📅', () => {
		const plan = planFields(input(link(), [line()], [item({ due: { date: 'soon', string: 'soon', isRecurring: false } })]), EMPTY);

		expect(plan.lineChanges).toEqual([]);
		expect(plan.log).toEqual([expect.objectContaining({ kind: 'due-dropped', anchor: 'td-a' })]);
	});
});

describe('planFields: priority', () => {
	it('writes the emoji of the new Todoist priority, and removes it for Normal', () => {
		const high = planFields(input(link(), [line()], [item({ priority: 3 })]), EMPTY);
		expect(written(high)).toBe('- [ ] Plan ⏫ 📅 2026-11-13 #deep 🆔 td-a');
		expect(local(high.links[0]).priority).toBe('high');
		expect(remote(high.links[0]).priority).toBe(3);
		expect(rerun(high, line(LINE.replace('🔺', '⏫'), { priority: 'high' }), item({ priority: 3 }))).toEqual(EMPTY);

		const normal = planFields(input(link(), [line()], [item({ priority: 1 })]), EMPTY);
		expect(written(normal)).toBe('- [ ] Plan 📅 2026-11-13 #deep 🆔 td-a');
		expect(local(normal.links[0]).priority).toBeNull();
	});

	it('keeps 🔽 and ⏬ when Todoist moves to Normal (both are Todoist 1), and writes nothing twice', () => {
		for (const [emoji, priority] of [['🔽', 'low'], ['⏬', 'lowest']] as const) {
			const text = `Plan ${emoji} 🆔 td-a`;
			const scanned = line(text, { dueDate: null, priority, tags: [] });
			const l = link({ local: localBase({ dueDate: null, priority, tags: [] }), remote: remoteBase({ priority: 2, due: null, labels: [], unmappedLabels: [] }) });
			const i = item({ priority: 1, due: null, labels: [] });

			const plan = planFields(input(l, [scanned], [i]), EMPTY);

			expect(plan.lineChanges).toEqual([]);
			expect(remote(plan.links[0]).priority).toBe(1);
			expect(local(plan.links[0]).priority).toBe(priority);
			expect(rerun(plan, scanned, i)).toEqual(EMPTY);
		}
	});
});

describe('planFields: labels', () => {
	it('adds a new label as a tag before the anchor and removes a dropped one', () => {
		const plan = planFields(input(link(), [line()], [item({ labels: ['Work', 'next'] })]), EMPTY);

		expect(written(plan)).toBe('- [ ] Plan 🔺 📅 2026-11-13 #next 🆔 td-a');
		expect(local(plan.links[0]).tags).toEqual(['next']);
		expect(remote(plan.links[0])).toMatchObject({ labels: ['Work', 'next'], unmappedLabels: ['Work'] });
		expect(rerun(plan, line(LINE.replace('#deep', '#next'), { tags: ['next'] }), item({ labels: ['Work', 'next'] }))).toEqual(EMPTY);
	});

	it('writes nothing when a remote label change only adds Work (the owner webhook)', () => {
		const l = link({ remote: remoteBase({ labels: ['deep'], unmappedLabels: [] }) });

		const plan = planFields(input(l, [line()], [item({ labels: ['deep', 'Work'] })]), EMPTY);

		expect(plan.lineChanges).toEqual([]);
		expect(remote(plan.links[0])).toMatchObject({ labels: ['deep', 'Work'], unmappedLabels: ['Work'] });
		expect(local(plan.links[0]).tags).toEqual(['deep']);
	});

	it('never writes or removes the scope tag, the default label, personal, or a label that is no tag name', () => {
		const l = link({ remote: remoteBase({ labels: ['deep', 'todoist', 'brain'], unmappedLabels: ['todoist', 'brain'] }) });
		const text = 'Plan 🔺 📅 2026-11-13 #deep #todoist 🆔 td-a';
		const i = item({ labels: ['deep', 'personal', 'two words', 'Brain'] });

		const plan = planFields(input(l, [line(text, { tags: ['deep', 'todoist'] })], [i], { excludedLabels: excludedLabelSet('brain') }), EMPTY);

		expect(plan.lineChanges).toEqual([]);
		expect(remote(plan.links[0]).unmappedLabels).toEqual(['personal', 'two words', 'Brain']);
	});

	it('compares labels case-insensitively', () => {
		const plan = planFields(input(link(), [line()], [item({ labels: ['Deep', 'Work'] })]), EMPTY);
		expect(plan.lineChanges).toEqual([]);

		const tagged = planFields(input(link({ remote: remoteBase({ labels: ['Work'], unmappedLabels: ['Work'] }) }), [line()], [item({ labels: ['DEEP', 'Work'] })]), EMPTY);
		expect(tagged.lineChanges).toEqual([]);
	});
});

/** The one planned push. */
function update(plan: FieldsPlan) {
	expect(plan.updates).toHaveLength(1);
	return plan.updates[0];
}

/** Plans a cycle where only the brain line changed: Todoist still matches the bases. */
function brainEdit(fields: Partial<ScannedLine['fields']>, extra: { local?: LocalBase; remote?: RemoteBase; item?: Partial<PullItem> } = {}) {
	return planFields(input(link(extra), [line(LINE, fields)], [item(extra.item)]), EMPTY);
}

describe('planFields: pushes from the brain', () => {
	it('pushes a text edit as item_update content; the bases move only on ok', () => {
		const plan = brainEdit({ description: 'Plan the launch' });

		const u = update(plan);
		expect(u).toMatchObject({ anchor: 'td-a', todoistId: 'a', uuid: 'uuid-1', args: { id: 'a', content: 'Plan the launch' } });
		expect(plan.lineChanges).toEqual([]);
		expect(plan.links).toEqual([]);
		expect(local(u.okLink).description).toBe('Plan the launch');
		expect(remote(u.okLink).content).toBe('Plan the launch');
		expect(local(u.refusedLink).description).toBe('Plan the launch');
		expect(remote(u.refusedLink).content).toBe('Plan');
	});

	it('pushes every changed field of one line in one command', () => {
		const plan = brainEdit({ description: 'Plan more', priority: 'high', dueDate: '2026-11-20', tags: ['deep', 'next'] });

		expect(update(plan).args).toEqual({ id: 'a', content: 'Plan more', priority: 3, due: { date: '2026-11-20' }, labels: ['deep', 'Work', 'next'] });
		expect(local(update(plan).okLink)).toMatchObject({ description: 'Plan more', priority: 'high', dueDate: '2026-11-20', tags: ['deep', 'next'] });
		expect(remote(update(plan).okLink)).toMatchObject({ content: 'Plan more', priority: 3, labels: ['deep', 'Work', 'next'], due: { date: '2026-11-20' } });
	});

	it('does not queue text over 500 characters or that fails the round trip, and logs it once', () => {
		for (const description of ['x'.repeat(501), 'Fix C# bug']) {
			const plan = brainEdit({ description });

			expect(plan.updates).toEqual([]);
			expect(plan.log).toEqual([expect.objectContaining({ kind: 'content-not-pushed', anchor: 'td-a' })]);
			expect(local(plan.links[0])).toMatchObject({ description: 'Plan', unpushedDescription: description });
			expect(remote(plan.links[0]).content).toBe('Plan');
			expect(planFields(input(plan.links[0], [line(LINE, { description })], [item()]), EMPTY)).toEqual(EMPTY);
		}
		expect(update(brainEdit({ description: 'x'.repeat(500) })).args.content).toHaveLength(500);
	});

	it('keeps syncing the other fields of a line whose brain text was not sent, both ways', () => {
		const text = 'Fix C# bug 🔺 📅 2026-11-13 #deep 🆔 td-a';
		const first = brainEdit({ description: 'Fix C# bug' });
		expect(first.log).toEqual([expect.objectContaining({ kind: 'content-not-pushed' })]);

		const priority = planFields(input(first.links[0], [line(text, { description: 'Fix C# bug', priority: 'high' })], [item()]), EMPTY);
		expect(update(priority).args).toEqual({ id: 'a', priority: 3 });
		expect(priority.log).toEqual([]);

		const content = planFields(input(first.links[0], [line(text, { description: 'Fix C# bug' })], [item({ content: 'Review spec' })]), EMPTY);
		expect(written(content, text)).toBe('- [ ] Review spec 🔺 📅 2026-11-13 #deep 🆔 td-a');
		expect(content.log).toEqual([expect.objectContaining({ kind: 'conflict', message: expect.stringContaining('Fix C# bug') })]);
		expect(local(content.links[0]).description).toBe('Review spec');
	});

	it('never pushes a line flagged by the round-trip check', () => {
		expect(brainEdit({ priority: 'high' }, { remote: remoteBase({ content: 'Fix #42', contentProblem: 'hash' }), item: { content: 'Fix #42' } }).updates).toEqual([]);
		expect(brainEdit({ priority: 'high' }, { local: localBase({ description: 'Fix #42' }) }).updates).toEqual([]);
	});

	it('only moves the local base when the brain already matches Todoist', () => {
		const plan = brainEdit({ description: 'Plan' }, { local: localBase({ description: 'Old' }) });

		expect(plan.updates).toEqual([]);
		expect(local(plan.links[0]).description).toBe('Plan');
	});

	it('keeps the time of a timed due and the timezone when the 📅 moves', () => {
		const due = { date: '2026-11-13T09:00:00Z', string: 'Nov 13 9am', isRecurring: false, datetime: '2026-11-13T09:00:00Z', timezone: 'Europe/Lisbon', lang: 'en' };

		const plan = brainEdit({ dueDate: '2026-11-20' }, { remote: remoteBase({ due }), item: { due } });

		expect(update(plan).args.due).toEqual({ date: '2026-11-20T09:00:00Z', timezone: 'Europe/Lisbon' });
		expect(remote(update(plan).okLink).due).toMatchObject({ date: '2026-11-20T09:00:00Z', datetime: '2026-11-20T09:00:00Z', isRecurring: false });
	});

	it('sends a recurring due as date + the remote rule + lang, never a bare date', () => {
		const weekly = { date: '2026-11-13', string: 'every week', isRecurring: true, datetime: null, timezone: null, lang: 'en' };

		const plan = brainEdit({ dueDate: '2026-11-20' }, { remote: remoteBase({ due: weekly }), item: { due: weekly } });

		expect(update(plan).args.due).toEqual({ date: '2026-11-20', string: 'every week', lang: 'en' });
		expect(remote(update(plan).okLink).due).toMatchObject({ date: '2026-11-20', string: 'every week', isRecurring: true });
	});

	it('removes the due of a task whose 📅 was removed, but never of a recurring one (logged once)', () => {
		expect(update(brainEdit({ dueDate: null })).args).toEqual({ id: 'a', due: null });
		expect(remote(update(brainEdit({ dueDate: null })).okLink).due).toBeNull();

		const weekly = { date: '2026-11-13', string: 'every week', isRecurring: true, datetime: null, timezone: null, lang: 'en' };
		const plan = brainEdit({ dueDate: null }, { remote: remoteBase({ due: weekly }), item: { due: weekly } });
		expect(plan.updates).toEqual([]);
		expect(plan.log).toEqual([expect.objectContaining({ kind: 'due-not-pushed', anchor: 'td-a' })]);
		expect(local(plan.links[0]).dueDate).toBeNull();
	});

	it('compares priorities in Todoist terms: 🔽 and ⏬ never push, a removed emoji pushes Normal', () => {
		const none = { local: localBase({ priority: null }), remote: remoteBase({ priority: 1 }), item: { priority: 1 } };
		expect(brainEdit({ priority: 'low' }, none).updates).toEqual([]);
		expect(brainEdit({ priority: 'lowest' }, none).updates).toEqual([]);
		expect(update(brainEdit({ priority: null })).args).toEqual({ id: 'a', priority: 1 });
		expect(update(brainEdit({ priority: 'medium' }, none)).args).toEqual({ id: 'a', priority: 2 });
	});

	it('always re-sends unmapped and context labels, and never pushes the scope tag', () => {
		const labels = ['deep', 'Work', 'personal', 'two words', 'brain'];
		const extra = { remote: remoteBase({ labels, unmappedLabels: ['Work', 'personal', 'two words', 'brain'] }), item: { labels } };

		const removed = planFields(input(link(extra), [line(LINE, { tags: ['todoist'] })], [item(extra.item)], { excludedLabels: excludedLabelSet('brain') }), EMPTY);
		expect(update(removed).args.labels).toEqual(['Work', 'personal', 'two words', 'brain']);

		const added = planFields(input(link(extra), [line(LINE, { tags: ['DEEP', 'next', 'todoist'] })], [item(extra.item)], { excludedLabels: excludedLabelSet('brain') }), EMPTY);
		expect(update(added).args.labels).toEqual([...labels, 'next']);
	});

	it('treats a tag edit that only changes case as no change', () => {
		expect(brainEdit({ tags: ['Deep'] }).updates).toEqual([]);
	});

	it('sends one label for new line tags that differ only by case', () => {
		expect(update(brainEdit({ tags: ['deep', 'next', 'Next'] })).args.labels).toEqual(['deep', 'Work', 'next']);
	});

	it('pushes the brain field next to a Todoist edit of another field', () => {
		const plan = planFields(input(link(), [line(LINE, { description: 'Plan more' })], [item({ priority: 3 })]), EMPTY);

		expect(written(plan)).toBe('- [ ] Plan ⏫ 📅 2026-11-13 #deep 🆔 td-a');
		expect(update(plan).args).toEqual({ id: 'a', content: 'Plan more' });
		expect(remote(update(plan).okLink)).toMatchObject({ priority: 3, content: 'Plan more' });
		expect(local(update(plan).okLink)).toMatchObject({ priority: 'high', description: 'Plan more' });
	});

	it('sees the echo of its own push as no change', () => {
		const pushed = brainEdit({ description: 'Plan more', dueDate: '2026-11-20', priority: 'high', tags: ['next'] });
		const after = line('Plan more ⏫ 📅 2026-11-20 #next 🆔 td-a', { description: 'Plan more', dueDate: '2026-11-20', priority: 'high', tags: ['next'] });
		const echo = item({ content: 'Plan more', priority: 3, labels: ['Work', 'next'], due: { date: '2026-11-20', string: 'Nov 20', isRecurring: false, lang: 'en' } });

		const next = planFields(input(update(pushed).okLink, [after], [echo]), EMPTY);

		expect(next.lineChanges).toEqual([]);
		expect(next.updates).toEqual([]);
		expect(next.log).toEqual([]);
	});
});

describe('planFields: both sides changed the same field', () => {
	it('lets Todoist win the priority and the due: the line is patched, the brain value logged, nothing pushed', () => {
		const plan = planFields(input(link(), [line(LINE, { priority: 'medium', dueDate: '2026-11-15' })], [item({ priority: 3, due: { date: '2026-11-20', string: 'Nov 20', isRecurring: false } })]), EMPTY);

		expect(written(plan)).toBe('- [ ] Plan ⏫ 📅 2026-11-20 #deep 🆔 td-a');
		expect(plan.updates).toEqual([]);
		expect(plan.log).toEqual([
			expect.objectContaining({ kind: 'conflict', message: expect.stringContaining('2026-11-15') }),
			expect.objectContaining({ kind: 'conflict', message: expect.stringContaining('medium') }),
		]);
	});

	it('lets Todoist win the tags: the line takes the Todoist tags, the brain tags are logged', () => {
		const text = 'Plan 🔺 📅 2026-11-13 #mine 🆔 td-a';
		const plan = planFields(input(link(), [line(text, { tags: ['mine'] })], [item({ labels: ['theirs', 'Work'] })]), EMPTY);

		expect(written(plan, text)).toBe('- [ ] Plan 🔺 📅 2026-11-13 #theirs 🆔 td-a');
		expect(plan.updates).toEqual([]);
		expect(plan.log).toEqual([expect.objectContaining({ kind: 'conflict', message: expect.stringContaining('mine') })]);
		expect(local(plan.links[0]).tags).toEqual(['theirs']);
	});

	it('logs no conflict when both sides reached the same value (a push whose answer was lost)', () => {
		const plan = planFields(input(link(), [line(LINE, { description: 'Plan more', priority: 'high', tags: ['next'] })], [item({ content: 'Plan more', priority: 3, labels: ['next', 'Work'] })]), EMPTY);

		expect(plan.lineChanges).toEqual([]);
		expect(plan.updates).toEqual([]);
		expect(plan.log).toEqual([]);
		expect(local(plan.links[0])).toMatchObject({ description: 'Plan more', priority: 'high', tags: ['next'] });
	});

	it('keeps a brain text edit out of Todoist when the Todoist text could not be written (mid-sentence), logging it', () => {
		const text = 'Buy #shop milk now 🆔 td-a';
		const l = link({ local: localBase({ description: 'Buy milk', dueDate: null, priority: null, tags: ['shop'] }), remote: remoteBase({ content: 'Buy milk', priority: 1, due: null, labels: ['shop'], unmappedLabels: [] }) });
		const i = item({ content: 'Buy oat milk', priority: 1, due: null, labels: ['shop'] });
		const scanned = line(text, { description: 'Buy milk now', dueDate: null, priority: null, tags: ['shop'] });

		const plan = planFields(input(l, [scanned], [i]), EMPTY);

		expect(plan.lineChanges).toEqual([]);
		expect(plan.updates).toEqual([]);
		expect(plan.log).toEqual([expect.objectContaining({ kind: 'description-conflict', message: expect.stringMatching(/Buy oat milk.*Buy milk now/u) })]);
		expect(planFields(input(plan.links[0], [scanned], [i]), EMPTY).updates).toEqual([]);
	});
});

describe('planFields: guards and merge', () => {
	it('does nothing when neither side changed', () => {
		expect(planFields(input(link(), [line()], [item()]), EMPTY)).toEqual(EMPTY);
		expect(planFields(input(link(), [line()], []), EMPTY)).toEqual(EMPTY);
	});

	it('skips a duplicated anchor, a line without parsed fields, a deleted item, one outside the tree, and one missing without a token', () => {
		const changed = item({ content: 'New' });
		expect(planFields(input(link(), [line(), line()], [changed]), EMPTY)).toEqual(EMPTY);
		expect(planFields(input(link(), [{ ...line(), fields: null }], [changed]), EMPTY)).toEqual(EMPTY);
		expect(planFields(input(link(), [line()], [{ ...changed, isDeleted: true }]), EMPTY)).toEqual(EMPTY);
		expect(planFields(input(link(), [line()], [{ ...changed, projectId: 'personal' }]), EMPTY)).toEqual(EMPTY);
		expect(planFields(input(link(), [line()], [], { incremental: false }), EMPTY)).toEqual(EMPTY);
	});

	it('leaves a link with a close or reopen planned this cycle to the next cycle', () => {
		const completion: CompletionPlan = { ...EMPTY, links: [link()], commands: [{ anchor: 'td-a', todoistId: 'a', pending: { uuid: 'u', type: 'item_close' } }] };

		expect(planFields(input(link(), [line(LINE, {}, 'x')], [item({ content: 'New' })]), completion)).toEqual({ ...completion, updates: [], withholdToken: true });
	});

	it('withholds the sync token only when a link with a close or reopen has a Todoist field edit this cycle', () => {
		const completion: CompletionPlan = { ...EMPTY, links: [link()], commands: [{ anchor: 'td-a', todoistId: 'a', pending: { uuid: 'u', type: 'item_close' } }] };
		const closed = [line(LINE, {}, 'x')];

		expect(planFields(input(link(), closed, [item()]), completion).withholdToken).toBe(false);
		expect(planFields(input(link(), closed, [item({ checked: true })]), completion).withholdToken).toBe(false);
		for (const edit of [{ content: 'New' }, { priority: 1 }, { labels: ['deep'] }, { due: null }]) {
			expect(planFields(input(link(), closed, [item(edit)]), completion).withholdToken).toBe(true);
		}
	});

	it('reads the line as the completion patch leaves it: a recurring 📅 completion moves is no brain edit', () => {
		const weekly = { date: '2026-11-13', string: 'every week', isRecurring: true, datetime: null, timezone: null, lang: 'en' };
		const rolled = { ...weekly, date: '2026-11-20' };
		const l = link({ remote: remoteBase({ due: weekly }) });
		const moved = { ...l, localBase: JSON.stringify(localBase({ dueDate: '2026-11-20' })), remoteBase: JSON.stringify(remoteBase({ due: rolled })) };
		const completion: CompletionPlan = { ...EMPTY, links: [moved], lineChanges: [{ anchor: 'td-a', relPath: 'Todoist/Work.md', expected: line(), status: null, dueDate: '2026-11-20' }] };

		const plan = planFields(input(l, [line()], [item({ due: rolled })]), completion);

		expect(plan.updates).toEqual([]);
		expect(written(plan)).toBe('- [ ] Plan 🔺 📅 2026-11-20 #deep 🆔 td-a');
	});

	it('merges with the completion plan: one change per line, on the bases completion moved', () => {
		const l = link();
		const closed = { ...l, localBase: JSON.stringify(localBase({ status: 'x' })), remoteBase: JSON.stringify(remoteBase({ checked: true })) };
		const completion: CompletionPlan = {
			...EMPTY,
			links: [closed],
			lineChanges: [{ anchor: 'td-a', relPath: 'Todoist/Work.md', expected: line(), status: 'closed' }],
			log: [{ kind: 'x', anchor: null, message: 'm' }],
		};

		const plan = planFields(input(l, [line()], [item({ checked: true, content: 'Planned' })]), completion);

		expect(written(plan)).toBe('- [x] Planned 🔺 📅 2026-11-13 #deep 🆔 td-a');
		expect(plan.links).toHaveLength(1);
		expect(local(plan.links[0])).toMatchObject({ status: 'x', description: 'Planned' });
		expect(remote(plan.links[0])).toMatchObject({ checked: true, content: 'Planned' });
		expect(plan.log).toEqual(completion.log);
	});
});
