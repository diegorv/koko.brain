import { describe, it, expect } from 'vitest';
import {
	classifyTodoistError,
	countSyncScope,
	formatCheckResult,
	rootProjectChoices,
	syncErrorMessage,
	treeProjectIds,
	type ScopeItem,
	type ScopeProject,
} from '#lib/features/todoist-sync/sync-scope.logic.js';

function project(id: string, name: string, extra: Partial<ScopeProject> = {}): ScopeProject {
	return { id, name, parentId: null, childOrder: 1, isDeleted: false, isArchived: false, inboxProject: false, ...extra };
}

function item(projectId: string, extra: Partial<ScopeItem> = {}): ScopeItem {
	return { projectId, checked: false, isDeleted: false, ...extra };
}

const PROJECTS: ScopeProject[] = [
	project('inbox', 'Inbox', { inboxProject: true }),
	project('work', 'Work', { childOrder: 1 }),
	project('personal', 'Personal', { childOrder: 2 }),
	project('acme', 'Acme', { parentId: 'work', childOrder: 2 }),
	project('acme-q4', 'Q4', { parentId: 'acme' }),
	project('ops', 'Ops', { parentId: 'work', childOrder: 1 }),
	project('home', 'Home', { parentId: 'personal' }),
];

describe('treeProjectIds', () => {
	it('returns the root and every project nested under it at any depth', () => {
		expect(treeProjectIds(PROJECTS, 'work', false)).toEqual(new Set(['work', 'acme', 'acme-q4', 'ops']));
	});

	it('adds the Inbox only when asked', () => {
		expect(treeProjectIds(PROJECTS, 'personal', true)).toEqual(new Set(['personal', 'home', 'inbox']));
		expect(treeProjectIds(PROJECTS, 'personal', false)).toEqual(new Set(['personal', 'home']));
	});

	it('leaves out deleted and archived projects and what sits under them', () => {
		const projects = [
			...PROJECTS.filter((p) => p.id !== 'acme'),
			project('acme', 'Acme', { parentId: 'work', isArchived: true }),
			project('old', 'Old', { parentId: 'work', isDeleted: true }),
		];
		expect(treeProjectIds(projects, 'work', false)).toEqual(new Set(['work', 'ops']));
	});

	it('returns null when the root is missing, deleted or archived', () => {
		expect(treeProjectIds(PROJECTS, 'nope', true)).toBeNull();
		expect(treeProjectIds([project('work', 'Work', { isDeleted: true })], 'work', false)).toBeNull();
		expect(treeProjectIds([project('work', 'Work', { isArchived: true })], 'work', false)).toBeNull();
	});

	it('returns null for an empty root and an empty project list', () => {
		expect(treeProjectIds(PROJECTS, '', false)).toBeNull();
		expect(treeProjectIds([], 'work', false)).toBeNull();
	});

	it('survives a parent cycle', () => {
		const projects = [project('a', 'A', { parentId: 'b' }), project('b', 'B', { parentId: 'a' })];
		expect(treeProjectIds(projects, 'a', false)).toEqual(new Set(['a', 'b']));
	});
});

describe('countSyncScope', () => {
	it('counts the tree projects and their open tasks', () => {
		const items = [
			item('work'),
			item('acme-q4'),
			item('ops', { checked: true }),
			item('acme', { isDeleted: true }),
			item('home'),
			item('inbox'),
		];
		expect(countSyncScope(PROJECTS, items, 'work', false)).toEqual({ projects: 4, openTasks: 2, inboxIncluded: false });
	});

	it('includes the Inbox project and its tasks when asked', () => {
		const items = [item('home'), item('inbox'), item('inbox')];
		expect(countSyncScope(PROJECTS, items, 'personal', true)).toEqual({ projects: 3, openTasks: 3, inboxIncluded: true });
	});

	it('reports no Inbox when asked for one but the account has none', () => {
		const projects = PROJECTS.filter((p) => !p.inboxProject);
		expect(countSyncScope(projects, [], 'personal', true)).toEqual({ projects: 2, openTasks: 0, inboxIncluded: false });
	});

	it('returns null when the root is not found', () => {
		expect(countSyncScope(PROJECTS, [item('work')], 'missing', false)).toBeNull();
	});
});

describe('rootProjectChoices', () => {
	it('lists live non-Inbox projects in tree order with their path', () => {
		expect(rootProjectChoices(PROJECTS)).toEqual([
			{ id: 'work', label: 'Work' },
			{ id: 'ops', label: 'Work / Ops' },
			{ id: 'acme', label: 'Work / Acme' },
			{ id: 'acme-q4', label: 'Work / Acme / Q4' },
			{ id: 'personal', label: 'Personal' },
			{ id: 'home', label: 'Personal / Home' },
		]);
	});

	it('drops archived and deleted projects with their subtree', () => {
		const projects = [project('work', 'Work'), project('a', 'A', { parentId: 'work', isArchived: true }), project('b', 'B', { parentId: 'a' })];
		expect(rootProjectChoices(projects)).toEqual([{ id: 'work', label: 'Work' }]);
	});

	it('lists a project whose parent is not in the list at the top level', () => {
		expect(rootProjectChoices([project('x', 'Shared', { parentId: 'elsewhere' })])).toEqual([{ id: 'x', label: 'Shared' }]);
	});

	it('returns an empty list for no projects', () => {
		expect(rootProjectChoices([])).toEqual([]);
	});
});

describe('classifyTodoistError', () => {
	it('reads 401 and 403 as an invalid token', () => {
		expect(classifyTodoistError({ httpStatusCode: 401 })).toEqual({ kind: 'invalid-token' });
		expect(classifyTodoistError({ httpStatusCode: 403 })).toEqual({ kind: 'invalid-token' });
	});

	it('reads 429 as a rate limit with retry_after from error_extra', () => {
		expect(classifyTodoistError({ httpStatusCode: 429, responseData: { error_extra: { retry_after: 30 } } })).toEqual({
			kind: 'rate-limit',
			retryAfter: 30,
		});
	});

	it('reads 429 without a usable retry_after as a plain rate limit', () => {
		expect(classifyTodoistError({ httpStatusCode: 429 })).toEqual({ kind: 'rate-limit' });
		expect(classifyTodoistError({ httpStatusCode: 429, responseData: 'Too many' })).toEqual({ kind: 'rate-limit' });
		expect(classifyTodoistError({ httpStatusCode: 429, responseData: { error_extra: { retry_after: 'soon' } } })).toEqual({ kind: 'rate-limit' });
	});

	it('reads everything else as unreachable', () => {
		expect(classifyTodoistError({ httpStatusCode: 503 })).toEqual({ kind: 'unreachable' });
		expect(classifyTodoistError(new TypeError('Network request failed'))).toEqual({ kind: 'unreachable' });
		expect(classifyTodoistError(null)).toEqual({ kind: 'unreachable' });
		expect(classifyTodoistError('boom')).toEqual({ kind: 'unreachable' });
	});
});

describe('syncErrorMessage', () => {
	it('gives one fixed message per kind', () => {
		expect(syncErrorMessage({ kind: 'invalid-token' })).toBe('Todoist rejected the API token. Check it in Settings > Todoist.');
		expect(syncErrorMessage({ kind: 'rate-limit', retryAfter: 30 })).toBe('Todoist rate limit reached. Try again in 30 seconds.');
		expect(syncErrorMessage({ kind: 'rate-limit', retryAfter: 1 })).toBe('Todoist rate limit reached. Try again in 1 second.');
		expect(syncErrorMessage({ kind: 'rate-limit' })).toBe('Todoist rate limit reached. Try again later.');
		expect(syncErrorMessage({ kind: 'unreachable' })).toBe('Could not reach Todoist. Check your connection and try again.');
	});
});

describe('formatCheckResult', () => {
	it('names the counts, with singulars and the Inbox when included', () => {
		expect(formatCheckResult({ projects: 4, openTasks: 12, inboxIncluded: false })).toBe('Todoist connection OK: 4 projects, 12 open tasks.');
		expect(formatCheckResult({ projects: 1, openTasks: 1, inboxIncluded: true })).toBe('Todoist connection OK: 1 project, 1 open task (Inbox included).');
		expect(formatCheckResult({ projects: 2, openTasks: 0, inboxIncluded: false })).toBe('Todoist connection OK: 2 projects, 0 open tasks.');
	});
});
