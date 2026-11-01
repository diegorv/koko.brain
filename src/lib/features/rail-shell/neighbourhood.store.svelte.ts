/**
 * The note the rail shell's Neighbourhood lens shows. Session-only: the PRD
 * persists no neighbourhood, so after a restart the `neighbourhood` rail item
 * falls back to Today (`restoreRailItem`). Cleared at vault teardown.
 */

/** Absolute path of the note whose neighbourhood the note list shows, or null */
let notePath = $state<string | null>(null);

export const neighbourhoodStore = {
	/** Absolute path of the note whose neighbourhood the note list shows, or null */
	get notePath() {
		return notePath;
	},

	/** Sets the note whose neighbourhood the note list shows. */
	setNotePath(path: string) {
		notePath = path;
	},

	/** Clears the note. */
	reset() {
		notePath = null;
	},
};
