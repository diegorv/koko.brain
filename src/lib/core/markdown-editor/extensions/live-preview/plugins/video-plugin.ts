import { RangeSetBuilder } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import { Decoration, type DecorationSet } from '@codemirror/view';
import { findMediaBlock } from '../parsers/media';
import { MediaWidget } from '../widgets';
import { hiddenLineDeco } from '../styles';
import { blockDecorator } from '../core/block-decorator';
import { shouldShowSource } from '../core/should-show-source';
import { getAllLines } from '../core/get-all-lines';

/** Computes video block decorations */
export function computeVideoBlocks(state: EditorState): DecorationSet {
	const lines = getAllLines(state);
	const builder = new RangeSetBuilder<Decoration>();
	let idx = 0;

	while (idx < lines.length) {
		const result = findMediaBlock(lines, idx, 'video');
		if (result) {
			const { block, endIdx } = result;

			// When cursor is outside, replace opening line with widget and hide remaining lines
			if (!shouldShowSource(state, block.openFrom, block.closeTo)) {
				const widget = new MediaWidget('video', block.src);

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
 * ViewPlugin that manages video block decorations.
 * Replaces `<video>` HTML blocks with rendered video players when cursor is outside.
 * Shows raw source when cursor is inside the block.
 */
export const videoPlugin = blockDecorator({
	settingsKey: 'video',
	profileLabel: 'video',
	compute: computeVideoBlocks,
});
