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
import { wikilinkHandler } from './handlers/wikilink-handler';
import { markHandlers, escapeHandler } from './handlers/mark-handlers';

/**
 * Production node handlers — every NodeHandler the inline pipeline dispatches
 * on Lezer node names. Order matters only for tie-breaking when multiple
 * handlers match (rare); the registry's `handlersByType` map gives O(1)
 * dispatch per node.
 */
export const PRODUCTION_NODE_HANDLERS: readonly NodeHandler[] = [
	highlightHandler,
	...headingHandlers,
	blockquoteHandler,
	...simpleWidgetHandlers,
	linkHandler,
	linkReferenceHandler,
	autolinkHandler,
	...markHandlers,
	escapeHandler,
];

/**
 * Production line handlers — regex-based parsers for markdown features
 * without a usable Lezer node (inline comments `%%…%%`, block references
 * `^id`, extended autolinks, wikilinks).
 */
export const PRODUCTION_LINE_HANDLERS: readonly LineHandler[] = [
	inlineCommentHandler,
	blockReferenceHandler,
	extendedAutolinkHandler,
	wikilinkHandler,
];

/**
 * Returns the full extension array for the inline pipeline:
 * `HighlightStyle` (tag-based marks/styles) + `inlineFormattingPlugin`
 * (everything that needs cursor reveal, regex parsing, or block-context
 * suppression).
 */
export function inlineExtensions(): Extension[] {
	return [
		inlineHighlightExtension(),
		makeInlineFormattingPlugin({
			nodeHandlers: PRODUCTION_NODE_HANDLERS,
			lineHandlers: PRODUCTION_LINE_HANDLERS,
		}),
	];
}
