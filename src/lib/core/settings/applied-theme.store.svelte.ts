/** Whether the theme last applied to the document is dark. Starts dark because the default theme is. */
let isDark = $state(true);

/**
 * Reactive mode of the applied theme. `theme.service.ts` writes it each time it
 * applies theme variables; it is the one source for code that must pick dark or
 * light colors itself (the stylesheet reads `html.dark` instead).
 */
export const appliedThemeStore = {
	/** True when the applied theme is dark (its editor background is dark or unreadable). */
	get isDark() { return isDark; },

	/** Records the mode of the theme just applied. */
	setDark(value: boolean) { isDark = value; },

	/** @internal test-only */
	_reset() { isDark = true; },
};
