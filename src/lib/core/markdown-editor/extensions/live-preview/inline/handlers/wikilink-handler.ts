import { Decoration } from '@codemirror/view';
import { wikilinkTextDeco } from '../../styles';
import { findWikilinkRanges } from '../../../wikilink/decoration.logic';
import type { LineHandler } from '../inline-formatting-plugin';

const FORMATTING_CLS = 'cm-formatting-inline';

/**
 * Wikilink rendering — `[[target]]`, `[[target#heading]]`, `[[target#^block-id]]`,
 * `[[target|display]]`. No Lezer node (Obsidian-specific), so this is a line
 * handler reusing `findWikilinkRanges` from the wikilink module.
 *
 * Cursor inside any wikilink → fall through and show raw markdown.
 *
 * Click handling stays in `click-handler.ts` which uses
 * `findMarkdownLinkUrlAtPosition` for markdown links and reads wikilink data
 * via `decoration.logic` directly — so there's no coupling between the
 * decoration handler and click resolution.
 */
export const wikilinkHandler: LineHandler = {
	name: 'wikilink',
	decorate({ line, isTouched, decorations }) {
		const ranges = findWikilinkRanges(line.text, line.from);
		for (const range of ranges) {
			if (isTouched(range.openBracketFrom, range.closeBracketTo)) continue;

			if (range.displayFrom !== null && range.displayTo !== null) {
				// [[Target|Display]] — hide [[Target| then style display, hide ]]
				decorations.push(
					Decoration.mark({ class: FORMATTING_CLS })
						.range(range.openBracketFrom, range.displayFrom + 1),
				);
				decorations.push(wikilinkTextDeco.range(range.displayFrom + 1, range.displayTo));
				decorations.push(
					Decoration.mark({ class: FORMATTING_CLS })
						.range(range.closeBracketFrom, range.closeBracketTo),
				);
			} else {
				// [[Target]], [[Target#Heading]], [[Target#^block-id]]
				decorations.push(
					Decoration.mark({ class: FORMATTING_CLS })
						.range(range.openBracketFrom, range.openBracketTo),
				);
				const contentEnd = range.headingTo ?? range.blockIdTo ?? range.targetTo;
				decorations.push(wikilinkTextDeco.range(range.targetFrom, contentEnd));
				decorations.push(
					Decoration.mark({ class: FORMATTING_CLS })
						.range(range.closeBracketFrom, range.closeBracketTo),
				);
			}
		}
	},
};
