import { HighlightStyle } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

/**
 * HighlightStyle that emits the same `cm-lp-*` CSS classes as the legacy
 * markdown-style + heading plugins, but driven by Lezer syntax tags instead
 * of per-plugin syntaxTree.iterate() calls.
 *
 * Contract (see tasks/notes/css-classes-inventory.md):
 *   - Tag `t.strong`        → class `cm-lp-bold`          (StrongEmphasis node)
 *   - Tag `t.emphasis`      → class `cm-lp-italic`        (Emphasis node)
 *   - Tag `t.strikethrough` → class `cm-lp-strikethrough` (Strikethrough node)
 *   - Tag `t.monospace`     → class `cm-lp-code`          (InlineCode node)
 *   - Tag `t.heading1..6`   → class `cm-lp-h1..6`         (ATXHeading1..6 nodes)
 *
 * Intentionally omitted at this scaffolding stage — these cases need custom
 * logic in `inline-formatting-plugin.ts` and live in later phases:
 *   - `t.link` (link text + brackets need cursor-reveal; see linkPlugin, Phase 9)
 *   - `t.quote` (blockquote depth > 1 needs Decoration.line; see Phase 5)
 *   - `==highlight==` (no Lezer node; parser-custom — handled in
 *     inline-formatting-plugin as a handler registration)
 *   - Cursor-reveal marks `**`, `*`, `~~`, `` ` ``, `==` (state-dependent; they
 *     stay in the handler registry because HighlightStyle can't read selection).
 *
 * Visual styling for every emitted class lives in `../styles.ts ›
 * livePreviewStyles` and is unchanged — HighlightStyle only assigns the class.
 */
export const mdStyle = HighlightStyle.define([
	{ tag: t.strong, class: 'cm-lp-bold' },
	{ tag: t.emphasis, class: 'cm-lp-italic' },
	{ tag: t.strikethrough, class: 'cm-lp-strikethrough' },
	{ tag: t.monospace, class: 'cm-lp-code' },
	{ tag: t.heading1, class: 'cm-lp-h1' },
	{ tag: t.heading2, class: 'cm-lp-h2' },
	{ tag: t.heading3, class: 'cm-lp-h3' },
	{ tag: t.heading4, class: 'cm-lp-h4' },
	{ tag: t.heading5, class: 'cm-lp-h5' },
	{ tag: t.heading6, class: 'cm-lp-h6' },
]);
