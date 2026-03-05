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
import { HorizontalRuleWidget } from '../widgets';

/**
 * ViewPlugin that replaces horizontal rule syntax (`---`, `***`, `___`) with a styled `<hr>` widget.
 *
 * - Tree traversal for `HorizontalRule` nodes
 * - Per-element cursor: shows source when cursor is on the HR line
 * - `isInsideBlockContext` to skip
 * - Uses `view.visibleRanges` for performance
 */
export const horizontalRulePlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = buildHorizontalRuleDecorations(view.state, view.visibleRanges);
		}

		update(update: ViewUpdate) {
			const action = checkUpdateAction(update);
			if (action === 'rebuild') {
				this.decorations = buildHorizontalRuleDecorations(
					update.view.state,
					update.view.visibleRanges,
				);
			}
		}
	},
	{ decorations: (v) => v.decorations },
);

/** Builds horizontal rule decorations for the given ranges */
export function buildHorizontalRuleDecorations(
	state: EditorState,
	ranges: readonly { from: number; to: number }[],
): DecorationSet {
	const decorations: Range<Decoration>[] = [];

	for (const { from, to } of ranges) {
		syntaxTree(state).iterate({
			from,
			to,
			enter: (node) => {
				if (node.name !== 'HorizontalRule') return;

				if (isInsideBlockContext(node)) return false;

				// Per-element: if cursor is on this HR, show source
				if (shouldShowSource(state, node.from, node.to)) return false;

				decorations.push(
					Decoration.replace({ widget: new HorizontalRuleWidget() }).range(
						node.from,
						node.to,
					),
				);

				return false;
			},
		});
	}

	return Decoration.set(decorations, true);
}
