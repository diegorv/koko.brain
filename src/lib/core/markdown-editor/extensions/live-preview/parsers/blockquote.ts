import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';

/** Range positions for a blockquote `> ` prefix, with nesting depth */
export interface BlockquoteMarkRange {
	markFrom: number;
	markTo: number;
	depth: number;
}

/** Matches callout syntax `> [!type]` to exclude from plain blockquote detection */
export const CALLOUT_RE = /^>\s*\[![\w-]+\]/;

/**
 * Finds the blockquote mark range using the Lezer syntax tree.
 * Counts QuoteMark nodes for nesting depth, excludes callout syntax.
 * Returns null if the line is not a blockquote or is a callout.
 */
export function findBlockquoteMarkRange(
	state: EditorState,
	from: number,
	to: number,
): BlockquoteMarkRange | null {
	// Exclude callout syntax (Obsidian-specific, not in Lezer grammar)
	const lineText = state.doc.sliceString(from, to);
	if (CALLOUT_RE.test(lineText)) return null;

	const quoteMarks: { from: number; to: number }[] = [];

	syntaxTree(state).iterate({
		from,
		to,
		enter: (node) => {
			if (node.name === 'QuoteMark') {
				quoteMarks.push({ from: node.from, to: node.to });
			}
		},
	});

	if (quoteMarks.length === 0) return null;

	const depth = quoteMarks.length;
	const lastMark = quoteMarks[quoteMarks.length - 1];

	// Include trailing space after last QuoteMark if present
	let markTo = lastMark.to;
	if (markTo < to && state.doc.sliceString(markTo, markTo + 1) === ' ') {
		markTo++;
	}

	return {
		markFrom: from,
		markTo,
		depth,
	};
}
