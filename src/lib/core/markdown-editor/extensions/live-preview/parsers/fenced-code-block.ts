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
	/**
	 * Start position of the language tag on the opening fence line — used by
	 * the language-switcher widget to dispatch a transaction that rewrites
	 * just the tag, leaving the rest of the document untouched. `null` when
	 * the fence has no `CodeInfo` child (e.g. ` ```\n…\n``` ` with no
	 * language); callers must insert at `openFenceTo` in that case.
	 */
	languageFrom: number | null;
	/** End position of the language tag on the opening fence line. `null` if absent. */
	languageTo: number | null;
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
			let languageFrom: number | null = null;
			let languageTo: number | null = null;
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
					languageFrom = child.from;
					languageTo = child.to;
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
				languageFrom,
				languageTo,
				closed,
			});
		},
	});

	return blocks;
}

/** A closed fenced code block claimed by a specialized decorator (mermaid, queryjs, collection) */
export interface SpecialFenceBlock {
	/** Start of the opening fence line */
	openFenceFrom: number;
	/** End of the opening fence line */
	openFenceTo: number;
	/** Start of the closing fence line */
	closeFenceFrom: number;
	/** End of the closing fence line */
	closeFenceTo: number;
	/** The lines between the fences, joined by `\n` (empty for an empty block) */
	content: string;
}

/**
 * Finds the closed fenced code blocks whose opening fence line matches `openRe`.
 * Detection comes from Lezer `FencedCode` nodes, so a fence nested inside a
 * larger fence (plain code text to the outer block) is never returned:
 * `findAllFencedCodeBlocks` iterates without entering mounted code-language
 * trees. `openRe` is tested against the whole opening line, which keeps each
 * decorator's language and fence-character rules.
 */
export function findSpecialFenceBlocks(state: EditorState, openRe: RegExp): SpecialFenceBlock[] {
	const result: SpecialFenceBlock[] = [];
	for (const block of findAllFencedCodeBlocks(state)) {
		if (!block.closed) continue;
		const openLine = state.doc.lineAt(block.openFenceFrom);
		if (!openRe.test(openLine.text)) continue;
		const closeLine = state.doc.lineAt(block.closeFenceFrom);
		const content =
			closeLine.number - openLine.number > 1
				? state.doc.sliceString(state.doc.line(openLine.number + 1).from, state.doc.line(closeLine.number - 1).to)
				: '';
		result.push({
			openFenceFrom: block.openFenceFrom,
			openFenceTo: block.openFenceTo,
			closeFenceFrom: block.closeFenceFrom,
			closeFenceTo: block.closeFenceTo,
			content,
		});
	}
	return result;
}
