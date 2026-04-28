import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import type { EditorState, Extension, Range, Line } from '@codemirror/state';
import type { SyntaxNodeRef } from '@lezer/common';
import { syntaxTree } from '@codemirror/language';
import { checkUpdateAction } from '../core/check-update-action';
import { shouldShowSource } from '../core/should-show-source';
import { isInsideBlockContext } from '../core/is-inside-block-context';
import { expandedVisibleRanges } from '../core/expanded-ranges';
import { profileStart, profileEnd } from '../core/profiling';

/**
 * Arguments passed to a node-handler's `decorate` function. `isTouched(from,
 * to)` is the cursor-reveal helper — every handler that wants to toggle a
 * `*-visible` modifier class on its mark calls it with the parent range.
 *
 * `scratch` is a per-build Map handlers can use to dedupe across multiple
 * dispatches — e.g. the blockquote handler matches `QuoteMark` (which fires
 * once per `>` on each line) and uses scratch to track which line numbers it
 * has already decorated.
 */
export interface NodeDecorateArgs {
	node: SyntaxNodeRef;
	state: EditorState;
	isTouched: (from: number, to: number) => boolean;
	decorations: Range<Decoration>[];
	scratch: Map<string, unknown>;
}

/** Handler that decorates a Lezer node by name. */
export interface NodeHandler {
	/** Lezer node name (e.g. "StrongEmphasis", "ATXHeading1", "Link") */
	nodeType: string;
	/** Pushes decorations into `args.decorations` for this single node match. */
	decorate(args: NodeDecorateArgs): void;
}

/** Arguments passed to a line-handler's `decorate` function. */
export interface LineDecorateArgs {
	line: Line;
	state: EditorState;
	isTouched: (from: number, to: number) => boolean;
	decorations: Range<Decoration>[];
	scratch: Map<string, unknown>;
}

/**
 * Handler that decorates per-line ranges via regex parsers — used for
 * markdown features that have no Lezer node (`==highlight==`, inline
 * comments `<!-- -->`, block references `^id`, wikilinks, extended autolinks).
 */
export interface LineHandler {
	/** Stable name (used in dedup keys + `LP-PROFILE` log entries). */
	name: string;
	/** Pushes decorations into `args.decorations` for this single line. */
	decorate(args: LineDecorateArgs): void;
}

/** Bundle of all handlers for one instance of the inline plugin. */
export interface InlineFormattingHandlers {
	nodeHandlers: readonly NodeHandler[];
	lineHandlers: readonly LineHandler[];
}

/**
 * Pure builder — exposed so tests can call it without mounting an EditorView.
 *
 * Walks the syntax tree once across `ranges`, dispatches to the matching
 * node handlers (deduped per-`name:from`), then walks the same ranges
 * line-by-line and dispatches to the line handlers (deduped per-line so
 * a regex parser doesn't re-process the same line twice when adjacent
 * visible ranges overlap).
 */
export function buildInlineDecorations(
	state: EditorState,
	ranges: readonly { from: number; to: number }[],
	handlers: InlineFormattingHandlers,
): DecorationSet {
	const decorations: Range<Decoration>[] = [];

	// Group node handlers by nodeType for O(1) dispatch
	const handlersByType = new Map<string, NodeHandler[]>();
	for (const h of handlers.nodeHandlers) {
		const existing = handlersByType.get(h.nodeType);
		if (existing) existing.push(h);
		else handlersByType.set(h.nodeType, [h]);
	}

	const seenNodes = new Set<string>();
	const seenLines = new Set<number>();
	const scratch = new Map<string, unknown>();
	const isTouched = (from: number, to: number) => shouldShowSource(state, from, to);

	for (const range of ranges) {
		// Node-based dispatch
		if (handlersByType.size > 0) {
			syntaxTree(state).iterate({
				from: range.from,
				to: range.to,
				enter: (node) => {
					const matched = handlersByType.get(node.name);
					if (!matched) return;
					if (isInsideBlockContext(node)) return false;
					const dedupKey = `${node.name}:${node.from}`;
					if (seenNodes.has(dedupKey)) return;
					seenNodes.add(dedupKey);
					for (const handler of matched) {
						handler.decorate({ node, state, isTouched, decorations, scratch });
					}
				},
			});
		}

		// Line-based dispatch — only walks if there's at least one line handler
		if (handlers.lineHandlers.length === 0) continue;
		const startLine = state.doc.lineAt(range.from).number;
		const endLine = state.doc.lineAt(range.to).number;
		for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
			if (seenLines.has(lineNum)) continue;
			seenLines.add(lineNum);
			const line = state.doc.line(lineNum);
			const nodeAt = syntaxTree(state).resolveInner(line.from);
			if (isInsideBlockContext(nodeAt)) continue;
			for (const handler of handlers.lineHandlers) {
				handler.decorate({ line, state, isTouched, decorations, scratch });
			}
		}
	}

	return Decoration.set(decorations, true);
}

/**
 * Factory: returns a `ViewPlugin` that runs the inline pipeline with the
 * given handlers. Tests call this with custom handler arrays; production
 * uses the aggregated set from `inline-extensions.ts`.
 *
 * Per CLAUDE.md § Performance rule 4, the update path:
 *   - returns immediately on viewport-only scroll changes
 *   - rebuilds only when `checkUpdateAction` says so (doc/cursor-line changes)
 *   - reads `lastCursorLine` so cursor moves within the same line are no-ops
 */
export function makeInlineFormattingPlugin(handlers: InlineFormattingHandlers): Extension {
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;
			lastCursorLine: number;

			constructor(view: EditorView) {
				this.decorations = buildInlineDecorations(
					view.state,
					expandedVisibleRanges(view),
					handlers,
				);
				this.lastCursorLine = view.state.doc.lineAt(view.state.selection.main.head).number;
			}

			update(update: ViewUpdate) {
				// Rule 4: viewport-only scroll never rebuilds; scrollDebouncePlugin
				// dispatches forceDecorationRebuild after scrolling settles.
				if (update.viewportChanged && !update.docChanged && !update.selectionSet) return;

				const action = checkUpdateAction(update, this.lastCursorLine);
				if (action !== 'rebuild') return;

				this.lastCursorLine = update.state.doc.lineAt(update.state.selection.main.head).number;
				const _t = profileStart();
				this.decorations = buildInlineDecorations(
					update.view.state,
					expandedVisibleRanges(update.view),
					handlers,
				);
				profileEnd('inline-formatting', _t);
			}
		},
		{ decorations: (v) => v.decorations },
	);
}
