import type { EditorState } from '@codemirror/state';
import { mouseSelectingField } from './mouse-selecting';

/**
 * Answers whether the syntax of a document range is shown as source. `to`
 * defaults to `from`.
 */
export type RevealPredicate = (from: number, to?: number) => boolean;

/**
 * The live-preview reveal rule: syntax is shown as source on every line
 * touched by any selection range (each cursor of a multi-cursor, every line
 * of a multi-line selection). A range is revealed when any of its lines is.
 * A non-empty range that ends exactly at a line start ends on the previous
 * line: a triple-click selection and a HardBreak node (which includes its
 * newline) both end there, and neither touches the line below.
 * While a mouse drag is in progress nothing is revealed, so the decorations
 * do not shift under the pointer; the release rebuilds them.
 *
 * Call once per decoration build and reuse the returned predicate: the
 * touched lines are kept as one interval per selection range, so a
 * select-all on a large note costs O(ranges), not O(lines).
 */
export function revealPredicate(state: EditorState): RevealPredicate {
	if (state.field(mouseSelectingField, false)) return () => false;

	const doc = state.doc;
	const lastLine = (from: number, to: number): number => {
		const line = doc.lineAt(to);
		return to > from && line.from === to ? line.number - 1 : line.number;
	};
	const touched = state.selection.ranges.map((range) => ({
		first: doc.lineAt(range.from).number,
		last: lastLine(range.from, range.to),
	}));

	return (from, to = from) => {
		const first = doc.lineAt(from).number;
		const last = lastLine(from, to);
		return touched.some((t) => t.first <= last && t.last >= first);
	};
}
