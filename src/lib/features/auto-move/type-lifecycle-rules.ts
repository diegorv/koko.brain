import type { TypeMetadata } from '$lib/features/type-definitions/type-definitions.logic';
import type { AutoMoveRule } from './auto-move.types';

/**
 * Generates auto-move rules from type definitions that have `archiveTo` configured.
 *
 * Every type with `archiveTo` gets an archive rule (move to the archive
 * destination when `_archived` becomes true).
 *
 * An unarchive rule (move back when `_archived` becomes false) is only emitted
 * when `archiveTo` has the shape `{folder}/<segment>`. In that shape the archive
 * is a single subfolder of the note's folder, so the unarchive destination
 * `{parent}` restores the note to where it came from and the archived-folder
 * guard can match the real `<segment>`. For any other `archiveTo`
 * (e.g. `archive/events/{year}`) the original location is not recoverable from
 * `{parent}`, so no unarchive rule is generated and the archive rule omits the
 * static folder guard (the service's isAlreadyInDestination check prevents
 * re-archiving against the dynamically resolved destination).
 */
export function generateLifecycleRules(
	typeMetadataMap: Map<string, TypeMetadata>,
): AutoMoveRule[] {
	const rules: AutoMoveRule[] = [];

	for (const [typeName, metadata] of typeMetadataMap) {
		if (!metadata.archiveTo) continue;

		// `type ==` is already case-insensitive for the type key (see
		// `evaluator.ts::evaluateBinary`), so no `.lower()` is needed. Calling a
		// method here would also throw on any note whose type is absent or not a
		// string, once per rule per save.
		const typeExpr = `type == "${typeName}"`;

		// Only "{folder}/<segment>" destinations have a static archive-folder
		// segment and a correct `{parent}` restore target.
		const folderSuffixMatch = metadata.archiveTo.match(/^\{folder\}\/([^/]+)$/);
		const archiveSuffix = folderSuffixMatch ? folderSuffixMatch[1] : null;

		const archiveGuard = archiveSuffix ? ` && !file.folder.endsWith("${archiveSuffix}")` : '';
		rules.push({
			id: `lifecycle-archive-${typeName.toLowerCase()}`,
			name: `[${typeName}] Archive`,
			expression: `${typeExpr} && _archived == true${archiveGuard}`,
			destination: metadata.archiveTo,
			enabled: true,
		});

		if (archiveSuffix) {
			rules.push({
				id: `lifecycle-unarchive-${typeName.toLowerCase()}`,
				name: `[${typeName}] Unarchive`,
				expression: `${typeExpr} && _archived == false && file.folder.endsWith("${archiveSuffix}")`,
				destination: '{parent}',
				enabled: true,
			});
		}
	}

	return rules;
}
