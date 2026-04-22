import { Decoration } from '@codemirror/view';

import { wikilinkTextDeco } from '../../styles';
import { findWikilinkRanges } from '../../../wikilink/decoration.logic';
import type { InlineLineHandler, InlineDecorationEntry } from '../inline-formatting-plugin';

const FORMATTING_CLS = 'cm-formatting-inline';

/**
 * `[[target]]`, `[[target#heading]]`, `[[target#^block-id]]`, and
 * `[[target|display]]`. Wikilinks are regex-parsed (no Lezer node) so this
 * lives as a line handler. Hides the brackets and (when present) the pipe
 * + target prefix, styling the visible text with `cm-lp-wikilink`.
 */
export const wikilinkHandler: InlineLineHandler = {
	decorate: ({ state, line, isTouched }) => {
		const entries: InlineDecorationEntry[] = [];
		const text = state.doc.sliceString(line.from, line.to);

		for (const range of findWikilinkRanges(text, line.from)) {
			if (isTouched(range.openBracketFrom, range.closeBracketTo)) continue;

			if (range.displayFrom !== null && range.displayTo !== null) {
				// [[Target|Display]] — hide everything up through the pipe, style the display, hide ]]
				entries.push(
					{
						from: range.openBracketFrom,
						to: range.displayFrom + 1,
						deco: Decoration.mark({ class: FORMATTING_CLS }),
					},
					{
						from: range.displayFrom + 1,
						to: range.displayTo,
						deco: wikilinkTextDeco,
					},
					{
						from: range.closeBracketFrom,
						to: range.closeBracketTo,
						deco: Decoration.mark({ class: FORMATTING_CLS }),
					},
				);
				continue;
			}

			// [[Target]] / [[Target#heading]] / [[Target#^block-id]]
			const contentEnd = range.headingTo ?? range.blockIdTo ?? range.targetTo;
			entries.push(
				{
					from: range.openBracketFrom,
					to: range.openBracketTo,
					deco: Decoration.mark({ class: FORMATTING_CLS }),
				},
				{
					from: range.targetFrom,
					to: contentEnd,
					deco: wikilinkTextDeco,
				},
				{
					from: range.closeBracketFrom,
					to: range.closeBracketTo,
					deco: Decoration.mark({ class: FORMATTING_CLS }),
				},
			);
		}

		return entries;
	},
};
