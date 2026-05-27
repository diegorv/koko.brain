import type { TypeMetadata } from '$lib/features/type-definitions/type-definitions.logic';
import type { AutoMoveRule } from './auto-move.types';

/**
 * Generates auto-move rules from type definitions that have `archiveTo` configured.
 * These rules move notes to the specified destination when `_archived` is set to true.
 */
export function generateLifecycleRules(
	typeMetadataMap: Map<string, TypeMetadata>,
): AutoMoveRule[] {
	const rules: AutoMoveRule[] = [];

	for (const [typeName, metadata] of typeMetadataMap) {
		if (!metadata.archiveTo) continue;

		rules.push({
			id: `lifecycle-archive-${typeName.toLowerCase()}`,
			name: `[${typeName}] Archive`,
			expression: `type.lower() == "${typeName.toLowerCase()}" && _archived == true`,
			destination: metadata.archiveTo,
			enabled: true,
		});
	}

	return rules;
}
