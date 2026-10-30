import { RangeSetBuilder } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import { Decoration, type DecorationSet } from '@codemirror/view';
import { findMediaBlock } from '../parsers/media';
import { MediaWidget } from '../widgets';
import { hideLines } from '../core/hide-lines';
import { blockDecorator } from '../core/block-decorator';
import { revealPredicate } from '../core/reveal';
import { getAllLines } from '../core/get-all-lines';

/** Computes video block decorations */
export function computeVideoBlocks(state: EditorState): DecorationSet {
	const isRevealed = revealPredicate(state);
	const lines = getAllLines(state);
	const builder = new RangeSetBuilder<Decoration>();
	let idx = 0;

	while (idx < lines.length) {
		const result = findMediaBlock(lines, idx, 'video');
		if (result) {
			const { block, endIdx } = result;

			// When cursor is outside, replace opening line with widget and hide remaining lines
			if (!isRevealed(block.openFrom, block.closeTo)) {
				const widget = new MediaWidget('video', block.src);

				// Opening line: replace with MediaWidget
				builder.add(
					block.openFrom,
					block.openTo,
					Decoration.replace({ widget }),
				);

				// Content lines + closing line: hide (for multi-line blocks)
				hideLines(builder, state.doc, lines[idx].number + 1, lines[endIdx].number);
			}

			idx = endIdx + 1;
		} else {
			idx++;
		}
	}

	return builder.finish();
}

/**
 * ViewPlugin that manages video block decorations.
 * Replaces `<video>` HTML blocks with rendered video players when cursor is outside.
 * Shows raw source when cursor is inside the block.
 */
export const videoPlugin = blockDecorator({
	settingsKey: 'video',
	profileLabel: 'video',
	compute: computeVideoBlocks,
});
