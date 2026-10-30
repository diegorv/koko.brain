import {
	Decoration,
	type DecorationSet,
	ViewPlugin,
	type ViewUpdate,
	EditorView,
} from '@codemirror/view';
import type { Extension, Range } from '@codemirror/state';
import { findWikilinkRanges } from './decoration.logic';

const bracketDeco = Decoration.mark({ class: 'cm-wikilink-bracket' });
const targetDeco = Decoration.mark({ class: 'cm-wikilink-target' });
const headingDeco = Decoration.mark({ class: 'cm-wikilink-heading' });
const blockIdDeco = Decoration.mark({ class: 'cm-wikilink-block-id' });
const displayDeco = Decoration.mark({ class: 'cm-wikilink-display' });

function buildDecorations(view: EditorView): DecorationSet {
	const decorations: Range<Decoration>[] = [];

	for (const { from, to } of view.visibleRanges) {
		const text = view.state.doc.sliceString(from, to);
		const ranges = findWikilinkRanges(text, from);

		for (const range of ranges) {
			decorations.push(bracketDeco.range(range.openBracketFrom, range.openBracketTo));
			decorations.push(bracketDeco.range(range.closeBracketFrom, range.closeBracketTo));
			// `[[#heading]]` has an empty target; an empty mark renders nothing
			// and `Decoration.range()` rejects it.
			if (range.targetFrom < range.targetTo) {
				decorations.push(targetDeco.range(range.targetFrom, range.targetTo));
			}

			if (range.headingFrom !== null && range.headingTo !== null) {
				decorations.push(headingDeco.range(range.headingFrom, range.headingTo));
			}
			if (range.blockIdFrom !== null && range.blockIdTo !== null) {
				decorations.push(blockIdDeco.range(range.blockIdFrom, range.blockIdTo));
			}
			if (range.displayFrom !== null && range.displayTo !== null) {
				decorations.push(displayDeco.range(range.displayFrom, range.displayTo));
			}
		}
	}

	return Decoration.set(decorations, true);
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
