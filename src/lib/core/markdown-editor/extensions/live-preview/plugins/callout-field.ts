import { RangeSetBuilder } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view';
import { findAllCallouts, CALLOUT_CONTENT_RE } from '../parsers/callout';
import { checkUpdateAction } from '../core/check-update-action';
import { shouldShowSource } from '../core/should-show-source';
import { calloutFoldState, toggleCalloutFold } from '../core/effects';
import { hiddenLineDeco } from '../styles';
import { profileStart, profileEnd } from '../core/profiling';

/** Widget that renders a fold chevron (▶/▼) for foldable callouts */
class CalloutFoldWidget extends WidgetType {
	constructor(
		readonly isCollapsed: boolean,
		readonly startLine: number,
	) {
		super();
	}

	toDOM(view: EditorView) {
		const span = document.createElement('span');
		span.className = 'cm-lp-callout-fold';
		span.textContent = this.isCollapsed ? '\u25B6' : '\u25BC';
		span.addEventListener('mousedown', (e) => {
			e.preventDefault();
			e.stopPropagation();
			view.dispatch({ effects: toggleCalloutFold.of(this.startLine) });
		});
		return span;
	}

	eq(other: CalloutFoldWidget) {
		return this.isCollapsed === other.isCollapsed && this.startLine === other.startLine;
	}

	ignoreEvent() {
		return false;
	}
}

/** Computes callout decorations using the Lezer syntax tree */
export function computeCallouts(state: EditorState): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();
	const callouts = findAllCallouts(state);
	const foldedLines = state.field(calloutFoldState, false) ?? new Set<number>();

	for (const callout of callouts) {
		const { header } = callout;
		const isTouched = shouldShowSource(state, callout.from, callout.to);

		const lineDeco = Decoration.line({
			class: 'cm-lp-callout',
			attributes: { style: `border-left-color: ${header.color}` },
		});

		// Fold state — every callout is toggleable from the UI, not just ones
		// whose markdown source carries `+`/`-`. Default is expanded unless the
		// source explicitly collapses via `-`; clicking the chevron toggles from
		// there and the toggle persists via `calloutFoldState` without touching
		// the markdown.
		const defaultCollapsed = header.foldable === '-';
		const isCollapsed = foldedLines.has(callout.startLine)
			? !defaultCollapsed
			: defaultCollapsed;

		const markerCls = isTouched
			? 'cm-formatting-block cm-formatting-block-visible'
			: 'cm-formatting-block';

		// Header line: line deco + mark on marker + optional fold chevron + optional title mark
		const headerLine = state.doc.line(callout.startLine);
		builder.add(headerLine.from, headerLine.from, lineDeco);
		builder.add(header.markerFrom, header.markerTo, Decoration.mark({ class: markerCls }));

		// Add fold chevron for every callout (not just those with explicit +/-
		// in source) so collapse is a UI affordance, not a syntactic one.
		// Skipped while the cursor is inside — otherwise the chevron would
		// overlap the raw markdown being edited.
		if (!isTouched) {
			builder.add(
				header.markerTo,
				header.markerTo,
				Decoration.widget({ widget: new CalloutFoldWidget(isCollapsed, callout.startLine), side: -1 }),
			);
		}

		if (header.title) {
			builder.add(
				header.titleFrom,
				header.titleTo,
				Decoration.mark({ class: 'cm-lp-callout-title' }),
			);
		}

		// Content lines: line deco + mark on `> ` prefix (or hide entirely if folded and not editing)
		for (let lineNum = callout.startLine + 1; lineNum <= callout.endLine; lineNum++) {
			const line = state.doc.line(lineNum);

			if (!isTouched && isCollapsed) {
				// Hide content lines when collapsed
				builder.add(line.from, line.from, hiddenLineDeco);
				builder.add(line.from, line.from, Decoration.line({ class: 'cm-lp-hidden-line' }));
			} else {
				builder.add(line.from, line.from, lineDeco);

				const prefixMatch = line.text.match(CALLOUT_CONTENT_RE);
				if (prefixMatch) {
					builder.add(line.from, line.from + prefixMatch[0].length, Decoration.mark({ class: markerCls }));
				}
			}
		}
	}

	return builder.finish();
}

/**
 * ViewPlugin that manages callout decorations independently.
 * Uses Lezer syntax tree (`Blockquote` nodes) for robust block boundary detection.
 * Hides `> [!type]` markers, applies colored left-border styling, and marks titles.
 * Shows raw text when cursor is inside the callout block.
 * Supports fold/collapse via `[!type]+` and `[!type]-` syntax.
 */
export const calloutField = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;
		lastCursorLine: number;
		constructor(view: EditorView) {
			this.decorations = computeCallouts(view.state);
			this.lastCursorLine = view.state.doc.lineAt(view.state.selection.main.head).number;
		}
		update(update: ViewUpdate) {
			if (update.viewportChanged && !update.docChanged && !update.selectionSet) return;
			if (checkUpdateAction(update, this.lastCursorLine) === 'rebuild') {
				this.lastCursorLine = update.state.doc.lineAt(update.state.selection.main.head).number;
				const _t = profileStart();
				this.decorations = computeCallouts(update.state);
				profileEnd('callout', _t);
			}
			// Also rebuild when fold state changes
			for (const effect of update.transactions.flatMap((t) => t.effects)) {
				if (effect.is(toggleCalloutFold)) {
					this.decorations = computeCallouts(update.state);
					break;
				}
			}
		}
	},
	{ decorations: (v) => v.decorations },
);
