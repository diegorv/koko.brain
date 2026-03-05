import {
	Decoration,
	type DecorationSet,
	EditorView,
	ViewPlugin,
	type ViewUpdate,
	WidgetType,
} from '@codemirror/view';
import type { EditorState, Range } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { checkUpdateAction } from '../core/check-update-action';
import { shouldShowSource } from '../core/should-show-source';
import { isInsideBlockContext } from '../core/is-inside-block-context';

/** Inline widget that shows a ↵ indicator for hard line breaks */
class HardBreakWidget extends WidgetType {
	toDOM() {
		const span = document.createElement('span');
		span.className = 'cm-lp-hard-break';
		span.textContent = '↵';
		return span;
	}

	eq() {
		return true;
	}
}

/**
 * ViewPlugin that shows a visual indicator for hard line breaks.
 *
 * Per CommonMark 6.7:
 * - Trailing double-space → `<br />`
 * - Backslash at end of line (`\`) → `<br />`
 *
 * When not touched: replaces the trailing spaces/backslash with a `↵` widget.
 * When touched: shows the source (spaces or backslash).
 */
export const hardBreakPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = buildHardBreakDecorations(view.state, view.visibleRanges);
		}

		update(update: ViewUpdate) {
			const action = checkUpdateAction(update);
			if (action === 'rebuild') {
				this.decorations = buildHardBreakDecorations(
					update.view.state,
					update.view.visibleRanges,
				);
			}
		}
	},
	{ decorations: (v) => v.decorations },
);

/** Builds hard break decorations for the given ranges */
export function buildHardBreakDecorations(
	state: EditorState,
	ranges: readonly { from: number; to: number }[],
): DecorationSet {
	const decorations: Range<Decoration>[] = [];

	for (const { from, to } of ranges) {
		syntaxTree(state).iterate({
			from,
			to,
			enter: (node) => {
				if (node.name !== 'HardBreak') return;

				if (isInsideBlockContext(node)) return false;

				if (shouldShowSource(state, node.from, node.to)) return false;

				// HardBreak node includes the trailing newline (e.g. "  \n" or "\\\n").
				// CodeMirror forbids plugins from replacing line breaks, so we must
				// exclude the newline and only replace the spaces/backslash portion.
				const replaceEnd = state.doc.lineAt(node.from).to;

				decorations.push(
					Decoration.replace({ widget: new HardBreakWidget() }).range(
						node.from,
						replaceEnd,
					),
				);

				return false;
			},
		});
	}

	return Decoration.set(decorations, true);
}
