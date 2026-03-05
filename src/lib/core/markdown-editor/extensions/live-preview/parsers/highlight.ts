import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';

/** Range positions for a `==highlighted==` match */
export interface HighlightRange {
	openMarkFrom: number;
	openMarkTo: number;
	textFrom: number;
	textTo: number;
	closeMarkFrom: number;
	closeMarkTo: number;
}

/**
 * Finds all `==highlighted==` ranges in the given line range.
 * Uses the Lezer syntax tree (`Highlight` and `HighlightMark` nodes from the HighlightExtension).
 */
export function findHighlightRanges(state: EditorState, from: number, to: number): HighlightRange[] {
	const ranges: HighlightRange[] = [];

	syntaxTree(state).iterate({
		from,
		to,
		enter(node) {
			if (node.name !== 'Highlight') return;

			// Walk children to find the two HighlightMark nodes
			const inner = node.node;
			let openMarkFrom = -1, openMarkTo = -1;
			let closeMarkFrom = -1, closeMarkTo = -1;

			let child = inner.firstChild;
			let isFirst = true;
			while (child) {
				if (child.name === 'HighlightMark') {
					if (isFirst) {
						openMarkFrom = child.from;
						openMarkTo = child.to;
						isFirst = false;
					} else {
						closeMarkFrom = child.from;
						closeMarkTo = child.to;
					}
				}
				child = child.nextSibling;
			}

			if (openMarkFrom < 0 || closeMarkFrom < 0) return;

			ranges.push({
				openMarkFrom,
				openMarkTo,
				textFrom: openMarkTo,
				textTo: closeMarkFrom,
				closeMarkFrom,
				closeMarkTo,
			});
		},
	});

	return ranges;
}
