import type { Extension } from '@codemirror/state';
import { syntaxHighlighting } from '@codemirror/language';

import { mdStyle } from './markdown-highlight-style';
import {
	inlineFormattingPlugin,
	registerInlineHandler,
	registerLineHandler,
	_clearInlineHandlers,
	type InlineHandler,
	type InlineLineHandler,
} from './inline-formatting-plugin';
import { headingHandlers } from './handlers/heading-handler';
import { blockquoteHandler } from './handlers/blockquote-handler';
import { inlineCommentHandler } from './handlers/inline-comment-handler';
import { blockReferenceHandler } from './handlers/block-reference-handler';
import { simpleWidgetHandlers } from './handlers/simple-widget-handlers';
import { markdownLinkHandlers } from './handlers/markdown-link-handlers';
import {
	autolinkNodeHandlers,
	autolinkLineHandlers,
} from './handlers/autolink-handlers';
import { wikilinkHandler } from './handlers/wikilink-handler';

/**
 * Production handlers registered by the new inline pipeline. Kept as a
 * pure value list so handlers stay auditable in one place and tests can
 * swap them trivially (_clearInlineHandlers() + register specific ones).
 *
 * HighlightStyle covers every case that can be expressed purely via a Lezer
 * tag → CSS class mapping. A handler is only added when the legacy plugin
 * did something HighlightStyle cannot: Decoration.line, cursor-reveal,
 * Decoration.replace with a widget, or a cross-line span.
 */
export const PRODUCTION_INLINE_HANDLERS: readonly InlineHandler[] = [
	...headingHandlers,
	blockquoteHandler,
	...simpleWidgetHandlers,
	...markdownLinkHandlers,
	...autolinkNodeHandlers,
];

/** Line-based handlers (regex parsers, no Lezer node). */
export const PRODUCTION_LINE_HANDLERS: readonly InlineLineHandler[] = [
	inlineCommentHandler,
	blockReferenceHandler,
	...autolinkLineHandlers,
	wikilinkHandler,
];

/**
 * Extensions emitted by the new inline pipeline. Called from
 * `live-preview.ts → livePreviewExtensions()` when
 * `experimental.newLivePreview` is on.
 *
 * Ships two extensions today:
 *   1. `syntaxHighlighting(mdStyle)` — Lezer tag → cm-lp-* class mapping for
 *      bold, italic, strikethrough, inline code and headings 1–6.
 *   2. `inlineFormattingPlugin` — ViewPlugin that dispatches the registered
 *      PRODUCTION_INLINE_HANDLERS. The plugin is idempotent: every call
 *      clears the registry first so repeat invocations never double-register.
 *
 * Order matters: syntaxHighlighting is registered first so handlers can
 * override the tag-based styling when they need to (e.g. blockquote depths
 * 2–3 that aren't expressible as a single Lezer tag).
 */
export function newInlineExtensions(): Extension[] {
	_clearInlineHandlers();
	for (const handler of PRODUCTION_INLINE_HANDLERS) registerInlineHandler(handler);
	for (const handler of PRODUCTION_LINE_HANDLERS) registerLineHandler(handler);
	return [syntaxHighlighting(mdStyle), inlineFormattingPlugin];
}
