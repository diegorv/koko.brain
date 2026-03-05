import {
	Decoration,
	type DecorationSet,
	EditorView,
	ViewPlugin,
	type ViewUpdate,
} from '@codemirror/view';
import type { EditorState, Range } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { checkUpdateAction } from '../core/check-update-action';
import { shouldShowSource } from '../core/should-show-source';
import { isInsideBlockContext } from '../core/is-inside-block-context';
import { OrderedListMarkerWidget } from '../widgets';

/**
 * ViewPlugin that replaces ordered list markers (`1. `, `2. `, etc.) with styled number widgets.
 *
 * - Tree traversal for `ListMark` nodes inside `OrderedList`
 * - Per-element cursor: shows source when cursor is on the list item line
 * - `isInsideBlockContext` to skip
 * - Uses `view.visibleRanges` for performance
 */
export const orderedListPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = buildOrderedListDecorations(view.state, view.visibleRanges);
		}

		update(update: ViewUpdate) {
			const action = checkUpdateAction(update);
			if (action === 'rebuild') {
				this.decorations = buildOrderedListDecorations(
					update.view.state,
					update.view.visibleRanges,
				);
			}
		}
	},
	{ decorations: (v) => v.decorations },
);

/** Builds ordered list decorations for the given ranges */
export function buildOrderedListDecorations(
	state: EditorState,
	ranges: readonly { from: number; to: number }[],
): DecorationSet {
	const decorations: Range<Decoration>[] = [];

	for (const { from, to } of ranges) {
		syntaxTree(state).iterate({
			from,
			to,
			enter: (node) => {
				if (node.name !== 'ListMark') return;
				if (node.node.parent?.parent?.name !== 'OrderedList') return;

				if (isInsideBlockContext(node)) return;

				const line = state.doc.lineAt(node.from);

				// Per-element: if cursor is on this list item line, show source
				if (shouldShowSource(state, line.from, line.to)) return;

				const markText = state.doc.sliceString(node.from, node.to);
				const num = parseInt(markText, 10);

				// Include trailing space after the mark
				let markTo = node.to;
				if (markTo < line.to && state.doc.sliceString(markTo, markTo + 1) === ' ') {
					markTo++;
				}

				decorations.push(
					Decoration.replace({
						widget: new OrderedListMarkerWidget(num),
					}).range(node.from, markTo),
				);
			},
		});
	}

	return Decoration.set(decorations, true);
}
