/** Zoom factor last applied to the webview (1 is 100%). */
let level = $state(1);

/** Whether the zoom chip is shown; `zoom.service.ts` hides it after a delay. */
let chipVisible = $state(false);

/**
 * Reactive zoom state for the zoom chip. `zoom.service.ts` writes it after the
 * webview accepts a new factor; components only read it.
 */
export const zoomStore = {
	/** Zoom factor last applied to the webview (1 is 100%). */
	get level() { return level; },

	/** True while the zoom chip is shown. */
	get chipVisible() { return chipVisible; },

	/** Records the factor just applied. */
	setLevel(value: number) { level = value; },

	/** Shows the zoom chip. */
	showChip() { chipVisible = true; },

	/** Hides the zoom chip. */
	hideChip() { chipVisible = false; },

	/** @internal test-only */
	_reset() {
		level = 1;
		chipVisible = false;
	},
};
