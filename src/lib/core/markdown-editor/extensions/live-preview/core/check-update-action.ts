import type { ViewUpdate } from '@codemirror/view';
import { forceDecorationRebuild } from './effects';
import { mouseSelectingField } from './mouse-selecting';

/**
 * Determines what action a ViewPlugin should take in response to a ViewUpdate.
 * - `'rebuild'`: decorations should be recomputed (doc/viewport changed, drag ended, selection moved, force rebuild)
 * - `'skip'`: currently dragging — suppress rebuild to prevent flicker
 * - `'none'`: no relevant change — keep existing decorations
 *
 * When `lastCursorLine` is provided, selection-only changes that keep the cursor
 * on the same line return `'none'` instead of `'rebuild'`. This optimization is
 * safe for plugins using `shouldShowSource` — decoration visibility only changes
 * when the cursor enters/leaves a line, not when it moves within one.
 */
export function checkUpdateAction(update: ViewUpdate, lastCursorLine?: number): 'rebuild' | 'skip' | 'none' {
	if (update.docChanged) return 'rebuild';
	// Pure viewport change (scroll): defer to scrollDebouncePlugin which will
	// dispatch forceDecorationRebuild after scroll stops. This eliminates
	// decoration rebuilds during active scrolling for all 27 plugins.
	if (update.viewportChanged) return 'none';
	if (update.transactions.some((t) => t.reconfigured)) return 'rebuild';
	if (update.transactions.some((t) => t.effects.some((e) => e.is(forceDecorationRebuild))))
		return 'rebuild';

	const isDragging = update.state.field(mouseSelectingField, false);
	const wasDragging = update.startState.field(mouseSelectingField, false);
	if (wasDragging && !isDragging) return 'rebuild';
	if (isDragging) return 'skip';

	if (update.selectionSet) {
		// Skip rebuild when cursor stayed on the same line — shouldShowSource
		// only changes when the cursor enters/leaves a line's range.
		if (lastCursorLine !== undefined) {
			const cursorLine = update.state.doc.lineAt(update.state.selection.main.head).number;
			if (cursorLine === lastCursorLine) return 'none';
		}
		return 'rebuild';
	}

	return 'none';
}
