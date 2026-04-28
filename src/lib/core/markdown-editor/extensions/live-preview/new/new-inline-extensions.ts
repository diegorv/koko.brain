import type { Extension } from '@codemirror/state';
import { inlineHighlightExtension } from './markdown-highlight-style';
import {
	makeInlineFormattingPlugin,
	type NodeHandler,
	type LineHandler,
} from './inline-formatting-plugin';
import { highlightHandler } from './handlers/highlight-handler';

/**
 * Production node handlers, registered in the order Phases 3–10 retire their
 * legacy plugin counterparts.
 */
export const PRODUCTION_NODE_HANDLERS: readonly NodeHandler[] = [
	highlightHandler,
];

/**
 * Production line handlers (regex-based parsers for markdown features without
 * a Lezer node — inline comments, block refs, wikilinks, extended autolinks).
 * Currently empty — populated by Phases 6, 7, 9.
 */
export const PRODUCTION_LINE_HANDLERS: readonly LineHandler[] = [];

/**
 * Returns the full extension array for the new inline pipeline:
 * `HighlightStyle` (tag-based marks/styles) + `inlineFormattingPlugin`
 * (everything that needs cursor reveal, regex parsing, or block-context
 * suppression).
 */
export function newInlineExtensions(): Extension[] {
	return [
		inlineHighlightExtension(),
		makeInlineFormattingPlugin({
			nodeHandlers: PRODUCTION_NODE_HANDLERS,
			lineHandlers: PRODUCTION_LINE_HANDLERS,
		}),
	];
}
