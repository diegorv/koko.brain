import { untrack } from 'svelte';

/** Whether the theme last applied to the document is dark. Starts dark because the default theme is. */
let isDark = $state(true);

/** Count of theme applications, so code that paints colors itself can repaint on any switch (dark to dark included). */
let revision = $state(0);

/**
 * Reactive mode of the applied theme. `theme.service.ts` writes it each time it
 * applies theme variables; it is the one source for code that must pick dark or
 * light colors itself (the stylesheet reads `html.dark` instead).
 */
export const appliedThemeStore = {
	/** True when the applied theme is dark (its editor background is dark or unreadable). */
	get isDark() { return isDark; },

	/** Grows by one on every theme application; read it to re-run when the theme's colors change. */
	get revision() { return revision; },

	/** Records the mode of the theme just applied. */
	setDark(value: boolean) { isDark = value; },

	/**
	 * Records that a theme was just applied. Reads `revision` untracked, so an
	 * `$effect` that applies a theme does not depend on what it writes and loop.
	 */
	bumpRevision() { revision = untrack(() => revision) + 1; },

	/** @internal test-only */
	_reset() {
		isDark = true;
		revision = 0;
	},
};
