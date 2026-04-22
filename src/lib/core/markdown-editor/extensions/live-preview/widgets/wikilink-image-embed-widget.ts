import { WidgetType } from '@codemirror/view';

import { isSafeUrl } from '$lib/utils/sanitize-url';

/** Widget that renders a wikilink image embed (`![[image.png]]`, `![[image.png|300]]`). */
export class WikilinkImageEmbedWidget extends WidgetType {
	constructor(
		readonly target: string,
		readonly width: number | null,
	) {
		super();
	}

	toDOM() {
		const wrapper = document.createElement('div');
		wrapper.className = 'cm-lp-image-wrapper';
		const img = document.createElement('img');
		if (isSafeUrl(this.target)) {
			img.src = this.target;
		}
		img.alt = this.target;
		img.className = 'cm-lp-image';
		if (this.width !== null) {
			img.style.maxWidth = `${this.width}px`;
		}
		wrapper.appendChild(img);
		return wrapper;
	}

	eq(other: WikilinkImageEmbedWidget) {
		return this.target === other.target && this.width === other.width;
	}

	ignoreEvent() {
		return true;
	}
}
