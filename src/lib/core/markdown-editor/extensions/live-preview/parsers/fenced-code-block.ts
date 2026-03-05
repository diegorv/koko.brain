import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';

/** Range positions for a fenced code block detected via the Lezer syntax tree */
export interface FencedCodeBlockRange {
	/** Start of the opening fence line */
	openFenceFrom: number;
	/** End of the opening fence line */
	openFenceTo: number;
	/** Start of the closing fence line (equals last content line if unclosed) */
	closeFenceFrom: number;
	/** End of the closing fence line (equals last content line if unclosed) */
	closeFenceTo: number;
	/** Start of the code content between the fences */
	contentFrom: number;
	/** End of the code content between the fences */
	contentTo: number;
	/** The language identifier (e.g. "js", "python"), empty string if none */
	language: string;
	/** Whether the block has a closing fence (per CommonMark spec, unclosed blocks extend to EOF) */
	closed: boolean;
}

/**
 * Finds all fenced code blocks using the Lezer syntax tree (`FencedCode` nodes).
 * Follows CommonMark spec: unclosed blocks extend to the end of the document.
 */
export function findAllFencedCodeBlocks(state: EditorState): FencedCodeBlockRange[] {
	const blocks: FencedCodeBlockRange[] = [];
	const tree = syntaxTree(state);

	tree.iterate({
		enter(node) {
			if (node.name !== 'FencedCode') return;

			const inner = node.node;
			let language = '';
			let contentFrom = -1;
			let contentTo = -1;
			let codeMarkCount = 0;

			// Walk children to find CodeMark (fences), CodeInfo (language), CodeText (content)
			let child = inner.firstChild;
			while (child) {
				if (child.name === 'CodeMark') {
					codeMarkCount++;
				} else if (child.name === 'CodeInfo') {
					language = state.doc.sliceString(child.from, child.to).trim();
				} else if (child.name === 'CodeText') {
					contentFrom = child.from;
					contentTo = child.to;
				}
				child = child.nextSibling;
			}

			// 2 CodeMark children = opening + closing fence; 1 = unclosed block (extends to EOF per spec)
			const closed = codeMarkCount >= 2;

			// Opening fence is the first line of the node
			const openLine = state.doc.lineAt(node.from);
			// Closing fence is the last line of the node (or EOF if unclosed)
			const closeLine = state.doc.lineAt(node.to);

			// Single-line node with no content — incomplete parse, skip
			if (openLine.number === closeLine.number) return;

			// Normalize content range for empty blocks
			if (contentFrom < 0) {
				contentFrom = openLine.to + 1;
				contentTo = openLine.to + 1;
			}

			blocks.push({
				openFenceFrom: openLine.from,
				openFenceTo: openLine.to,
				closeFenceFrom: closeLine.from,
				closeFenceTo: closeLine.to,
				contentFrom,
				contentTo: contentFrom > contentTo ? contentFrom : contentTo,
				language,
				closed,
			});
		},
	});

	return blocks;
}
