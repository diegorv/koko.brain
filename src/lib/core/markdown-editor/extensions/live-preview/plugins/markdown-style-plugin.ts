import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import type { EditorState, Range } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { boldTextDeco, italicTextDeco, strikethroughTextDeco, inlineCodeTextDeco, highlightTextDeco } from '../styles';
import { isInsideBlockContext } from '../core/is-inside-block-context';
import { findHighlightRanges } from '../parsers/highlight';
import { forceDecorationRebuild } from '../core/effects';
import { expandedVisibleRanges } from '../core/expanded-ranges';
import { appendLog } from '$lib/utils/log.service';

/**
 * ViewPlugin that applies semantic CSS classes to inline content ranges:
 * `cm-lp-bold` on `StrongEmphasis`, `cm-lp-italic` on `Emphasis`, etc.
 *
 * Key property: Only rebuilds on `docChanged` or `viewportChanged` — NOT on
 * `selectionSet`. Styling doesn't depend on cursor position. More efficient than
 * the old approach where ALL decorations rebuilt on every cursor move.
 *
 * This is the visual formatting — bold weight, italic style, strikethrough line,
 * code background, highlight background.
 */
export const markdownStylePlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = buildContentStylesForRanges(view.state, expandedVisibleRanges(view));
		}

		update(update: ViewUpdate) {
			// Rebuild on doc/viewport changes, tab switches (forceDecorationRebuild), or reconfigured
			// — but NOT on selectionSet alone (styling doesn't depend on cursor position)
			if (
				update.docChanged ||
				update.viewportChanged ||
				update.transactions.some((t) => t.reconfigured) ||
				update.transactions.some((t) => t.effects.some((e) => e.is(forceDecorationRebuild)))
			) {
				const _t = performance.now();
				this.decorations = buildContentStylesForRanges(
					update.view.state,
					expandedVisibleRanges(update.view),
				);
				const _d = performance.now() - _t; if (_d > 0.5) appendLog('LP-PROFILE', `markdown-style: ${_d.toFixed(1)}ms`);
			}
		}
	},
	{ decorations: (v) => v.decorations },
);

/** Builds content styling decorations for the given ranges */
export function buildContentStylesForRanges(
	state: EditorState,
	ranges: readonly { from: number; to: number }[],
): DecorationSet {
	const decorations: Range<Decoration>[] = [];

	for (const { from, to } of ranges) {
		addLezerContentStyles(state, from, to, decorations);
		addHighlightContentStyles(state, from, to, decorations);
	}

	return Decoration.set(decorations, true);
}

/** Adds content styling for Lezer-based inline formatting (bold, italic, strikethrough, code) */
function addLezerContentStyles(
	state: EditorState,
	from: number,
	to: number,
	decorations: Range<Decoration>[],
): void {
	syntaxTree(state).iterate({
		from,
		to,
		enter: (node) => {
			if (isInsideBlockContext(node)) return false;

			if (node.name === 'StrongEmphasis') {
				decorations.push(boldTextDeco.range(node.from, node.to));
			} else if (node.name === 'Emphasis') {
				decorations.push(italicTextDeco.range(node.from, node.to));
			} else if (node.name === 'Strikethrough') {
				decorations.push(strikethroughTextDeco.range(node.from, node.to));
			} else if (node.name === 'InlineCode') {
				decorations.push(inlineCodeTextDeco.range(node.from, node.to));
			}
		},
	});
}

/** Adds content styling for highlight (`==text==`) which has no Lezer node */
function addHighlightContentStyles(
	state: EditorState,
	from: number,
	to: number,
	decorations: Range<Decoration>[],
): void {
	const startLine = state.doc.lineAt(from).number;
	const endLine = state.doc.lineAt(to).number;

	for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
		const line = state.doc.line(lineNum);

		const nodeAt = syntaxTree(state).resolveInner(line.from);
		if (isInsideBlockContext(nodeAt)) continue;

		const ranges = findHighlightRanges(state, line.from, line.to);
		for (const range of ranges) {
			decorations.push(highlightTextDeco.range(range.openMarkFrom, range.closeMarkTo));
		}
	}
}
