import { Decoration } from '@codemirror/view';
import { hiddenSyntaxDeco } from '../../styles';
import { findInlineCommentRanges } from '../../parsers/comment';
import type { LineHandler } from '../inline-formatting-plugin';

/** Dimmed but visible comment, used while its line is touched by the selection. */
const revealedCommentDeco = Decoration.mark({ class: 'cm-lp-inline-comment' });

/**
 * Hides inline `%%text%%` comments. No Lezer node for `%%…%%` (Obsidian-specific
 * syntax), so this is a line handler — `findInlineCommentRanges` walks each
 * line for matches.
 *
 * Reveal (shared line rule, `core/reveal.ts`):
 *   - line not touched by the selection → `hiddenSyntaxDeco` (removed from the DOM)
 *   - line touched → `cm-lp-inline-comment` only (dimmed but visible)
 */
export const inlineCommentHandler: LineHandler = {
	name: 'inline-comment',
	decorate({ line, state, isRevealed, decorations }) {
		const ranges = findInlineCommentRanges(state, line.from, line.to);
		for (const range of ranges) {
			const deco = isRevealed(range.from, range.to) ? revealedCommentDeco : hiddenSyntaxDeco;
			decorations.push(deco.range(range.from, range.to));
		}
	},
};
