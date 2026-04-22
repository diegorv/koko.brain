import type { Extension } from '@codemirror/state';
import { syntaxHighlighting } from '@codemirror/language';

import { mdStyle } from './markdown-highlight-style';
import {
	inlineFormattingPlugin,
	registerInlineHandler,
	_clearInlineHandlers,
	type InlineHandler,
} from './inline-formatting-plugin';
import { highlightHandler } from './handlers/highlight-handler';
import { headingHandlers } from './handlers/heading-handler';

/**
 * Production handlers registered by the new inline pipeline. Keeping the
 * list as a pure value makes it trivially testable (_clearInlineHandlers()
 * + one forEach(registerInlineHandler) in beforeEach) and keeps phase-
 * specific handlers auditable in one place.
 *
 * Grows one handler per migration phase:
 *   - Phase 3 (markdownStyle)        → highlightHandler
 *   - Phase 4 (heading)              → headingMarkHandler
 *   - Phase 5 (blockquote)           → blockquoteMarkHandler (+ line deco)
 *   - Phase 6 (inline comments)      → commentHandler
 *   - Phase 7 (block references)     → blockRefHandler
 *   - Phase 8 (simpleWidget)         → hrHandler, bulletHandler, …
 *   - Phase 9 (link)                 → linkHandler (split 9a/9b/9c)
 *   - Phase 10 (inline marks)        → inlineMarksHandler (cursor-reveal)
 */
export const PRODUCTION_INLINE_HANDLERS: readonly InlineHandler[] = [
	highlightHandler,
	...headingHandlers,
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
	for (const handler of PRODUCTION_INLINE_HANDLERS) {
		registerInlineHandler(handler);
	}
	return [syntaxHighlighting(mdStyle), inlineFormattingPlugin];
}
