import { RangeSetBuilder } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import { Decoration, type DecorationSet } from '@codemirror/view';
import { findQueryjsBlock } from '../parsers/queryjs-block';
import { QueryjsBlockWidget } from '../widgets/queryjs-block-widget';
import { hiddenLineDeco } from '../styles';
import { blockDecorator } from '../core/block-decorator';
import { forceDecorationRebuild } from '../core/effects';
import { shouldShowSource } from '../core/should-show-source';
import { getAllLines } from '../core/get-all-lines';

/** Computes queryjs block decorations */
export function computeQueryjsBlocks(state: EditorState): DecorationSet {
	const lines = getAllLines(state);
	const builder = new RangeSetBuilder<Decoration>();
	let idx = 0;

	while (idx < lines.length) {
		const result = findQueryjsBlock(lines, idx);
		if (result) {
			const { block, endIdx } = result;

			// When cursor is inside, show raw JS
			if (!shouldShowSource(state, block.openFenceFrom, block.closeFenceTo)) {
				const widget = new QueryjsBlockWidget(block.jsContent);

				// Opening fence line: replace with QueryjsBlockWidget
				builder.add(
					block.openFenceFrom,
					block.openFenceTo,
					Decoration.replace({ widget }),
				);

				// Content lines + closing fence: hide
				for (let i = idx + 1; i <= endIdx; i++) {
					builder.add(lines[i].from, lines[i].from, hiddenLineDeco);
					builder.add(lines[i].from, lines[i].to, Decoration.replace({}));
				}
			}

			idx = endIdx + 1;
		} else {
			idx++;
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
 * change or a `forceDecorationRebuild` is dropped before `checkUpdateAction`
 * (which would rebuild on, say, the end of a mouse drag). `forceDecorationRebuild`
 * must pass through: it is how the editor signals "the property index became
 * ready", and the rebuild creates fresh widgets whose `eq()` snapshot differs,
 * replacing any "Building index..." placeholder. Scroll-debounce force rebuilds
 * also land here; they recompute the (cheap) line scan and `eq()` keeps the
 * existing DOM, so no script re-executes.
 */
export const queryjsBlockField = blockDecorator({
	settingsKey: 'queryjs',
	profileLabel: 'queryjs-block',
	compute: computeQueryjsBlocks,
	gate: (update) =>
		update.docChanged ||
		update.selectionSet ||
		update.transactions.some((t) => t.effects.some((e) => e.is(forceDecorationRebuild))),
});
