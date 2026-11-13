import { describe, it, expect } from 'vitest';
import type { CollectionDefinition, CollectionFilter, CollectionViewDef, PropertyIndexRecord, SortDef } from '#lib/features/collection/collection.types.js';
import type { FilterGroup } from '#lib/features/collection/toolbar/toolbar.types.js';
import {
	seedToolbarStateFromDefinition,
	buildOverriddenQuery,
	combineAvailableProperties,
	countActiveFilters,
	applyToolbarEdit,
	canonicalToolbarValue,
	toolbarKeyBase,
	toolbarKeysDiffering,
	toolbarValuesFromState,
	buildRenameFileName,
	resolveViewListSort,
	type ToolbarKey,
	type ToolbarValues,
} from '#lib/features/type-definitions/type-note-list.logic.js';
import { executeQuery } from '#lib/features/collection/collection.logic.js';
import { parseCollectionYaml } from '#lib/features/collection/yaml-parser.js';
import { getNotesForViewPaths } from '#lib/features/type-definitions/type-sidebar.logic.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

function makeView(overrides: Partial<CollectionViewDef> = {}): CollectionViewDef {
	return { type: 'table', name: 'Default', ...overrides };
}

function makeRecord(path: string, frontmatter: Record<string, unknown>): PropertyIndexRecord {
	const props = new Map<string, unknown>();
	for (const [k, v] of Object.entries(frontmatter)) props.set(k, v);
	return {
		path,
		name: path.split('/').pop() ?? '',
		basename: (path.split('/').pop() ?? '').replace(/\.md$/, ''),
		folder: path.split('/').slice(0, -1).join('/'),
		ext: '.md',
		size: 0,
		ctime: 0,
		mtime: 0,
		properties: props as Map<string, PropertyIndexRecord['properties'] extends Map<string, infer V> ? V : never>,
		tags: [],
		tasks: [],
		outgoingLinks: [],
	} as unknown as PropertyIndexRecord;
}

describe('seedToolbarStateFromDefinition', () => {
	it('parses string filters into a single AND group', () => {
		const def: CollectionDefinition = { filters: "status == 'active'", views: [makeView()] };
		const seed = seedToolbarStateFromDefinition(def, def.views[0]);

		expect(seed.globalFilters).toHaveLength(1);
		expect(seed.globalFilters[0].conjunction).toBe('and');
		expect(seed.globalFilters[0].rows[0]).toMatchObject({ property: 'status', operator: 'is', value: 'active' });
	});

	it('parses CollectionFilter objects into matching groups', () => {
		const def: CollectionDefinition = {
			filters: { or: ["file.hasTag('bug')", "file.hasTag('task')"] },
			views: [makeView()],
		};
		const seed = seedToolbarStateFromDefinition(def, def.views[0]);

		expect(seed.globalFilters).toHaveLength(1);
		expect(seed.globalFilters[0].conjunction).toBe('or');
		expect(seed.globalFilters[0].rows).toHaveLength(2);
	});

	it('seeds view-scoped filters from the active view, not the global root', () => {
		const view = makeView({ filters: "priority == 'high'" });
		const def: CollectionDefinition = { filters: "status == 'active'", views: [view] };
		const seed = seedToolbarStateFromDefinition(def, view);

		expect(seed.viewFilters[0].rows[0].property).toBe('priority');
		expect(seed.globalFilters[0].rows[0].property).toBe('status');
	});

	it('clones the sort array so later mutations do not leak into the source', () => {
		const sort: SortDef[] = [{ column: 'due', direction: 'ASC' }];
		const view = makeView({ sort });
		const def: CollectionDefinition = { views: [view] };
		const seed = seedToolbarStateFromDefinition(def, view);

		seed.sort.push({ column: 'name', direction: 'DESC' });
		expect(sort).toHaveLength(1);
	});

	it('returns empty arrays / empty record when fields are missing', () => {
		const def: CollectionDefinition = { views: [makeView()] };
		const seed = seedToolbarStateFromDefinition(def, def.views[0]);

		expect(seed.globalFilters).toEqual([]);
		expect(seed.viewFilters).toEqual([]);
		expect(seed.sort).toEqual([]);
		expect(seed.formulas).toEqual({});
	});

	it('treats a missing active view as empty filters and empty sort', () => {
		const def: CollectionDefinition = { filters: "status == 'x'", views: [] };
		const seed = seedToolbarStateFromDefinition(def, undefined);

		expect(seed.globalFilters).toHaveLength(1);
		expect(seed.viewFilters).toEqual([]);
		expect(seed.sort).toEqual([]);
	});

	it('passes formulas through unchanged', () => {
		const formulas = { remaining: '100 - progress' };
		const def: CollectionDefinition = { formulas, views: [makeView()] };
		const seed = seedToolbarStateFromDefinition(def, def.views[0]);

		expect(seed.formulas).toEqual(formulas);
	});
});

describe('buildOverriddenQuery', () => {
	const baseDef: CollectionDefinition = { filters: "status == 'old'", views: [makeView({ filters: "tag == 'old'", sort: [{ column: 'name', direction: 'ASC' }] })] };

	it('returns null when no active view is provided', () => {
		expect(buildOverriddenQuery(baseDef, undefined, [], [], [])).toBeNull();
	});

	it('replaces global filters with the local toolbar state', () => {
		const globalGroups: FilterGroup[] = [
			{ conjunction: 'and', rows: [{ id: 'a', property: 'status', operator: 'is', value: 'new' }] },
		];
		const out = buildOverriddenQuery(baseDef, baseDef.views[0], globalGroups, [], [])!;
		expect(out.definition.filters).toBe("status == 'new'");
	});

	it('replaces view filters with the local toolbar state', () => {
		const viewGroups: FilterGroup[] = [
			{ conjunction: 'and', rows: [{ id: 'b', property: 'tag', operator: 'is', value: 'new' }] },
		];
		const out = buildOverriddenQuery(baseDef, baseDef.views[0], [], viewGroups, [])!;
		expect(out.view.filters).toBe("tag == 'new'");
	});

	it('keeps the original view sort when localSort is empty', () => {
		const out = buildOverriddenQuery(baseDef, baseDef.views[0], [], [], [])!;
		expect(out.view.sort).toEqual([{ column: 'name', direction: 'ASC' }]);
	});

	it('overrides the view sort when localSort has entries', () => {
		const localSort: SortDef[] = [{ column: 'due', direction: 'DESC' }];
		const out = buildOverriddenQuery(baseDef, baseDef.views[0], [], [], localSort)!;
		expect(out.view.sort).toEqual(localSort);
	});

	it('does not mutate the source definition or view', () => {
		const view = baseDef.views[0];
		const before = JSON.stringify({ filters: baseDef.filters, view });
		buildOverriddenQuery(baseDef, view, [
			{ conjunction: 'and', rows: [{ id: 'x', property: 'status', operator: 'is', value: 'mutated' }] },
		], [], [{ column: 'due', direction: 'DESC' }]);
		expect(JSON.stringify({ filters: baseDef.filters, view })).toBe(before);
	});

	it('returns undefined filters when both local groups are empty', () => {
		const out = buildOverriddenQuery(baseDef, baseDef.views[0], [], [], [])!;
		expect(out.definition.filters).toBeUndefined();
		expect(out.view.filters).toBeUndefined();
	});
});

describe('combineAvailableProperties', () => {
	it('appends formula columns to the base property list', () => {
		const index = new Map<string, PropertyIndexRecord>([
			['/a.md', makeRecord('/a.md', { status: 'active' })],
		]);
		const props = combineAvailableProperties(index, { remaining: '100 - progress' });

		expect(props).toContain('status');
		expect(props).toContain('formula.remaining');
		expect(props).toContain('file.name');
	});

	it('returns only base properties when no formulas are declared', () => {
		const props = combineAvailableProperties(new Map(), {});
		expect(props.some((p) => p.startsWith('formula.'))).toBe(false);
	});

	it('does not deduplicate formula names that collide with frontmatter keys', () => {
		// Documented behaviour: collisions are surfaced as duplicates so the caller
		// can decide whether to filter — TypeNoteList does not.
		const index = new Map<string, PropertyIndexRecord>([
			['/a.md', makeRecord('/a.md', { remaining: 50 })],
		]);
		const props = combineAvailableProperties(index, { remaining: '100' });
		expect(props.filter((p) => p === 'remaining')).toHaveLength(1);
		expect(props.filter((p) => p === 'formula.remaining')).toHaveLength(1);
	});
});

/** Parses a `.view` fixture, throwing when it does not parse. */
function definitionOf(yaml: string): CollectionDefinition {
	const parsed = parseCollectionYaml(yaml);
	if (!parsed.success) throw new Error(parsed.error);
	return parsed.definition;
}

/** Applies a toolbar edit that must be accepted, returning the new YAML. */
function acceptedEdit<K extends ToolbarKey>(yaml: string, key: K, next: ToolbarValues[K], base: string): string {
	const result = applyToolbarEdit(yaml, key, next, base);
	if (!result.ok) throw new Error(`edit refused: ${result.reason}`);
	return result.yaml;
}

const row = (id: string, property: string, value: string) => ({ id, property, operator: 'is' as const, value });

/** Two views; `_rail_view` names the second. */
const RAIL_SECOND = [
	'_rail_view: Board',
	'views:',
	'  - type: table',
	'    name: Table',
	"    filters: status == 'open'",
	'    sort:',
	'      - column: file.basename',
	'        direction: ASC',
	'  - type: table',
	'    name: Board',
	"    filters: status == 'done'",
	'',
].join('\n');

describe('toolbarValuesFromState', () => {
	it('gives each key the value the toolbar writes for it', () => {
		const sort: SortDef[] = [{ column: 'due', direction: 'ASC' }];
		expect(toolbarValuesFromState([{ conjunction: 'and', rows: [row('1', 'status', 'active')] }], [], sort)).toEqual({
			filters: "status == 'active'",
			viewFilters: undefined,
			sort,
		});
	});

	it('writes nested filter objects of the seeded state as they were', () => {
		const definition: CollectionDefinition = {
			filters: { and: ["_type == 'Project'", { or: ["status == 'active'", 'priority > 3'] }] },
			views: [makeView({ filters: { and: [{ not: ['archived == true'] }] }, sort: [{ column: 'due', direction: 'ASC' }] })],
		};
		const seed = seedToolbarStateFromDefinition(definition, definition.views[0]);
		expect(toolbarValuesFromState(seed.globalFilters, seed.viewFilters, seed.sort)).toEqual({
			filters: definition.filters,
			viewFilters: definition.views[0].filters,
			sort: [{ column: 'due', direction: 'ASC' }],
		});
	});
});

describe('toolbarKeyBase', () => {
	it('reads the view filters and sort of the view _rail_view names', () => {
		const definition = definitionOf(RAIL_SECOND);
		expect(toolbarKeyBase(definition, 'viewFilters')).toBe(canonicalToolbarValue('viewFilters', "status == 'done'"));
		expect(toolbarKeyBase(definition, 'sort')).toBe(canonicalToolbarValue('sort', []));
	});

	it('gives a filter the base of its toolbar round trip, its keys in any order', () => {
		const a: CollectionFilter = { or: ['a == 1', 'b == 2'], and: ['c == 3'] };
		const b: CollectionFilter = { and: ['c == 3'], or: ['a == 1', 'b == 2'] };
		expect(toolbarKeyBase({ filters: a, views: [makeView()] }, 'filters')).toBe(toolbarKeyBase({ filters: b, views: [makeView()] }, 'filters'));
		// `and: [x]` is what the toolbar writes back as `x`.
		expect(toolbarKeyBase({ filters: { and: ['c == 3'] }, views: [makeView()] }, 'filters')).toBe(canonicalToolbarValue('filters', 'c == 3'));
	});

	it('gives a missing key the base of an empty one', () => {
		const definition: CollectionDefinition = { views: [makeView()] };
		expect(toolbarKeyBase(definition, 'filters')).toBe(canonicalToolbarValue('filters', undefined));
		expect(toolbarKeyBase(definition, 'sort')).toBe(canonicalToolbarValue('sort', []));
	});

	it('tells different values apart', () => {
		const definition: CollectionDefinition = { filters: 'a == 1', views: [makeView({ sort: [{ column: 'due', direction: 'ASC' }] })] };
		expect(toolbarKeyBase(definition, 'filters')).not.toBe(canonicalToolbarValue('filters', 'a == 2'));
		expect(toolbarKeyBase(definition, 'sort')).not.toBe(canonicalToolbarValue('sort', [{ column: 'due', direction: 'DESC' }]));
	});
});

describe('toolbarKeysDiffering', () => {
	it('names the keys whose value in the file differs from the toolbar values', () => {
		const definition = definitionOf(RAIL_SECOND);
		const values = toolbarValuesFromState([], [{ conjunction: 'and', rows: [row('1', 'status', 'open')] }], []);
		expect(toolbarKeysDiffering(definition, values)).toEqual(['viewFilters']);
		expect(toolbarKeysDiffering(definition, { ...values, viewFilters: "status == 'done'" })).toEqual([]);
	});
});

describe('applyToolbarEdit', () => {
	it('writes a sort edit to the sort only, keeping `and: [x]` and unknown filter keys as written', () => {
		const yaml = [
			'filters:',
			'  and:',
			"    - _type == 'Project'",
			'  note: kept',
			'views:',
			'  - type: table',
			'    name: Projects',
			'    filters:',
			'      and:',
			"        - status == 'open'",
			'',
		].join('\n');
		const before = definitionOf(yaml);
		const sort: SortDef[] = [{ column: 'due', direction: 'DESC' }];

		const after = definitionOf(acceptedEdit(yaml, 'sort', sort, toolbarKeyBase(before, 'sort')));

		expect(after.filters).toEqual({ and: ["_type == 'Project'"], note: 'kept' });
		expect(after.views[0].filters).toEqual({ and: ["status == 'open'"] });
		expect(after.views[0].sort).toEqual(sort);
	});

	it('writes to the view _rail_view names in the bytes it is given, after the views were reordered', () => {
		const base = toolbarKeyBase(definitionOf(RAIL_SECOND), 'viewFilters');
		const reordered = [
			'_rail_view: Board',
			'views:',
			'  - type: table',
			'    name: Board',
			"    filters: status == 'done'",
			'  - type: table',
			'    name: Table',
			"    filters: status == 'open'",
			'',
		].join('\n');

		const after = definitionOf(acceptedEdit(reordered, 'viewFilters', "priority == 'high'", base));

		expect(after.views[0]).toEqual({ type: 'table', name: 'Board', filters: "priority == 'high'" });
		expect(after.views[1]).toEqual({ type: 'table', name: 'Table', filters: "status == 'open'" });
		expect(after.railView).toBe('Board');
	});

	it('never refuses its own second edit, including an Any group before an All group', () => {
		const yaml = 'views:\n  - type: table\n    name: Projects\n';
		const first = toolbarValuesFromState(
			[
				{ conjunction: 'or', rows: [row('1', 'status', 'open'), row('2', 'status', 'done')] },
				{ conjunction: 'and', rows: [row('3', '_type', 'Project')] },
			],
			[],
			[],
		);
		// `filterGroupsToFilter` emits `or` before `and`; a re-read yields `and`, `or`.
		expect(Object.keys(first.filters as CollectionFilter)).toEqual(['or', 'and']);
		const afterFirst = acceptedEdit(yaml, 'filters', first.filters, toolbarKeyBase(definitionOf(yaml), 'filters'));
		const baseAfterFirst = canonicalToolbarValue('filters', first.filters);
		expect(toolbarKeyBase(definitionOf(afterFirst), 'filters')).toBe(baseAfterFirst);

		const second = toolbarValuesFromState(
			[
				{ conjunction: 'or', rows: [row('1', 'status', 'open'), row('2', 'status', 'done')] },
				{ conjunction: 'and', rows: [row('3', '_type', 'Project'), row('4', 'owner', 'me')] },
			],
			[],
			[],
		);
		const afterSecond = definitionOf(acceptedEdit(afterFirst, 'filters', second.filters, baseAfterFirst));
		expect(afterSecond.filters).toEqual(second.filters);

		// Then a sort edit, on the base the seed would give.
		const sort: SortDef[] = [{ column: 'status', direction: 'ASC' }];
		const sortBase = canonicalToolbarValue('sort', []);
		const afterSort = acceptedEdit(acceptedEdit(afterFirst, 'sort', sort, sortBase), 'sort', [], canonicalToolbarValue('sort', sort));
		expect(definitionOf(afterSort).views[0].sort).toBeUndefined();
	});

	it('refuses the edit when that key in the bytes differs from the base', () => {
		const base = toolbarKeyBase(definitionOf(RAIL_SECOND), 'viewFilters');
		const changed = RAIL_SECOND.replace("status == 'done'", "status == 'blocked'");
		expect(applyToolbarEdit(changed, 'viewFilters', "priority == 'high'", base)).toEqual({ ok: false, reason: 'conflict' });
	});

	it('accepts the edit when only another key differs', () => {
		const base = toolbarKeyBase(definitionOf(RAIL_SECOND), 'sort');
		const changed = RAIL_SECOND.replace("status == 'done'", "status == 'blocked'");
		const after = definitionOf(acceptedEdit(changed, 'sort', [{ column: 'due', direction: 'ASC' }], base));
		expect(after.views[1].filters).toBe("status == 'blocked'");
		expect(after.views[1].sort).toEqual([{ column: 'due', direction: 'ASC' }]);
	});

	it('reports YAML that does not parse as a .view instead of returning it unchanged', () => {
		const result = applyToolbarEdit('views: [', 'sort', [], canonicalToolbarValue('sort', []));
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.reason).toBe('invalid');
		expect(result.reason === 'invalid' && result.error).toMatch(/Invalid YAML/);
		expect(applyToolbarEdit('', 'sort', [], canonicalToolbarValue('sort', []))).toMatchObject({ ok: false, reason: 'invalid' });
	});
});

describe('countActiveFilters', () => {
	it('sums rows across both groups', () => {
		const global: FilterGroup[] = [
			{ conjunction: 'and', rows: [
				{ id: '1', property: 'status', operator: 'is', value: 'a' },
				{ id: '2', property: 'priority', operator: 'is', value: 'high' },
			] },
		];
		const view: FilterGroup[] = [
			{ conjunction: 'or', rows: [{ id: '3', property: 'tag', operator: 'is', value: 'x' }] },
		];
		expect(countActiveFilters(global, view)).toBe(3);
	});

	it('returns 0 when both inputs are empty', () => {
		expect(countActiveFilters([], [])).toBe(0);
	});

	it('counts each row in every group', () => {
		const groups: FilterGroup[] = [
			{ conjunction: 'and', rows: [{ id: '1', property: 'a', operator: 'is', value: '1' }] },
			{ conjunction: 'or', rows: [{ id: '2', property: 'b', operator: 'is', value: '2' }] },
		];
		expect(countActiveFilters(groups, [])).toBe(2);
	});
});

describe('buildRenameFileName', () => {
	it('builds the new file name from the edited title, preserving the extension', () => {
		expect(buildRenameFileName('/vault/Projects/Old Name.md', 'Old Name', 'New Name')).toEqual({ ok: true, name: 'New Name.md' });
	});

	it('trims surrounding whitespace from the input', () => {
		expect(buildRenameFileName('/vault/Note.md', 'Note', '  Renamed  ')).toEqual({ ok: true, name: 'Renamed.md' });
	});

	it('returns null when the input is empty or whitespace', () => {
		expect(buildRenameFileName('/vault/Note.md', 'Note', '')).toBeNull();
		expect(buildRenameFileName('/vault/Note.md', 'Note', '   ')).toBeNull();
	});

	it('returns null when the title is unchanged', () => {
		expect(buildRenameFileName('/vault/Note.md', 'Note', 'Note')).toBeNull();
	});

	it('returns the rule an illegal file name breaks', () => {
		expect(buildRenameFileName('/vault/Note.md', 'Note', 'Meeting: weekly sync')).toEqual({ ok: false, error: 'Name cannot contain ":"' });
		expect(buildRenameFileName('/vault/Note.md', 'Note', 'What next?')).toEqual({ ok: false, error: 'Name cannot contain "?"' });
		expect(buildRenameFileName('/vault/Note.md', 'Note', 'bad/name')).toEqual({ ok: false, error: 'Name cannot contain "/"' });
		expect(buildRenameFileName('/vault/Note.md', 'Note', '.hidden')).toEqual({ ok: false, error: 'Name cannot start with "."' });
	});

	it('handles paths without an extension', () => {
		expect(buildRenameFileName('/vault/Note', 'Note', 'Other')).toEqual({ ok: true, name: 'Other' });
	});
});

describe('resolveViewListSort', () => {
	it('returns null when the view has a sort, so the query order is kept', () => {
		expect(resolveViewListSort(makeView({ sort: [{ column: 'rank', direction: 'ASC' }] }), 'title')).toBeNull();
	});

	it('falls back to the _sort value when the view has no sort', () => {
		expect(resolveViewListSort(makeView(), 'title')).toBe('title');
		expect(resolveViewListSort(makeView({ sort: [] }), 'modified')).toBe('modified');
	});
});

describe('view list order (query + sidebar notes)', () => {
	// _sort: title would list A, B, C. The view sort (rank DESC) must win.
	const entries = [
		entryV2('/v/a.md', { title: 'A', modifiedAt: 300 }),
		entryV2('/v/b.md', { title: 'B', modifiedAt: 100 }),
		entryV2('/v/c.md', { title: 'C', modifiedAt: 200 }),
	];
	const index = new Map<string, PropertyIndexRecord>([
		['/v/a.md', makeRecord('/v/a.md', { rank: 1 })],
		['/v/b.md', makeRecord('/v/b.md', { rank: 3 })],
		['/v/c.md', makeRecord('/v/c.md', { rank: 2 })],
	]);
	const def: CollectionDefinition = { views: [makeView()] };

	function listTitles(localSort: SortDef[], frontmatterSort: string): string[] {
		const q = buildOverriddenQuery(def, def.views[0], [], [], localSort)!;
		const result = executeQuery(q.definition, q.view, index, null);
		const paths = new Set(result.records.map((r) => r.path));
		return getNotesForViewPaths(entries, paths, resolveViewListSort(q.view, frontmatterSort)).map(
			(n) => n.title,
		);
	}

	it('lists notes in the view sort order when it differs from _sort', () => {
		expect(listTitles([{ column: 'rank', direction: 'DESC' }], 'title')).toEqual(['B', 'C', 'A']);
		expect(listTitles([{ column: 'rank', direction: 'ASC' }], 'title')).toEqual(['A', 'C', 'B']);
	});

	it('keeps the _sort order when the view has no sort', () => {
		expect(listTitles([], 'title')).toEqual(['A', 'B', 'C']);
		expect(listTitles([], 'modified')).toEqual(['A', 'C', 'B']);
	});
});
