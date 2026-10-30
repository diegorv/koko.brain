import { RangeSetBuilder } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import { Decoration, type DecorationSet } from '@codemirror/view';
import { findMediaBlock } from '../parsers/media';
import { MediaWidget } from '../widgets';
import { hideLines } from '../core/hide-lines';
import { blockDecorator } from '../core/block-decorator';
import { revealPredicate } from '../core/reveal';
import { getAllLines } from '../core/get-all-lines';

/** Computes audio block decorations */
export function computeAudioBlocks(state: EditorState): DecorationSet {
	const isRevealed = revealPredicate(state);
	const lines = getAllLines(state);
	const builder = new RangeSetBuilder<Decoration>();
	let idx = 0;

	while (idx < lines.length) {
		const result = findMediaBlock(lines, idx, 'audio');
		if (result) {
			const { block, endIdx } = result;

			// When cursor is outside, replace opening line with widget and hide remaining lines
			if (!isRevealed(block.openFrom, block.closeTo)) {
				const widget = new MediaWidget('audio', block.src);

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
 * ViewPlugin that manages audio block decorations.
 * Replaces `<audio>` HTML blocks with rendered audio players when cursor is outside.
 * Shows raw source when cursor is inside the block.
 */
export const audioPlugin = blockDecorator({
	settingsKey: 'audio',
	profileLabel: 'audio',
	compute: computeAudioBlocks,
});
