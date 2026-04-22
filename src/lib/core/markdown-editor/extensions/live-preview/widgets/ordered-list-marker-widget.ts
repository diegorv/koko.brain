import { WidgetType } from '@codemirror/view';

/** Widget that replaces `1. ` with a styled number marker. */
export class OrderedListMarkerWidget extends WidgetType {
	constructor(readonly number: number) {
		super();
	}

	toDOM() {
		const span = document.createElement('span');
		span.className = 'cm-lp-ol-marker';
		span.textContent = `${this.number}.`;
		return span;
	}

	eq(other: OrderedListMarkerWidget) {
		return this.number === other.number;
	}

	ignoreEvent() {
		return true;
	}
}
