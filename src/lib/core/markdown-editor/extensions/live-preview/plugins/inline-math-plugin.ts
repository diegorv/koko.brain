import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import type { EditorState, Range } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { checkUpdateAction } from '../core/check-update-action';
import { shouldShowSource } from '../core/should-show-source';
import { isInsideBlockContext } from '../core/is-inside-block-context';
import { findInlineMathRanges } from '../parsers/math';
import { InlineMathWidget } from '../widgets/inline-math-widget';

/**
 * ViewPlugin that replaces inline `$formula$` with rendered KaTeX widgets.
 *
 * - Uses Lezer syntax tree (`InlineMath` nodes from the MathExtension)
 * - Per-element cursor: shows source when cursor is on the math expression
 * - `isInsideBlockContext` as safety check for code blocks / HTML blocks
 * - Uses `view.visibleRanges` for performance
 */
export const inlineMathPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = buildInlineMathDecorations(view.state, view.visibleRanges);
		}

		update(update: ViewUpdate) {
			const action = checkUpdateAction(update);
			if (action === 'rebuild') {
				this.decorations = buildInlineMathDecorations(
					update.view.state,
					update.view.visibleRanges,
				);
			}
		}
	},
	{ decorations: (v) => v.decorations },
);

/** Builds inline math decorations for the given visible ranges */
export function buildInlineMathDecorations(
	state: EditorState,
	ranges: readonly { from: number; to: number }[],
): DecorationSet {
	const decorations: Range<Decoration>[] = [];

	for (const { from, to } of ranges) {
		const startLine = state.doc.lineAt(from).number;
		const endLine = state.doc.lineAt(to).number;

		for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
			const line = state.doc.line(lineNum);

			// Skip lines inside block contexts (code blocks, HTML, etc.)
			const nodeAt = syntaxTree(state).resolveInner(line.from);
			if (isInsideBlockContext(nodeAt)) continue;

			const mathRanges = findInlineMathRanges(state, line.from, line.to);
			for (const range of mathRanges) {
				// Per-element: if cursor is on this math, show source
				if (shouldShowSource(state, range.from, range.to)) continue;

				decorations.push(
					Decoration.replace({ widget: new InlineMathWidget(range.formula) }).range(
						range.from,
						range.to,
					),
				);
			}
		}
	}

	return Decoration.set(decorations, true);
}
