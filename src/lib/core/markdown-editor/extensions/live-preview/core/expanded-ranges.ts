import type { EditorView } from '@codemirror/view';

/**
 * Returns visible ranges expanded by a buffer (default 2000 chars) in each direction.
 * Pre-computes decorations beyond the viewport for smoother scrolling.
 */
export function expandedVisibleRanges(
	view: EditorView,
	buffer: number = 2000,
): readonly { from: number; to: number }[] {
	const docLength = view.state.doc.length;
	return view.visibleRanges.map((r) => ({
		from: Math.max(0, r.from - buffer),
		to: Math.min(docLength, r.to + buffer),
	}));
}
