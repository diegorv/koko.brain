import { hiddenSyntaxDeco, wikilinkTextDeco } from '../../styles';
import { findWikilinkRanges } from '../../../wikilink/decoration.logic';
import type { LineHandler } from '../inline-formatting-plugin';

/**
 * Wikilink rendering — `[[target]]`, `[[target#heading]]`, `[[target#^block-id]]`,
 * `[[target|display]]`. No Lezer node (Obsidian-specific), so this is a line
 * handler reusing `findWikilinkRanges` from the wikilink module.
 *
 * Wikilink line touched by the selection → show raw markdown.
 *
 * Click handling stays in `click-handler.ts` which uses
 * `findMarkdownLinkUrlAtPosition` for markdown links and reads wikilink data
 * via `decoration.logic` directly — so there's no coupling between the
 * decoration handler and click resolution.
 */
export const wikilinkHandler: LineHandler = {
	name: 'wikilink',
	decorate({ line, isRevealed, decorations }) {
		const ranges = findWikilinkRanges(line.text, line.from);
		for (const range of ranges) {
			if (isRevealed(range.openBracketFrom, range.closeBracketTo)) continue;

			if (range.displayFrom !== null && range.displayTo !== null) {
				// [[Target|Display]] — hide [[Target| then style display, hide ]]
				decorations.push(
					hiddenSyntaxDeco.range(range.openBracketFrom, range.displayFrom + 1),
				);
				decorations.push(wikilinkTextDeco.range(range.displayFrom + 1, range.displayTo));
				decorations.push(
					hiddenSyntaxDeco.range(range.closeBracketFrom, range.closeBracketTo),
				);
			} else {
				// [[Target]], [[Target#Heading]], [[Target#^block-id]]
				decorations.push(
					hiddenSyntaxDeco.range(range.openBracketFrom, range.openBracketTo),
				);
				const contentEnd = range.headingTo ?? range.blockIdTo ?? range.targetTo;
				decorations.push(wikilinkTextDeco.range(range.targetFrom, contentEnd));
				decorations.push(
					hiddenSyntaxDeco.range(range.closeBracketFrom, range.closeBracketTo),
				);
			}
		}
	},
};
