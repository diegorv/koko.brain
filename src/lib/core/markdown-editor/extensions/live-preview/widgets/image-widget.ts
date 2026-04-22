import { WidgetType } from '@codemirror/view';

import { isSafeUrl } from '$lib/utils/sanitize-url';

/** Widget that renders an inline `![alt](url)` markdown image. */
export class ImageWidget extends WidgetType {
	constructor(
		readonly url: string,
		readonly alt: string,
		readonly width?: number,
		readonly height?: number,
	) {
		super();
	}

	toDOM() {
		const wrapper = document.createElement('div');
		wrapper.className = 'cm-lp-image-wrapper';
		const img = document.createElement('img');
		if (isSafeUrl(this.url)) {
			img.src = this.url;
		}
		img.alt = this.alt;
		img.className = 'cm-lp-image';
		if (this.width) {
			img.style.maxWidth = `${this.width}px`;
		}
		if (this.height) {
			img.style.height = `${this.height}px`;
		}
		wrapper.appendChild(img);
		return wrapper;
	}

	eq(other: ImageWidget) {
		return this.url === other.url && this.alt === other.alt
			&& this.width === other.width && this.height === other.height;
	}

	ignoreEvent() {
		return true;
	}
}
