import { WidgetType } from '@codemirror/view';

import { isSafeUrl } from '$lib/utils/sanitize-url';

/** Widget that renders an inline `<audio controls>` player from a URL. */
export class AudioWidget extends WidgetType {
	constructor(readonly src: string) {
		super();
	}

	toDOM() {
		const wrapper = document.createElement('div');
		wrapper.className = 'cm-lp-audio-wrapper';
		const audio = document.createElement('audio');
		if (isSafeUrl(this.src)) {
			audio.src = this.src;
		}
		audio.controls = true;
		audio.className = 'cm-lp-audio';
		wrapper.appendChild(audio);
		return wrapper;
	}

	eq(other: AudioWidget) {
		return this.src === other.src;
	}

	ignoreEvent() {
		return true;
	}
}
