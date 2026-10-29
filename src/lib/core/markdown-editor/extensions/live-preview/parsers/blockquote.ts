import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';
import { matchCalloutHeader } from '../../callout/callout.logic';

/** Range positions for a blockquote `> ` prefix, with nesting depth */
export interface BlockquoteMarkRange {
	markFrom: number;
	markTo: number;
	depth: number;
}

/**
 * Finds the blockquote mark range using the Lezer syntax tree.
 * Counts QuoteMark nodes for nesting depth.
 * Returns null if the line is not a blockquote or belongs to a callout: any
 * enclosing `Blockquote` whose first line is a callout header (header and
 * content lines alike, nested `> > [!type]` included) is drawn by the
 * callout field, not as a plain blockquote.
 */
export function findBlockquoteMarkRange(
	state: EditorState,
	from: number,
	to: number,
): BlockquoteMarkRange | null {
	const quoteMarks: { from: number; to: number }[] = [];
	const tree = syntaxTree(state);

	tree.iterate({
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

	// Callout syntax is Obsidian-specific, so it is not in the Lezer grammar
	for (let node = tree.resolveInner(lastMark.from, 1).parent; node; node = node.parent) {
		if (node.name === 'Blockquote' && matchCalloutHeader(state.doc.lineAt(node.from).text)) return null;
	}

	// Include trailing space after last QuoteMark if present
	let markTo = lastMark.to;
	if (markTo < to && state.doc.sliceString(markTo, markTo + 1) === ' ') {
		markTo++;
	}

	return {
		// Starts at the first `>`, not the line start: in `- > quote` the list
		// marker before it belongs to the list, not the blockquote.
		markFrom: quoteMarks[0].from,
		markTo,
		depth,
	};
}
