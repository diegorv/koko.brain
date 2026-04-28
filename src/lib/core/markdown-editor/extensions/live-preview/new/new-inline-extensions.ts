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
import { blockReferenceHandler } from './handlers/block-reference-handler';
import { simpleWidgetHandlers } from './handlers/simple-widget-handlers';
import { linkHandler, linkReferenceHandler } from './handlers/markdown-link-handlers';
import { autolinkHandler, extendedAutolinkHandler } from './handlers/autolink-handlers';

/**
 * Production node handlers, registered in the order Phases 3–10 retire their
 * legacy plugin counterparts.
 */
export const PRODUCTION_NODE_HANDLERS: readonly NodeHandler[] = [
	highlightHandler,
	...headingHandlers,
	blockquoteHandler,
	...simpleWidgetHandlers,
	linkHandler,
	linkReferenceHandler,
	autolinkHandler,
];

/**
 * Production line handlers — regex-based parsers for markdown features
 * without a usable Lezer node. Phases 6 + 7 covered inline comments and
 * block references; Phase 9 will add wikilinks and extended autolinks.
 */
export const PRODUCTION_LINE_HANDLERS: readonly LineHandler[] = [
	inlineCommentHandler,
	blockReferenceHandler,
	extendedAutolinkHandler,
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
