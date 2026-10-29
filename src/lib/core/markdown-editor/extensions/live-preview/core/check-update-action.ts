import type { ViewUpdate } from '@codemirror/view';
import { forceDecorationRebuild } from './effects';
import { mouseSelectingField } from './mouse-selecting';
import { sameTouchedLines } from './reveal';

/**
 * Determines what action a ViewPlugin should take in response to a ViewUpdate.
 * - `'rebuild'`: decorations should be recomputed (doc changed, reconfigured, drag ended, selection changed its touched lines, force rebuild)
 * - `'skip'`: currently dragging, even on a force rebuild — suppress rebuild to prevent flicker
 * - `'none'`: no relevant change, including a pure scroll — keep existing decorations
 *
 * The answer reads only this update (no state survives across updates). A
 * selection change rebuilds only when it changes the set of lines the
 * selection touches (`sameTouchedLines`): `revealPredicate` reveals whole
 * lines, so a move within that set cannot change any decoration. A move
 * answered `'none'` keeps the set equal to the one the last rebuild saw, so
 * those answers chain safely; a drag's skips end in the release rebuild.
 */
export function checkUpdateAction(update: ViewUpdate): 'rebuild' | 'skip' | 'none' {
	if (update.docChanged) return 'rebuild';
	if (update.transactions.some((t) => t.reconfigured)) return 'rebuild';

	// The drag check precedes forceDecorationRebuild: revealPredicate reveals
	// nothing mid-drag, so a forced rebuild (scroll debounce after autoscroll)
	// would collapse a revealed block under the pointer. The release rebuilds.
	const isDragging = update.state.field(mouseSelectingField, false);
	const wasDragging = update.startState.field(mouseSelectingField, false);
	if (wasDragging && !isDragging) return 'rebuild';
	if (isDragging) return 'skip';

	if (update.transactions.some((t) => t.effects.some((e) => e.is(forceDecorationRebuild))))
		return 'rebuild';

	if (update.selectionSet) {
		return sameTouchedLines(update.startState, update.state) ? 'none' : 'rebuild';
	}

	// A pure viewport change (scroll) ends here: scrollDebouncePlugin dispatches
	// forceDecorationRebuild after scrolling stops. A viewport change that also
	// moves the selection (arrow keys at the viewport edge) or carries a
	// reconfigure / forceDecorationRebuild was handled above.
	return 'none';
}

/**
 * True for a viewport change that should not rebuild a full-document
 * decorator (CLAUDE.md live-preview perf rule 4): no doc change, no selection
 * move, no reconfigure and no `forceDecorationRebuild`. scrollDebouncePlugin
 * dispatches the rebuild once scrolling settles. Any other effect (a
 * `rebuildOn` effect included) riding a scroll still counts as a pure scroll.
 */
export function isPureScroll(update: ViewUpdate): boolean {
	return (
		update.viewportChanged &&
		!update.docChanged &&
		!update.selectionSet &&
		!update.transactions.some(
			(t) => t.reconfigured || t.effects.some((e) => e.is(forceDecorationRebuild)),
		)
	);
}
