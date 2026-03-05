import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';

export interface StrikethroughRange {
	openMarkFrom: number;
	openMarkTo: number;
	textFrom: number;
	textTo: number;
	closeMarkFrom: number;
	closeMarkTo: number;
}

/**
 * Finds all `~~strikethrough~~` ranges using the Lezer syntax tree.
 * Uses Strikethrough nodes with StrikethroughMark children (requires GFM extension).
 */
export function findStrikethroughRanges(state: EditorState, from: number, to: number): StrikethroughRange[] {
	const ranges: StrikethroughRange[] = [];

	syntaxTree(state).iterate({
		from,
		to,
		enter: (node) => {
			if (node.name === 'Strikethrough') {
				const marks: { from: number; to: number }[] = [];
				let child = node.node.firstChild;
				while (child) {
					if (child.name === 'StrikethroughMark') {
						marks.push({ from: child.from, to: child.to });
					}
					child = child.nextSibling;
				}

				if (marks.length >= 2) {
					const openMark = marks[0];
					const closeMark = marks[marks.length - 1];
					ranges.push({
						openMarkFrom: openMark.from,
						openMarkTo: openMark.to,
						textFrom: openMark.to,
						textTo: closeMark.from,
						closeMarkFrom: closeMark.from,
						closeMarkTo: closeMark.to,
					});
				}
				return false;
			}
		},
	});

	return ranges;
}
