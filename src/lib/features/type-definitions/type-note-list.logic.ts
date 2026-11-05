import type { CollectionDefinition, CollectionFilter, CollectionViewDef, PropertyIndexRecord, SortDef } from '#lib/features/collection/collection.types.js';
import type { FilterGroup } from '#lib/features/collection/toolbar/toolbar.types.js';
import { parseFilterToGroups, filterGroupsToFilter, getAllKnownProperties } from '#lib/features/collection/toolbar/filter.logic.js';
import { parseCollectionYaml, railViewIndex, updateCollectionYaml, type CollectionYamlUpdates } from '#lib/features/collection/yaml-parser.js';
import { isValidFileName } from '#lib/core/filesystem/fs.logic.js';

/**
 * Builds the target file name for an inline note-list rename, where the user
 * edits the TITLE (file name without extension) rather than the full name.
 * Re-appends the original path's extension. Returns `null` when the rename
 * should be discarded: empty/whitespace input, unchanged title, or a result
 * that is not a legal file name.
 */
export function buildRenameFileName(path: string, currentTitle: string, input: string): string | null {
	const trimmed = input.trim();
	if (!trimmed || trimmed === currentTitle) return null;
	const fileName = path.split('/').pop() ?? '';
	const dotIndex = fileName.lastIndexOf('.');
	const ext = dotIndex > 0 ? fileName.slice(dotIndex) : '';
	const newName = trimmed + ext;
	if (!isValidFileName(newName)) return null;
	return newName;
}

/**
 * Seed shape produced from a successfully-parsed .view definition. The TypeNoteList
 * toolbar uses this snapshot to initialise its local mutable state once per view
 * selection — subsequent edits drive the local state directly without touching disk.
 */
export interface ToolbarSeed {
	globalFilters: FilterGroup[];
	viewFilters: FilterGroup[];
	sort: SortDef[];
	formulas: Record<string, string>;
}

/**
 * Returns the local toolbar state seeded from the parsed view definition and
 * `activeView` (the rail passes the view it runs, `railViewIndex`). Missing
 * fields collapse to empty arrays / empty record so the caller can drop the
 * result straight into reactive state.
 */
export function seedToolbarStateFromDefinition(
	definition: CollectionDefinition,
	activeView: CollectionViewDef | undefined,
): ToolbarSeed {
	return {
		globalFilters: parseFilterToGroups(definition.filters),
		viewFilters: parseFilterToGroups(activeView?.filters),
		sort: activeView?.sort ? [...activeView.sort] : [],
		formulas: definition.formulas ?? {},
	};
}

/** Bundle returned by buildOverriddenQuery, ready to feed into executeQuery. */
export interface OverriddenQuery {
	definition: CollectionDefinition;
	view: CollectionViewDef;
}

/**
 * Produces a `{ definition, view }` pair where the YAML-sourced filters / sort are
 * replaced by the local toolbar state. The original definition / view are NOT
 * mutated. Returns `null` when no active view exists (the caller should render the
 * empty-view branch instead of querying).
 *
 * Behaviour mirrors `CollectionView.svelte` lines 127-141: global filters override
 * `definition.filters`, view filters override `view.filters`, and `localSort` only
 * replaces `view.sort` when the user has chosen at least one sort column.
 */
export function buildOverriddenQuery(
	definition: CollectionDefinition,
	activeView: CollectionViewDef | undefined,
	localGlobalFilters: FilterGroup[],
	localViewFilters: FilterGroup[],
	localSort: SortDef[],
): OverriddenQuery | null {
	if (!activeView) return null;
	return {
		definition: { ...definition, filters: filterGroupsToFilter(localGlobalFilters) },
		view: {
			...activeView,
			filters: filterGroupsToFilter(localViewFilters),
			sort: localSort.length > 0 ? localSort : activeView.sort,
		},
	};
}

/**
 * Picks the order of a view's note list. The view's sort (Sort popover, stored
 * as `sort:` on the view the list runs) wins: `null` tells
 * `getNotesForViewPaths` to keep the query's order. `frontmatterSort` (the
 * `.view`'s `_sort`) applies only to a view with no sort.
 */
export function resolveViewListSort(view: CollectionViewDef, frontmatterSort: string): string | null {
	return view.sort && view.sort.length > 0 ? null : frontmatterSort;
}

/**
 * Returns the property names offered in the filter / sort dropdowns. Combines the
 * base set discovered from the live property index (`file.*` and every frontmatter
 * key seen) with the `formula.<name>` columns declared in the active view.
 */
export function combineAvailableProperties(
	propertyIndex: Map<string, PropertyIndexRecord>,
	viewFormulas: Record<string, string>,
): string[] {
	const base = getAllKnownProperties(propertyIndex);
	const formulaProps = Object.keys(viewFormulas).map((n) => `formula.${n}`);
	return [...base, ...formulaProps];
}

/** Total count of filter rows across global and view-scoped groups. */
export function countActiveFilters(globalFilters: FilterGroup[], viewFilters: FilterGroup[]): number {
	return (
		globalFilters.reduce((n, g) => n + g.rows.length, 0) +
		viewFilters.reduce((n, g) => n + g.rows.length, 0)
	);
}

/**
 * What the rail's Sort and Filter toolbar writes, per `.view` key: the
 * top-level `filters`, and the `filters` and `sort` of the view the rail runs
 * (`railViewIndex`).
 */
export interface ToolbarValues {
	/** Top-level filters; undefined removes the key */
	filters: CollectionFilter | string | undefined;
	/** The rail view's own filters; undefined removes the key */
	viewFilters: CollectionFilter | string | undefined;
	/** The rail view's sort; empty removes the key */
	sort: SortDef[];
}

/** One key the toolbar writes. */
export type ToolbarKey = keyof ToolbarValues;

/** Every key the toolbar writes. */
export const TOOLBAR_KEYS: readonly ToolbarKey[] = ['filters', 'viewFilters', 'sort'];

/** The value of each key the toolbar would write for its local state. */
export function toolbarValuesFromState(globalFilters: FilterGroup[], viewFilters: FilterGroup[], sort: SortDef[]): ToolbarValues {
	return { filters: filterGroupsToFilter(globalFilters), viewFilters: filterGroupsToFilter(viewFilters), sort };
}

/** JSON with the keys of every object sorted, so key order never makes two values differ. */
function sortedJson(value: unknown): string {
	return JSON.stringify(value ?? null, (_key, v: unknown) =>
		v && typeof v === 'object' && !Array.isArray(v)
			? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
			: v,
	);
}

/**
 * The canonical form of a raw value of `key`: the value after the toolbar's
 * own round trip (filters are read into groups and written back, so `and: [x]`
 * is `x`; a missing sort is an empty one), as JSON with sorted keys. Two values
 * with one canonical form are the same to the toolbar.
 */
export function canonicalToolbarValue<K extends ToolbarKey>(key: K, raw: ToolbarValues[K] | undefined): string {
	if (key === 'sort') return sortedJson(raw ?? []);
	return sortedJson(filterGroupsToFilter(parseFilterToGroups(raw as CollectionFilter | string | undefined)) ?? null);
}

/** The value of `key` in `definition`, through {@link canonicalToolbarValue}. */
export function toolbarKeyBase(definition: CollectionDefinition, key: ToolbarKey): string {
	const view = definition.views[railViewIndex(definition)];
	if (key === 'filters') return canonicalToolbarValue(key, definition.filters);
	if (key === 'viewFilters') return canonicalToolbarValue(key, view?.filters);
	return canonicalToolbarValue(key, view?.sort);
}

/** The keys whose value in `definition` is not the one in `values`. */
export function toolbarKeysDiffering(definition: CollectionDefinition, values: ToolbarValues): ToolbarKey[] {
	return TOOLBAR_KEYS.filter((key) => toolbarKeyBase(definition, key) !== canonicalToolbarValue(key, values[key]));
}

/** The YAML a toolbar edit gives, or why it was refused. */
export type ToolbarEditResult =
	| { ok: true; yaml: string }
	/** That key in the YAML is no longer the value the edit was made on */
	| { ok: false; reason: 'conflict' }
	/** The YAML does not parse as a `.view` */
	| { ok: false; reason: 'invalid'; error: string };

/**
 * Writes `next` as `key` of the `.view` YAML `yaml`, and nothing else. The
 * view is the one the rail runs in these bytes (`railViewIndex`), not the one
 * an older parse ran, so a reorder on disk still writes to the view
 * `_rail_view` names. Refused as a conflict when that key's value in `yaml`
 * ({@link toolbarKeyBase}) is not `base`, the value the toolbar showed when the
 * edit was made. The YAML is re-serialized, so its comments go.
 */
export function applyToolbarEdit<K extends ToolbarKey>(yaml: string, key: K, next: ToolbarValues[K], base: string): ToolbarEditResult {
	const parsed = parseCollectionYaml(yaml);
	if (!parsed.success) return { ok: false, reason: 'invalid', error: parsed.error };
	if (toolbarKeyBase(parsed.definition, key) !== base) return { ok: false, reason: 'conflict' };
	const viewIndex = railViewIndex(parsed.definition);
	const updates: CollectionYamlUpdates =
		key === 'filters'
			? { filters: next as ToolbarValues['filters'] }
			: key === 'viewFilters'
				? { viewFilters: next as ToolbarValues['viewFilters'], viewIndex }
				: { viewSort: next as ToolbarValues['sort'], viewIndex };
	return { ok: true, yaml: updateCollectionYaml(yaml, updates) };
}
