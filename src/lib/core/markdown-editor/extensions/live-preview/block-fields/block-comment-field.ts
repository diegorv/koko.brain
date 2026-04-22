import { RangeSetBuilder } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import { Decoration, type DecorationSet } from '@codemirror/view';
import { findBlockComment } from '../parsers/comment';
import { shouldShowSource } from '../core/should-show-source';
import { getAllLines } from '../core/get-all-lines';
import { hiddenLineDeco } from '../styles';
import { buildBlockField } from '../core/build-block-field';

/** Computes block comment decorations */
export function computeBlockComments(state: EditorState): DecorationSet {
	const lines = getAllLines(state);
	const builder = new RangeSetBuilder<Decoration>();
	let idx = 0;

	while (idx < lines.length) {
		const result = findBlockComment(lines, idx);
		if (result) {
			const { block, endIdx } = result;

			// When cursor is outside the block: hide all lines
			if (!shouldShowSource(state, block.openFenceFrom, block.closeFenceTo)) {
				for (let i = idx; i <= endIdx; i++) {
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
 * ViewPlugin that manages block comment (`%%\n…\n%%`) decorations. Hides the
 * entire block when the cursor is outside; shows raw text when inside.
 */
export const blockCommentField = buildBlockField({
	name: 'block-comment',
	compute: computeBlockComments,
});
