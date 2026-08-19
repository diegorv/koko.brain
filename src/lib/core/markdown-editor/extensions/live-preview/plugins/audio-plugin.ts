import { RangeSetBuilder } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import { Decoration, type DecorationSet } from '@codemirror/view';
import { findMediaBlock } from '../parsers/media';
import { MediaWidget } from '../widgets';
import { hiddenLineDeco } from '../styles';
import { blockDecorator } from '../core/block-decorator';
import { shouldShowSource } from '../core/should-show-source';
import { getAllLines } from '../core/get-all-lines';

/** Computes audio block decorations */
export function computeAudioBlocks(state: EditorState): DecorationSet {
	const lines = getAllLines(state);
	const builder = new RangeSetBuilder<Decoration>();
	let idx = 0;

	while (idx < lines.length) {
		const result = findMediaBlock(lines, idx, 'audio');
		if (result) {
			const { block, endIdx } = result;

			// When cursor is outside, replace opening line with widget and hide remaining lines
			if (!shouldShowSource(state, block.openFrom, block.closeTo)) {
				const widget = new MediaWidget('audio', block.src);

				// Opening line: replace with MediaWidget
				builder.add(
					block.openFrom,
					block.openTo,
					Decoration.replace({ widget }),
				);

				// Content lines + closing line: hide (for multi-line blocks)
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
 * ViewPlugin that manages audio block decorations.
 * Replaces `<audio>` HTML blocks with rendered audio players when cursor is outside.
 * Shows raw source when cursor is inside the block.
 */
export const audioPlugin = blockDecorator({
	settingsKey: 'audio',
	profileLabel: 'audio',
	compute: computeAudioBlocks,
});
