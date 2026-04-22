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
import { inlineMarksHandlers } from './handlers/inline-marks-handlers';
import { imageHandler } from './handlers/image-handler';
import { footnoteHandler } from './handlers/footnote-handlers';
import { wikilinkEmbedHandler } from './handlers/wikilink-embed-handler';
import { metaBindInputHandler } from './handlers/meta-bind-input-handler';

/**
 * Production handlers registered by the inline pipeline. Kept as a pure value
 * list so handlers stay auditable in one place and tests can swap them
 * trivially (_clearInlineHandlers() + register specific ones).
 *
 * `syntaxHighlighting(mdStyle)` covers every case that can be expressed purely
 * via a Lezer tag → CSS class mapping. A handler is only added when the
 * feature needs something `HighlightStyle` cannot express: `Decoration.line`,
 * cursor-reveal, `Decoration.replace` with a widget, or a cross-line span.
 */
export const PRODUCTION_INLINE_HANDLERS: readonly InlineHandler[] = [
	...headingHandlers,
	blockquoteHandler,
	...simpleWidgetHandlers,
	...markdownLinkHandlers,
	...autolinkNodeHandlers,
	...inlineMarksHandlers,
	imageHandler,
];

/** Line-based handlers (regex parsers, no Lezer node). */
export const PRODUCTION_LINE_HANDLERS: readonly InlineLineHandler[] = [
	inlineCommentHandler,
	blockReferenceHandler,
	...autolinkLineHandlers,
	wikilinkHandler,
	footnoteHandler,
	wikilinkEmbedHandler,
	metaBindInputHandler,
];

/**
 * Extensions that drive the inline rendering of the live-preview editor.
 * Called from `live-preview.ts → livePreviewExtensions()`.
 *
 * Ships two extensions:
 *   1. `syntaxHighlighting(mdStyle)` — Lezer tag → `cm-lp-*` class mapping for
 *      bold, italic, strikethrough, inline code and highlight.
 *   2. `inlineFormattingPlugin` — ViewPlugin that dispatches the registered
 *      PRODUCTION_INLINE_HANDLERS + PRODUCTION_LINE_HANDLERS. Idempotent:
 *      every call clears the registry first so repeat invocations don't
 *      double-register.
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
