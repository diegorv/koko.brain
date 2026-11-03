import type { EditorState } from '@codemirror/state';
import { findSpecialFenceBlocks } from './fenced-code-block';

/** Information about a ```meta-bind-button code block */
export interface MetaBindButtonBlock {
	/** Start of the opening ```meta-bind-button line */
	openFenceFrom: number;
	/** End of the opening ```meta-bind-button line */
	openFenceTo: number;
	/** Start of the closing ``` line */
	closeFenceFrom: number;
	/** End of the closing ``` line */
	closeFenceTo: number;
	/** The YAML content between the fences */
	yamlContent: string;
}

/**
 * Finds every closed ```meta-bind-button block, from the Lezer `FencedCode` nodes.
 * A ```meta-bind-button fence nested in a larger fence is code text and is not returned.
 */
export function findAllMetaBindButtonBlocks(state: EditorState): MetaBindButtonBlock[] {
	return findSpecialFenceBlocks(state, 'meta-bind-button', '`').map(({ content, ...range }) => ({
		...range,
		yamlContent: content,
	}));
}
