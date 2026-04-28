import type { EditorState } from '@codemirror/state';

/**
 * Returns true if any selection range (cursor or selection) intersects the
 * document range [from, to]. Uses position-based intersection for per-element
 * granularity — only the specific element under/overlapping the cursor shows source.
 *
 * Source-mode toggle (Cmd+K / `Code` toolbar button) is handled at the
 * `livePreview` compartment level — when off, this function is never called
 * because the entire live-preview extension is removed.
 */
export function shouldShowSource(state: EditorState, from: number, to: number): boolean {
	for (const range of state.selection.ranges) {
		if (range.from <= to && range.to >= from) return true;
	}

	return false;
}
