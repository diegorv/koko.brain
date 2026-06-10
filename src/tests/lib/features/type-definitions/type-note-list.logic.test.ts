import { describe, it, expect } from 'vitest';
import type { CollectionDefinition, CollectionViewDef, NoteRecord, SortDef } from '$lib/features/collection/collection.types';
import type { FilterGroup } from '$lib/features/collection/toolbar/toolbar.types';
import {
	seedToolbarStateFromDefinition,
	buildOverriddenQuery,
	combineAvailableProperties,
	countActiveFilters,
	buildViewYamlUpdates,
	buildRenameFileName,
} from '$lib/features/type-definitions/type-note-list.logic';

function makeView(overrides: Partial<CollectionViewDef> = {}): CollectionViewDef {
	return { type: 'table', name: 'Default', ...overrides };
}

function makeRecord(path: string, frontmatter: Record<string, unknown>): NoteRecord {
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
		properties: props as Map<string, NoteRecord['properties'] extends Map<string, infer V> ? V : never>,
		tags: [],
		tasks: [],
		outgoingLinks: [],
	} as unknown as NoteRecord;
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
		const index = new Map<string, NoteRecord>([
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
		const index = new Map<string, NoteRecord>([
			['/a.md', makeRecord('/a.md', { remaining: 50 })],
		]);
		const props = combineAvailableProperties(index, { remaining: '100' });
		expect(props.filter((p) => p === 'remaining')).toHaveLength(1);
		expect(props.filter((p) => p === 'formula.remaining')).toHaveLength(1);
	});
});

describe('buildViewYamlUpdates', () => {
	it('produces the three-key patch consumed by updateCollectionYaml', () => {
		const global: FilterGroup[] = [
			{ conjunction: 'and', rows: [{ id: '1', property: 'status', operator: 'is', value: 'active' }] },
		];
		const view: FilterGroup[] = [
			{ conjunction: 'and', rows: [{ id: '2', property: 'priority', operator: 'is', value: 'high' }] },
		];
		const sort: SortDef[] = [{ column: 'due', direction: 'ASC' }];

		const out = buildViewYamlUpdates(global, view, sort);

		expect(out).toEqual({
			filters: "status == 'active'",
			viewFilters: "priority == 'high'",
			viewSort: sort,
		});
	});

	it('emits undefined filters when groups are empty so YAML keys get removed', () => {
		const out = buildViewYamlUpdates([], [], []);
		expect(out).toEqual({ filters: undefined, viewFilters: undefined, viewSort: [] });
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
		expect(buildRenameFileName('/vault/Projects/Old Name.md', 'Old Name', 'New Name')).toBe('New Name.md');
	});

	it('trims surrounding whitespace from the input', () => {
		expect(buildRenameFileName('/vault/Note.md', 'Note', '  Renamed  ')).toBe('Renamed.md');
	});

	it('returns null when the input is empty or whitespace', () => {
		expect(buildRenameFileName('/vault/Note.md', 'Note', '')).toBeNull();
		expect(buildRenameFileName('/vault/Note.md', 'Note', '   ')).toBeNull();
	});

	it('returns null when the title is unchanged', () => {
		expect(buildRenameFileName('/vault/Note.md', 'Note', 'Note')).toBeNull();
	});

	it('returns null when the resulting file name is invalid', () => {
		expect(buildRenameFileName('/vault/Note.md', 'Note', 'bad/name')).toBeNull();
		expect(buildRenameFileName('/vault/Note.md', 'Note', '.hidden')).toBeNull();
	});

	it('handles paths without an extension', () => {
		expect(buildRenameFileName('/vault/Note', 'Note', 'Other')).toBe('Other');
	});
});
