import type { NoteEntryV2 } from '$lib/types/vault-v2.types';
import type { TypeMetadata } from './type-definitions.logic';
import type { TypeSidebarSelection } from './type-sidebar.logic';

let typeMetadataMap = $state<Map<string, TypeMetadata>>(new Map());
let entries = $state<NoteEntryV2[]>([]);
let entriesVersion = $state(0);
let selectedTypeOrNav = $state<TypeSidebarSelection | null>(null);

export const typeDefinitionsStore = {
	get typeMetadataMap() { return typeMetadataMap; },
	get entries() { return entries; },
	get entriesVersion() { return entriesVersion; },
	get selectedTypeOrNav() { return selectedTypeOrNav; },

	/** Returns metadata for a type name, or undefined if not defined. */
	getTypeMetadata(typeName: string): TypeMetadata | undefined {
		return typeMetadataMap.get(typeName);
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
	},
};
