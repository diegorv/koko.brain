import { RangeSetBuilder } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import { Decoration, type DecorationSet } from '@codemirror/view';
import { findAllMermaidBlocks } from '../parsers/mermaid';
import { MermaidWidget } from '../widgets/mermaid-widget';
import { hideLines } from '../core/hide-lines';
import { blockDecorator } from '../core/block-decorator';
import { revealPredicate } from '../core/reveal';

/** Computes mermaid block decorations */
export function computeMermaidBlocks(state: EditorState): DecorationSet {
	const isRevealed = revealPredicate(state);
	const builder = new RangeSetBuilder<Decoration>();

	for (const block of findAllMermaidBlocks(state)) {
		// When cursor is inside, show raw source
		if (isRevealed(block.openFenceFrom, block.closeFenceTo)) continue;

		const widget = new MermaidWidget(block.diagramSource);

		// Opening fence line: replace with MermaidWidget
		builder.add(
			block.openFenceFrom,
			block.openFenceTo,
			Decoration.replace({ widget }),
		);

		// Content lines + closing fence: hide
		hideLines(
			builder,
			state.doc,
			state.doc.lineAt(block.openFenceTo).number + 1,
			state.doc.lineAt(block.closeFenceTo).number,
		);
	}

	return builder.finish();
}

/**
 * ViewPlugin that manages mermaid diagram decorations.
 * Replaces ```mermaid code blocks with rendered SVG diagrams when cursor is outside.
 * Shows raw source when cursor is inside the block.
 */
export const mermaidField = blockDecorator({
	settingsKey: 'mermaid',
	profileLabel: 'mermaid',
	compute: computeMermaidBlocks,
});
