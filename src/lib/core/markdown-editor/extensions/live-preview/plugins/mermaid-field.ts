import { RangeSetBuilder } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { findMermaidBlock } from '../parsers/mermaid';
import { MermaidWidget } from '../widgets/mermaid-widget';
import { hiddenLineDeco } from '../styles';
import { checkUpdateAction } from '../core/check-update-action';
import { shouldShowSource } from '../core/should-show-source';
import { getAllLines } from '../core/get-all-lines';
import { profileStart, profileEnd } from '../core/profiling';

/** Computes mermaid block decorations */
export function computeMermaidBlocks(state: EditorState): DecorationSet {
	const lines = getAllLines(state);
	const builder = new RangeSetBuilder<Decoration>();
	let idx = 0;

	while (idx < lines.length) {
		const result = findMermaidBlock(lines, idx);
		if (result) {
			const { block, endIdx } = result;

			// When cursor is outside, replace opening fence with widget and hide remaining lines
			if (!shouldShowSource(state, block.openFenceFrom, block.closeFenceTo)) {
				const widget = new MermaidWidget(block.diagramSource);

				// Opening fence line: replace with MermaidWidget
				builder.add(
					block.openFenceFrom,
					block.openFenceTo,
					Decoration.replace({ widget }),
				);

				// Content lines + closing fence: hide
				for (let i = idx + 1; i <= endIdx; i++) {
					builder.add(lines[i].from, lines[i].from, hiddenLineDeco);
					builder.add(lines[i].from, lines[i].to, Decoration.replace({}));
				}
			}

			idx = endIdx + 1;
		} else {
			idx++;
		}
	}

	return builder.finish();
}

/**
 * ViewPlugin that manages mermaid diagram decorations.
 * Replaces ```mermaid code blocks with rendered SVG diagrams when cursor is outside.
 * Shows raw source when cursor is inside the block.
 */
export const mermaidField = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;
		lastCursorLine: number;
		constructor(view: EditorView) {
			this.decorations = computeMermaidBlocks(view.state);
			this.lastCursorLine = view.state.doc.lineAt(view.state.selection.main.head).number;
		}
		update(update: ViewUpdate) {
			if (update.viewportChanged && !update.docChanged && !update.selectionSet) return;
			if (checkUpdateAction(update, this.lastCursorLine) === 'rebuild') {
				this.lastCursorLine = update.state.doc.lineAt(update.state.selection.main.head).number;
				const _t = profileStart();
				this.decorations = computeMermaidBlocks(update.state);
				profileEnd('mermaid', _t);
			}
		}
	},
	{ decorations: (v) => v.decorations },
);
