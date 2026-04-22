import {
	Decoration,
	type DecorationSet,
	EditorView,
	ViewPlugin,
	type ViewUpdate,
	type WidgetType,
} from '@codemirror/view';
import type { EditorState, Range } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import type { SyntaxNodeRef } from '@lezer/common';

import { checkUpdateAction } from '../core/check-update-action';
import { shouldShowSource } from '../core/should-show-source';
import { isInsideBlockContext } from '../core/is-inside-block-context';
import { expandedVisibleRanges } from '../core/expanded-ranges';
import { profileStart, profileEnd } from '../core/profiling';

/**
 * Context handed to a handler every time the unified plugin visits a Lezer node.
 * `isTouched(from, to)` is a thin wrapper over shouldShowSource so handlers
 * can query cursor-reveal over arbitrary ranges — some handlers care about the
 * node's own range (`node.from, node.to`), others care about the parent node
 * (EmphasisMark handlers reveal when cursor is inside the whole Emphasis, not
 * just on the `*`).
 */
export interface InlineHandlerContext {
	state: EditorState;
	node: SyntaxNodeRef;
	/** Returns true if any selection range intersects [from, to] (or rawMode is on). */
	isTouched: (from: number, to: number) => boolean;
}

/**
 * Return value of a handler. Each entry maps a document range to a decoration.
 * Handlers may return zero, one, or many entries. `null` / `undefined` is a
 * shorthand for "no decoration" to keep common handlers compact.
 */
export interface InlineDecorationEntry {
	from: number;
	to: number;
	deco: Decoration;
}

export type InlineHandlerResult =
	| InlineDecorationEntry
	| InlineDecorationEntry[]
	| null
	| undefined;

/**
 * Registers a handler for one Lezer node name. The unified plugin iterates
 * the syntax tree exactly once per rebuild and routes each visited node to
 * the matching handler.
 */
export interface InlineHandler {
	/** Lezer node name, e.g. `'EmphasisMark'`, `'CodeMark'`, `'HeaderMark'`. */
	nodeType: string;
	/** Called for every matching node. Returns decorations to add, or null. */
	decorate(ctx: InlineHandlerContext): InlineHandlerResult;
}

/**
 * Context for line-based handlers. Used when a decoration depends on a regex
 * scan of the line text (e.g. `%%inline comments%%` or `==highlight==` before
 * the Lezer HighlightExtension landed) rather than a Lezer node.
 */
export interface InlineLineHandlerContext {
	state: EditorState;
	line: { from: number; to: number; number: number };
	isTouched: (from: number, to: number) => boolean;
}

export interface InlineLineHandler {
	decorate(ctx: InlineLineHandlerContext): InlineHandlerResult;
}

/** Module-level registries. Handlers are pushed at import time. */
const handlers: InlineHandler[] = [];
const handlersByNode: Map<string, InlineHandler[]> = new Map();
const lineHandlers: InlineLineHandler[] = [];

/**
 * Registers a handler. Callers should invoke this at module load time — the
 * plugin reads from the registry every rebuild.
 */
export function registerInlineHandler(handler: InlineHandler): void {
	handlers.push(handler);
	let arr = handlersByNode.get(handler.nodeType);
	if (!arr) {
		arr = [];
		handlersByNode.set(handler.nodeType, arr);
	}
	arr.push(handler);
}

/**
 * Registers a line-based handler — called once per visible line that is not
 * inside a block context. Use for decorations whose input is a regex over the
 * line text rather than a Lezer node.
 */
export function registerLineHandler(handler: InlineLineHandler): void {
	lineHandlers.push(handler);
}

/**
 * @internal Used only by tests. Returns a snapshot of registered handlers.
 */
export function _inlineHandlersSnapshot(): readonly InlineHandler[] {
	return handlers.slice();
}

/**
 * @internal Used only by tests. Clears every registered handler and the
 * per-node routing map. Real usage has handlers registered at import time
 * and never unregistered.
 */
export function _clearInlineHandlers(): void {
	handlers.length = 0;
	handlersByNode.clear();
	lineHandlers.length = 0;
}

/**
 * Wraps a widget type into a replace decoration entry. Convenience for
 * handlers that want `Decoration.replace({ widget })`.
 */
export function replaceWithWidget(
	from: number,
	to: number,
	widget: WidgetType,
	options: { block?: boolean } = {},
): InlineDecorationEntry {
	return { from, to, deco: Decoration.replace({ widget, block: options.block }) };
}

/**
 * Unified inline ViewPlugin.
 *
 * Iterates the syntax tree once per rebuild, dispatches each node to every
 * registered handler keyed on node name, and collects their decorations.
 * Skips nodes inside block contexts (fenced code, frontmatter, etc.) the
 * same way every legacy plugin does.
 *
 * Rebuild triggers follow checkUpdateAction with lastCursorLine — identical
 * optimization as inline-marks-plugin. During Phase 2 (no handlers) the
 * rebuild path returns an empty DecorationSet and costs O(visibleChars).
 */
export const inlineFormattingPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;
		lastCursorLine: number;

		constructor(view: EditorView) {
			this.decorations = buildInlineDecorations(
				view.state,
				expandedVisibleRanges(view),
			);
			this.lastCursorLine = view.state.doc.lineAt(view.state.selection.main.head).number;
		}

		update(update: ViewUpdate) {
			const action = checkUpdateAction(update, this.lastCursorLine);
			if (action === 'rebuild') {
				this.lastCursorLine = update.state.doc.lineAt(update.state.selection.main.head).number;
				const _t = profileStart();
				this.decorations = buildInlineDecorations(
					update.view.state,
					expandedVisibleRanges(update.view),
				);
				profileEnd('inline-formatting', _t);
			}
		}
	},
	{ decorations: (v) => v.decorations },
);

/**
 * Builds the decoration set for the given ranges by walking the syntax tree
 * once and calling every matching handler. Exported so tests can invoke the
 * core routing logic without spinning up a ViewPlugin.
 */
export function buildInlineDecorations(
	state: EditorState,
	ranges: readonly { from: number; to: number }[],
): DecorationSet {
	const collected: Range<Decoration>[] = [];

	const isTouched = (from: number, to: number) => shouldShowSource(state, from, to);

	const pushResult = (result: InlineHandlerResult) => {
		if (result == null) return;
		if (Array.isArray(result)) {
			for (const entry of result) collected.push(entry.deco.range(entry.from, entry.to));
		} else {
			collected.push(result.deco.range(result.from, result.to));
		}
	};

	for (const { from, to } of ranges) {
		syntaxTree(state).iterate({
			from,
			to,
			enter: (node) => {
				if (isInsideBlockContext(node)) return false;
				const matching = handlersByNode.get(node.name);
				if (!matching || matching.length === 0) return;
				const ctx: InlineHandlerContext = { state, node, isTouched };
				for (const handler of matching) pushResult(handler.decorate(ctx));
			},
		});

		if (lineHandlers.length > 0) {
			const startLine = state.doc.lineAt(from).number;
			const endLine = state.doc.lineAt(to).number;
			for (let ln = startLine; ln <= endLine; ln++) {
				const line = state.doc.line(ln);
				const nodeAt = syntaxTree(state).resolveInner(line.from);
				if (isInsideBlockContext(nodeAt)) continue;
				const ctx: InlineLineHandlerContext = {
					state,
					line: { from: line.from, to: line.to, number: line.number },
					isTouched,
				};
				for (const handler of lineHandlers) pushResult(handler.decorate(ctx));
			}
		}
	}

	return Decoration.set(collected, true);
}
