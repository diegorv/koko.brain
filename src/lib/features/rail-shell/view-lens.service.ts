import type { PropertyIndexRecord } from '#lib/features/collection/collection.types.js';
import { appendLog } from '#lib/utils/log.service.js';
import { refreshViewDefinition } from '#lib/features/type-definitions/view-parse-cache.js';
import { queryViewLens, resolveViewLens, viewLoadFromQuery, viewReadError, type ViewLoad } from './lens.logic';
import type { LensContext } from './rail-shell.types';

/** A view's navigator badge: the number of notes its list holds, or why it has no list. */
export type ViewCount = { count: number } | { error: string };

/**
 * Counts the notes each view lists, the same way its note list resolves it.
 * Re-reads every `.view` from disk (refreshing the parse cache) so an edit
 * made in the editor shows. A view that cannot be read or parsed, or whose
 * filter does not parse, gets that message instead of a count (a read
 * failure is also logged).
 */
export async function countViewNotes(
	viewPaths: readonly string[],
	ctx: LensContext,
	propertyIndex: Map<string, PropertyIndexRecord>,
): Promise<Map<string, ViewCount>> {
	const counts = new Map<string, ViewCount>();
	await Promise.all(
		viewPaths.map(async (path) => {
			let load: ViewLoad;
			try {
				const parsed = await refreshViewDefinition(path);
				load = parsed.success
					? viewLoadFromQuery(queryViewLens(parsed.definition, null, propertyIndex))
					: { kind: 'error', message: parsed.error };
			} catch (err) {
				appendLog('VIEW-LENS', `count failed for ${path}: ${String(err)}`);
				load = viewReadError(err);
			}
			const lens = resolveViewLens(path, load, ctx);
			counts.set(path, lens.status?.kind === 'error' ? { error: lens.status.message } : { count: lens.notes.length });
		}),
	);
	return counts;
}
