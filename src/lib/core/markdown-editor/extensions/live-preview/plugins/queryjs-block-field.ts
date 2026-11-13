import { RangeSetBuilder } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import { Decoration, type DecorationSet } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { findAllQueryjsBlocks } from '../parsers/queryjs-block';
import { fencedBlockRenderers } from '../core/fenced-block-renderers';
import { hideLines } from '../core/hide-lines';
import { blockDecorator } from '../core/block-decorator';
import { forceDecorationRebuild } from '../core/effects';
import { mouseSelectingField } from '../core/mouse-selecting';
import { revealPredicate } from '../core/reveal';

/** Computes queryjs block decorations; none when no `queryjs` renderer is registered. */
export function computeQueryjsBlocks(state: EditorState): DecorationSet {
	const renderer = state.facet(fencedBlockRenderers).get('queryjs');
	if (!renderer) return Decoration.none;
	const isRevealed = revealPredicate(state);
	const builder = new RangeSetBuilder<Decoration>();

	for (const block of findAllQueryjsBlocks(state)) {
		// When cursor is inside, show raw JS
		if (isRevealed(block.openFenceFrom, block.closeFenceTo)) continue;

		const widget = renderer.widget(block.jsContent);

		// Opening fence line: replace with the renderer's widget
		builder.add(
			block.openFenceFrom,
			block.openFenceTo,
			Decoration.replace({ widget }),
		);

		// Content lines + closing fence: hide
		hideLines(
			builder,
			state.doc,
			state.doc.lineAt(block.openFenceTo).number + 1,
			state.doc.lineAt(block.closeFenceTo).number,
		);
	}

	return builder.finish();
}

/**
 * ViewPlugin that manages queryjs block decorations independently.
 * Replaces ```queryjs code blocks with the registered renderer's widget when cursor is outside.
 * Shows raw JavaScript when cursor is inside the block.
 *
 * The `gate` is narrower than every other block decorator's: queryjs widgets
 * are the expensive ones, so anything that is not a document edit, a selection
 * change, a `forceDecorationRebuild`, a replaced syntax tree or the end of a
 * mouse drag is dropped before `checkUpdateAction`. The tree check lets in the
 * parse worker's effect-only transaction: blocks are found by walking the tree,
 * so a block past the initial parse (3000 chars) only appears once it lands.
 * `forceDecorationRebuild` must pass through: it is how the editor signals
 * "the property index became ready", and the rebuild creates fresh widgets whose `eq()` snapshot differs, replacing any
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
		syntaxTree(update.startState) !== syntaxTree(update.state) ||
		(update.startState.field(mouseSelectingField, false) === true &&
			!update.state.field(mouseSelectingField, false)),
});
