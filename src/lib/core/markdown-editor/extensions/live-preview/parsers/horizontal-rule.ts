import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';

/**
 * Checks whether the given line range contains a horizontal rule
 * by inspecting the Lezer syntax tree for a `HorizontalRule` node.
 */
export function isHorizontalRule(state: EditorState, from: number, to: number): boolean {
	let found = false;
	syntaxTree(state).iterate({
		from,
		to,
		enter: (node) => {
			if (node.name === 'HorizontalRule') {
				found = true;
				return false;
			}
		},
	});
	return found;
}
