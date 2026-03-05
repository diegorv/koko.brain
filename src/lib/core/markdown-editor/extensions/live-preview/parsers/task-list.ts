import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';

export interface TaskMarkerRange {
	markerFrom: number;
	markerTo: number;
	checked: boolean;
}

/**
 * Finds a task marker `[ ]` or `[x]` range on a single line using the Lezer syntax tree.
 * Uses Task > TaskMarker nodes (requires GFM extension).
 */
export function findTaskMarkerRange(
	state: EditorState,
	from: number,
	to: number,
): TaskMarkerRange | null {
	let result: TaskMarkerRange | null = null;

	syntaxTree(state).iterate({
		from,
		to,
		enter: (node) => {
			if (node.name === 'TaskMarker') {
				const content = state.doc.sliceString(node.from, node.to);
				if (content !== '[ ]' && content !== '[x]' && content !== '[X]') return false;
				result = {
					markerFrom: node.from,
					markerTo: node.to,
					checked: content !== '[ ]',
				};
				return false;
			}
		},
	});

	return result;
}
