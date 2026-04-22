import { HighlightStyle } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

/**
 * HighlightStyle that emits `cm-lp-*` CSS classes driven by Lezer syntax tags
 * instead of per-plugin syntaxTree.iterate() calls.
 *
 * Contract (see tasks/notes/css-classes-inventory.md):
 *   - Tag `t.strong`        → class `cm-lp-bold`          (StrongEmphasis node)
 *   - Tag `t.emphasis`      → class `cm-lp-italic`        (Emphasis node)
 *   - Tag `t.strikethrough` → class `cm-lp-strikethrough` (Strikethrough node)
 *   - Tag `t.monospace`     → class `cm-lp-code`          (InlineCode node)
 *
 * Intentionally NOT in HighlightStyle — these need logic that HighlightStyle
 * can't express and live in the handler registry instead:
 *   - Headings (`cm-lp-h1..6`): need `Decoration.line` on the whole .cm-line
 *     for line-level font-size/line-height. HighlightStyle emits tag classes
 *     on content spans, not lines. See handlers/heading-handler.ts (Phase 4).
 *   - `==highlight==`: parser-custom Lezer node `Highlight`, no reusable tag.
 *     See handlers/highlight-handler.ts (Phase 3).
 *   - Link, blockquote depth > 1, cursor-reveal marks: upcoming phases.
 *
 * Visual styling for every emitted class lives in `../styles.ts ›
 * livePreviewStyles` and is unchanged — HighlightStyle only assigns the class.
 */
export const mdStyle = HighlightStyle.define([
	{ tag: t.strong, class: 'cm-lp-bold' },
	{ tag: t.emphasis, class: 'cm-lp-italic' },
	{ tag: t.strikethrough, class: 'cm-lp-strikethrough' },
	{ tag: t.monospace, class: 'cm-lp-code' },
]);
