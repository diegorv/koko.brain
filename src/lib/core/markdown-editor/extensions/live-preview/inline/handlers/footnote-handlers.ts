import { Decoration } from '@codemirror/view';

import { footnoteRefDeco, footnoteDefMarkerDeco } from '../../styles';
import {
	findFootnoteRefRanges,
	findFootnoteDefRange,
	findInlineFootnoteRanges,
} from '../../parsers/footnote';
import type { InlineLineHandler, InlineDecorationEntry } from '../inline-formatting-plugin';

const FORMATTING_CLS = 'cm-formatting-inline';

/**
 * Handles all footnote decoration in a single line pass:
 *   - `[^label]` refs → cm-lp-footnote-ref (superscript).
 *   - `[^label]: text` defs → cm-lp-footnote-def-marker on the marker span.
 *   - `^[text]` inline footnotes → hide `^[` and `]`, superscript the text.
 *
 * Regex-parsed (no single Lezer node covers all three forms), so this lives
 * as a line handler.
 */
export const footnoteHandler: InlineLineHandler = {
	decorate: ({ state, line, isTouched }) => {
		const entries: InlineDecorationEntry[] = [];

		// Refs [^label]
		for (const range of findFootnoteRefRanges(state, line.from, line.to)) {
			if (isTouched(range.fullFrom, range.fullTo)) continue;
			entries.push({ from: range.fullFrom, to: range.fullTo, deco: footnoteRefDeco });
		}

		// Definitions [^label]: text
		const def = findFootnoteDefRange(state, line.from, line.to);
		if (def && !isTouched(def.markerFrom, def.markerTo)) {
			entries.push({ from: def.markerFrom, to: def.markerTo, deco: footnoteDefMarkerDeco });
		}

		// Inline footnotes ^[text]
		for (const range of findInlineFootnoteRanges(state, line.from, line.to)) {
			if (isTouched(range.fullFrom, range.fullTo)) continue;
			const formatting = Decoration.mark({ class: FORMATTING_CLS });
			entries.push(
				{ from: range.openMarkFrom, to: range.openMarkTo, deco: formatting },
				{ from: range.textFrom, to: range.textTo, deco: footnoteRefDeco },
				{ from: range.closeMarkFrom, to: range.closeMarkTo, deco: formatting },
			);
		}

		return entries;
	},
};
