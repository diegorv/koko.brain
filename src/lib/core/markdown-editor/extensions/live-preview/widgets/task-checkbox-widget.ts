import { EditorView, WidgetType } from '@codemirror/view';

/** Widget that renders a task list checkbox for `[ ]` / `[x]` markers. */
export class TaskCheckboxWidget extends WidgetType {
	constructor(
		readonly checked: boolean,
		readonly pos: number,
	) {
		super();
	}

	toDOM(view: EditorView) {
		const input = document.createElement('input');
		input.type = 'checkbox';
		input.checked = this.checked;
		input.className = 'cm-lp-task-checkbox';
		input.addEventListener('mousedown', (e) => {
			e.preventDefault();
			const newChar = this.checked ? ' ' : 'x';
			view.dispatch({
				changes: { from: this.pos + 1, to: this.pos + 2, insert: newChar },
			});
		});
		return input;
	}

	eq(other: TaskCheckboxWidget) {
		return this.checked === other.checked && this.pos === other.pos;
	}

	ignoreEvent() {
		return false;
	}
}
