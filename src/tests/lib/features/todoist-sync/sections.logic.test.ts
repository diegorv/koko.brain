import { describe, it, expect } from 'vitest';
import type { TodoistSectionLink, TodoistTaskLink } from '#lib/contracts/index.js';
import type { LocalBase, PullItem, RemoteBase, ScannedLine } from '#lib/features/todoist-sync/pull.logic.js';
import {
	noteOutline,
	outOfScopeAnchors,
	placeInsert,
	planMoves,
	planSections,
	type LineNote,
	type MoveInput,
	type PullSection,
	type SectionInput,
	type SectionNote,
} from '#lib/features/todoist-sync/sections.logic.js';

const WORK = '---\ntodoist_project: work\n---\n- [ ] Plan 🆔 td-w1\n\n## Next\n- [ ] Hire 🆔 td-w3\n### Detail\n- [ ] Deep 🆔 td-w4\n# Other\n- [ ] Loose 🆔 td-w5\n';

describe('noteOutline', () => {
	it('reads the ## headings and the heading above each task line; ### does not end a section, # does', () => {
		const outline = noteOutline(WORK);

		expect(outline.headings).toEqual(['Next']);
		expect([...outline.withTasks]).toEqual(['Next']);
		expect(Object.fromEntries(outline.anchorHeadings)).toEqual({ 'td-w1': null, 'td-w3': 'Next', 'td-w4': 'Next', 'td-w5': null });
		expect(outline.anchorLines.get('td-w3')).toBe('- [ ] Hire 🆔 td-w3');
		expect(outline.lineHeadings.get(7)).toBe('Next');
	});

	it('skips frontmatter and code fences, and keeps a repeated heading twice', () => {
		const outline = noteOutline('---\n## Fm\n---\n```\n## Code\n- [ ] x 🆔 td-x\n```\n## A\n## A\n');

		expect(outline.headings).toEqual(['A', 'A']);
		expect(outline.anchorHeadings.size).toBe(0);
		expect(outline.withTasks.size).toBe(0);
	});

	it('reads an empty note as no headings and no lines', () => {
		expect(noteOutline('')).toEqual({ headings: [], withTasks: new Set(), lineHeadings: new Map(), anchorHeadings: new Map(), anchorLines: new Map() });
	});
});

function section(id: string, name: string, extra: Partial<PullSection> = {}): PullSection {
	return { id, projectId: 'work', name, sectionOrder: 1, isArchived: false, isDeleted: false, ...extra };
}

function sectionLink(id: string, heading: string, projectId = 'work'): TodoistSectionLink {
	return { todoistSectionId: id, projectId, heading };
}

function note(content: string, projectId = 'work', relPath = `Todoist/${projectId}.md`): SectionNote {
	return { projectId, relPath, outline: noteOutline(content) };
}

function sectionInput(extra: Partial<SectionInput>): SectionInput {
	let n = 0;
	return { sections: [], links: [], notes: [], allowWrites: true, newUuid: () => `u${++n}`, newTempId: () => `t${n}`, ...extra };
}

describe('planSections: from Todoist', () => {
	it('appends a heading for a new section, in section order, and targets it', () => {
		const plan = planSections(sectionInput({ sections: [section('s2', 'Later', { sectionOrder: 2 }), section('s1', 'Next')], notes: [note('')] }));

		expect(plan.appends.map((a) => a.link)).toEqual([sectionLink('s1', 'Next'), sectionLink('s2', 'Later')]);
		expect(Object.fromEntries(plan.targetHeadings)).toEqual({ s1: 'Next', s2: 'Later' });
		expect(plan.paired).toEqual([]);
	});

	it('pairs a new section with the one heading of its text instead of appending', () => {
		const plan = planSections(sectionInput({ sections: [section('s1', ' Next ')], notes: [note('## Next\n')] }));

		expect(plan.paired).toEqual([sectionLink('s1', 'Next')]);
		expect(plan.appends).toEqual([]);
		expect(plan.scannedSections.get('work')?.get('Next')).toBe('s1');
	});

	it('writes nothing for a heading that appears twice, a section without a note, or one that is deleted or archived', () => {
		const plan = planSections(
			sectionInput({
				sections: [section('s1', 'Next'), section('s2', 'Gone', { isDeleted: true }), section('s3', 'Old', { isArchived: true }), section('s4', 'Away', { projectId: 'acme' })],
				notes: [note('## Next\n## Next\n')],
			}),
		);

		expect(plan.appends).toEqual([]);
		expect(plan.paired).toEqual([]);
		expect(plan.targetHeadings.size).toBe(0);
	});

	it('renames the heading of a renamed section, and only moves the stored text when the brain has the new name already', () => {
		const renamed = planSections(sectionInput({ sections: [section('s1', 'Now')], links: [sectionLink('s1', 'Next')], notes: [note('## Next\n')] }));
		const followed = planSections(sectionInput({ sections: [section('s1', 'Now')], links: [sectionLink('s1', 'Next')], notes: [note('## Now\n')] }));

		expect(renamed.renames).toEqual([{ relPath: 'Todoist/work.md', from: 'Next', link: sectionLink('s1', 'Now') }]);
		expect(renamed.targetHeadings.get('s1')).toBe('Now');
		expect(renamed.scannedSections.get('work')?.get('Next')).toBe('s1');
		expect(followed.renames).toEqual([]);
		expect(followed.paired).toEqual([sectionLink('s1', 'Now')]);
	});

	it('only pairs in rebuild mode: no append, no rename, no add', () => {
		const plan = planSections(
			sectionInput({
				allowWrites: false,
				sections: [section('s1', 'Next'), section('s2', 'Later'), section('s3', 'Now')],
				links: [sectionLink('s3', 'Was')],
				notes: [note('## Next\n- [ ] a\n## Was\n## Mine\n- [ ] b\n')],
			}),
		);

		expect(plan.paired).toEqual([sectionLink('s1', 'Next')]);
		expect(plan.appends).toEqual([]);
		expect(plan.renames).toEqual([]);
		expect(plan.adds).toEqual([]);
	});
});

describe('planSections: from the brain', () => {
	it('adds a section for a heading with a task line that no link names; a heading without one is left alone', () => {
		const plan = planSections(sectionInput({ notes: [note('## Errands\n- [ ] Buy milk\n## Empty\n')] }));

		expect(plan.adds).toEqual([{ projectId: 'work', relPath: 'Todoist/work.md', heading: 'Errands', uuid: 'u1', tempId: 't1', renamed: null }]);
	});

	it('adds no section for a ## heading with no text, even with a task line under it', () => {
		const plan = planSections(sectionInput({ notes: [note('##   \n- [ ] a\n')] }));

		expect(plan.adds).toEqual([]);
	});

	it('adds a renamed heading as a new section that carries the log row of the link whose heading is gone', () => {
		const plan = planSections(sectionInput({ sections: [section('s1', 'Next')], links: [sectionLink('s1', 'Next')], notes: [note('## Soon\n- [ ] a\n')] }));

		expect(plan.adds.map((a) => [a.heading, a.renamed])).toEqual([['Soon', { kind: 'section-renamed', anchor: null, message: expect.stringContaining('"Next"') }]]);
		expect(plan.targetHeadings.has('s1')).toBe(false);
	});

	it('adds nothing for a heading a link names, even of a section no longer live', () => {
		const plan = planSections(sectionInput({ sections: [section('s1', 'Next', { isArchived: true })], links: [sectionLink('s1', 'Next')], notes: [note('## Next\n- [ ] a\n')] }));

		expect(plan.adds).toEqual([]);
		expect(plan.scannedSections.get('work')?.has('Next')).toBe(false);
	});
});

function taskLink(id: string, local: Partial<LocalBase>, remote: Partial<RemoteBase>, extra: Partial<TodoistTaskLink> = {}): TodoistTaskLink {
	return {
		anchor: `td-${id}`,
		todoistId: id,
		noteRelPath: 'Todoist/Work.md',
		localBase: JSON.stringify({ description: id, status: ' ', dueDate: null, priority: null, tags: [], ...local }),
		remoteBase: JSON.stringify({ content: id, projectId: 'work', sectionId: null, parentId: null, checked: false, priority: 1, due: null, labels: [], unmappedLabels: [], contentProblem: null, ...remote }),
		pendingUuid: null,
		pendingCmd: null,
		missCount: 0,
		frozen: false,
		...extra,
	};
}

function item(id: string, extra: Partial<PullItem> = {}): PullItem {
	return { id, projectId: 'work', sectionId: null, parentId: null, content: id, description: '', labels: [], priority: 1, due: null, checked: false, isDeleted: false, childOrder: 1, ...extra };
}

function scanned(anchor: string, relPath: string, extra: Partial<ScannedLine> = {}): ScannedLine {
	return { relPath, lineNumber: 1, line: `x 🆔 ${anchor}`, status: ' ', fields: { description: 'x', dueDate: null, priority: null, tags: [] }, indent: 0, recurrence: null, ...extra };
}

const WORK_NOTE = '---\ntodoist_project: work\n---\n- [ ] Top 🆔 td-a\n\n## Next\n- [ ] In next 🆔 td-b\n';
const ACME_NOTE = '---\ntodoist_project: acme\n---\n- [ ] In acme 🆔 td-c\n';

function moveInput(links: TodoistTaskLink[], items: PullItem[], extra: Partial<MoveInput> = {}): MoveInput {
	const notes = new Map<string, LineNote>([
		['Todoist/Work.md', { kind: 'project', projectId: 'work', outline: noteOutline(WORK_NOTE) }],
		['Todoist/Acme.md', { kind: 'project', projectId: 'acme', outline: noteOutline(ACME_NOTE) }],
		['Notes/Day.md', { kind: 'other' }],
	]);
	const occurrences = new Map<string, ScannedLine[]>([
		['td-a', [scanned('td-a', 'Todoist/Work.md')]],
		['td-b', [scanned('td-b', 'Todoist/Work.md')]],
		['td-c', [scanned('td-c', 'Todoist/Acme.md')]],
	]);
	let n = 0;
	return {
		links,
		skip: new Set(),
		occurrences,
		items: new Map(items.map((i) => [i.id, i])),
		treeIds: new Set(['work', 'acme']),
		notes,
		scannedSections: new Map([['work', new Map([['Next', 'sn']])], ['acme', new Map()]]),
		targetHeadings: new Map([['sn', 'Next']]),
		projectNotes: new Map([['work', 'Todoist/Work.md'], ['acme', 'Todoist/Acme.md']]),
		newUuid: () => `u${++n}`,
		...extra,
	};
}

const AT_WORK = { location: { projectId: 'work', sectionId: null } };
const AT_NEXT = { location: { projectId: 'work', sectionId: 'sn' } };
const location = (link: TodoistTaskLink) => (JSON.parse(link.localBase!) as LocalBase).location;
const remotePlace = (link: TodoistTaskLink) => {
	const r = JSON.parse(link.remoteBase!) as RemoteBase;
	return { projectId: r.projectId, sectionId: r.sectionId };
};

describe('planMoves: from Todoist', () => {
	it('moves the line of a task moved into a section under its heading, within its note', () => {
		const plan = planMoves(moveInput([taskLink('a', AT_WORK, {})], [item('a', { sectionId: 'sn' })]));

		expect(plan.lineMoves).toEqual([
			{ anchor: 'td-a', from: 'Todoist/Work.md', to: 'Todoist/Work.md', heading: 'Next', line: '- [ ] Top 🆔 td-a', link: expect.any(Object) },
		]);
		expect(location(plan.lineMoves[0].link)).toEqual({ projectId: 'work', sectionId: 'sn' });
		expect(remotePlace(plan.lineMoves[0].link)).toEqual({ projectId: 'work', sectionId: 'sn' });
		expect(plan.pushes).toEqual([]);
	});

	it('moves the line of a task moved to another project into that note, above its sections', () => {
		const plan = planMoves(moveInput([taskLink('b', AT_NEXT, { sectionId: 'sn' })], [item('b', { projectId: 'acme' })]));

		expect(plan.lineMoves.map((m) => [m.from, m.to, m.heading, m.link.noteRelPath])).toEqual([['Todoist/Work.md', 'Todoist/Acme.md', null, 'Todoist/Acme.md']]);
	});

	it('lets Todoist win when both sides moved the task, logging the brain place', () => {
		const plan = planMoves(moveInput([taskLink('a', AT_NEXT, { sectionId: 'sn' })], [item('a', { projectId: 'acme' })]));

		expect(plan.lineMoves.map((m) => m.to)).toEqual(['Todoist/Acme.md']);
		expect(plan.log).toEqual([{ kind: 'conflict', anchor: 'td-a', message: expect.stringContaining('Todoist/Work.md') }]);
	});

	it('moves a line with no place yet to Todoist place, and only sets the base when they agree', () => {
		const moved = planMoves(moveInput([taskLink('a', {}, { sectionId: 'sn' })], [item('a', { sectionId: 'sn' })]));
		const agreed = planMoves(moveInput([taskLink('b', {}, { sectionId: 'sn' })], [item('b', { sectionId: 'sn' })]));

		expect(moved.lineMoves.map((m) => m.heading)).toEqual(['Next']);
		expect(moved.log).toEqual([]);
		expect(agreed.lineMoves).toEqual([]);
		expect(agreed.links.map(location)).toEqual([{ projectId: 'work', sectionId: 'sn' }]);
	});

	it('waits while the target section has no heading', () => {
		const plan = planMoves(moveInput([taskLink('a', AT_WORK, {})], [item('a', { sectionId: 'other' })]));

		expect(plan).toEqual({ links: [], lineMoves: [], pushes: [], log: [] });
	});
});

describe('planMoves: from the brain', () => {
	it('sends item_move with the section of the heading the line moved under', () => {
		const plan = planMoves(moveInput([taskLink('b', AT_WORK, {})], [item('b')]));

		expect(plan.pushes.map((p) => p.args)).toEqual([{ id: 'b', sectionId: 'sn' }]);
		expect(location(plan.pushes[0].okLink)).toEqual({ projectId: 'work', sectionId: 'sn' });
		expect(remotePlace(plan.pushes[0].okLink)).toEqual({ projectId: 'work', sectionId: 'sn' });
		expect(location(plan.pushes[0].refusedLink)).toEqual({ projectId: 'work', sectionId: 'sn' });
		expect(remotePlace(plan.pushes[0].refusedLink)).toEqual({ projectId: 'work', sectionId: null });
	});

	it('sends item_move with the project for a line moved above the sections or into another project note', () => {
		const plan = planMoves(moveInput([taskLink('a', AT_NEXT, { sectionId: 'sn' }), taskLink('c', AT_WORK, {})], [item('a', { sectionId: 'sn' }), item('c')]));

		expect(plan.pushes.map((p) => p.args)).toEqual([
			{ id: 'a', projectId: 'work' },
			{ id: 'c', projectId: 'acme' },
		]);
		expect(plan.pushes[1].okLink.noteRelPath).toBe('Todoist/Acme.md');
	});

	it('changes nothing for a line where both bases already are', () => {
		const plan = planMoves(moveInput([taskLink('a', AT_WORK, {}), taskLink('b', AT_NEXT, { sectionId: 'sn' })], [item('a'), item('b', { sectionId: 'sn' })]));

		expect(plan).toEqual({ links: [], lineMoves: [], pushes: [], log: [] });
	});

	it('lets a line in another note follow Todoist: only the bases move', () => {
		const input = moveInput([taskLink('d', AT_WORK, {})], [item('d', { projectId: 'acme' })]);
		input.occurrences.set('td-d', [scanned('td-d', 'Notes/Day.md')]);

		const plan = planMoves(input);

		expect(plan.lineMoves).toEqual([]);
		expect(plan.pushes).toEqual([]);
		expect(plan.links.map(location)).toEqual([{ projectId: 'acme', sectionId: null }]);
	});

	it('skips busy, frozen and detached links, subtasks, closed tasks and a duplicated anchor', () => {
		const input = moveInput(
			[
				taskLink('a', AT_NEXT, {}),
				taskLink('b', AT_WORK, {}, { frozen: true }),
				taskLink('c', AT_WORK, {}, { missCount: 3 }),
				taskLink('e', AT_WORK, {}),
				taskLink('f', AT_WORK, {}),
				taskLink('g', AT_WORK, {}),
			],
			[item('a'), item('b'), item('c'), item('e', { parentId: 'a' }), item('f', { checked: true }), item('g')],
			{ skip: new Set(['td-a']) },
		);
		// Each of these lines sits under Next while its base says above the sections: without its reason it would be pushed.
		for (const id of ['c', 'e', 'f']) input.occurrences.set(`td-${id}`, [scanned(`td-${id}`, 'Todoist/Work.md')]);
		input.occurrences.set('td-g', [scanned('td-g', 'Todoist/Work.md'), scanned('td-g', 'Todoist/Work.md')]);
		const next = noteOutline(`${WORK_NOTE}- [ ] c 🆔 td-c\n- [ ] e 🆔 td-e\n- [ ] f 🆔 td-f\n- [ ] g 🆔 td-g\n`);
		input.notes = new Map([['Todoist/Work.md', { kind: 'project', projectId: 'work', outline: next }]]);

		expect(planMoves(input)).toEqual({ links: [], lineMoves: [], pushes: [], log: [] });
		input.skip = new Set();
		expect(planMoves(input).links.map((l) => l.anchor)).toEqual(['td-a']);
		input.links = input.links.map((l) => ({ ...l, frozen: false, missCount: 0 }));
		input.items = new Map([...input.items.values()].map((i) => [i.id, { ...i, parentId: null, checked: false }]));
		expect(planMoves(input).pushes.map((p) => p.anchor)).toEqual(['td-b', 'td-c', 'td-e', 'td-f']);
	});

	it('skips a line under a heading no live section is linked to', () => {
		const input = moveInput([taskLink('b', AT_WORK, {})], [item('b')], { scannedSections: new Map([['work', new Map()]]) });

		expect(planMoves(input)).toEqual({ links: [], lineMoves: [], pushes: [], log: [] });
	});

	it('gives a line with no place yet under a heading with no section Todoist place as its base, unless Todoist moved it', () => {
		const scannedSections = new Map([['work', new Map<string, string>()]]);
		const waiting = planMoves(moveInput([taskLink('b', {}, {})], [item('b')], { scannedSections }));
		const moved = planMoves(moveInput([taskLink('b', {}, {})], [item('b', { projectId: 'acme' })], { scannedSections }));

		expect(waiting.links.map(location)).toEqual([{ projectId: 'work', sectionId: null }]);
		expect(waiting.lineMoves).toEqual([]);
		expect(waiting.pushes).toEqual([]);
		expect(moved).toEqual({ links: [], lineMoves: [], pushes: [], log: [] });
	});
});

describe('outOfScopeAnchors', () => {
	it('names a line moved to another note without #todoist, and leaves the rest', () => {
		const notes = new Map<string, LineNote>([['Notes/Day.md', { kind: 'other' }], ['Todoist/Work.md', { kind: 'project', projectId: 'work', outline: noteOutline('') }]]);
		const occurrences = new Map<string, ScannedLine[]>([
			['td-a', [scanned('td-a', 'Notes/Day.md')]],
			['td-b', [scanned('td-b', 'Notes/Day.md', { fields: { description: 'x', dueDate: null, priority: null, tags: ['Todoist'] } })]],
			['td-c', [scanned('td-c', 'Todoist/Work.md')]],
			['td-d', [scanned('td-d', 'Notes/Unknown.md')]],
			['td-e', [scanned('td-e', 'Notes/Day.md', { fields: null })]],
		]);
		const links = ['a', 'b', 'c', 'd', 'e'].map((id) => taskLink(id, {}, {}));

		expect([...outOfScopeAnchors(links, occurrences, notes)]).toEqual(['td-a']);
		expect([...outOfScopeAnchors([], occurrences, notes)]).toEqual([]);
	});
});

describe('placeInsert', () => {
	it('puts a task of a known section under its heading and one of no section above the sections, with their place', () => {
		const inSection = placeInsert('- [ ] a 🆔 td-a', taskLink('a', {}, { sectionId: 'sn' }), new Map([['sn', 'Next']]));
		const noSection = placeInsert('- [ ] b 🆔 td-b', taskLink('b', {}, {}), new Map());

		expect(inSection.insert).toEqual({ afterHeading: 'Next', lines: ['- [ ] a 🆔 td-a'] });
		expect(location(inSection.link)).toEqual({ projectId: 'work', sectionId: 'sn' });
		expect(noSection.insert).toEqual({ afterHeading: null, beforeSections: true, lines: ['- [ ] b 🆔 td-b'] });
		expect(location(noSection.link)).toEqual({ projectId: 'work', sectionId: null });
	});

	it('puts a task whose section has no heading above the sections, with no place, so a later cycle moves it', () => {
		const placed = placeInsert('- [ ] a 🆔 td-a', taskLink('a', {}, { sectionId: 'sx' }), new Map());

		expect(placed.insert).toEqual({ afterHeading: null, beforeSections: true, lines: ['- [ ] a 🆔 td-a'] });
		expect(location(placed.link)).toBeUndefined();
	});
});
