import { RangeSetBuilder } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import { Decoration, type DecorationSet } from '@codemirror/view';
import { findAllMetaBindButtonBlocks } from '../parsers/meta-bind-button';
import { parseButtonConfig } from '../meta-bind-button.logic';
import { MetaBindButtonWidget, MetaBindButtonErrorWidget } from '../widgets/meta-bind-button-widget';
import { hiddenLineDeco } from '../styles';
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
		const firstHidden = state.doc.lineAt(block.openFenceTo).number + 1;
		const lastHidden = state.doc.lineAt(block.closeFenceTo).number;
		for (let n = firstHidden; n <= lastHidden; n++) {
			const line = state.doc.line(n);
			builder.add(line.from, line.from, hiddenLineDeco);
			builder.add(line.from, line.to, Decoration.replace({}));
		}
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
