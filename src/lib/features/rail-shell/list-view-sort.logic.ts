import type { SortDef } from '#lib/features/collection/collection.types.js';
import type { ListSortConfig, ListSortOption } from '#lib/features/rail-shell/list-toolbar.types.js';

/**
 * Maps a view's `sort:` column to the Sort dropdown's option. Columns the
 * dropdown has no built-in for become a property option, so the pick still
 * orders by that frontmatter key.
 */
export function sortDefToListSort(def: SortDef): ListSortConfig {
	const direction = def.direction === 'DESC' ? 'desc' : 'asc';
	switch (def.column) {
		case 'file.mtime':
			return { option: 'modified', direction };
		case 'file.ctime':
			return { option: 'created', direction };
		case 'file.name':
		case 'file.basename':
			return { option: 'title', direction };
		case 'status':
			return { option: 'status', direction };
		default:
			return { option: `property:${def.column}`, direction };
	}
}

/** Inverse of `sortDefToListSort`. Title saves as `file.name`, the column Obsidian uses. */
export function listSortToSortDef(config: ListSortConfig): SortDef {
	const direction = config.direction === 'desc' ? 'DESC' : 'ASC';
	return { column: sortColumnFor(config.option), direction };
}

/** The `sort:` column a dropdown option writes to a `.view`. */
function sortColumnFor(option: ListSortOption): string {
	switch (option) {
		case 'modified':
			return 'file.mtime';
		case 'created':
			return 'file.ctime';
		case 'title':
			return 'file.name';
		case 'status':
			return 'status';
		default:
			return option.slice('property:'.length);
	}
}

/**
 * The order a view's list shows. Its first `sort:` column wins. Without one,
 * the legacy `_sort` value applies, and an unknown value falls back to
 * modified, newest first, the same default `getViewSort` uses.
 */
export function viewListSort(sorts: readonly SortDef[], frontmatterSort: string): ListSortConfig {
	const first = sorts[0];
	if (first) return sortDefToListSort(first);
	switch (frontmatterSort) {
		case 'created':
			return { option: 'created', direction: 'desc' };
		case 'modified-asc':
			return { option: 'modified', direction: 'asc' };
		case 'created-asc':
			return { option: 'created', direction: 'asc' };
		case 'title':
			return { option: 'title', direction: 'asc' };
		default:
			return { option: 'modified', direction: 'desc' };
	}
}
