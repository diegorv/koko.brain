import type { EditorState } from '@codemirror/state';
import { findSpecialFenceBlocks } from './fenced-code-block';

/** Information about a ```collection code block */
export interface CollectionBlockInfo {
	/** Start of the opening ```collection line */
	openFenceFrom: number;
	/** End of the opening ```collection line */
	openFenceTo: number;
	/** Start of the closing ``` line */
	closeFenceFrom: number;
	/** End of the closing ``` line */
	closeFenceTo: number;
	/** The YAML content between the fences */
	yamlContent: string;
}

/**
 * Finds every closed ```collection block, from the Lezer `FencedCode` nodes.
 * A ```collection fence nested in a larger fence is code text and is not returned.
 */
export function findAllCollectionBlocks(state: EditorState): CollectionBlockInfo[] {
	return findSpecialFenceBlocks(state, 'collection', '`').map(({ content, ...range }) => ({
		...range,
		yamlContent: content,
	}));
}
