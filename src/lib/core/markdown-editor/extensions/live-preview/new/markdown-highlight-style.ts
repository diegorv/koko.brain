import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import type { Extension } from '@codemirror/state';

/**
 * Tag-based style entries that the unified live-preview pipeline applies via
 * `syntaxHighlighting`. Phase 2 starts empty; Phases 3–10 populate this with
 * `class:` keys preserving the legacy CSS class names (cm-lp-bold,
 * cm-lp-italic, etc.) so themes keep working unchanged.
 *
 * Tag-based styling covers the marks/styles that have a Lezer node and don't
 * need cursor-aware reveal: bold, italic, strikethrough, monospace, …
 * Anything that needs cursor reveal or has no Lezer node lives in
 * `inline-formatting-plugin.ts` instead.
 */
export const markdownInlineHighlight = HighlightStyle.define([]);

/**
 * Returns the live-preview HighlightStyle wrapped in a `syntaxHighlighting`
 * extension, ready to be appended to the live-preview extension array.
 */
export function inlineHighlightExtension(): Extension {
	return syntaxHighlighting(markdownInlineHighlight);
}
