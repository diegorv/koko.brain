import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';
import { calloutHeaderOf } from './callout';

/** Range positions for a blockquote `> ` prefix, with nesting depth */
export interface BlockquoteMarkRange {
	markFrom: number;
	markTo: number;
	depth: number;
}

/**
 * Finds the blockquote mark range using the Lezer syntax tree.
 * Counts QuoteMark nodes for nesting depth.
 * Returns null if the line is not a blockquote or its innermost blockquote is
 * a callout (header and content lines alike, nested `> > [!type]` included):
 * the callout field draws those. A plain quote nested in a callout gets a
 * range past the callout's own `>` prefixes, which the callout field hides,
 * with depth counted from there.
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

	const lastMark = quoteMarks[quoteMarks.length - 1];

	// Callout syntax is Obsidian-specific, so it is not in the Lezer grammar
	let skip = 0;
	let innermost = true;
	for (let node = tree.resolveInner(lastMark.from, 1).parent; node; node = node.parent) {
		if (node.name !== 'Blockquote') continue;
		const header = calloutHeaderOf(state, node);
		if (header) {
			if (innermost) return null;
			skip = header.depth;
			break;
		}
		innermost = false;
	}
	if (skip >= quoteMarks.length) return null;

	// Include trailing space after last QuoteMark if present
	let markTo = lastMark.to;
	if (markTo < to && state.doc.sliceString(markTo, markTo + 1) === ' ') {
		markTo++;
	}

	return {
		// Starts at the first `>`, not the line start: in `- > quote` the list
		// marker before it belongs to the list, not the blockquote.
		markFrom: quoteMarks[skip].from,
		markTo,
		depth: quoteMarks.length - skip,
	};
}
