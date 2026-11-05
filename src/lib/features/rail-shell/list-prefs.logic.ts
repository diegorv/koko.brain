import type { Lens } from '#lib/features/rail-shell/rail-shell.types.js';
import { formatListSort, parseListSort } from '#lib/features/rail-shell/list-sort.logic.js';
import type { ListPrefs, ListSortConfig } from '#lib/features/rail-shell/list-toolbar.types.js';

/**
 * One stored entry of `layout.railListPrefs`, as `settings.json` keeps it: the
 * sort is its `<option>:<direction>` string.
 */
export interface StoredListPrefs {
	/** The picked order, as {@link formatListSort} writes it */
	sort?: string;
	/** Frontmatter keys shown as pills on the rows, in display order */
	properties?: string[];
}

/**
 * Lens kinds whose list is newest first when nothing is picked. Literal strings
 * because importing `lens.logic.ts` would pull the whole lens resolver in here.
 */
const MODIFIED_DEFAULT_KINDS = new Set(['inbox', 'today', 'favorites', 'archive', 'type', 'untyped']);

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseEntry(raw: unknown): ListPrefs | null {
	if (!isPlainObject(raw)) return null;

	const prefs: ListPrefs = {};
	const sort = parseListSort(raw.sort);
	if (sort) prefs.sort = sort;
	if (Array.isArray(raw.properties)) {
		const properties = raw.properties.filter((item): item is string => typeof item === 'string');
		if (properties.length > 0) prefs.properties = properties;
	}

	return Object.keys(prefs).length > 0 ? prefs : null;
}

/**
 * The saved list preferences of a `layout.railListPrefs` value. The value is
 * loaded unvalidated, so this drops whatever does not read back: a non-object
 * record or entry, an unparsable sort, non-string property items, and entries
 * left empty. Never throws and never changes `raw`.
 */
export function parseRailListPrefs(raw: unknown): Record<string, ListPrefs> {
	const result: Record<string, ListPrefs> = {};
	if (!isPlainObject(raw)) return result;

	for (const [key, entry] of Object.entries(raw)) {
		const prefs = parseEntry(entry);
		if (prefs) result[key] = prefs;
	}
	return result;
}

/**
 * The next `layout.railListPrefs` record after changing one list's preferences.
 * A field the patch leaves out keeps its saved value; `null` (or an empty
 * property array) removes the field, and a key left with no field is deleted.
 * Entries that do not parse are dropped from the result. `raw` is not changed.
 */
export function withListPrefs(
	raw: unknown,
	key: string,
	patch: { sort?: ListSortConfig | null; properties?: string[] | null },
): Record<string, StoredListPrefs> {
	const prefs = parseRailListPrefs(raw);
	const next: ListPrefs = { ...prefs[key] };

	if (patch.sort !== undefined) {
		if (patch.sort === null) delete next.sort;
		else next.sort = patch.sort;
	}
	if (patch.properties !== undefined) {
		if (patch.properties === null || patch.properties.length === 0) delete next.properties;
		else next.properties = [...patch.properties];
	}

	if (next.sort === undefined && next.properties === undefined) delete prefs[key];
	else prefs[key] = next;

	const stored: Record<string, StoredListPrefs> = {};
	for (const [entryKey, entry] of Object.entries(prefs)) {
		stored[entryKey] = {
			...(entry.sort ? { sort: formatListSort(entry.sort) } : {}),
			...(entry.properties ? { properties: [...entry.properties] } : {}),
		};
	}
	return stored;
}

/** The order a list uses when no sort is saved for it, or null when it keeps the lens's native order. */
export function defaultLensSort(kind: string): ListSortConfig | null {
	return MODIFIED_DEFAULT_KINDS.has(kind) ? { option: 'modified', direction: 'desc' } : null;
}

/**
 * The `layout.railListPrefs` key a lens reads its preferences from: one shared
 * key for every folder, `type:<name>` for a type, and the kind for the rest.
 * Kind strings match `lens.logic.ts`.
 */
export function listPrefsKey(lens: Lens): string {
	if (lens.kind === 'folder') return 'folder';
	if (lens.kind === 'type' && lens.target) return `type:${lens.target}`;
	return lens.kind;
}
