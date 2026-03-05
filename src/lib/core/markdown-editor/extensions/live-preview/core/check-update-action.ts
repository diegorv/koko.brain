import type { ViewUpdate } from '@codemirror/view';
import { forceDecorationRebuild } from './effects';
import { mouseSelectingField } from './mouse-selecting';

/**
 * Determines what action a ViewPlugin should take in response to a ViewUpdate.
 * - `'rebuild'`: decorations should be recomputed (doc/viewport changed, drag ended, selection moved, force rebuild)
 * - `'skip'`: currently dragging — suppress rebuild to prevent flicker
 * - `'none'`: no relevant change — keep existing decorations
 */
export function checkUpdateAction(update: ViewUpdate): 'rebuild' | 'skip' | 'none' {
	if (update.docChanged || update.viewportChanged) return 'rebuild';
	if (update.transactions.some((t) => t.reconfigured)) return 'rebuild';
	if (update.transactions.some((t) => t.effects.some((e) => e.is(forceDecorationRebuild))))
		return 'rebuild';

	const isDragging = update.state.field(mouseSelectingField, false);
	const wasDragging = update.startState.field(mouseSelectingField, false);
	if (wasDragging && !isDragging) return 'rebuild';
	if (isDragging) return 'skip';
	if (update.selectionSet) return 'rebuild';

	return 'none';
}
