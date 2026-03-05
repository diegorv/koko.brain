import { RangeSetBuilder } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { findAudioBlock } from '../parsers/audio';
import { AudioWidget } from '../widgets';
import { hiddenLineDeco } from '../styles';
import { checkUpdateAction } from '../core/check-update-action';
import { shouldShowSource } from '../core/should-show-source';
import { getAllLines } from '../core/get-all-lines';

/** Computes audio block decorations */
export function computeAudioBlocks(state: EditorState): DecorationSet {
	const lines = getAllLines(state);
	const builder = new RangeSetBuilder<Decoration>();
	let idx = 0;

	while (idx < lines.length) {
		const result = findAudioBlock(lines, idx);
		if (result) {
			const { block, endIdx } = result;

			// When cursor is outside, replace opening line with widget and hide remaining lines
			if (!shouldShowSource(state, block.openFrom, block.closeTo)) {
				const widget = new AudioWidget(block.src);

				// Opening line: replace with AudioWidget
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
export const audioPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;
		constructor(view: EditorView) {
			this.decorations = computeAudioBlocks(view.state);
		}
		update(update: ViewUpdate) {
			if (checkUpdateAction(update) === 'rebuild') {
				this.decorations = computeAudioBlocks(update.state);
			}
		}
	},
	{ decorations: (v) => v.decorations },
);
