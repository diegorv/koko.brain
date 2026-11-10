import { describe, it, expect } from 'vitest';
import type { TodoistTaskLink } from '#lib/contracts/index.js';
import { applyLineChange, type CompletionPlan } from '#lib/features/todoist-sync/completion.logic.js';
import { planFields, type FieldsInput } from '#lib/features/todoist-sync/fields.logic.js';
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
		...extra,
	};
}

const EMPTY: CompletionPlan = { lineChanges: [], links: [], commands: [], log: [] };
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

describe('planFields: guards and merge', () => {
	it('does nothing when nothing changed in Todoist, whatever the line holds', () => {
		expect(planFields(input(link(), [line('Other 🔽 #x 🆔 td-a', { description: 'Other', priority: 'low', dueDate: null, tags: ['x'] })], [item()]), EMPTY)).toEqual(EMPTY);
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

		expect(planFields(input(link(), [line(LINE, {}, 'x')], [item({ content: 'New' })]), completion)).toEqual(completion);
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
