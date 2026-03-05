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
import { TaskCheckboxWidget } from '../widgets';

/**
 * ViewPlugin that replaces task markers `[ ]` / `[x]` with styled checkbox widgets.
 *
 * - Tree traversal for `TaskMarker` nodes (GFM)
 * - Per-element cursor: `shouldShowSource(state, taskLine.from, taskLine.to)`
 * - `isInsideBlockContext` to skip
 * - Uses `view.visibleRanges` for performance
 */
export const taskListPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = buildTaskListDecorations(view.state, view.visibleRanges);
		}

		update(update: ViewUpdate) {
			const action = checkUpdateAction(update);
			if (action === 'rebuild') {
				this.decorations = buildTaskListDecorations(
					update.view.state,
					update.view.visibleRanges,
				);
			}
		}
	},
	{ decorations: (v) => v.decorations },
);

/** Builds task list decorations for the given ranges */
export function buildTaskListDecorations(
	state: EditorState,
	ranges: readonly { from: number; to: number }[],
): DecorationSet {
	const decorations: Range<Decoration>[] = [];

	for (const { from, to } of ranges) {
		syntaxTree(state).iterate({
			from,
			to,
			enter: (node) => {
				if (node.name !== 'TaskMarker') return;

				if (isInsideBlockContext(node)) return;

				const line = state.doc.lineAt(node.from);

				// Per-element: if cursor is on this task line, show source
				if (shouldShowSource(state, line.from, line.to)) return;

				const content = state.doc.sliceString(node.from, node.to);
				const checked = content !== '[ ]';
				decorations.push(
					Decoration.replace({
						widget: new TaskCheckboxWidget(checked, node.from),
					}).range(node.from, node.to),
				);
			},
		});
	}

	return Decoration.set(decorations, true);
}
