import { describe, it, expect } from 'vitest';
import type { TodoistTaskLink } from '#lib/contracts/index.js';
import { belowLineBrake, isDetached, planDetach, type DetachInput } from '#lib/features/todoist-sync/detach.logic.js';
import type { PullItem, ScannedLine } from '#lib/features/todoist-sync/pull.logic.js';
import type { ScopeProject } from '#lib/features/todoist-sync/sync-scope.logic.js';

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

function link(id: string, extra: Partial<TodoistTaskLink> = {}): TodoistTaskLink {
	return {
		anchor: `td-${id}`,
		todoistId: id,
		noteRelPath: 'Todoist/Work.md',
		localBase: '{}',
		remoteBase: '{}',
		pendingUuid: null,
		pendingCmd: null,
		missCount: 0,
		frozen: false,
		...extra,
	};
}

function line(anchor: string): ScannedLine {
	return { relPath: 'Todoist/Work.md', lineNumber: 1, line: `T 🆔 ${anchor}`, status: ' ', fields: null };
}

/** Occurrences with one line for each anchor given. */
function seen(...anchors: string[]): Map<string, ScannedLine[]> {
	return new Map(anchors.map((a) => [a, [line(a)]]));
}

function project(id: string, extra: Partial<ScopeProject> = {}): ScopeProject {
	return { id, name: id, parentId: null, childOrder: 1, isDeleted: false, isArchived: false, ...extra };
}

/** `work` is the root with `acme` under it; `personal` is a live project outside the tree. */
const PROJECTS = [project('work'), project('acme', { parentId: 'work' }), project('personal')];

function input(links: TodoistTaskLink[], occurrences: Map<string, ScannedLine[]>, items: PullItem[] = [], projects: ScopeProject[] = PROJECTS): DetachInput {
	return { links, occurrences, items: new Map(items.map((i) => [i.id, i])), treeIds: new Set(['work', 'acme']), projects };
}

describe('isDetached', () => {
	it('is true from 3 misses on', () => {
		expect(isDetached(link('a', { missCount: 0 }))).toBe(false);
		expect(isDetached(link('a', { missCount: 2 }))).toBe(false);
		expect(isDetached(link('a', { missCount: 3 }))).toBe(true);
		expect(isDetached(link('a', { missCount: 7 }))).toBe(true);
	});
});

describe('planDetach: Todoist side', () => {
	it('detaches a link whose item is deleted, keeping the line, clearing the pending command, logged', () => {
		const a = link('a', { pendingCmd: '{"uuid":"u","type":"item_close"}' });

		const plan = planDetach(input([a], seen('td-a'), [item('a', { isDeleted: true })]));

		expect(plan.links).toEqual([{ ...a, missCount: 3, pendingCmd: null }]);
		expect(plan.detached).toEqual(['td-a']);
		expect(plan.log).toEqual([expect.objectContaining({ kind: 'detach', anchor: 'td-a', message: expect.stringContaining('deleted in Todoist') })]);
	});

	it('detaches a link whose item moved to a project outside the tree, logged', () => {
		const plan = planDetach(input([link('a')], seen('td-a'), [item('a', { projectId: 'personal' })]));

		expect(plan.detached).toEqual(['td-a']);
		expect(plan.links[0].missCount).toBe(3);
		expect(plan.log).toEqual([expect.objectContaining({ kind: 'detach', anchor: 'td-a', message: expect.stringContaining('outside') })]);
	});

	it('keeps a link whose item moved within the tree, or is closed there', () => {
		const plan = planDetach(input([link('a'), link('b')], seen('td-a', 'td-b'), [item('a', { projectId: 'acme' }), item('b', { checked: true })]));

		expect(plan).toEqual({ links: [], detached: [], log: [] });
	});

	it('keeps a link whose item is in a project the pull does not know', () => {
		const plan = planDetach(input([link('a')], seen('td-a'), [item('a', { projectId: 'created-later' })]));

		expect(plan).toEqual({ links: [], detached: [], log: [] });
	});

	it('keeps a link whose item is in an archived or deleted project, or one under an archived parent', () => {
		const projects = [
			...PROJECTS,
			project('old', { parentId: 'work', isArchived: true }),
			project('under-old', { parentId: 'old' }),
			project('gone', { isDeleted: true }),
		];
		const items = [item('a', { projectId: 'old' }), item('b', { projectId: 'under-old' }), item('c', { projectId: 'gone' })];

		const plan = planDetach(input([link('a'), link('b'), link('c')], seen('td-a', 'td-b', 'td-c'), items, projects));

		expect(plan).toEqual({ links: [], detached: [], log: [] });
	});

	it('detaches a link whose item moved under a live project outside the tree', () => {
		const projects = [...PROJECTS, project('side', { parentId: 'personal' })];

		const plan = planDetach(input([link('a')], seen('td-a'), [item('a', { projectId: 'side' })], projects));

		expect(plan.detached).toEqual(['td-a']);
	});

	it('never counts an item missing from the pull as deleted', () => {
		const plan = planDetach(input([link('a', { missCount: 2 })], seen('td-a'), []));

		expect(plan.detached).toEqual([]);
		expect(plan.links).toEqual([link('a', { missCount: 0 })]);
	});
});

describe('planDetach: vault side', () => {
	it('counts a miss for a line not in the scan, and detaches on the third one, logged', () => {
		const one = planDetach(input([link('a')], seen(), [item('a')]));
		expect(one.links).toEqual([link('a', { missCount: 1 })]);
		expect(one.detached).toEqual([]);
		expect(one.log).toEqual([]);

		const two = planDetach(input([link('a', { missCount: 1 })], seen(), [item('a')]));
		expect(two.links).toEqual([link('a', { missCount: 2 })]);

		const three = planDetach(input([link('a', { missCount: 2 })], seen(), [item('a')]));
		expect(three.links).toEqual([link('a', { missCount: 3 })]);
		expect(three.detached).toEqual(['td-a']);
		expect(three.log).toEqual([expect.objectContaining({ kind: 'detach', anchor: 'td-a', message: expect.stringContaining('not found in the vault') })]);
	});

	it('resets the count when the line reappears', () => {
		const plan = planDetach(input([link('a', { missCount: 2 })], seen('td-a')));

		expect(plan.links).toEqual([link('a', { missCount: 0 })]);
	});

	it('changes nothing for a present line with no misses', () => {
		expect(planDetach(input([link('a')], seen('td-a'), [item('a')]))).toEqual({ links: [], detached: [], log: [] });
	});

	it('leaves detached links and links without a Todoist id alone', () => {
		const detached = link('a', { missCount: 3 });
		const pendingAdd = link('b', { todoistId: null });

		const plan = planDetach(input([detached, pendingAdd], seen(), [item('a', { isDeleted: true })]));

		expect(plan).toEqual({ links: [], detached: [], log: [] });
	});

	it('detaches a deleted item at once even when its line is gone too', () => {
		const plan = planDetach(input([link('a')], seen(), [item('a', { isDeleted: true })]));

		expect(plan.links).toEqual([link('a', { missCount: 3 })]);
		expect(plan.log).toEqual([expect.objectContaining({ message: expect.stringContaining('deleted in Todoist') })]);
	});
});

describe('belowLineBrake', () => {
	it('trips when fewer than half of the active links have a line', () => {
		const links = [link('a'), link('b'), link('c')];

		expect(belowLineBrake(links, seen('td-a'))).toBe(true);
		expect(belowLineBrake(links, seen('td-a', 'td-b'))).toBe(false);
	});

	it('does not trip at exactly half', () => {
		expect(belowLineBrake([link('a'), link('b')], seen('td-a'))).toBe(false);
	});

	it('trips when no anchored line is seen at all', () => {
		expect(belowLineBrake([link('a')], seen())).toBe(true);
	});

	it('never trips without active links: an empty table or only detached ones', () => {
		expect(belowLineBrake([], seen())).toBe(false);
		expect(belowLineBrake([link('a', { missCount: 3 }), link('b', { missCount: 3 })], seen())).toBe(false);
	});

	it('counts only active links', () => {
		const links = [link('a'), link('b', { missCount: 3 }), link('c', { missCount: 3 })];

		expect(belowLineBrake(links, seen('td-a'))).toBe(false);
	});
});
