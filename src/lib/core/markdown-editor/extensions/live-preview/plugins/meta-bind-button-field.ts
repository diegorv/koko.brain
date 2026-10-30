import { RangeSetBuilder } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import { Decoration, type DecorationSet } from '@codemirror/view';
import { findAllMetaBindButtonBlocks } from '../parsers/meta-bind-button';
import { parseButtonConfig } from '../meta-bind-button.logic';
import { MetaBindButtonWidget, MetaBindButtonErrorWidget } from '../widgets/meta-bind-button-widget';
import { hideLines } from '../core/hide-lines';
import { blockDecorator } from '../core/block-decorator';
import { revealPredicate } from '../core/reveal';

/** Computes meta-bind button decorations */
export function computeMetaBindButtons(state: EditorState): DecorationSet {
	const isRevealed = revealPredicate(state);
	const builder = new RangeSetBuilder<Decoration>();

	for (const block of findAllMetaBindButtonBlocks(state)) {
		// When cursor is inside, show raw YAML
		if (isRevealed(block.openFenceFrom, block.closeFenceTo)) continue;

		const config = parseButtonConfig(block.yamlContent);
		const widget = config
			? new MetaBindButtonWidget(config)
			: new MetaBindButtonErrorWidget('Invalid configuration');

		// First line: replace with the widget
		builder.add(block.openFenceFrom, block.openFenceTo, Decoration.replace({ widget }));

		// Remaining lines: hide text and collapse line element
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
 * ViewPlugin that manages meta-bind button decorations independently.
 * Replaces ```meta-bind-button code blocks with interactive button widgets.
 * Shows raw YAML when cursor is inside the block.
 */
export const metaBindButtonField = blockDecorator({
	settingsKey: 'metaBindButton',
	profileLabel: 'meta-bind-button',
	compute: computeMetaBindButtons,
});
