import type { PropertyIndexRecord } from '#lib/features/collection/collection.types.js';
import { appendLog } from '#lib/utils/log.service.js';
import { railViewNameNote } from '#lib/features/type-definitions/type-sidebar.logic.js';
import { refreshViewDefinition } from '#lib/features/type-definitions/view-parse-cache.js';
import { queryViewLens, resolveViewLens, viewLoadFromQuery, viewReadError, type ViewLoad } from './lens.logic';
import type { LensContext } from './rail-shell.types';

/** A view's navigator badge: the number of notes its list holds, or why it has no list. */
export type ViewCount = ({ count: number } | { error: string }) & {
	/** Set when the parsed `.view`'s `_rail_view` names none of its views (`railViewNameNote`) */
	railViewNote?: string;
};

/**
 * Counts the notes each view lists, the same way its note list resolves it.
 * Re-reads every `.view` from disk (refreshing the parse cache) so an edit
 * made in the editor shows. A view that cannot be read or parsed, or whose
 * filter does not parse, gets that message instead of a count (a read
 * failure is also logged). The parse also says whether `_rail_view` names one
 * of the views, which the index entry cannot.
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
			let railViewNote: string | null = null;
			try {
				const parsed = await refreshViewDefinition(path);
				if (parsed.success) railViewNote = railViewNameNote(parsed.definition);
				load = parsed.success
					? viewLoadFromQuery(queryViewLens(parsed.definition, null, propertyIndex, path, ctx))
					: { kind: 'error', message: parsed.error };
			} catch (err) {
				appendLog('VIEW-LENS', `count failed for ${path}: ${String(err)}`);
				load = viewReadError(err);
			}
			const lens = resolveViewLens(path, load, ctx);
			const badge = lens.status?.kind === 'error' ? { error: lens.status.message } : { count: lens.notes.length };
			counts.set(path, railViewNote ? { ...badge, railViewNote } : badge);
		}),
	);
	return counts;
}
