import type { Theme } from './theme.types';
import { settingsStore } from './settings.store.svelte';
import { findThemeByName, themeColorsToCssVars } from './theme.logic';

/**
 * Applies a theme by setting all its color tokens as CSS custom properties
 * on the document root element.
 */
export function applyTheme(theme: Theme): void {
	const el = document.documentElement;
	const vars = themeColorsToCssVars(theme.colors);

	for (const [name, value] of Object.entries(vars)) {
		el.style.setProperty(name, value);
	}
}

/**
 * Reads the active theme from the settings store and applies it.
 * Falls back to the built-in default if the active theme is not found.
 */
export function applyActiveTheme(): void {
	const { activeTheme, themes } = settingsStore.appearance;
	const theme = findThemeByName(themes, activeTheme);
	applyTheme(theme);
}

/**
 * Removes all inline theme overrides from the document root,
 * allowing CSS `.dark` fallback values to take effect.
 */
export function removeThemeOverrides(theme: Theme): void {
	const el = document.documentElement;
	const vars = themeColorsToCssVars(theme.colors);

	for (const name of Object.keys(vars)) {
		el.style.removeProperty(name);
	}
}
