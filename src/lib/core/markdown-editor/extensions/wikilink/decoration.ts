import {
	Decoration,
	type DecorationSet,
	ViewPlugin,
	type ViewUpdate,
	EditorView,
} from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import type { Extension } from '@codemirror/state';
import { findWikilinkRanges } from './decoration.logic';

const bracketDeco = Decoration.mark({ class: 'cm-wikilink-bracket' });
const targetDeco = Decoration.mark({ class: 'cm-wikilink-target' });
const headingDeco = Decoration.mark({ class: 'cm-wikilink-heading' });
const blockIdDeco = Decoration.mark({ class: 'cm-wikilink-block-id' });
const displayDeco = Decoration.mark({ class: 'cm-wikilink-display' });

function buildDecorations(view: EditorView): DecorationSet {
	const decorations: { from: number; to: number; deco: Decoration }[] = [];

	for (const { from, to } of view.visibleRanges) {
		const text = view.state.doc.sliceString(from, to);
		const ranges = findWikilinkRanges(text, from);

		for (const range of ranges) {
			decorations.push({
				from: range.openBracketFrom,
				to: range.openBracketTo,
				deco: bracketDeco,
			});
			decorations.push({
				from: range.closeBracketFrom,
				to: range.closeBracketTo,
				deco: bracketDeco,
			});
			decorations.push({ from: range.targetFrom, to: range.targetTo, deco: targetDeco });

			if (range.headingFrom !== null && range.headingTo !== null) {
				decorations.push({ from: range.headingFrom, to: range.headingTo, deco: headingDeco });
			}
			if (range.blockIdFrom !== null && range.blockIdTo !== null) {
				decorations.push({ from: range.blockIdFrom, to: range.blockIdTo, deco: blockIdDeco });
			}
			if (range.displayFrom !== null && range.displayTo !== null) {
				decorations.push({ from: range.displayFrom, to: range.displayTo, deco: displayDeco });
			}
		}
	}

	decorations.sort((a, b) => a.from - b.from || a.to - b.to);

	const builder = new RangeSetBuilder<Decoration>();
	for (const { from, to, deco } of decorations) {
		builder.add(from, to, deco);
	}
	return builder.finish();
}

const wikilinkDecorationPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;
		constructor(view: EditorView) {
			this.decorations = buildDecorations(view);
		}
		update(update: ViewUpdate) {
			if (update.docChanged || update.viewportChanged) {
				this.decorations = buildDecorations(update.view);
			}
		}
	},
	{ decorations: (v) => v.decorations },
);

const wikilinkStyles = EditorView.baseTheme({
	'.cm-wikilink-bracket': {
		color: 'var(--wikilink-bracket)',
	},
	'.cm-wikilink-target': {
		color: 'var(--wikilink-target)',
		cursor: 'pointer',
		textDecoration: 'underline',
		textDecorationColor: 'var(--wikilink-target-decoration)',
	},
	'.cm-wikilink-target span': {
		color: 'inherit !important',
	},
	'.cm-wikilink-target:hover': {
		textDecorationColor: 'var(--wikilink-target)',
	},
	'.cm-wikilink-heading': {
		color: 'var(--wikilink-heading)',
	},
	'.cm-wikilink-block-id': {
		color: 'var(--wikilink-heading)',
	},
	'.cm-wikilink-display': {
		color: 'var(--wikilink-display)',
	},
});

export function wikilinkDecoration(): Extension {
	return [wikilinkDecorationPlugin, wikilinkStyles];
}
