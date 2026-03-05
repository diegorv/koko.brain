import type { EditorState } from '@codemirror/state';
import type { LineInfo } from './types';

/** Builds a LineInfo array from the full document in an EditorState */
export function getAllLines(state: EditorState): LineInfo[] {
	const lines: LineInfo[] = [];
	for (let i = 1; i <= state.doc.lines; i++) {
		const line = state.doc.line(i);
		lines.push({ text: line.text, from: line.from, to: line.to, number: line.number });
	}
	return lines;
}
