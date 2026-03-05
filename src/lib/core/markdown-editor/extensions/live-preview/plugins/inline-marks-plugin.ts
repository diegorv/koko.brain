import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import type { EditorState, Range } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { checkUpdateAction } from '../core/check-update-action';
import { shouldShowSource } from '../core/should-show-source';
import { isInsideBlockContext } from '../core/is-inside-block-context';
import { findHighlightRanges } from '../parsers/highlight';

/**
 * ViewPlugin that manages inline formatting mark visibility with CSS animations.
 *
 * Finds all formatting marks (`**`, `*`, `~~`, `` ` ``, `==`, `\`) and applies
 * `Decoration.mark({ class })` to toggle visibility. Marks are always in the DOM —
 * hidden via `max-width: 0` when cursor is away, animated to visible when cursor
 * enters the parent element range.
 *
 * Key difference from the old approach: `Decoration.replace({})` deleted marks from DOM
 * (instant, no animation). `Decoration.mark({ class: 'cm-formatting-inline' })` keeps
 * them in DOM and hides via CSS (smooth transition).
 *
 * Rebuilds on doc/viewport/selection changes (mark visibility depends on cursor position).
 */
export const inlineMarksPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = buildMarkVisibilityForRanges(view.state, view.visibleRanges);
		}

		update(update: ViewUpdate) {
			const action = checkUpdateAction(update);
			if (action === 'rebuild') {
				this.decorations = buildMarkVisibilityForRanges(
					update.view.state,
					update.view.visibleRanges,
				);
			}
			// 'skip' during drag, 'none' when nothing changed
		}
	},
	{ decorations: (v) => v.decorations },
);

/** Builds mark visibility decorations for the given ranges (visible ranges or full doc) */
export function buildMarkVisibilityForRanges(
	state: EditorState,
	ranges: readonly { from: number; to: number }[],
): DecorationSet {
	const decorations: Range<Decoration>[] = [];

	for (const { from, to } of ranges) {
		addLezerMarkDecorations(state, from, to, decorations);
		addHighlightMarkDecorations(state, from, to, decorations);
		addEscapeDecorations(state, from, to, decorations);
	}

	return Decoration.set(decorations, true);
}

/** Adds mark visibility decorations for Lezer-based inline marks (bold, italic, strikethrough, code) */
function addLezerMarkDecorations(
	state: EditorState,
	from: number,
	to: number,
	decorations: Range<Decoration>[],
): void {
	syntaxTree(state).iterate({
		from,
		to,
		enter: (node) => {
			if (
				node.name !== 'EmphasisMark' &&
				node.name !== 'CodeMark' &&
				node.name !== 'StrikethroughMark'
			) {
				return;
			}

			if (isInsideBlockContext(node)) return;

			const parent = node.node.parent;
			if (!parent) return;

			const isTouched = shouldShowSource(state, parent.from, parent.to);
			const cls = isTouched
				? 'cm-formatting-inline cm-formatting-inline-visible'
				: 'cm-formatting-inline';
			decorations.push(Decoration.mark({ class: cls }).range(node.from, node.to));
		},
	});
}

/**
 * Adds mark visibility decorations for backslash escape sequences (`\*`, `\#`, etc.).
 * Hides the `\` character when cursor is outside, shows it when cursor is inside the Escape node.
 */
function addEscapeDecorations(
	state: EditorState,
	from: number,
	to: number,
	decorations: Range<Decoration>[],
): void {
	syntaxTree(state).iterate({
		from,
		to,
		enter: (node) => {
			if (node.name !== 'Escape') return;
			if (isInsideBlockContext(node)) return;

			// Escape node covers `\` + the escaped character. Only hide the `\`.
			const backslashFrom = node.from;
			const backslashTo = node.from + 1;

			const isTouched = shouldShowSource(state, node.from, node.to);
			const cls = isTouched
				? 'cm-formatting-inline cm-formatting-inline-visible'
				: 'cm-formatting-inline';
			decorations.push(Decoration.mark({ class: cls }).range(backslashFrom, backslashTo));
		},
	});
}

/** Adds mark visibility decorations for highlight marks (`==`) which have no Lezer node */
function addHighlightMarkDecorations(
	state: EditorState,
	from: number,
	to: number,
	decorations: Range<Decoration>[],
): void {
	const startLine = state.doc.lineAt(from).number;
	const endLine = state.doc.lineAt(to).number;

	for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
		const line = state.doc.line(lineNum);

		// Check if this line is inside a block context by resolving the line start node
		const nodeAt = syntaxTree(state).resolveInner(line.from);
		if (isInsideBlockContext(nodeAt)) continue;

		const ranges = findHighlightRanges(state, line.from, line.to);
		for (const range of ranges) {
			const isTouched = shouldShowSource(state, range.openMarkFrom, range.closeMarkTo);
			const cls = isTouched
				? 'cm-formatting-inline cm-formatting-inline-visible'
				: 'cm-formatting-inline';

			// Opening mark ==
			decorations.push(Decoration.mark({ class: cls }).range(range.openMarkFrom, range.openMarkTo));
			// Closing mark ==
			decorations.push(
				Decoration.mark({ class: cls }).range(range.closeMarkFrom, range.closeMarkTo),
			);
		}
	}
}
