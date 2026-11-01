import type { PropertyIndexRecord } from '#lib/features/collection/collection.types.js';
import { appendLog } from '#lib/utils/log.service.js';
import { refreshViewDefinition } from '#lib/features/type-definitions/view-parse-cache.js';
import { queryViewLens, resolveViewLens } from './lens.logic';
import type { LensContext } from './rail-shell.types';

/**
 * Counts the notes each view lists, the same way its note list resolves it.
 * Re-reads every `.view` from disk (refreshing the parse cache) so an edit
 * made in the editor shows. A view that cannot
 * be read or parsed is left out of the map (a read failure is logged).
 */
export async function countViewNotes(
	viewPaths: readonly string[],
	ctx: LensContext,
	propertyIndex: Map<string, PropertyIndexRecord>,
): Promise<Map<string, number>> {
	const counts = new Map<string, number>();
	await Promise.all(
		viewPaths.map(async (path) => {
			try {
				const parsed = await refreshViewDefinition(path);
				if (!parsed.success) return;
				counts.set(path, resolveViewLens(path, queryViewLens(parsed.definition, null, propertyIndex), ctx).notes.length);
			} catch (err) {
				// An unreadable view has no count; its row shows none.
				appendLog('VIEW-LENS', `count failed for ${path}: ${String(err)}`);
			}
		}),
	);
	return counts;
}
