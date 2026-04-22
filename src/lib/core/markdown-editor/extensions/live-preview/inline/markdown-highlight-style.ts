import { HighlightStyle } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

/**
 * HighlightStyle that emits `cm-lp-*` CSS classes driven by Lezer syntax tags
 * instead of per-plugin syntaxTree.iterate() calls.
 *
 * Contract (see tasks/notes/css-classes-inventory.md for the complete
 * inventory of classes emitted by the inline pipeline):
 *   - Tag `t.strong`            → class `cm-lp-bold`          (StrongEmphasis)
 *   - Tag `t.emphasis`          → class `cm-lp-italic`        (Emphasis)
 *   - Tag `t.strikethrough`     → class `cm-lp-strikethrough` (Strikethrough)
 *   - Tag `t.monospace`         → class `cm-lp-code`          (InlineCode)
 *   - Tag `t.special(t.content)` → class `cm-lp-highlight`    (Highlight from
 *     the custom HighlightExtension)
 *
 * Intentionally NOT in HighlightStyle — these need logic HighlightStyle can't
 * express and live in the handler registry instead:
 *   - Headings (`cm-lp-h1..6`): need `Decoration.line` on the whole `.cm-line`
 *     for line-level font-size / line-height. HighlightStyle emits tag classes
 *     on content spans, not lines. See `handlers/heading-handler.ts`.
 *   - Link brackets, blockquote depth > 1, cursor-reveal marks, widgets
 *     (`Decoration.replace`): see the handlers under `handlers/`.
 *
 * Visual styling for every emitted class lives in `../styles.ts ›
 * livePreviewStyles`; HighlightStyle only assigns the class.
 */
export const mdStyle = HighlightStyle.define([
	{ tag: t.strong, class: 'cm-lp-bold' },
	{ tag: t.emphasis, class: 'cm-lp-italic' },
	{ tag: t.strikethrough, class: 'cm-lp-strikethrough' },
	{ tag: t.monospace, class: 'cm-lp-code' },
	{ tag: t.special(t.content), class: 'cm-lp-highlight' },
]);
