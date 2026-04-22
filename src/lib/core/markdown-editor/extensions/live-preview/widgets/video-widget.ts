import { WidgetType } from '@codemirror/view';

import { isSafeUrl } from '$lib/utils/sanitize-url';

/** Widget that renders an inline `<video controls>` player from a URL. */
export class VideoWidget extends WidgetType {
	constructor(readonly src: string) {
		super();
	}

	toDOM() {
		const wrapper = document.createElement('div');
		wrapper.className = 'cm-lp-video-wrapper';
		const video = document.createElement('video');
		if (isSafeUrl(this.src)) {
			video.src = this.src;
		}
		video.controls = true;
		video.className = 'cm-lp-video';
		wrapper.appendChild(video);
		return wrapper;
	}

	eq(other: VideoWidget) {
		return this.src === other.src;
	}

	ignoreEvent() {
		return true;
	}
}
