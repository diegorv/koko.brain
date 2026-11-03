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

/**
 * Finds every closed ```mermaid block, from the Lezer `FencedCode` nodes.
 * A ```mermaid fence nested in a larger fence is code text and is not returned.
 */
export function findAllMermaidBlocks(state: EditorState): MermaidBlockInfo[] {
	return findSpecialFenceBlocks(state, 'mermaid', '`~').map(({ content, ...range }) => ({
		...range,
		diagramSource: content,
	}));
}
