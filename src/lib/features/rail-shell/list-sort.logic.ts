import type {
	ListSortConfig,
	ListSortDirection,
	ListSortOption,
} from '#lib/features/rail-shell/list-toolbar.types.js';

const PROPERTY_PREFIX = 'property:';

/** The built-in orders the Sort dropdown offers, in menu order. */
export const BUILT_IN_SORT_OPTIONS: readonly { value: ListSortOption; label: string }[] = [
	{ value: 'modified', label: 'Modified' },
	{ value: 'created', label: 'Created' },
	{ value: 'title', label: 'Title' },
	{ value: 'status', label: 'Status' },
];

/** Times read newest first by default; text and status read A to Z. */
export function defaultSortDirection(option: ListSortOption): ListSortDirection {
	return option === 'modified' || option === 'created' ? 'desc' : 'asc';
}

/**
 * The label the Sort dropdown shows for an option. Property keys drop their
 * leading underscores so `_due` reads as `due`, matching the Properties picker.
 */
export function sortOptionLabel(option: ListSortOption): string {
	if (option.startsWith(PROPERTY_PREFIX)) {
		return option.slice(PROPERTY_PREFIX.length).replace(/^_+/, '');
	}
	return BUILT_IN_SORT_OPTIONS.find((o) => o.value === option)?.label ?? option;
}

/** The sort option for a frontmatter key. */
export function propertySortOption(key: string): ListSortOption {
	return `${PROPERTY_PREFIX}${key}`;
}

/** Serializes a sort as `<option>:<direction>`, the form stored in `_list_sort` and settings. */
export function formatListSort(config: ListSortConfig): string {
	return `${config.option}:${config.direction}`;
}

/**
 * Inverse of {@link formatListSort}. The direction follows the last colon, so a
 * property key may contain colons. Returns null for anything it cannot read back.
 */
export function parseListSort(raw: unknown): ListSortConfig | null {
	if (typeof raw !== 'string') return null;
	const separator = raw.lastIndexOf(':');
	if (separator < 0) return null;

	const optionPart = raw.slice(0, separator);
	const directionPart = raw.slice(separator + 1);
	if (directionPart !== 'asc' && directionPart !== 'desc') return null;

	if (optionPart.startsWith(PROPERTY_PREFIX)) {
		if (optionPart.length === PROPERTY_PREFIX.length) return null;
		return { option: optionPart as ListSortOption, direction: directionPart };
	}

	const isBuiltIn = BUILT_IN_SORT_OPTIONS.some((o) => o.value === optionPart);
	if (!isBuiltIn) return null;
	return { option: optionPart as ListSortOption, direction: directionPart };
}
