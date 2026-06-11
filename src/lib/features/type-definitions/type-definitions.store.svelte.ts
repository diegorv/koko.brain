import type { NoteEntryV2 } from '$lib/types/vault-v2.types';
import type { TypeMetadata } from './type-definitions.logic';
import type { TypeSidebarSelection } from './type-sidebar.logic';

let typeMetadataMap = $state<Map<string, TypeMetadata>>(new Map());
let entries = $state<NoteEntryV2[]>([]);
let entriesVersion = $state(0);
let selectedTypeOrNav = $state<TypeSidebarSelection | null>(null);
/** O(1) path → entry index over the latest entries snapshot. Rebuilt on every setEntries. */
let entriesByPath = $state<Map<string, NoteEntryV2>>(new Map());
/** O(1) type title → definition path index (isA === 'Type', first match wins). Rebuilt on every setEntries. */
let typeDefinitionPaths = $state<Map<string, string>>(new Map());

export const typeDefinitionsStore = {
	get typeMetadataMap() { return typeMetadataMap; },
	get entries() { return entries; },
	get entriesVersion() { return entriesVersion; },
	get selectedTypeOrNav() { return selectedTypeOrNav; },

	/** Returns metadata for a type name, or undefined if not defined. */
	getTypeMetadata(typeName: string): TypeMetadata | undefined {
		return typeMetadataMap.get(typeName);
	},

	/** O(1) lookup of an entry by absolute path in the latest snapshot. */
	getEntryByPath(path: string): NoteEntryV2 | undefined {
		return entriesByPath.get(path);
	},

	/** O(1) lookup of a type definition note's absolute path by type title. */
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
		const defPaths = new Map<string, string>();
		for (const e of value) {
			byPath.set(e.path, e);
			if (e.isA === 'Type' && !defPaths.has(e.title)) defPaths.set(e.title, e.path);
		}
		entriesByPath = byPath;
		typeDefinitionPaths = defPaths;
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
