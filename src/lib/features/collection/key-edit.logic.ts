import type { CollectionDefinition, CollectionViewDef } from './collection.types';
import { parseCollectionYaml, updateCollectionYaml, type CollectionYamlUpdates } from './yaml-parser';

/**
 * One key the collection editor writes on its own: a root key (`filters`,
 * `formulas`) or a key of the view at an index (the `view*` keys), named as in
 * `CollectionYamlUpdates`.
 */
export type EditorKey = Exclude<keyof CollectionYamlUpdates, 'viewIndex'>;

/** The field of the view that each view key writes. */
const VIEW_FIELDS = {
	viewSort: 'sort',
	viewFilters: 'filters',
	viewOrder: 'order',
	viewDateProperty: 'dateProperty',
	viewEndDateProperty: 'endDateProperty',
	viewWeekStartDay: 'weekStartDay',
	viewColorProperty: 'colorProperty',
} as const satisfies Record<Exclude<EditorKey, 'filters' | 'formulas'>, keyof CollectionViewDef>;

/** Every key the collection editor writes. */
export const EDITOR_KEYS: readonly EditorKey[] = ['filters', 'formulas', ...(Object.keys(VIEW_FIELDS) as EditorKey[])];

/** A toolbar edit refused because the key it writes changed since the toolbar read it. */
export class CollectionEditConflict extends Error {
	constructor() {
		super('The file changed since it was read');
		this.name = 'CollectionEditConflict';
	}
}

/** JSON with the keys of every object sorted, so key order never makes two values differ. */
export function sortedJson(value: unknown): string {
	return JSON.stringify(value ?? null, (_key, v: unknown) =>
		v && typeof v === 'object' && !Array.isArray(v)
			? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
			: v,
	);
}

/**
 * The value of `key` in `definition`, as a string two reads compare by. A view
 * key is paired with the `name` of the view at `viewIndex`, so an edit made on
 * one view is refused once another view sits at that index.
 */
function editorKeyBase(definition: CollectionDefinition, key: EditorKey, viewIndex: number): string {
	if (key === 'filters' || key === 'formulas') return sortedJson(definition[key]);
	const view = definition.views[viewIndex];
	return sortedJson([view?.name, view?.[VIEW_FIELDS[key]]]);
}

/** The base of every key in `definition`, for the view at `viewIndex`. */
export function editorKeyBases(definition: CollectionDefinition, viewIndex: number): Record<EditorKey, string> {
	return Object.fromEntries(EDITOR_KEYS.map((key) => [key, editorKeyBase(definition, key, viewIndex)])) as Record<EditorKey, string>;
}

/** The YAML an editor key edit gives, or why it was refused. */
export type EditorKeyEditResult =
	| { ok: true; yaml: string }
	/** That key in the YAML is no longer the value the edit was made on */
	| { ok: false; reason: 'conflict' }
	/** The YAML does not parse as a collection */
	| { ok: false; reason: 'invalid'; error: string };

/**
 * Writes `value` as `key` of the YAML `yaml` (for a view key, of the view at
 * `viewIndex`), and nothing else. Refused as a conflict when that key's base in
 * `yaml` is not `base`, the one the editor showed when the edit was made. The
 * YAML is re-serialized, so its comments go.
 */
export function applyEditorKeyEdit<K extends EditorKey>(
	yaml: string,
	key: K,
	value: CollectionYamlUpdates[K],
	base: string,
	viewIndex: number,
): EditorKeyEditResult {
	const parsed = parseCollectionYaml(yaml);
	if (!parsed.success) return { ok: false, reason: 'invalid', error: parsed.error };
	if (editorKeyBase(parsed.definition, key, viewIndex) !== base) return { ok: false, reason: 'conflict' };
	return { ok: true, yaml: updateCollectionYaml(yaml, { [key]: value, viewIndex }) };
}

/**
 * The base of `key` once `value` is written into `yaml`: the one the next edit
 * of that key is checked against. Read back through the writer and the
 * parser, so a removed key or an empty value compares as the file will hold
 * it. Empty when `yaml` does not parse.
 */
export function editorKeyBaseAfter<K extends EditorKey>(yaml: string, key: K, value: CollectionYamlUpdates[K], viewIndex: number): string {
	const parsed = parseCollectionYaml(updateCollectionYaml(yaml, { [key]: value, viewIndex }));
	return parsed.success ? editorKeyBase(parsed.definition, key, viewIndex) : '';
}

/** Whether the view at `index` of `yaml` is named `name`, so a tab edit made on an older read lands on the view it was made on. */
export function isViewAt(yaml: string, index: number, name: string): boolean {
	const parsed = parseCollectionYaml(yaml);
	return parsed.success && parsed.definition.views[index]?.name === name;
}
