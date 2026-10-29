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

/** Opening line of a meta-bind-button block: a backtick fence at column 0 whose info string is exactly `meta-bind-button` */
const META_BIND_BUTTON_OPEN_RE = /^(`{3,})\s*meta-bind-button\s*$/;

/**
 * Finds every closed ```meta-bind-button block, from the Lezer `FencedCode` nodes.
 * A ```meta-bind-button fence nested in a larger fence is code text and is not returned.
 */
export function findAllMetaBindButtonBlocks(state: EditorState): MetaBindButtonBlock[] {
	return findSpecialFenceBlocks(state, META_BIND_BUTTON_OPEN_RE).map(({ content, ...range }) => ({
		...range,
		yamlContent: content,
	}));
}
