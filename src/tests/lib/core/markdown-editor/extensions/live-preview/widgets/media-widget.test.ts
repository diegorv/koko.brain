// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { MediaWidget } from '$lib/core/markdown-editor/extensions/live-preview/widgets';

describe('MediaWidget', () => {
	it('renders an audio player with the derived cm-lp-audio classes', () => {
		const dom = new MediaWidget('audio', 'clip.mp3').toDOM();
		expect(dom.outerHTML).toBe(
			'<div class="cm-lp-audio-wrapper"><audio src="clip.mp3" controls="" class="cm-lp-audio"></audio></div>',
		);
	});

	it('renders a video player with the derived cm-lp-video classes', () => {
		const dom = new MediaWidget('video', 'clip.mp4').toDOM();
		expect(dom.outerHTML).toBe(
			'<div class="cm-lp-video-wrapper"><video src="clip.mp4" controls="" class="cm-lp-video"></video></div>',
		);
	});

	it('leaves src blank for unsafe URLs', () => {
		expect(new MediaWidget('audio', 'javascript:alert(1)').toDOM().outerHTML).toBe(
			'<div class="cm-lp-audio-wrapper"><audio controls="" class="cm-lp-audio"></audio></div>',
		);
		expect(new MediaWidget('video', 'javascript:alert(1)').toDOM().outerHTML).toBe(
			'<div class="cm-lp-video-wrapper"><video controls="" class="cm-lp-video"></video></div>',
		);
	});

	it('eq() returns true for the same tag and src', () => {
		expect(new MediaWidget('audio', 'a.mp3').eq(new MediaWidget('audio', 'a.mp3'))).toBe(true);
		expect(new MediaWidget('video', 'a.mp4').eq(new MediaWidget('video', 'a.mp4'))).toBe(true);
	});

	it('eq() returns false on src mismatch', () => {
		expect(new MediaWidget('audio', 'a.mp3').eq(new MediaWidget('audio', 'b.mp3'))).toBe(false);
		expect(new MediaWidget('video', 'a.mp4').eq(new MediaWidget('video', 'b.mp4'))).toBe(false);
	});

	it('eq() returns false on tag mismatch with an identical src', () => {
		// One class now serves both players, so the tag is the only thing left
		// keeping an audio widget from being reused as a video one.
		expect(new MediaWidget('audio', 'same.src').eq(new MediaWidget('video', 'same.src'))).toBe(
			false,
		);
	});

	it('ignoreEvent() is true so the player handles its own clicks', () => {
		expect(new MediaWidget('audio', 'a.mp3').ignoreEvent()).toBe(true);
		expect(new MediaWidget('video', 'a.mp4').ignoreEvent()).toBe(true);
	});
});
