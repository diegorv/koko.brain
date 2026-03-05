import { RangeSetBuilder } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { findAllBlockMath } from '../parsers/math';
import { BlockMathWidget } from '../widgets/block-math-widget';
import { hiddenLineDeco } from '../styles';
import { checkUpdateAction } from '../core/check-update-action';
import { shouldShowSource } from '../core/should-show-source';

/** Computes block math decorations using the Lezer syntax tree */
export function computeBlockMath(state: EditorState): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();
	const blocks = findAllBlockMath(state);

	for (const block of blocks) {
		// When cursor is inside, show raw source
		if (shouldShowSource(state, block.openFrom, block.closeTo)) continue;

		const widget = new BlockMathWidget(block.formula);

		// Opening $$ line: replace with BlockMathWidget
		builder.add(
			block.openFrom,
			block.openTo,
			Decoration.replace({ widget }),
		);

		// Content lines + closing $$: hide
		const startLine = state.doc.lineAt(block.openFrom).number + 1;
		const endLine = state.doc.lineAt(block.closeTo).number;
		for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
			const line = state.doc.line(lineNum);
			builder.add(line.from, line.from, hiddenLineDeco);
			builder.add(line.from, line.to, Decoration.replace({}));
		}
	}

	return builder.finish();
}

/**
 * ViewPlugin that manages block math (`$$...$$`) decorations.
 * Uses Lezer syntax tree (`BlockMath` nodes from the MathExtension) for robust detection.
 * Replaces block math with rendered KaTeX display when cursor is outside.
 * Shows raw LaTeX source when cursor is inside the block.
 */
export const blockMathField = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;
		constructor(view: EditorView) {
			this.decorations = computeBlockMath(view.state);
		}
		update(update: ViewUpdate) {
			if (checkUpdateAction(update) === 'rebuild') {
				this.decorations = computeBlockMath(update.state);
			}
		}
	},
	{ decorations: (v) => v.decorations },
);
