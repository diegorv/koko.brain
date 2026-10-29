import type { EditorState } from '@codemirror/state';
import { findSpecialFenceBlocks } from './fenced-code-block';

/** Information about a ```mermaid fenced code block */
export interface MermaidBlockInfo {
	/** Start of the opening ```mermaid line */
	openFenceFrom: number;
	/** End of the opening ```mermaid line */
	openFenceTo: number;
	/** Start of the closing ``` line */
	closeFenceFrom: number;
	/** End of the closing ``` line */
	closeFenceTo: number;
	/** The Mermaid diagram definition between the fences */
	diagramSource: string;
}

/** Opening line of a mermaid block: a backtick or tilde fence at column 0 whose info string is exactly `mermaid` */
const MERMAID_OPEN_RE = /^(`{3,}|~{3,})\s*mermaid\s*$/;

/**
 * Finds every closed ```mermaid block, from the Lezer `FencedCode` nodes.
 * A ```mermaid fence nested in a larger fence is code text and is not returned.
 */
export function findAllMermaidBlocks(state: EditorState): MermaidBlockInfo[] {
	return findSpecialFenceBlocks(state, MERMAID_OPEN_RE).map(({ content, ...range }) => ({
		...range,
		diagramSource: content,
	}));
}
