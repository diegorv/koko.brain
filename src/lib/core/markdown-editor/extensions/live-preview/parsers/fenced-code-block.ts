import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';
import type { SyntaxNode } from '@lezer/common';

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

/** A closed fenced code block claimed by a specialized decorator (mermaid, queryjs, collection, meta-bind-button) */
export interface SpecialFenceBlock {
	/** Start of the opening fence line */
	openFenceFrom: number;
	/** End of the opening fence line */
	openFenceTo: number;
	/** Start of the closing fence line */
	closeFenceFrom: number;
	/** End of the closing fence line */
	closeFenceTo: number;
	/** The lines between the fences without their container prefix, joined by `\n` (empty for an empty block) */
	content: string;
}

/**
 * Finds the closed fenced code blocks whose info string is exactly `language`
 * and whose fence character is one of `fenceChars` (e.g. "`" or "`~").
 * Detection comes from Lezer `FencedCode` nodes, so a fence nested inside a
 * larger fence (plain code text to the outer block) is never returned:
 * `findAllFencedCodeBlocks` iterates without entering mounted code-language
 * trees. A fence inside a callout, blockquote or list item is found. An
 * opening fence indented past the content column of its container (column 0
 * at the top level) is not: CommonMark would strip that indent from every
 * content line, and Lezer's `CodeText` keeps it.
 *
 * `content` is built line by line from the node's `CodeText` children, which
 * Lezer starts after the container prefix of each line (every `>` with its one
 * optional space, or the list item indent), so the consumer gets the text it
 * would at the top level. A line with no `CodeText` is blank.
 */
export function findSpecialFenceBlocks(state: EditorState, language: string, fenceChars: string): SpecialFenceBlock[] {
	const result: SpecialFenceBlock[] = [];
	const tree = syntaxTree(state);
	for (const block of findAllFencedCodeBlocks(state)) {
		if (!block.closed || block.language !== language || block.languageFrom === null) continue;
		const fence = tree.resolve(block.languageFrom, 1).parent;
		if (fence?.name !== 'FencedCode') continue;
		if (!fenceChars.includes(state.doc.sliceString(fence.from, fence.from + 1))) continue;
		if (!startsAtContentColumn(state, fence)) continue;
		const firstLine = state.doc.lineAt(block.openFenceTo).number + 1;
		const lines: string[] = Array(state.doc.lineAt(block.closeFenceFrom).number - firstLine).fill('');
		for (let child = fence.firstChild; child; child = child.nextSibling) {
			if (child.name !== 'CodeText') continue;
			// A CodeText may span several lines (top level) or end with the newline of its line (in a container)
			for (let pos = child.from; pos < child.to; ) {
				const line = state.doc.lineAt(pos);
				lines[line.number - firstLine] += state.doc.sliceString(pos, Math.min(child.to, line.to));
				pos = line.to + 1;
			}
		}
		const content = lines.join('\n');
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

/**
 * Whether a `FencedCode` node starts at the content column of its container:
 * column 0 at the top level, right after the line's quote marker and its one
 * optional space in a blockquote, and at the list item's content column in a
 * list item. Columns count characters, so a tab-indented fence is rejected.
 */
function startsAtContentColumn(state: EditorState, fence: SyntaxNode): boolean {
	const container = fence.parent;
	const fenceLine = state.doc.lineAt(fence.from);
	if (!container || container.name === 'Document') return fence.from === fenceLine.from;
	if (container.name === 'Blockquote') {
		let mark: SyntaxNode | null = null;
		for (let child = container.firstChild; child && child.from < fence.from; child = child.nextSibling) {
			if (child.name === 'QuoteMark') mark = child;
		}
		return mark !== null && mark.from >= fenceLine.from && fence.from - mark.to <= 1;
	}
	if (container.name === 'ListItem') {
		const mark = container.firstChild;
		if (mark?.name !== 'ListMark') return true;
		const markLine = state.doc.lineAt(mark.from);
		if (markLine.number === fenceLine.number) return true;
		// CommonMark: the content column is after the marker and 1-4 spaces, or 1 space when the marker line has no text
		const rest = state.doc.sliceString(mark.to, markLine.to);
		const gap = rest.length - rest.trimStart().length;
		const contentColumn = mark.to - markLine.from + (gap >= 1 && gap <= 4 && gap < rest.length ? gap : 1);
		return fence.from - fenceLine.from === contentColumn;
	}
	return true;
}
