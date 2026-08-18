import type { EditorState, Line } from '@codemirror/state';

/** Builds an array with every line of the document in an EditorState */
export function getAllLines(state: EditorState): Line[] {
	const lines: Line[] = [];
	for (let i = 1; i <= state.doc.lines; i++) {
		lines.push(state.doc.line(i));
	}
	return lines;
}
