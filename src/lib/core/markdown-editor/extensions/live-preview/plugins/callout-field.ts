import type { EditorState } from '@codemirror/state';
import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';
import { findAllCallouts, CALLOUT_CONTENT_RE } from '../parsers/callout';
import { shouldShowSource } from '../core/should-show-source';
import { calloutFoldState, toggleCalloutFold } from '../core/effects';
import { hiddenLineDeco } from '../styles';
import { buildBlockField } from '../core/build-block-field';

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
 * ViewPlugin that manages callout decorations. Uses Lezer syntax tree
 * (`Blockquote`) for robust block detection. Hides `> [!type]` markers,
 * applies colored left-border styling, marks titles, and renders a fold
 * chevron on every callout. Shows raw text when cursor is inside.
 *
 * `toggleCalloutFold` is listed as an extra rebuild trigger so clicking the
 * chevron flips the fold state without needing a doc or selection change.
 */
export const calloutField = buildBlockField({
	name: 'callout',
	compute: computeCallouts,
	rebuildOnEffects: [toggleCalloutFold],
});
