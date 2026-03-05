import {
	Decoration,
	type DecorationSet,
	ViewPlugin,
	type ViewUpdate,
	EditorView,
} from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import type { Extension } from '@codemirror/state';
import { parseCalloutLine } from './callout.logic';

function getCalloutDecoration(color: string): Decoration {
	return Decoration.line({
		attributes: {
			class: 'cm-callout',
			style: `border-left: 3px solid ${color}; padding-left: 8px; background: color-mix(in srgb, ${color} 7%, transparent);`,
		},
	});
}

function buildDecorations(view: EditorView): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();

	for (const { from, to } of view.visibleRanges) {
		for (let pos = from; pos <= to; ) {
			const line = view.state.doc.lineAt(pos);
			const callout = parseCalloutLine(line.text);
			if (callout) {
				builder.add(line.from, line.from, getCalloutDecoration(callout.color));
			}
			pos = line.to + 1;
		}
	}

	return builder.finish();
}

const calloutDecorationPlugin = ViewPlugin.fromClass(
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

export function calloutDecoration(): Extension {
	return calloutDecorationPlugin;
}
