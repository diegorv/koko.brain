import { RangeSetBuilder } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import { Decoration, type DecorationSet } from '@codemirror/view';
import { findAllQueryjsBlocks } from '../parsers/queryjs-block';
import { QueryjsBlockWidget } from '../widgets/queryjs-block-widget';
import { hiddenLineDeco } from '../styles';
import { blockDecorator } from '../core/block-decorator';
import { forceDecorationRebuild } from '../core/effects';
import { mouseSelectingField } from '../core/mouse-selecting';
import { revealPredicate } from '../core/reveal';

/** Computes queryjs block decorations */
export function computeQueryjsBlocks(state: EditorState): DecorationSet {
	const isRevealed = revealPredicate(state);
	const builder = new RangeSetBuilder<Decoration>();

	for (const block of findAllQueryjsBlocks(state)) {
		// When cursor is inside, show raw JS
		if (isRevealed(block.openFenceFrom, block.closeFenceTo)) continue;

		const widget = new QueryjsBlockWidget(block.jsContent);

		// Opening fence line: replace with QueryjsBlockWidget
		builder.add(
			block.openFenceFrom,
			block.openFenceTo,
			Decoration.replace({ widget }),
		);

		// Content lines + closing fence: hide
		const firstHidden = state.doc.lineAt(block.openFenceTo).number + 1;
		const lastHidden = state.doc.lineAt(block.closeFenceTo).number;
		for (let n = firstHidden; n <= lastHidden; n++) {
			const line = state.doc.line(n);
			builder.add(line.from, line.from, hiddenLineDeco);
			builder.add(line.from, line.to, Decoration.replace({}));
		}
	}

	return builder.finish();
}

/**
 * ViewPlugin that manages queryjs block decorations independently.
 * Replaces ```queryjs code blocks with QueryjsBlockWidget when cursor is outside.
 * Shows raw JavaScript when cursor is inside the block.
 *
 * The `gate` is narrower than every other block decorator's: queryjs widgets
 * are the expensive ones, so anything that is not a document edit, a selection
 * change, a `forceDecorationRebuild` or the end of a mouse drag is dropped
 * before `checkUpdateAction`. `forceDecorationRebuild` must pass through: it is
 * how the editor signals "the property index became ready", and the rebuild
 * creates fresh widgets whose `eq()` snapshot differs, replacing any
 * "Building index..." placeholder. Scroll-debounce force rebuilds also land
 * here; they recompute the (cheap) line scan and `eq()` keeps the existing DOM,
 * so no script re-executes. The drag release must pass because
 * `checkUpdateAction` skips a forced rebuild mid-drag on the promise that the
 * release rebuilds, and the release transaction is effect-only. Do not add
 * `forceDecorationRebuild` to `rebuildOn` instead: that bypasses the drag skip
 * and collapses a revealed block under the pointer.
 */
export const queryjsBlockField = blockDecorator({
	settingsKey: 'queryjs',
	profileLabel: 'queryjs-block',
	compute: computeQueryjsBlocks,
	gate: (update) =>
		update.docChanged ||
		update.selectionSet ||
		update.transactions.some((t) => t.effects.some((e) => e.is(forceDecorationRebuild))) ||
		(update.startState.field(mouseSelectingField, false) === true &&
			!update.state.field(mouseSelectingField, false)),
});
