import type { ViewUpdate } from '@codemirror/view';
import { forceDecorationRebuild } from './effects';
import { mouseSelectingField } from './mouse-selecting';

/**
 * Determines what action a ViewPlugin should take in response to a ViewUpdate.
 * - `'rebuild'`: decorations should be recomputed (doc changed, reconfigured, drag ended, selection moved, force rebuild)
 * - `'skip'`: currently dragging — suppress rebuild to prevent flicker
 * - `'none'`: no relevant change, including a pure scroll — keep existing decorations
 *
 * When `lastCursorLine` is provided, selection-only changes that keep the cursor
 * on the same line return `'none'` instead of `'rebuild'`. This optimization is
 * safe for plugins using `revealPredicate` — decoration visibility only changes
 * when the cursor enters/leaves a line, not when it moves within one.
 */
export function checkUpdateAction(update: ViewUpdate, lastCursorLine?: number): 'rebuild' | 'skip' | 'none' {
	if (update.docChanged) return 'rebuild';
	if (update.transactions.some((t) => t.reconfigured)) return 'rebuild';
	if (update.transactions.some((t) => t.effects.some((e) => e.is(forceDecorationRebuild))))
		return 'rebuild';

	const isDragging = update.state.field(mouseSelectingField, false);
	const wasDragging = update.startState.field(mouseSelectingField, false);
	if (wasDragging && !isDragging) return 'rebuild';
	if (isDragging) return 'skip';

	if (update.selectionSet) {
		// Skip rebuild when cursor stayed on the same line — revealPredicate
		// only changes when the cursor enters/leaves a line's range.
		if (lastCursorLine !== undefined) {
			const cursorLine = update.state.doc.lineAt(update.state.selection.main.head).number;
			if (cursorLine === lastCursorLine) return 'none';
		}
		return 'rebuild';
	}

	// A pure viewport change (scroll) ends here: scrollDebouncePlugin dispatches
	// forceDecorationRebuild after scrolling stops. A viewport change that also
	// moves the selection (arrow keys at the viewport edge) or carries a
	// reconfigure / forceDecorationRebuild was handled above.
	return 'none';
}
