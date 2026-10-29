import { RangeSetBuilder } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import { Decoration, type DecorationSet } from '@codemirror/view';
import { findAllCollectionBlocks } from '../parsers/collection-block';
import { CollectionBlockWidget } from '../widgets/collection-block-widget';
import { hiddenLineDeco } from '../styles';
import { blockDecorator } from '../core/block-decorator';
import { revealPredicate } from '../core/reveal';

/** Computes collection block decorations */
export function computeCollectionBlocks(state: EditorState): DecorationSet {
	const isRevealed = revealPredicate(state);
	const builder = new RangeSetBuilder<Decoration>();

	for (const block of findAllCollectionBlocks(state)) {
		// When cursor is inside, show raw YAML
		if (isRevealed(block.openFenceFrom, block.closeFenceTo)) continue;

		const widget = new CollectionBlockWidget(block.yamlContent);

		// Opening fence line: replace with CollectionBlockWidget
		builder.add(
			block.openFenceFrom,
			block.openFenceTo,
			Decoration.replace({ widget }),
		);

		// Content lines + closing fence: hide
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
 * ViewPlugin that manages collection block decorations independently.
 * Replaces ```collection code blocks with CollectionBlockWidget when cursor is outside.
 * Shows raw YAML when cursor is inside the block.
 */
export const collectionBlockField = blockDecorator({
	settingsKey: 'collectionBlock',
	profileLabel: 'collection-block',
	compute: computeCollectionBlocks,
});
