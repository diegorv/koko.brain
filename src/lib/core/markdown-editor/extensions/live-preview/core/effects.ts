import { StateEffect, StateField } from '@codemirror/state';

/** Dispatched after a tab switch to force a decoration rebuild once the viewport is stable */
export const forceDecorationRebuild = StateEffect.define<null>();

/** Dispatched to toggle fold state of a callout at a given start line number */
export const toggleCalloutFold = StateEffect.define<number>();

/**
 * StateField that tracks which callouts are currently folded, by start line number.
 * Foldable callouts with `-` start folded; `+` start expanded; `null` are not foldable.
 */
export const calloutFoldState = StateField.define<Set<number>>({
	create: () => new Set(),
	update(value, tr) {
		let updated = value;

		// Remap line numbers when the document changes so fold state stays accurate
		if (tr.docChanged && updated.size > 0) {
			const remapped = new Set<number>();
			for (const lineNum of updated) {
				const line = tr.startState.doc.line(lineNum);
				const newPos = tr.changes.mapPos(line.from, 1);
				const newLineNum = tr.newDoc.lineAt(newPos).number;
				remapped.add(newLineNum);
			}
			updated = remapped;
		}

		for (const effect of tr.effects) {
			if (effect.is(toggleCalloutFold)) {
				updated = new Set(updated);
				if (updated.has(effect.value)) {
					updated.delete(effect.value);
				} else {
					updated.add(effect.value);
				}
			}
		}
		return updated;
	},
});
