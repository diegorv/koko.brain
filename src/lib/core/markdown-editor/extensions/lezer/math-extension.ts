import type { MarkdownConfig, InlineParser, BlockParser, BlockContext, Line, InlineContext } from '@lezer/markdown';
import { tags as t } from '@lezer/highlight';

/**
 * Inline math parser for `$formula$` syntax.
 * Rules (matching Obsidian/KaTeX behavior):
 * - Not preceded/followed by `$` (avoids matching `$$`)
 * - Content must not start or end with a space
 * - Content must not be empty
 * - Single line only
 */
const inlineMathParser: InlineParser = {
	name: 'InlineMath',
	parse(cx: InlineContext, next: number, pos: number): number {
		// Must be $ (char code 36)
		if (next !== 36) return -1;

		// Must not be preceded by $ (avoid matching inside $$)
		if (pos > cx.offset && cx.char(pos - 1) === 36) return -1;

		// Must not be followed by $ (avoid matching $$) or be at end
		if (cx.char(pos + 1) === 36 || cx.char(pos + 1) === -1) return -1;

		// Content must not start with space/tab
		const firstContent = cx.char(pos + 1);
		if (firstContent === 32 || firstContent === 9) return -1;

		// Find closing $ on same line
		for (let i = pos + 1; i < cx.end; i++) {
			const ch = cx.char(i);

			// Newline ends search (inline math is single-line)
			if (ch === 10) return -1;

			if (ch === 36) {
				// Content must not end with space
				if (cx.char(i - 1) === 32 || cx.char(i - 1) === 9) continue;

				// Must not be followed by $ (avoid matching $$)
				if (i + 1 < cx.end && cx.char(i + 1) === 36) continue;

				// Valid match
				return cx.addElement(
					cx.elt('InlineMath', pos, i + 1, [
						cx.elt('InlineMathMark', pos, pos + 1),
						cx.elt('InlineMathMark', i, i + 1),
					]),
				);
			}
		}

		return -1;
	},
	after: 'Emphasis',
};

/**
 * Block math parser for `$$...$$` syntax.
 * A `$$` line on its own opens a block, and a subsequent `$$` line closes it.
 * Content between the delimiters is treated as a single block math expression.
 */
const blockMathParser: BlockParser = {
	name: 'BlockMath',
	parse(cx: BlockContext, line: Line): boolean {
		// Check for $$ at the content start (line.next is char code after whitespace)
		if (line.next !== 36 /* $ */) return false;

		const lineText = line.text.slice(line.pos);
		if (!/^\$\$\s*$/.test(lineText)) return false;

		const openFrom = cx.lineStart + line.pos;
		const openTo = cx.lineStart + line.text.length;
		const children = [cx.elt('BlockMathMark', openFrom, openTo)];

		// Advance through lines looking for closing $$
		while (cx.nextLine()) {
			const contentLineText = line.text.slice(line.pos);
			if (/^\$\$\s*$/.test(contentLineText) && line.next === 36) {
				const closeFrom = cx.lineStart + line.pos;
				const closeTo = cx.lineStart + line.text.length;
				children.push(cx.elt('BlockMathMark', closeFrom, closeTo));

				// Move past the closing $$ line (matching FencedCode pattern)
				cx.nextLine();
				cx.addElement(cx.elt('BlockMath', openFrom, cx.prevLineEnd(), children));
				return true;
			}
		}

		// Unclosed block math — do not create a node (user is still typing)
		return false;
	},
	before: 'FencedCode',
};

/**
 * Lezer MarkdownConfig extension for math syntax.
 * Adds `InlineMath` and `BlockMath` nodes to the syntax tree.
 *
 * Node types:
 * - `InlineMath`: inline `$formula$` expression
 * - `InlineMathMark`: the `$` delimiters
 * - `BlockMath`: block `$$...$$` expression
 * - `BlockMathMark`: the `$$` delimiter lines
 */
export const MathExtension: MarkdownConfig = {
	defineNodes: [
		{ name: 'InlineMath', style: t.special(t.content) },
		{ name: 'InlineMathMark', style: t.processingInstruction },
		{ name: 'BlockMath', block: true },
		{ name: 'BlockMathMark', style: t.processingInstruction },
	],
	parseInline: [inlineMathParser],
	parseBlock: [blockMathParser],
};
