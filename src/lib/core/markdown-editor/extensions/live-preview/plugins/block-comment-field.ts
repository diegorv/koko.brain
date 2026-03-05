import { RangeSetBuilder } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { findBlockComment } from '../parsers/comment';
import { checkUpdateAction } from '../core/check-update-action';
import { shouldShowSource } from '../core/should-show-source';
import { getAllLines } from '../core/get-all-lines';
import { hiddenLineDeco } from '../styles';

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
 * ViewPlugin that manages block comment (`%%\n...\n%%`) decorations independently.
 * Hides the entire block when cursor is outside. Shows raw text when cursor is inside.
 */
export const blockCommentField = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;
		constructor(view: EditorView) {
			this.decorations = computeBlockComments(view.state);
		}
		update(update: ViewUpdate) {
			if (checkUpdateAction(update) === 'rebuild') {
				this.decorations = computeBlockComments(update.state);
			}
		}
	},
	{ decorations: (v) => v.decorations },
);
