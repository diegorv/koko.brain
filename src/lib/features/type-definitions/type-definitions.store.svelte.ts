import type { NoteEntryV2 } from '$lib/types/vault-v2.types';
import type { TypeMetadata } from './type-definitions.logic';

let typeMetadataMap = $state<Map<string, TypeMetadata>>(new Map());
let entries = $state<NoteEntryV2[]>([]);
let entriesVersion = $state(0);

export const typeDefinitionsStore = {
	get typeMetadataMap() { return typeMetadataMap; },
	get entries() { return entries; },
	get entriesVersion() { return entriesVersion; },

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

	reset(): void {
		typeMetadataMap = new Map();
		entries = [];
		entriesVersion = 0;
	},
};
