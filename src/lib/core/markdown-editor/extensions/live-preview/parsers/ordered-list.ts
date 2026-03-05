import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';

/** Range positions for an ordered list marker like `1. ` */
export interface OrderedListMarkRange {
	markFrom: number;
	markTo: number;
	number: number;
}

/**
 * Finds the ordered list marker range on a single line using the Lezer syntax tree.
 * Uses OrderedList > ListItem > ListMark nodes.
 */
export function findOrderedListMarkRange(
	state: EditorState,
	from: number,
	to: number,
): OrderedListMarkRange | null {
	let result: OrderedListMarkRange | null = null;

	syntaxTree(state).iterate({
		from,
		to,
		enter: (node) => {
			if (node.name === 'ListMark' && node.node.parent?.parent?.name === 'OrderedList') {
				const markText = state.doc.sliceString(node.from, node.to);
				const num = parseInt(markText, 10);
				// Include the trailing space after the mark (e.g. "1. ")
				let markTo = node.to;
				if (markTo < to && state.doc.sliceString(markTo, markTo + 1) === ' ') {
					markTo++;
				}
				result = {
					markFrom: node.from,
					markTo,
					number: num,
				};
				return false;
			}
		},
	});

	return result;
}
