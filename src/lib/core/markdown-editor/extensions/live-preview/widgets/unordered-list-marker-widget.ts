import { WidgetType } from '@codemirror/view';

/** Widget that replaces `-` / `*` / `+` bullets with a styled `•` marker. */
export class UnorderedListMarkerWidget extends WidgetType {
	toDOM() {
		const span = document.createElement('span');
		span.className = 'cm-lp-ul-marker';
		span.textContent = '•';
		return span;
	}

	eq() {
		return true;
	}

	ignoreEvent() {
		return true;
	}
}
