import { RangeSetBuilder } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import { Decoration, type DecorationSet } from '@codemirror/view';
import { findMetaBindButtonBlock } from '../parsers/meta-bind-button';
import { parseButtonConfig } from '../meta-bind-button.logic';
import { MetaBindButtonWidget, MetaBindButtonErrorWidget } from '../widgets/meta-bind-button-widget';
import { hiddenLineDeco } from '../styles';
import { blockDecorator } from '../core/block-decorator';
import { shouldShowSource } from '../core/should-show-source';
import { getAllLines } from '../core/get-all-lines';

/** Computes meta-bind button decorations */
export function computeMetaBindButtons(state: EditorState): DecorationSet {
	const lines = getAllLines(state);
	const builder = new RangeSetBuilder<Decoration>();
	let idx = 0;

	while (idx < lines.length) {
		const result = findMetaBindButtonBlock(lines, idx);
		if (result) {
			const { block, endIdx } = result;

			// When cursor is inside, show raw YAML
			if (!shouldShowSource(state, lines[idx].from, lines[endIdx].to)) {
				const config = parseButtonConfig(block.yamlContent);
				const widget = config
					? new MetaBindButtonWidget(config)
					: new MetaBindButtonErrorWidget('Invalid configuration');

				// First line: replace with the widget
				builder.add(lines[idx].from, lines[idx].to, Decoration.replace({ widget }));

				// Remaining lines: hide text and collapse line element
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
 * ViewPlugin that manages meta-bind button decorations independently.
 * Replaces ```meta-bind-button code blocks with interactive button widgets.
 * Shows raw YAML when cursor is inside the block.
 */
export const metaBindButtonField = blockDecorator({
	settingsKey: 'metaBindButton',
	profileLabel: 'meta-bind-button',
	compute: computeMetaBindButtons,
});
