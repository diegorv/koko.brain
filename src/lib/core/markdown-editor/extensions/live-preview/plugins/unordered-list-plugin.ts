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
import { UnorderedListMarkerWidget } from '../widgets';

/**
 * ViewPlugin that replaces unordered list markers (`-`, `*`, `+`) with a styled bullet widget (`•`).
 *
 * - Tree traversal for `ListMark` nodes inside `BulletList`
 * - Per-element cursor: shows source when cursor is on the list item line
 * - `isInsideBlockContext` to skip
 * - Uses `view.visibleRanges` for performance
 */
export const unorderedListPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = buildUnorderedListDecorations(view.state, view.visibleRanges);
		}

		update(update: ViewUpdate) {
			const action = checkUpdateAction(update);
			if (action === 'rebuild') {
				this.decorations = buildUnorderedListDecorations(
					update.view.state,
					update.view.visibleRanges,
				);
			}
		}
	},
	{ decorations: (v) => v.decorations },
);

/** Builds unordered list decorations for the given ranges */
export function buildUnorderedListDecorations(
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
				if (node.node.parent?.parent?.name !== 'BulletList') return;

				if (isInsideBlockContext(node)) return;

				const line = state.doc.lineAt(node.from);

				// Per-element: if cursor is on this list item line, show source
				if (shouldShowSource(state, line.from, line.to)) return;

				// Include trailing space after the mark
				let markTo = node.to;
				if (markTo < line.to && state.doc.sliceString(markTo, markTo + 1) === ' ') {
					markTo++;
				}

				decorations.push(
					Decoration.replace({
						widget: new UnorderedListMarkerWidget(),
					}).range(node.from, markTo),
				);
			},
		});
	}

	return Decoration.set(decorations, true);
}
