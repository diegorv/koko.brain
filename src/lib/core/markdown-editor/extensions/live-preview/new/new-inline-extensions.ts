import type { Extension } from '@codemirror/state';
import { inlineHighlightExtension } from './markdown-highlight-style';
import {
	makeInlineFormattingPlugin,
	type NodeHandler,
	type LineHandler,
} from './inline-formatting-plugin';
import { highlightHandler } from './handlers/highlight-handler';
import { headingHandlers } from './handlers/heading-handler';
import { blockquoteHandler } from './handlers/blockquote-handler';
import { inlineCommentHandler } from './handlers/inline-comment-handler';

/**
 * Production node handlers, registered in the order Phases 3–10 retire their
 * legacy plugin counterparts.
 */
export const PRODUCTION_NODE_HANDLERS: readonly NodeHandler[] = [
	highlightHandler,
	...headingHandlers,
	blockquoteHandler,
];

/**
 * Production line handlers — regex-based parsers for markdown features
 * without a usable Lezer node. Phase 6 ships inline `%%comments%%`; Phases
 * 7 and 9 will add block-references and wikilinks/extended-autolinks.
 */
export const PRODUCTION_LINE_HANDLERS: readonly LineHandler[] = [
	inlineCommentHandler,
];

/**
 * Returns the full extension array for the new inline pipeline:
 * `HighlightStyle` (tag-based marks/styles) + `inlineFormattingPlugin`
 * (everything that needs cursor reveal, regex parsing, or block-context
 * suppression).
 */
export function newInlineExtensions(): Extension[] {
	return [
		inlineHighlightExtension(),
		makeInlineFormattingPlugin({
			nodeHandlers: PRODUCTION_NODE_HANDLERS,
			lineHandlers: PRODUCTION_LINE_HANDLERS,
		}),
	];
}
