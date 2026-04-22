import { Decoration } from '@codemirror/view';

import { findBlockReference } from '../../parsers/block-reference';
import type { InlineLineHandler, InlineHandlerResult } from '../inline-formatting-plugin';

/**
 * Handles trailing block references (`^block-id`). Regex-based with no Lezer
 * node, so it registers as a line handler. When the cursor is on the line the
 * ref shows dimmed (`cm-lp-block-ref`); otherwise it's hidden
 * (`cm-lp-block-ref cm-lp-block-ref-hidden`).
 */
export const blockReferenceHandler: InlineLineHandler = {
	decorate: ({ state, line, isTouched }): InlineHandlerResult => {
		const ref = findBlockReference(state.doc.sliceString(line.from, line.to), line.from);
		if (!ref) return null;
		const cls = isTouched(line.from, line.to)
			? 'cm-lp-block-ref'
			: 'cm-lp-block-ref cm-lp-block-ref-hidden';
		return {
			from: ref.from,
			to: ref.to,
			deco: Decoration.mark({ class: cls }),
		};
	},
};
