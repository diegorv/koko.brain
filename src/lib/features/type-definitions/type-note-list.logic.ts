import type { CollectionDefinition, CollectionViewDef, NoteRecord, SortDef } from '$lib/features/collection/collection.types';
import type { FilterGroup } from '$lib/features/collection/toolbar/toolbar.types';
import { parseFilterToGroups, filterGroupsToFilter, getAllKnownProperties } from '$lib/features/collection/toolbar/filter.logic';
import type { CollectionYamlUpdates } from '$lib/features/collection/yaml-parser';
import { isValidFileName } from '$lib/core/filesystem/fs.logic';

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
 * Returns the local toolbar state seeded from the parsed view definition and its
 * first view. Missing fields collapse to empty arrays / empty record so the
 * caller can drop the result straight into reactive state.
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
 * Returns the property names offered in the filter / sort dropdowns. Combines the
 * base set discovered from the live property index (`file.*` and every frontmatter
 * key seen) with the `formula.<name>` columns declared in the active view.
 */
export function combineAvailableProperties(
	propertyIndex: Map<string, NoteRecord>,
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
 * Translates the live local toolbar state into the patch shape accepted by
 * updateCollectionYaml — exactly the three keys the .view round-trip cares about.
 * Keeps the persistence call site free of filter-serialisation details.
 */
export function buildViewYamlUpdates(
	localGlobalFilters: FilterGroup[],
	localViewFilters: FilterGroup[],
	localSort: SortDef[],
): CollectionYamlUpdates {
	return {
		filters: filterGroupsToFilter(localGlobalFilters),
		viewFilters: filterGroupsToFilter(localViewFilters),
		viewSort: localSort,
	};
}
