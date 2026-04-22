import { Decoration } from '@codemirror/view';

import type { InlineHandler } from '../inline-formatting-plugin';

/**
 * Emits `cm-lp-highlight` on every `Highlight` Lezer node. The custom
 * HighlightExtension (src/lib/core/markdown-editor/extensions/lezer/
 * highlight-extension.ts) tags `==text==` as a Highlight node with a
 * `t.special(t.content)` tag — matching on node name keeps this handler
 * robust against tag changes in the Lezer extension.
 *
 * The legacy markdownStylePlugin (being retired in Phase 3) computed the
 * same decoration by calling findHighlightRanges(line) per line and
 * emitting a mark from openMarkFrom to closeMarkTo. Since we already have
 * the Highlight node from the syntax tree here, we use node.from..node.to
 * directly — identical bytes covered.
 */
export const highlightHandler: InlineHandler = {
	nodeType: 'Highlight',
	decorate: ({ node }) => ({
		from: node.from,
		to: node.to,
		deco: Decoration.mark({ class: 'cm-lp-highlight' }),
	}),
};
