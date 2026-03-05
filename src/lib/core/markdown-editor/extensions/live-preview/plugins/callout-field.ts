import { RangeSetBuilder } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view';
import { findAllCallouts, CALLOUT_CONTENT_RE } from '../parsers/callout';
import { checkUpdateAction } from '../core/check-update-action';
import { shouldShowSource } from '../core/should-show-source';
import { calloutFoldState, toggleCalloutFold } from '../core/effects';
import { hiddenLineDeco } from '../styles';

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

		// Determine fold state
		const isFoldable = header.foldable !== null;
		let isCollapsed = false;
		if (isFoldable) {
			if (foldedLines.has(callout.startLine)) {
				// User toggled — inverted from default
				isCollapsed = header.foldable === '+'; // default expanded, toggled = collapsed
			} else {
				// Default state
				isCollapsed = header.foldable === '-';
			}
		}

		const markerCls = isTouched
			? 'cm-formatting-block cm-formatting-block-visible'
			: 'cm-formatting-block';

		// Header line: line deco + mark on marker + optional fold chevron + optional title mark
		const headerLine = state.doc.line(callout.startLine);
		builder.add(headerLine.from, headerLine.from, lineDeco);
		builder.add(header.markerFrom, header.markerTo, Decoration.mark({ class: markerCls }));

		// Add fold chevron widget after the marker (before title) — only when not editing
		if (isFoldable && !isTouched) {
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
		constructor(view: EditorView) {
			this.decorations = computeCallouts(view.state);
		}
		update(update: ViewUpdate) {
			if (checkUpdateAction(update) === 'rebuild') {
				this.decorations = computeCallouts(update.state);
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
