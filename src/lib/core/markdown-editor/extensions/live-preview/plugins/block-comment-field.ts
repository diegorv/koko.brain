import { RangeSetBuilder } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import type { Decoration, DecorationSet } from '@codemirror/view';
import { findBlockComment } from '../parsers/comment';
import { findAllFencedCodeBlocks } from '../parsers/fenced-code-block';
import { blockDecorator } from '../core/block-decorator';
import { revealPredicate } from '../core/reveal';
import { getAllLines } from '../core/get-all-lines';
import { hideLines } from '../core/hide-lines';

/** Computes block comment decorations */
export function computeBlockComments(state: EditorState): DecorationSet {
	const isRevealed = revealPredicate(state);
	const lines = getAllLines(state);
	const builder = new RangeSetBuilder<Decoration>();

	// Start offsets of every line of a fenced code block, fences included.
	// Unclosed blocks count too: per CommonMark they run to the end of the doc.
	const codeLineStarts = new Set<number>();
	for (const block of findAllFencedCodeBlocks(state)) {
		const first = state.doc.lineAt(block.openFenceFrom).number;
		const last = state.doc.lineAt(block.closeFenceTo).number;
		for (let n = first; n <= last; n++) codeLineStarts.add(state.doc.line(n).from);
	}
	const isCode = (line: { from: number }) => codeLineStarts.has(line.from);

	let idx = 0;
	while (idx < lines.length) {
		const result = findBlockComment(lines, idx, isCode);
		if (result) {
			const { block, endIdx } = result;

			// When cursor is outside the block: hide all lines
			if (!isRevealed(block.openFenceFrom, block.closeFenceTo)) {
				hideLines(builder, state.doc, lines[idx].number, lines[endIdx].number);
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
 * A `%%` line inside fenced code is code, never a comment fence.
 */
export const blockCommentField = blockDecorator({
	settingsKey: 'blockComment',
	profileLabel: 'block-comment',
	compute: computeBlockComments,
});
