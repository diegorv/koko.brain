import { describe, it, expect } from 'vitest';
import {
	heldProjectIds,
	noteBaseName,
	planProjects,
	projectStateEntry,
	readProjectState,
	type ProjectInput,
	type ProjectState,
} from '#lib/features/todoist-sync/projects.logic.js';
import type { ScannedNote } from '#lib/features/todoist-sync/pull.logic.js';
import type { ScopeProject } from '#lib/features/todoist-sync/sync-scope.logic.js';

function project(id: string, name: string, extra: Partial<ScopeProject> = {}): ScopeProject {
	return { id, name, parentId: null, childOrder: 1, isDeleted: false, isArchived: false, inboxProject: false, ...extra };
}

const PROJECTS = [project('work', 'Work'), project('acme', 'Acme', { parentId: 'work' }), project('personal', 'Personal')];
const NOTES: ScannedNote[] = [
	{ relPath: 'Todoist/Work.md', projectId: 'work' },
	{ relPath: 'Todoist/Acme.md', projectId: 'acme' },
];
const BASES: ProjectState['bases'] = {
	work: { name: 'Work', relPath: 'Todoist/Work.md' },
	acme: { name: 'Acme', relPath: 'Todoist/Acme.md' },
};

function state(extra: Partial<ProjectState> = {}): ProjectState {
	return { bases: { ...BASES }, pending: [], refused: [], ...extra };
}

function input(extra: Partial<ProjectInput> = {}): ProjectInput {
	let n = 0;
	let t = 0;
	return {
		folder: 'Todoist',
		projects: PROJECTS,
		treeIds: new Set(['work', 'acme']),
		rootId: 'work',
		notes: NOTES,
		createdNotes: [],
		templatesFolder: '_system/templates',
		state: state(),
		allowAdds: true,
		newUuid: () => `uuid-${++n}`,
		newTempId: () => `tmp-${++t}`,
		...extra,
	};
}

describe('readProjectState', () => {
	it('reads the stored JSON back', () => {
		const s = state({ refused: ['Todoist/X.md'] });

		expect(readProjectState([projectStateEntry(s)])).toEqual(s);
	});

	it('is empty without the row or with unreadable JSON', () => {
		const empty = { bases: {}, pending: [], refused: [] };
		expect(readProjectState([])).toEqual(empty);
		expect(readProjectState([{ key: 'projects', value: '{oops' }])).toEqual(empty);
		expect(readProjectState([{ key: 'projects', value: 'null' }])).toEqual(empty);
	});
});

describe('noteBaseName', () => {
	it('drops the folder and the Markdown extension', () => {
		expect(noteBaseName('Todoist/Q4 plan.md')).toBe('Q4 plan');
		expect(noteBaseName('Old.markdown')).toBe('Old');
	});
});

describe('planProjects: bases', () => {
	it('adopts the name and path of a project without a base, and of the notes the pull creates', () => {
		const plan = planProjects(input({ state: state({ bases: {} }), createdNotes: [{ projectId: 'acme', relPath: 'Todoist/Acme 2.md' }], notes: [NOTES[0]] }));

		expect(plan.state.bases).toEqual({ work: { name: 'Work', relPath: 'Todoist/Work.md' }, acme: { name: 'Acme', relPath: 'Todoist/Acme 2.md' } });
		expect(plan.renames).toEqual([]);
		expect(plan.updates).toEqual([]);
	});

	it('leaves an unchanged project as it is and follows a note moved to another folder', () => {
		const notes = [NOTES[0], { relPath: 'Areas/Acme.md', projectId: 'acme' }];

		const plan = planProjects(input({ notes }));

		expect(plan.state.bases.acme).toEqual({ name: 'Acme', relPath: 'Areas/Acme.md' });
		expect(plan.renames).toEqual([]);
		expect(plan.updates).toEqual([]);
		expect(plan.log).toEqual([]);
	});
});

describe('planProjects: renames', () => {
	it('renames the note after a Todoist rename, cleaning the name and adding a suffix on collision', () => {
		const projects = [PROJECTS[0], project('acme', 'Acme: Launch', { parentId: 'work' })];
		const notes = [...NOTES, { relPath: 'Todoist/Acme- Launch.md', projectId: null }];

		const plan = planProjects(input({ projects, notes }));

		expect(plan.renames).toEqual([{ projectId: 'acme', name: 'Acme: Launch', from: 'Todoist/Acme.md', to: 'Todoist/Acme- Launch 2.md' }]);
		expect(plan.state.bases.acme).toEqual(BASES.acme);
	});

	it('keeps the note path on a case-only Todoist rename: no rename, no suffix, the base takes the name', () => {
		const projects = [PROJECTS[0], project('acme', 'acme', { parentId: 'work' })];

		const plan = planProjects(input({ projects }));

		expect(plan.renames).toEqual([]);
		expect(plan.updates).toEqual([]);
		expect(plan.state.bases.acme).toEqual({ name: 'acme', relPath: 'Todoist/Acme.md' });
	});

	it("leaves the note's own path out of the collision check", () => {
		const projects = [PROJECTS[0], project('acme', 'Acme', { parentId: 'work' })];
		const notes = [NOTES[0], { relPath: 'Todoist/Acme.md', projectId: null }, { relPath: 'Todoist/Acme 2.md', projectId: 'acme' }];
		const bases = { ...BASES, acme: { name: 'Old', relPath: 'Todoist/Acme 2.md' } };

		const plan = planProjects(input({ projects, notes, state: state({ bases }) }));

		expect(plan.renames).toEqual([]);
		expect(plan.state.bases.acme).toEqual({ name: 'Acme', relPath: 'Todoist/Acme 2.md' });
	});

	it('pushes a note rename as project_update with the file name', () => {
		const notes = [NOTES[0], { relPath: 'Todoist/Acme Corp.md', projectId: 'acme' }];

		const plan = planProjects(input({ notes }));

		expect(plan.updates).toEqual([{ projectId: 'acme', uuid: 'uuid-1', name: 'Acme Corp', relPath: 'Todoist/Acme Corp.md', remoteName: 'Acme' }]);
		expect(plan.state.bases.acme).toEqual(BASES.acme);
	});

	it('lets Todoist win when both sides renamed, logging the brain name', () => {
		const projects = [PROJECTS[0], project('acme', 'Acme Inc', { parentId: 'work' })];
		const notes = [NOTES[0], { relPath: 'Todoist/Acme Corp.md', projectId: 'acme' }];

		const plan = planProjects(input({ projects, notes }));

		expect(plan.renames).toEqual([{ projectId: 'acme', name: 'Acme Inc', from: 'Todoist/Acme Corp.md', to: 'Todoist/Acme Inc.md' }]);
		expect(plan.updates).toEqual([]);
		expect(plan.log).toEqual([expect.objectContaining({ kind: 'conflict', message: expect.stringContaining('Acme Corp') })]);
	});

	it('only moves the base when both sides already carry the same name', () => {
		const projects = [PROJECTS[0], project('acme', 'Acme Corp', { parentId: 'work' })];
		const notes = [NOTES[0], { relPath: 'Todoist/Acme Corp.md', projectId: 'acme' }];

		const plan = planProjects(input({ projects, notes }));

		expect(plan.renames).toEqual([]);
		expect(plan.updates).toEqual([]);
		expect(plan.state.bases.acme).toEqual({ name: 'Acme Corp', relPath: 'Todoist/Acme Corp.md' });
	});

	it('never renames the Inbox', () => {
		const projects = [...PROJECTS, project('inbox', 'Inbox', { inboxProject: true })];
		const notes = [...NOTES, { relPath: 'Todoist/Triage.md', projectId: 'inbox' }];
		const s = state({ bases: { ...BASES, inbox: { name: 'Inbox', relPath: 'Todoist/Inbox.md' } } });

		const plan = planProjects(input({ projects, notes, state: s, treeIds: new Set(['work', 'acme', 'inbox']) }));

		expect(plan.updates).toEqual([]);
		expect(plan.state.bases.inbox.relPath).toBe('Todoist/Triage.md');
	});

	it('freezes a project named by two notes: no rename, no update', () => {
		const projects = [PROJECTS[0], project('acme', 'Acme Inc', { parentId: 'work' })];
		const notes = [...NOTES, { relPath: 'Notes/Copy.md', projectId: 'acme' }];

		const plan = planProjects(input({ projects, notes }));

		expect(plan.frozenProjectIds).toEqual(new Set(['acme']));
		expect(plan.renames).toEqual([]);
	});
});

describe('planProjects: leaving the tree', () => {
	it('detaches a deleted project and one moved under a live project outside the tree, logged once', () => {
		const projects = [PROJECTS[0], project('acme', 'Acme', { isDeleted: true }), PROJECTS[2], project('ops', 'Ops', { parentId: 'personal' })];
		const s = state({ bases: { ...BASES, ops: { name: 'Ops', relPath: 'Todoist/Ops.md' } } });

		const plan = planProjects(input({ projects, state: s, treeIds: new Set(['work']), notes: [NOTES[0]] }));

		expect(plan.state.bases.acme).toEqual({ ...BASES.acme, detached: true });
		expect(plan.state.bases.ops).toEqual({ name: 'Ops', relPath: 'Todoist/Ops.md', detached: true });
		expect(plan.log.map((e) => [e.kind, e.message.includes('deleted') ? 'deleted' : 'moved'])).toEqual([
			['detach', 'deleted'],
			['detach', 'moved'],
		]);
		const again = planProjects(input({ projects, state: plan.state, treeIds: new Set(['work']), notes: [NOTES[0]] }));
		expect(again.log).toEqual([]);
	});

	it('keeps the base of an archived or unknown project, and re-adopts a detached one back in the tree', () => {
		const archived = planProjects(input({ projects: [PROJECTS[0], project('acme', 'Acme', { parentId: 'work', isArchived: true })], treeIds: new Set(['work']) }));
		const unknown = planProjects(input({ projects: [PROJECTS[0]], treeIds: new Set(['work']) }));
		const back = planProjects(input({ state: state({ bases: { ...BASES, acme: { name: 'Old', relPath: 'Todoist/Old.md', detached: true } } }) }));

		expect(archived.state.bases.acme).toEqual(BASES.acme);
		expect(unknown.state.bases.acme).toEqual(BASES.acme);
		expect(archived.log).toEqual([]);
		expect(back.state.bases.acme).toEqual(BASES.acme);
		expect(back.renames).toEqual([]);
	});
});

describe('planProjects: brain-born projects', () => {
	it('adds a note directly in the sync folder without todoist_project, under the root', () => {
		const notes = [...NOTES, { relPath: 'Todoist/Launch.md', projectId: null }];

		const plan = planProjects(input({ notes }));

		expect(plan.adds).toEqual([{ relPath: 'Todoist/Launch.md', uuid: 'uuid-1', tempId: 'tmp-1', args: { name: 'Launch', parentId: 'work' } }]);
		expect(plan.state.pending).toEqual([]);
	});

	it('adds nothing for subfolders, other folders, excluded paths, refused notes, a note a base points at, or in rebuild mode', () => {
		const notes = [
			...NOTES,
			{ relPath: 'Todoist/Sub/Deep.md', projectId: null },
			{ relPath: 'Notes/Day.md', projectId: null },
			{ relPath: 'Todoist/Refused.md', projectId: null },
		];
		const excluded = planProjects(input({ folder: '_system/templates', notes: [{ relPath: '_system/templates/T.md', projectId: null }] }));
		const refused = planProjects(input({ notes, state: state({ refused: ['Todoist/Refused.md', 'Todoist/Gone.md'] }) }));
		const rebuild = planProjects(input({ notes: [...NOTES, { relPath: 'Todoist/Launch.md', projectId: null }], allowAdds: false }));

		const indexBehind = planProjects(
			input({ notes: [NOTES[0], { relPath: 'Todoist/Launch.md', projectId: null }], state: state({ bases: { ...BASES, p9: { name: 'Launch', relPath: 'Todoist/Launch.md' } } }) }),
		);
		expect(indexBehind.adds).toEqual([]);
		expect(excluded.adds).toEqual([]);
		expect(refused.adds).toEqual([]);
		expect(refused.state.refused).toEqual(['Todoist/Refused.md']);
		expect(rebuild.adds).toEqual([]);
	});

	it('resends a stored pending add as is, and drops one whose note is gone or has an id', () => {
		const pending = (relPath: string) => ({ relPath, uuid: `u-${relPath}`, tempId: `t-${relPath}`, args: { name: noteBaseName(relPath), parentId: 'work' } });
		const s = state({ pending: [pending('Todoist/Launch.md'), pending('Todoist/Gone.md'), pending('Todoist/Acme.md')] });
		const notes = [...NOTES, { relPath: 'Todoist/Launch.md', projectId: null }];

		const plan = planProjects(input({ notes, state: s }));
		const rebuild = planProjects(input({ notes, state: s, allowAdds: false }));

		expect(plan.resends).toEqual([pending('Todoist/Launch.md')]);
		expect(plan.adds).toEqual([]);
		expect(plan.state.pending).toEqual([pending('Todoist/Launch.md')]);
		expect(rebuild.resends).toEqual([]);
		expect(rebuild.state.pending).toEqual([pending('Todoist/Launch.md')]);
	});
});

describe('heldProjectIds', () => {
	it('holds a tree project with no note and no base named like a pending add under the root', () => {
		const projects = [...PROJECTS, project('p9', 'Launch', { parentId: 'work' }), project('p8', 'Other', { parentId: 'work' })];
		const s = state({ pending: [{ relPath: 'Todoist/Launch.md', uuid: 'u', tempId: 't', args: { name: 'Launch', parentId: 'work' } }] });
		const tree = new Set(['work', 'acme', 'p9', 'p8']);

		expect(heldProjectIds(s, projects, tree, NOTES)).toEqual(new Set(['p9']));
		expect(heldProjectIds(state(), projects, tree, NOTES)).toEqual(new Set());
	});
});
