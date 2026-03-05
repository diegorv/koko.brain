import type { EditorState } from '@codemirror/state';

/**
 * Returns true if any selection range (cursor or selection) intersects the
 * document range [from, to]. Uses position-based intersection for per-element
 * granularity — only the specific element under/overlapping the cursor shows source.
 */
export function shouldShowSource(state: EditorState, from: number, to: number): boolean {
	for (const range of state.selection.ranges) {
		if (range.from <= to && range.to >= from) return true;
	}

	return false;
}
