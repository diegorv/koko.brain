import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

import { buildNoteRecord, executeQuery } from '#lib/features/collection/collection.logic.js';
import { parseCollectionYaml } from '#lib/features/collection/yaml-parser.js';
import type { PropertyIndexRecord } from '#lib/features/collection/collection.types.js';
import { normalizeTypeCasing } from '#lib/core/frontmatter/properties.logic.js';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
import type { FrontmatterValue, NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import { pinnedRailItems, queryViewLens, viewNavigatorRows } from '#lib/features/rail-shell/lens.logic.js';
import { buildTypeMetadataMap } from '#lib/features/type-definitions/type-definitions.logic.js';
import { ignoredKeyNotes, railViewNameNote } from '#lib/features/type-definitions/type-sidebar.logic.js';
import {
	buildOverriddenQuery,
	seedToolbarStateFromDefinition,
} from '#lib/features/type-definitions/type-note-list.logic.js';
import { entryV2 } from '../fixtures/vault-entries.fixture';

// Runs the real `.view` files of `help/examples/type-definitions-features`
// against a vault where the example folder sits next to personal notes, so a
// copy of the folder lists only its own notes.

const FOLDER = join(process.cwd(), 'help/examples/type-definitions-features');

function record(path: string, props: Record<string, unknown>, ctime = Date.now()): PropertyIndexRecord {
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
function listed(viewFile: string, notes: PropertyIndexRecord[]): { sidebar: string[]; list: string[] } {
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

/**
 * The example folder copied into a vault next to a personal note, as the
 * rail reads it: one index entry per file (a `.view`'s YAML is its
 * frontmatter, as Rust indexes it), the property-index records of the notes
 * and the file tree.
 */
const COPY = '/vault/examples/type-definitions-features';
const OUTSIDE = '/vault/Personal/outside.md';

/** The YAML frontmatter of a Markdown file, `type` read as `_type` like Rust's alias map. */
function frontmatterOf(text: string): Record<string, FrontmatterValue> {
	const match = text.match(/^---\n([\s\S]*?)\n---/);
	const fm = (match ? parseYaml(match[1]) : {}) as Record<string, FrontmatterValue>;
	if ('type' in fm) {
		fm._type = fm.type;
		delete fm.type;
	}
	return fm;
}

function noteEntry(path: string, fm: Record<string, FrontmatterValue>): NoteEntryV2 {
	return entryV2(path, {
		frontmatter: fm,
		isA: typeof fm._type === 'string' ? normalizeTypeCasing(fm._type) : null,
		organized: fm._organized !== false,
		archived: fm._archived === true,
		favorite: fm._favorite === true,
		tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
	});
}

function exampleVault() {
	const entries: NoteEntryV2[] = [];
	const index = new Map<string, PropertyIndexRecord>();
	const tree: FileTreeNode[] = [];
	const add = (path: string, text: string) => {
		if (path.endsWith('.view')) {
			entries.push(entryV2(path, { frontmatter: parseYaml(text) as Record<string, FrontmatterValue> }));
		} else {
			entries.push(noteEntry(path, frontmatterOf(text)));
			index.set(path, buildNoteRecord(path, text));
		}
	};
	for (const name of readdirSync(FOLDER)) {
		if (name === '_types' || name === 'README.md') continue;
		add(`${COPY}/${name}`, readFileSync(join(FOLDER, name), 'utf8'));
		tree.push({ name, path: `${COPY}/${name}`, isDirectory: false });
	}
	for (const name of readdirSync(join(FOLDER, '_types'))) {
		const path = `${COPY}/_types/${name}`;
		entries.push(entryV2(path, { frontmatter: frontmatterOf(readFileSync(join(FOLDER, '_types', name), 'utf8')), isA: 'Type' }));
	}
	const outside = '---\ntype: Project\nstatus: active\ndate: 2026-04-01\ntags:\n  - health\n---\n';
	add(OUTSIDE, outside);
	return { entries, index, tree, ctx: { entries, vaultPath: '/vault', systemFolder: '_system' } };
}

/** The paths the rail lists for a sample `.view`, through the query the note list runs. */
function railList(viewFile: string): string[] {
	const vault = exampleVault();
	const parsed = parseCollectionYaml(readFileSync(join(FOLDER, viewFile), 'utf8'));
	if (!parsed.success) throw new Error(`${viewFile} does not parse`);
	const result = queryViewLens(parsed.definition, null, vault.index, `${COPY}/${viewFile}`, vault.ctx);
	if (!result || result.filterError) throw new Error(`${viewFile} did not run: ${result?.filterError}`);
	return result.paths;
}

describe('type-definitions-features samples of the .view keys', () => {
	const viewFiles = readdirSync(FOLDER).filter((name) => name.endsWith('.view'));

	it('every sample .view parses and sets no reserved key to a value its reader ignores', () => {
		expect(viewFiles.sort()).toEqual([
			'active-projects.view',
			'dated-since-march.view',
			'drafts.view',
			'health.view',
			'project-inbox.view',
			'projects-by-status.view',
			'recent-meetings.view',
		]);
		for (const name of viewFiles) {
			const text = readFileSync(join(FOLDER, name), 'utf8');
			const parsed = parseCollectionYaml(text);
			if (!parsed.success) throw new Error(`${name}: ${parsed.error}`);
			expect(ignoredKeyNotes(parseYaml(text) as Record<string, unknown>), name).toEqual([]);
			expect(railViewNameNote(parsed.definition), name).toBeNull();
		}
	});

	it('every type definition sets no reserved key to a value its reader ignores, and none sets the unapplied _sort or _view', () => {
		for (const name of readdirSync(join(FOLDER, '_types'))) {
			const fm = frontmatterOf(readFileSync(join(FOLDER, '_types', name), 'utf8'));
			expect(ignoredKeyNotes(fm), name).toEqual([]);
			expect(Object.keys(fm).filter((k) => k === '_sort' || k === '_view'), name).toEqual([]);
		}
	});

	it('Views leaves out the hidden drafts.view and lists the Work group after the ungrouped views', () => {
		const { tree, entries } = exampleVault();
		const rows = viewNavigatorRows(tree, new Map(entries.map((e) => [e.path, e])));
		expect(rows.map((r) => [r.label, r.group])).toEqual([
			['Active Projects', null],
			['Recent Meetings', null],
			['Health', null],
			['Projects by Status', null],
			['Dated Since March 2026', null],
			['Project Inbox', 'Work'],
		]);
		expect(rows.every((r) => r.keyNotes.length === 0)).toBe(true);
	});

	it('the hidden drafts.view still lists the draft project', () => {
		expect(railList('drafts.view')).toEqual([`${COPY}/project-inbox-example.md`]);
	});

	it('the grouped project-inbox.view lists the unorganized project only', () => {
		expect(railList('project-inbox.view')).toEqual([`${COPY}/project-inbox-example.md`]);
	});

	it('health.view and the Responsibility type are pinned to the rail, by _order', () => {
		const { entries } = exampleVault();
		const pins = pinnedRailItems(entries, buildTypeMetadataMap(entries));
		expect(pins.map((p) => [p.kind, p.label])).toEqual([
			['type', 'Responsibilities'],
			['view', 'Health'],
		]);
	});

	it('health.view lists the health notes of the folder, not the personal one', () => {
		expect(railList('health.view').sort()).toEqual([
			`${COPY}/operation-strength-training.md`,
			`${COPY}/responsibility-stay-in-shape.md`,
		]);
	});

	it('projects-by-status.view runs the view _rail_view names, not the first one', () => {
		const vault = exampleVault();
		const parsed = parseCollectionYaml(readFileSync(join(FOLDER, 'projects-by-status.view'), 'utf8'));
		if (!parsed.success) throw new Error('projects-by-status.view does not parse');
		const result = queryViewLens(parsed.definition, null, vault.index, `${COPY}/projects-by-status.view`, vault.ctx);
		expect(result?.viewIndex).toBe(1);
		expect(result?.railViewName).toBe('Active');
		expect(result?.paths).toEqual([`${COPY}/project-kokobrain.md`]);
	});

	it('dated-since-march.view matches frontmatter dates on or after 2026-03-01, oldest first', () => {
		expect(railList('dated-since-march.view')).toEqual([
			`${COPY}/event-product-launch.md`,
			`${COPY}/meeting-weekly-standup.md`,
		]);
	});
});
