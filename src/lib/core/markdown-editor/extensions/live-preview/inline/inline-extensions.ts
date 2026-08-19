import type { Extension } from '@codemirror/state';
import { inlineHighlightExtension } from './markdown-highlight-style';
import {
	makeInlineFormattingPlugin,
	type InlineFormattingHandlers,
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
import type { InlineHandlerName } from '../core/decorator-names';

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
 * Troubleshooting kill-switch table — toggleable decorator name → the
 * handlers disabled with it. Keyed by `INLINE_HANDLER_NAMES` from
 * `core/decorator-names.ts`, so the table and the switches in Troubleshooting
 * cannot drift apart. Keeps the legacy per-plugin toggle scope (e.g. `link`
 * covered markdown links, autolinks and wikilinks). Handlers absent from the
 * table (inline comments, block references) are always on, as in the legacy
 * pipeline.
 */
const TOGGLEABLE_HANDLERS: Record<InlineHandlerName, readonly (NodeHandler | LineHandler)[]> = {
	heading: headingHandlers,
	blockquote: [blockquoteHandler],
	simpleWidget: simpleWidgetHandlers,
	link: [linkHandler, linkReferenceHandler, autolinkHandler, extendedAutolinkHandler, wikilinkHandler],
	inlineMarks: [...markHandlers, escapeHandler],
	markdownStyle: [highlightHandler],
};

/**
 * Applies the Troubleshooting `disabledDecorators` kill-switches to the
 * production registries. Exposed so tests can assert the filtering without
 * mounting an EditorView.
 */
export function productionHandlers(
	disabledDecorators: Record<string, boolean> = {},
): InlineFormattingHandlers {
	const disabled = new Set(
		Object.entries(TOGGLEABLE_HANDLERS)
			.filter(([name]) => disabledDecorators[name])
			.flatMap(([, handlers]) => handlers),
	);
	return {
		nodeHandlers: PRODUCTION_NODE_HANDLERS.filter((h) => !disabled.has(h)),
		lineHandlers: PRODUCTION_LINE_HANDLERS.filter((h) => !disabled.has(h)),
	};
}

/**
 * Returns the full extension array for the inline pipeline:
 * `HighlightStyle` (tag-based marks/styles) + `inlineFormattingPlugin`
 * (everything that needs cursor reveal, regex parsing, or block-context
 * suppression). `disabledDecorators` (Troubleshooting settings) filters
 * out the handlers of any disabled name; `markdownStyle` additionally
 * drops the `HighlightStyle` wrapper, mirroring the legacy
 * `markdownStylePlugin` scope (bold/italic/strikethrough/monospace).
 */
export function inlineExtensions(disabledDecorators: Record<string, boolean> = {}): Extension[] {
	const exts: Extension[] = [];
	if (!disabledDecorators.markdownStyle) exts.push(inlineHighlightExtension());
	exts.push(makeInlineFormattingPlugin(productionHandlers(disabledDecorators)));
	return exts;
}
