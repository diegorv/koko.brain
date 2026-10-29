import type { EditorState } from '@codemirror/state';
import { findSpecialFenceBlocks } from './fenced-code-block';

/** Information about a ```queryjs code block */
export interface QueryjsBlockInfo {
	/** Start of the opening ```queryjs line */
	openFenceFrom: number;
	/** End of the opening ```queryjs line */
	openFenceTo: number;
	/** Start of the closing ``` line */
	closeFenceFrom: number;
	/** End of the closing ``` line */
	closeFenceTo: number;
	/** The JavaScript content between the fences */
	jsContent: string;
}

/** Opening line of a queryjs block: a backtick fence at column 0 whose info string is exactly `queryjs` */
const QUERYJS_OPEN_RE = /^`{3,}\s*queryjs\s*$/;

/**
 * Finds every closed ```queryjs block, from the Lezer `FencedCode` nodes.
 * A queryjs fence nested in a larger fence is code text and is not returned.
 */
export function findAllQueryjsBlocks(state: EditorState): QueryjsBlockInfo[] {
	return findSpecialFenceBlocks(state, QUERYJS_OPEN_RE).map(({ content, ...range }) => ({
		...range,
		jsContent: content,
	}));
}
