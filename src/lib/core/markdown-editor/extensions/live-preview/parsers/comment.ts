import type { EditorState } from '@codemirror/state';

/** Range positions for an inline `%%text%%` comment */
export interface InlineCommentRange {
	from: number;
	to: number;
}

/** Matches inline `%%text%%` comments (non-greedy, single line) */
const INLINE_COMMENT_RE = /%%(.+?)%%/g;

/** Matches a line that is exactly `%%` (opening or closing a block comment) */
export const BLOCK_COMMENT_FENCE_RE = /^%%\s*$/;

/**
 * Finds all inline `%%text%%` comment ranges on a single line.
 * Uses regex (Obsidian-specific syntax, no Lezer equivalent).
 */
export function findInlineCommentRanges(state: EditorState, from: number, to: number): InlineCommentRange[] {
	const text = state.doc.sliceString(from, to);
	const ranges: InlineCommentRange[] = [];
	INLINE_COMMENT_RE.lastIndex = 0;

	let match: RegExpExecArray | null;
	while ((match = INLINE_COMMENT_RE.exec(text)) !== null) {
		ranges.push({
			from: from + match.index,
			to: from + match.index + match[0].length,
		});
	}

	return ranges;
}

/** Result of finding a block comment `%%\n...\n%%` */
export interface BlockCommentRange {
	openFenceFrom: number;
	openFenceTo: number;
	closeFenceFrom: number;
	closeFenceTo: number;
}

/**
 * Finds a block comment starting at the given line index.
 * A block comment starts with a line that is exactly `%%` and ends with another `%%` line.
 */
export function findBlockComment(
	lines: { text: string; from: number; to: number }[],
	startIdx: number,
): { block: BlockCommentRange; endIdx: number } | null {
	const firstLine = lines[startIdx];
	if (!BLOCK_COMMENT_FENCE_RE.test(firstLine.text)) return null;

	for (let i = startIdx + 1; i < lines.length; i++) {
		if (BLOCK_COMMENT_FENCE_RE.test(lines[i].text)) {
			return {
				block: {
					openFenceFrom: firstLine.from,
					openFenceTo: firstLine.to,
					closeFenceFrom: lines[i].from,
					closeFenceTo: lines[i].to,
				},
				endIdx: i,
			};
		}
	}

	return null;
}
