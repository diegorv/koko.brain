import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import { normalizeTypeCasing } from '#lib/core/frontmatter/properties.logic.js';
import type { TypeMetadata } from './type-definitions.logic';
import type { TypeSidebarSelection } from './type-sidebar.logic';

let typeMetadataMap = $state<Map<string, TypeMetadata>>(new Map());
/**
 * Whole-vault snapshot, replaced (never mutated) on every index refresh.
 * `$state.raw`: a deep proxy over 10k+ entries cost ~100-150 ms per refresh.
 */
let entries = $state.raw<NoteEntryV2[]>([]);
let entriesVersion = $state(0);
let selectedTypeOrNav = $state<TypeSidebarSelection | null>(null);
/** O(1) path → entry index over the latest entries snapshot. Rebuilt by setEntries, patched per path by patchEntries. */
let entriesByPath = $state<Map<string, NoteEntryV2>>(new Map());
/** O(1) type name (normalized title) → definition path index (isA === 'Type', first match wins). Rebuilt by setEntries, and by patchEntries when a touched entry was or is a Type. */
let typeDefinitionPaths = $state<Map<string, string>>(new Map());

export const typeDefinitionsStore = {
	get typeMetadataMap() { return typeMetadataMap; },
	get entries() { return entries; },
	get entriesVersion() { return entriesVersion; },
	get selectedTypeOrNav() { return selectedTypeOrNav; },
	/**
	 * O(1) path → entry index over the latest snapshot, for callers that need the
	 * whole map (a comparator resolving many paths) rather than a single lookup.
	 * Always written together with `entries` in setEntries/patchEntries/reset - a
	 * writer that updates one without the other would silently stale every consumer.
	 */
	get entriesByPath() { return entriesByPath; },

	/** Returns metadata for a type name, or undefined if not defined. */
	getTypeMetadata(typeName: string): TypeMetadata | undefined {
		return typeMetadataMap.get(typeName);
	},

	/** O(1) lookup of an entry by absolute path in the latest snapshot. */
	getEntryByPath(path: string): NoteEntryV2 | undefined {
		return entriesByPath.get(path);
	},

	/** O(1) lookup of a type definition note's absolute path by type name (the `isA` its notes carry). */
	getTypeDefinitionPath(typeName: string): string | undefined {
		return typeDefinitionPaths.get(typeName);
	},

	/** Returns all type metadata entries sorted by order. */
	get sortedTypes(): TypeMetadata[] {
		return Array.from(typeMetadataMap.values()).sort((a, b) => a.order - b.order);
	},

	setTypeMetadataMap(map: Map<string, TypeMetadata>): void {
		typeMetadataMap = map;
	},

	/** Stores the latest vault entries snapshot for sidebar consumption. */
	setEntries(value: NoteEntryV2[]): void {
		entries = value;
		// Build lookup indexes from the raw (pre-proxy) array so per-render
		// consumers resolve paths and type definitions in O(1) instead of
		// scanning the reactive entries array (see icon-resolver).
		const byPath = new Map<string, NoteEntryV2>();
		for (const e of value) byPath.set(e.path, e);
		entriesByPath = byPath;
		typeDefinitionPaths = buildTypeDefinitionPaths(value);
		entriesVersion++;
	},

	/**
	 * Stores `value`, a snapshot that differs from the current one only at
	 * `touchedPaths` (`upserted` holds their new entries; a touched path not
	 * in it was removed), updating `entriesByPath` for those paths only. The
	 * type definition paths are rebuilt only when a touched entry was or is
	 * a Type, since first-match-wins needs the whole snapshot.
	 */
	patchEntries(value: NoteEntryV2[], touchedPaths: Iterable<string>, upserted: NoteEntryV2[]): void {
		const byPath = new Map(entriesByPath);
		let typeTouched = false;
		for (const path of touchedPaths) {
			if (byPath.get(path)?.isA === 'Type') typeTouched = true;
			byPath.delete(path);
		}
		for (const e of upserted) {
			byPath.set(e.path, e);
			if (e.isA === 'Type') typeTouched = true;
		}
		entries = value;
		entriesByPath = byPath;
		if (typeTouched) typeDefinitionPaths = buildTypeDefinitionPaths(value);
		entriesVersion++;
	},

	/** Sets the current sidebar selection (type, nav item, or untyped). */
	setSelection(value: TypeSidebarSelection | null): void {
		selectedTypeOrNav = value;
	},

	reset(): void {
		typeMetadataMap = new Map();
		entries = [];
		entriesVersion = 0;
		selectedTypeOrNav = null;
		entriesByPath = new Map();
		typeDefinitionPaths = new Map();
	},
};

/**
 * Type name -> definition note path over `value` (isA === 'Type'). Keyed by
 * the title with Rust's `is_a` casing, so the `Book` notes find a `book.md`
 * definition. When several definitions map to one type name (`a/book.md` and
 * `b/Book.md`, or two `Book.md` files), the first in `value` order wins.
 * `value` is the Rust snapshot, sorted by path (`get_all_vault_entries_v2`,
 * kept sorted by `patchEntriesSnapshot`), so the lowest path wins.
 * `buildTypeMetadataMap` applies the same rule, so both name the same file.
 */
function buildTypeDefinitionPaths(value: NoteEntryV2[]): Map<string, string> {
	const defPaths = new Map<string, string>();
	for (const e of value) {
		if (e.isA !== 'Type') continue;
		const name = normalizeTypeCasing(e.title);
		if (!defPaths.has(name)) defPaths.set(name, e.path);
	}
	return defPaths;
}
