import { StateEffect, StateField } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

/** Effect to set the mouse-selecting state (true = dragging, false = released) */
export const setMouseSelecting = StateEffect.define<boolean>();

/** Tracks whether the user is currently mouse-dragging a selection */
export const mouseSelectingField = StateField.define<boolean>({
	create: () => false,
	update(value, tr) {
		for (const e of tr.effects) {
			if (e.is(setMouseSelecting)) return e.value;
		}
		return value;
	},
});

/** DOM event handlers that dispatch mouse-selecting state changes */
export const mouseSelectingHandlers = EditorView.domEventHandlers({
	mousedown: (_e, view) => {
		view.dispatch({ effects: setMouseSelecting.of(true) });
		return false;
	},
	mouseup: (_e, view) => {
		view.dispatch({ effects: setMouseSelecting.of(false) });
		return false;
	},
});
