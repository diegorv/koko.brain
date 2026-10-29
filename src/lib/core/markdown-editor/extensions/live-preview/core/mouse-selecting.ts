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

/** Clears the drag flag; dispatches only while it is set, so one drag releases once. */
function releaseMouseSelecting(view: EditorView): void {
	if (view.state.field(mouseSelectingField, false)) {
		view.dispatch({ effects: setMouseSelecting.of(false) });
	}
}

/**
 * DOM event handlers that dispatch mouse-selecting state changes. A release
 * outside the content DOM (gutter, another pane, outside the window) never
 * reaches the content `mouseup`, so mousedown also arms a one-shot `mouseup`
 * listener on the owner document. The content handler stays because an
 * ancestor between the content DOM and the document (`view.dom`, a Svelte
 * wrapper) may stop the event before it reaches the document.
 *
 * A native drag of selected text ends in `drop` / `dragend`, never `mouseup`,
 * so `dragstart` releases too. It is the one drag event sure to reach the
 * content DOM: `dragend` targets the source text, which a same-editor move
 * has already deleted, and `drop` fires in another pane when the text lands
 * there. Releasing before the drop also lets the drop's edit rebuild with the
 * cursor's line revealed.
 */
export const mouseSelectingHandlers = EditorView.domEventHandlers({
	mousedown: (_e, view) => {
		view.dispatch({ effects: setMouseSelecting.of(true) });
		view.dom.ownerDocument.addEventListener('mouseup', () => releaseMouseSelecting(view), {
			once: true,
		});
		return false;
	},
	mouseup: (_e, view) => {
		releaseMouseSelecting(view);
		return false;
	},
	dragstart: (_e, view) => {
		releaseMouseSelecting(view);
		return false;
	},
});
