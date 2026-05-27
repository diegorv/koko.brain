import type { TypeMetadata } from '$lib/features/type-definitions/type-definitions.logic';
import type { AutoMoveRule } from './auto-move.types';

/**
 * Generates auto-move rules from type definitions that have `archiveTo` configured.
 * For each type: an archive rule (move to archive on _archived=true) and an
 * unarchive rule (move back to parent on _archived=false while in _archive folder).
 */
export function generateLifecycleRules(
	typeMetadataMap: Map<string, TypeMetadata>,
): AutoMoveRule[] {
	const rules: AutoMoveRule[] = [];

	for (const [typeName, metadata] of typeMetadataMap) {
		if (!metadata.archiveTo) continue;

		const typeExpr = `type.lower() == "${typeName.toLowerCase()}"`;

		rules.push({
			id: `lifecycle-archive-${typeName.toLowerCase()}`,
			name: `[${typeName}] Archive`,
			expression: `${typeExpr} && _archived == true`,
			destination: metadata.archiveTo,
			enabled: true,
		});

		rules.push({
			id: `lifecycle-unarchive-${typeName.toLowerCase()}`,
			name: `[${typeName}] Unarchive`,
			expression: `${typeExpr} && _archived == false && file.folder.endsWith("_archive")`,
			destination: '{parent}',
			enabled: true,
		});
	}

	return rules;
}
