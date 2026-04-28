import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import type { Extension } from '@codemirror/state';

/**
 * Tag-based style entries that the unified live-preview pipeline applies via
 * `syntaxHighlighting`. The `class:` keys preserve the legacy CSS class names
 * (cm-lp-bold, cm-lp-italic, etc.) so themes keep working unchanged.
 *
 * Tag-based styling covers the marks/styles that have a Lezer node and don't
 * need cursor-aware reveal: bold, italic, strikethrough, monospace.
 * Anything that needs cursor reveal, regex parsing, or block-context
 * suppression lives in `inline-formatting-plugin.ts` instead.
 */
export const markdownInlineHighlight = HighlightStyle.define([
	{ tag: tags.strong, class: 'cm-lp-bold' },
	{ tag: tags.emphasis, class: 'cm-lp-italic' },
	{ tag: tags.strikethrough, class: 'cm-lp-strikethrough' },
	{ tag: tags.monospace, class: 'cm-lp-code' },
]);

/**
 * Returns the live-preview HighlightStyle wrapped in a `syntaxHighlighting`
 * extension, ready to be appended to the live-preview extension array.
 */
export function inlineHighlightExtension(): Extension {
	return syntaxHighlighting(markdownInlineHighlight);
}
