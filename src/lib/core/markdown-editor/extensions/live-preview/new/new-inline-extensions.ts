import type { Extension } from '@codemirror/state';
import { syntaxHighlighting } from '@codemirror/language';

import { mdStyle } from './markdown-highlight-style';
import { inlineFormattingPlugin } from './inline-formatting-plugin';

/**
 * Extensions emitted by the new inline pipeline. Called from
 * `live-preview.ts → livePreviewExtensions()` when
 * `experimental.newLivePreview` is on.
 *
 * Ships two extensions today:
 *   1. `syntaxHighlighting(mdStyle)` — Lezer tag → cm-lp-* class mapping for
 *      bold, italic, strikethrough, inline code and headings 1–6.
 *   2. `inlineFormattingPlugin` — ViewPlugin that dispatches registered
 *      handlers to cover everything HighlightStyle can't (cursor-reveal
 *      marks, HR widgets, bullet replacements, links, etc.). No handlers
 *      are registered yet — handlers are added one at a time in Phases 3–10.
 *
 * Order matters: syntaxHighlighting is registered first so handlers can
 * override the tag-based styling when they need to (e.g. blockquote depths
 * 2–3 that aren't expressible as a single Lezer tag).
 */
export function newInlineExtensions(): Extension[] {
	return [syntaxHighlighting(mdStyle), inlineFormattingPlugin];
}
