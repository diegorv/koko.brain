import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';

export interface InlineCodeRange {
	openMarkFrom: number;
	openMarkTo: number;
	textFrom: number;
	textTo: number;
	closeMarkFrom: number;
	closeMarkTo: number;
}

/**
 * Finds all `` `inline code` `` ranges using the Lezer syntax tree.
 * Uses InlineCode nodes with CodeMark children. Handles single and multi-backtick delimiters.
 */
export function findInlineCodeRanges(state: EditorState, from: number, to: number): InlineCodeRange[] {
	const ranges: InlineCodeRange[] = [];

	syntaxTree(state).iterate({
		from,
		to,
		enter: (node) => {
			if (node.name === 'InlineCode') {
				const marks: { from: number; to: number }[] = [];
				let child = node.node.firstChild;
				while (child) {
					if (child.name === 'CodeMark') {
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
