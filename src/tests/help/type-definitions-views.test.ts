import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { executeQuery } from '#lib/features/collection/collection.logic.js';
import { parseCollectionYaml } from '#lib/features/collection/yaml-parser.js';
import type { NoteRecord } from '#lib/features/collection/collection.types.js';
import {
	buildOverriddenQuery,
	seedToolbarStateFromDefinition,
} from '#lib/features/type-definitions/type-note-list.logic.js';

// Runs the real `.view` files of `help/examples/type-definitions-features`
// against a vault where the example folder sits next to personal notes, so a
// copy of the folder lists only its own notes.

const FOLDER = join(process.cwd(), 'help/examples/type-definitions-features');

function record(path: string, props: Record<string, unknown>, ctime = Date.now()): NoteRecord {
	const name = path.split('/').pop() ?? path;
	return {
		path,
		name,
		basename: name.replace(/\.md$/, ''),
		folder: path.substring(0, path.lastIndexOf('/')),
		ext: '.md',
		mtime: Date.now(),
		ctime,
		size: 0,
		properties: new Map(Object.entries(props)),
	};
}

/** Paths of the notes a `.view` file lists, through both sidebar render paths. */
function listed(viewFile: string, notes: NoteRecord[]): { sidebar: string[]; list: string[] } {
	const parsed = parseCollectionYaml(readFileSync(join(FOLDER, viewFile), 'utf8'));
	if (!parsed.success) throw new Error(`${viewFile} does not parse`);
	const { definition } = parsed;
	const view = definition.views[0];
	const index = new Map(notes.map((n) => [n.path, n]));
	// TypeSidebar counts with the parsed definition as is.
	const sidebar = executeQuery(definition, view, index).records.map((r) => r.path);
	// TypeNoteList round-trips the filters through the toolbar groups first.
	const seed = seedToolbarStateFromDefinition(definition, view);
	const query = buildOverriddenQuery(definition, view, seed.globalFilters, seed.viewFilters, seed.sort);
	if (!query) throw new Error(`${viewFile} has no view`);
	const list = executeQuery(query.definition, query.view, index).records.map((r) => r.path);
	return { sidebar: sidebar.sort(), list: list.sort() };
}

const INSIDE = '/vault/Resources/help/examples/type-definitions-features';
const OWN_VAULT = '/Users/me/type-definitions-features';

describe('type-definitions-features .view files', () => {
	it('active-projects.view lists only active projects in the example folder', () => {
		const notes = [
			record(`${INSIDE}/project-kokobrain.md`, { _type: 'Project', status: 'active' }),
			record(`${INSIDE}/project-website-redesign.md`, { _type: 'Project', status: 'done' }),
			record(`${OWN_VAULT}/project-kokobrain.md`, { _type: 'Project', status: 'active' }),
			record('/vault/Work/personal-project.md', { _type: 'Project', status: 'active' }),
			record('/vault/Resources/help/examples/type-definitions-features-old/p.md', { _type: 'Project', status: 'active' }),
		];
		const expected = [`${INSIDE}/project-kokobrain.md`, `${OWN_VAULT}/project-kokobrain.md`].sort();
		expect(listed('active-projects.view', notes)).toEqual({ sidebar: expected, list: expected });
	});

	it('recent-meetings.view lists only recent meetings in the example folder', () => {
		const notes = [
			record(`${INSIDE}/meeting-weekly-standup.md`, { _type: 'Meeting' }),
			record(`${INSIDE}/meeting-kickoff.md`, { _type: 'Meeting' }, Date.now() - 60 * 86_400_000),
			record('/vault/Meetings/1-1 with boss.md', { _type: 'Meeting' }),
			record('/vault/Meetings/type-definitions-features-old/notes.md', { _type: 'Meeting' }),
		];
		const expected = [`${INSIDE}/meeting-weekly-standup.md`];
		expect(listed('recent-meetings.view', notes)).toEqual({ sidebar: expected, list: expected });
	});

	it('lists nothing when the vault has no notes', () => {
		expect(listed('active-projects.view', [])).toEqual({ sidebar: [], list: [] });
		expect(listed('recent-meetings.view', [])).toEqual({ sidebar: [], list: [] });
	});
});
