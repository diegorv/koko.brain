import type { EditorState } from '@codemirror/state';
import { mouseSelectingField } from './mouse-selecting';

/**
 * Answers whether the syntax of a document range is shown as source. `to`
 * defaults to `from`.
 */
export type RevealPredicate = (from: number, to?: number) => boolean;

/** A run of consecutive 1-based line numbers, `first` to `last` inclusive. */
export interface LineInterval {
	/** First line of the run */
	first: number;
	/** Last line of the run */
	last: number;
}

/**
 * The lines touched by any selection range (each cursor of a multi-cursor,
 * every line of a multi-line selection), as sorted, merged intervals: two
 * selections that touch the same lines give equal arrays. A non-empty range
 * that ends exactly at a line start ends on the previous line: a triple-click
 * selection and a HardBreak node (which includes its newline) both end there,
 * and neither touches the line below. Ignores a mouse drag in progress.
 */
export function touchedLines(state: EditorState): LineInterval[] {
	const doc = state.doc;
	const out: LineInterval[] = [];
	// Selection ranges are sorted by position, so `first` never decreases.
	for (const range of state.selection.ranges) {
		const first = doc.lineAt(range.from).number;
		const last = lastLine(state, range.from, range.to);
		const prev = out[out.length - 1];
		if (prev && first <= prev.last + 1) prev.last = Math.max(prev.last, last);
		else out.push({ first, last });
	}
	return out;
}

/**
 * True when both states' selections touch exactly the same lines, so
 * `revealPredicate` gives the same answer for every range in both.
 */
export function sameTouchedLines(a: EditorState, b: EditorState): boolean {
	const x = touchedLines(a);
	const y = touchedLines(b);
	return x.length === y.length && x.every((t, i) => t.first === y[i].first && t.last === y[i].last);
}

/** Line number `[from, to]` ends on (see `touchedLines` for the line-start rule). */
function lastLine(state: EditorState, from: number, to: number): number {
	const line = state.doc.lineAt(to);
	return to > from && line.from === to ? line.number - 1 : line.number;
}

/**
 * The live-preview reveal rule: syntax is shown as source on every line in
 * `touchedLines(state)`. A range is revealed when any of its lines is.
 * While a mouse drag is in progress nothing is revealed, so the decorations
 * do not shift under the pointer; the release rebuilds them.
 *
 * Call once per decoration build and reuse the returned predicate: the
 * touched lines are kept as one interval per run of lines, so a select-all
 * on a large note costs O(ranges), not O(lines).
 */
export function revealPredicate(state: EditorState): RevealPredicate {
	if (state.field(mouseSelectingField, false)) return () => false;

	const doc = state.doc;
	const touched = touchedLines(state);

	return (from, to = from) => {
		const first = doc.lineAt(from).number;
		const last = lastLine(state, from, to);
		return touched.some((t) => t.first <= last && t.last >= first);
	};
}
