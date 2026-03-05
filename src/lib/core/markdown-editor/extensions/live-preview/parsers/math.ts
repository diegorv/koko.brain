import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';

/** Range positions for an inline `$formula$` match */
export interface InlineMathRange {
	/** Start of the opening `$` delimiter */
	from: number;
	/** End of the closing `$` delimiter */
	to: number;
	/** The LaTeX formula between the delimiters */
	formula: string;
}

/** Information about a `$$...$$` block math expression */
export interface BlockMathInfo {
	/** Start of the opening `$$` line */
	openFrom: number;
	/** End of the opening `$$` line */
	openTo: number;
	/** Start of the closing `$$` line */
	closeFrom: number;
	/** End of the closing `$$` line */
	closeTo: number;
	/** The LaTeX formula between the delimiters */
	formula: string;
}

/**
 * Finds all inline `$formula$` ranges in the given line range.
 * Uses the Lezer syntax tree (`InlineMath` nodes from the MathExtension).
 */
export function findInlineMathRanges(state: EditorState, from: number, to: number): InlineMathRange[] {
	const ranges: InlineMathRange[] = [];

	syntaxTree(state).iterate({
		from,
		to,
		enter(node) {
			if (node.name !== 'InlineMath') return;

			// Extract formula between the $ delimiters
			const formula = state.doc.sliceString(node.from + 1, node.to - 1);
			ranges.push({
				from: node.from,
				to: node.to,
				formula,
			});
		},
	});

	return ranges;
}

/**
 * Finds all `$$...$$` block math expressions using the Lezer syntax tree.
 * Uses `BlockMath` and `BlockMathMark` nodes from the MathExtension.
 */
export function findAllBlockMath(state: EditorState): BlockMathInfo[] {
	const blocks: BlockMathInfo[] = [];
	const tree = syntaxTree(state);

	tree.iterate({
		enter(node) {
			if (node.name !== 'BlockMath') return;

			const inner = node.node;
			let openFrom = -1, openTo = -1;
			let closeFrom = -1, closeTo = -1;

			let child = inner.firstChild;
			let isFirst = true;
			while (child) {
				if (child.name === 'BlockMathMark') {
					if (isFirst) {
						openFrom = child.from;
						openTo = child.to;
						isFirst = false;
					} else {
						closeFrom = child.from;
						closeTo = child.to;
					}
				}
				child = child.nextSibling;
			}

			if (openFrom < 0 || closeFrom < 0) return;

			// Formula is the content between the two marks
			const hasOpenNewline = state.doc.sliceString(openTo, openTo + 1) === '\n';
			const hasCloseNewline = state.doc.sliceString(closeFrom - 1, closeFrom) === '\n';
			const formulaFrom = hasOpenNewline ? openTo + 1 : openTo;
			const formulaTo = hasCloseNewline ? closeFrom - 1 : closeFrom;
			const formula = formulaFrom <= formulaTo
				? state.doc.sliceString(formulaFrom, formulaTo)
				: '';

			blocks.push({ openFrom, openTo, closeFrom, closeTo, formula });
		},
	});

	return blocks;
}
