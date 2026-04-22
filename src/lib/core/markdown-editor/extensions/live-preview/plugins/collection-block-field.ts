import { RangeSetBuilder } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import { Decoration, type DecorationSet } from '@codemirror/view';
import { findCollectionBlock } from '../parsers/collection-block';
import { CollectionBlockWidget } from '../widgets/collection-block-widget';
import { hiddenLineDeco } from '../styles';
import { shouldShowSource } from '../core/should-show-source';
import { getAllLines } from '../core/get-all-lines';
import { buildBlockField } from '../core/build-block-field';

/** Computes collection block decorations */
export function computeCollectionBlocks(state: EditorState): DecorationSet {
	const lines = getAllLines(state);
	const builder = new RangeSetBuilder<Decoration>();
	let idx = 0;

	while (idx < lines.length) {
		const result = findCollectionBlock(lines, idx);
		if (result) {
			const { block, endIdx } = result;

			// When cursor is inside, show raw YAML
			if (!shouldShowSource(state, block.openFenceFrom, block.closeFenceTo)) {
				const widget = new CollectionBlockWidget(block.yamlContent);

				// Opening fence line: replace with CollectionBlockWidget
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
 * ViewPlugin that manages collection block decorations. Replaces
 * ```collection``` code blocks with CollectionBlockWidget when the cursor is
 * outside; shows raw YAML when inside.
 */
export const collectionBlockField = buildBlockField({
	name: 'collection-block',
	compute: computeCollectionBlocks,
});
