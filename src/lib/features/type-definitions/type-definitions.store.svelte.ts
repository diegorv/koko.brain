import type { TypeMetadata } from './type-definitions.logic';

let typeMetadataMap = $state<Map<string, TypeMetadata>>(new Map());

export const typeDefinitionsStore = {
	get typeMetadataMap() { return typeMetadataMap; },

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

	reset(): void {
		typeMetadataMap = new Map();
	},
};
