import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';

export interface HeadingMarkRange {
	level: number;
	markFrom: number;
	markTo: number;
}

/** Parsed setext heading with text line and underline positions */
export interface SetextHeadingRange {
	level: number;
	/** Start of the entire setext heading (first char of text line) */
	from: number;
	/** End of the entire setext heading (end of underline) */
	to: number;
	/** Start of the underline row */
	underlineFrom: number;
	/** End of the underline row */
	underlineTo: number;
}

/**
 * Finds the heading mark range (e.g., `## `) for an ATX heading in the given line range
 * by inspecting the Lezer syntax tree for `ATXHeading1`-`ATXHeading6` nodes.
 */
export function findHeadingMarkRange(
	state: EditorState,
	lineFrom: number,
	lineTo: number,
): HeadingMarkRange | null {
	let result: HeadingMarkRange | null = null;

	syntaxTree(state).iterate({
		from: lineFrom,
		to: lineTo,
		enter: (node) => {
			const match = node.name.match(/^ATXHeading(\d)$/);
			if (match) {
				const level = parseInt(match[1]);
				const headerMark = node.node.getChild('HeaderMark');
				if (headerMark) {
					// Include the space after the mark (e.g., "## " not just "##")
					const markTo = Math.min(headerMark.to + 1, lineTo);
					result = { level, markFrom: lineFrom, markTo };
				}
				return false;
			}
		},
	});

	return result;
}

/**
 * Finds a setext heading (`SetextHeading1`/`SetextHeading2`) in the given range.
 * Setext headings have a text line followed by an underline of `=` (h1) or `-` (h2).
 */
export function findSetextHeadingRange(
	state: EditorState,
	from: number,
	to: number,
): SetextHeadingRange | null {
	let result: SetextHeadingRange | null = null;

	syntaxTree(state).iterate({
		from,
		to,
		enter: (node) => {
			const match = node.name.match(/^SetextHeading(\d)$/);
			if (!match) return;

			const level = parseInt(match[1]);
			const headingNode = node.node;

			// The underline is the last line of the setext heading node
			const lastLine = state.doc.lineAt(headingNode.to);

			result = {
				level,
				from: headingNode.from,
				to: headingNode.to,
				underlineFrom: lastLine.from,
				underlineTo: lastLine.to,
			};
			return false;
		},
	});

	return result;
}
