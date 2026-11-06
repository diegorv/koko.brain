import { isDarkColor } from '#lib/utils/color.js';

import type { Theme } from './theme.types';
import { appliedThemeStore } from './applied-theme.store.svelte';
import { settingsStore } from './settings.store.svelte';
import { findThemeByName, themeColorsToCssVars } from './theme.logic';

/**
 * localStorage key holding the CSS variables of the theme last applied in the
 * main window. Secondary windows (the Quick Capture composer) have no vault and
 * no settings, but share this origin's localStorage, so they read the theme here.
 */
export const THEME_VARS_STORAGE_KEY = 'kokobrain:theme-vars';

/** Sets each CSS custom property in `vars` on the document root element. */
function setRootVars(vars: Record<string, string>): void {
	const el = document.documentElement;
	for (const [name, value] of Object.entries(vars)) {
		el.style.setProperty(name, value);
	}
}

/**
 * Makes the applied theme the single dark/light source: `html.dark` drives the
 * `dark:` utilities (`@custom-variant` in `app.css`), `color-scheme` drives the
 * native controls and scrollbars. An editor background `isDarkColor` cannot read
 * (or none at all) counts as dark, the same fallback as `mermaid-widget.ts`.
 * Also bumps `appliedThemeStore.revision` for code that paints theme colors itself.
 */
function applyMode(vars: Record<string, string>): void {
	const dark = isDarkColor(vars['--editor-bg'] ?? '') !== false;
	const el = document.documentElement;
	el.classList.toggle('dark', dark);
	el.style.colorScheme = dark ? 'dark' : 'light';
	appliedThemeStore.setDark(dark);
	appliedThemeStore.bumpRevision();
}

/**
 * Applies a theme by setting all its color tokens as CSS custom properties
 * on the document root element. Does not mirror to the secondary windows: the
 * theme editor calls this for its unsaved draft preview.
 */
export function applyTheme(theme: Theme): void {
	const vars = themeColorsToCssVars(theme.colors);
	setRootVars(vars);
	applyMode(vars);
}

/**
 * Applies the theme the main window last mirrored to localStorage. Leaves the
 * stylesheet defaults in place when nothing (or something unreadable) is stored.
 */
export function applyStoredTheme(): void {
	let parsed: unknown;
	try {
		parsed = JSON.parse(localStorage.getItem(THEME_VARS_STORAGE_KEY) ?? 'null');
	} catch {
		return;
	}
	if (!parsed || typeof parsed !== 'object') return;
	const vars: Record<string, string> = {};
	for (const [name, value] of Object.entries(parsed)) {
		if (name.startsWith('--') && typeof value === 'string') vars[name] = value;
	}
	setRootVars(vars);
	applyMode(vars);
}

/**
 * Reads the active theme from the settings store, applies it, and mirrors its
 * CSS variables to localStorage for the secondary windows (see
 * `THEME_VARS_STORAGE_KEY`). Falls back to the built-in default if the active
 * theme is not found.
 */
export function applyActiveTheme(): void {
	const { activeTheme, themes } = settingsStore.appearance;
	const vars = themeColorsToCssVars(findThemeByName(themes, activeTheme).colors);
	setRootVars(vars);
	applyMode(vars);
	try {
		localStorage.setItem(THEME_VARS_STORAGE_KEY, JSON.stringify(vars));
	} catch (err) {
		// The main window is already themed; only the composer misses the update.
		console.error('Failed to mirror theme to localStorage:', err);
	}
}
