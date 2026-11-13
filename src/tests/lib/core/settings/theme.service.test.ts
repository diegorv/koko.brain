// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { flushSync } from 'svelte';

import { appliedThemeStore } from '#lib/core/settings/applied-theme.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { KOKOBRAIN_DEFAULT_THEME, LAVENDER_HAZE_THEME, themeColorsToCssVars } from '#lib/core/settings/theme.logic.js';
import { applyTheme, applyActiveTheme, applyStoredTheme, THEME_VARS_STORAGE_KEY } from '#lib/core/settings/theme.service.js';
import type { Theme, ThemeColors } from '#lib/core/settings/theme.types.js';

import { countEffectRuns } from '../../../fixtures/settings-effect-probe.svelte.js';

describe('applyTheme', () => {
	beforeEach(() => {
		settingsStore.reset();
		document.documentElement.style.cssText = '';
	});

	it('sets all CSS custom properties on document root', () => {
		applyTheme(KOKOBRAIN_DEFAULT_THEME);

		expect(document.documentElement.style.getPropertyValue('--background')).toBe('#21222e');
		expect(document.documentElement.style.getPropertyValue('--card')).toBe('#2a2e3d');
		expect(document.documentElement.style.getPropertyValue('--tab-bar')).toBe('#5a5c79');
	});

	it('sets syntax colors with correct prefix', () => {
		applyTheme(KOKOBRAIN_DEFAULT_THEME);

		expect(document.documentElement.style.getPropertyValue('--syntax-heading1')).toBe('#E8A5FF');
		expect(document.documentElement.style.getPropertyValue('--syntax-emphasis')).toBe('#93c5fd');
	});

	it('sets callout colors with correct prefix', () => {
		applyTheme(KOKOBRAIN_DEFAULT_THEME);

		expect(document.documentElement.style.getPropertyValue('--callout-note')).toBe('#60a5fa');
		expect(document.documentElement.style.getPropertyValue('--callout-tip')).toBe('#4ade80');
	});

	it('applies a custom theme with overridden colors', () => {
		const custom: Theme = {
			name: 'Custom',
			colors: {
				...KOKOBRAIN_DEFAULT_THEME.colors,
				ui: { ...KOKOBRAIN_DEFAULT_THEME.colors.ui, background: '#ff0000' },
			},
		};

		applyTheme(custom);

		expect(document.documentElement.style.getPropertyValue('--background')).toBe('#ff0000');
		// Other UI colors still set from defaults
		expect(document.documentElement.style.getPropertyValue('--card')).toBe('#2a2e3d');
	});
});

describe('applyActiveTheme', () => {
	beforeEach(() => {
		settingsStore.reset();
		document.documentElement.style.cssText = '';
	});

	it('applies the default theme from store', () => {
		applyActiveTheme();

		// Real store has DEFAULT_APPEARANCE with KOKOBRAIN_DEFAULT_THEME
		expect(document.documentElement.style.getPropertyValue('--background')).toBe('#21222e');
		expect(document.documentElement.style.getPropertyValue('--divider')).toBe('#383a4f');
	});

	it('applies a custom active theme from store', () => {
		const customColors: ThemeColors = {
			...KOKOBRAIN_DEFAULT_THEME.colors,
			ui: { ...KOKOBRAIN_DEFAULT_THEME.colors.ui, background: '#aabbcc' },
		};
		settingsStore.updateAppearance({
			activeTheme: 'My Custom',
			themes: [
				KOKOBRAIN_DEFAULT_THEME,
				{ name: 'My Custom', colors: customColors },
			],
		});

		applyActiveTheme();

		expect(document.documentElement.style.getPropertyValue('--background')).toBe('#aabbcc');
	});

	it('falls back to default theme when active theme not found', () => {
		settingsStore.updateAppearance({
			activeTheme: 'Nonexistent',
			themes: [KOKOBRAIN_DEFAULT_THEME],
		});

		applyActiveTheme();

		// Falls back to KOKOBRAIN_DEFAULT_THEME via findThemeByName
		expect(document.documentElement.style.getPropertyValue('--background')).toBe('#21222e');
	});
});

describe('applyTheme — edge cases', () => {
	beforeEach(() => {
		settingsStore.reset();
		document.documentElement.style.cssText = '';
	});

	it('handles a theme with only a subset of color groups', () => {
		const partial: Theme = {
			name: 'Partial',
			colors: {
				ui: { background: '#111111' },
			} as any,
		};

		applyTheme(partial);

		expect(document.documentElement.style.getPropertyValue('--background')).toBe('#111111');
		// Syntax / callout vars should NOT be set
		expect(document.documentElement.style.getPropertyValue('--syntax-heading1')).toBe('');
	});

	it('handles a theme with empty color groups', () => {
		const empty: Theme = {
			name: 'Empty',
			colors: {} as any,
		};

		applyTheme(empty);

		// No CSS vars set
		expect(document.documentElement.style.getPropertyValue('--background')).toBe('');
		expect(document.documentElement.style.getPropertyValue('--card')).toBe('');
	});
});

describe('theme mirror for secondary windows', () => {
	beforeEach(() => {
		settingsStore.reset();
		localStorage.clear();
		document.documentElement.style.cssText = '';
	});

	it('applyActiveTheme mirrors the CSS variables to localStorage', () => {
		applyActiveTheme();

		const stored = JSON.parse(localStorage.getItem(THEME_VARS_STORAGE_KEY) ?? '{}');
		expect(stored['--background']).toBe('#21222e');
		expect(stored['--popover']).toBe(KOKOBRAIN_DEFAULT_THEME.colors.ui.popover);
	});

	it('applyTheme alone (the theme editor draft preview) does not mirror', () => {
		applyActiveTheme();
		const draft: Theme = {
			name: 'Draft',
			colors: {
				...KOKOBRAIN_DEFAULT_THEME.colors,
				ui: { ...KOKOBRAIN_DEFAULT_THEME.colors.ui, popover: '#999999' },
			},
		};

		applyTheme(draft);

		const stored = JSON.parse(localStorage.getItem(THEME_VARS_STORAGE_KEY) ?? '{}');
		expect(stored['--popover']).toBe(KOKOBRAIN_DEFAULT_THEME.colors.ui.popover);
	});

	it('applyStoredTheme applies the mirrored variables to the document root', () => {
		settingsStore.updateAppearance({
			activeTheme: 'Custom',
			themes: [
				KOKOBRAIN_DEFAULT_THEME,
				{
					name: 'Custom',
					colors: {
						...KOKOBRAIN_DEFAULT_THEME.colors,
						ui: { ...KOKOBRAIN_DEFAULT_THEME.colors.ui, popover: '#123456' },
					},
				},
			],
		});
		applyActiveTheme();
		document.documentElement.style.cssText = '';

		applyStoredTheme();

		expect(document.documentElement.style.getPropertyValue('--popover')).toBe('#123456');
	});

	it('applyStoredTheme leaves the root untouched when nothing is stored', () => {
		applyStoredTheme();

		expect(document.documentElement.style.getPropertyValue('--background')).toBe('');
	});

	it('applyStoredTheme ignores a corrupt stored value', () => {
		localStorage.setItem(THEME_VARS_STORAGE_KEY, '{not json');

		expect(() => applyStoredTheme()).not.toThrow();
		expect(document.documentElement.style.getPropertyValue('--background')).toBe('');
	});

	it('applyStoredTheme leaves the mode alone when nothing is stored', () => {
		document.documentElement.classList.add('dark');

		applyStoredTheme();

		expect(document.documentElement.classList.contains('dark')).toBe(true);
		expect(document.documentElement.style.colorScheme).toBe('');
	});

	it('applyStoredTheme only applies custom-property entries with string values', () => {
		localStorage.setItem(THEME_VARS_STORAGE_KEY, JSON.stringify({ '--popover': '#abcdef', color: 'red', '--x': 5 }));

		applyStoredTheme();

		expect(document.documentElement.style.getPropertyValue('--popover')).toBe('#abcdef');
		expect(document.documentElement.style.getPropertyValue('color')).toBe('');
		expect(document.documentElement.style.getPropertyValue('--x')).toBe('');
	});

	it('the main window applies the stored theme before any vault loads', () => {
		// Settings, and with them the active theme, live in the vault, so the
		// start screen only gets the theme from the mirror. One tab of
		// indentation: top level of the <script>, not inside a vault-scoped $effect.
		const layout = readFileSync(`${process.cwd()}/src/routes/(app)/+layout.svelte`, 'utf8');
		expect(layout).toMatch(/\n\tapplyStoredTheme\(\);\n/);
	});
});

describe('the applied theme decides dark mode', () => {
	const root = document.documentElement;
	const mode = () => ({
		dark: root.classList.contains('dark'),
		colorScheme: root.style.colorScheme,
		isDark: appliedThemeStore.isDark,
	});
	const DARK = { dark: true, colorScheme: 'dark', isDark: true };
	const LIGHT = { dark: false, colorScheme: 'light', isDark: false };

	beforeEach(() => {
		settingsStore.reset();
		localStorage.clear();
		root.style.cssText = '';
		root.className = 'dark';
		appliedThemeStore._reset();
	});

	it('defaults to dark, matching the default theme', () => {
		expect(appliedThemeStore.isDark).toBe(true);
	});

	it('applyTheme with a light theme switches to light, and the default theme restores dark', () => {
		applyTheme(LAVENDER_HAZE_THEME);
		expect(mode()).toEqual(LIGHT);

		applyTheme(KOKOBRAIN_DEFAULT_THEME);
		expect(mode()).toEqual(DARK);
	});

	it('treats an unparseable editor background as dark', () => {
		applyTheme(LAVENDER_HAZE_THEME);
		const unreadable: Theme = {
			name: 'Unreadable',
			colors: {
				...LAVENDER_HAZE_THEME.colors,
				ui: { ...LAVENDER_HAZE_THEME.colors.ui, editorBg: 'var(--x)' },
			},
		};

		applyTheme(unreadable);

		expect(mode()).toEqual(DARK);
	});

	it('applyStoredTheme with stored light vars switches to light', () => {
		localStorage.setItem(THEME_VARS_STORAGE_KEY, JSON.stringify(themeColorsToCssVars(LAVENDER_HAZE_THEME.colors)));

		applyStoredTheme();

		expect(mode()).toEqual(LIGHT);
	});

	it('applyActiveTheme with Lavender Haze active switches to light', () => {
		settingsStore.updateAppearance({ activeTheme: 'Lavender Haze' });

		applyActiveTheme();

		expect(mode()).toEqual(LIGHT);
	});
});

describe('every apply bumps the applied theme revision', () => {
	beforeEach(() => {
		settingsStore.reset();
		localStorage.clear();
		document.documentElement.style.cssText = '';
		appliedThemeStore._reset();
	});

	it('applyTheme bumps it, even between two dark themes', () => {
		applyTheme(KOKOBRAIN_DEFAULT_THEME);
		const first = appliedThemeStore.revision;
		applyTheme({ ...KOKOBRAIN_DEFAULT_THEME, name: 'Other dark' });

		expect(first).toBeGreaterThan(0);
		expect(appliedThemeStore.revision).toBeGreaterThan(first);
	});

	it('applyStoredTheme bumps it', () => {
		localStorage.setItem(THEME_VARS_STORAGE_KEY, JSON.stringify(themeColorsToCssVars(LAVENDER_HAZE_THEME.colors)));

		applyStoredTheme();

		expect(appliedThemeStore.revision).toBeGreaterThan(0);
	});

	it('applyActiveTheme bumps it', () => {
		applyActiveTheme();

		expect(appliedThemeStore.revision).toBeGreaterThan(0);
	});

	// The bump must not track `revision`, or an effect that applies a theme
	// re-runs itself until Svelte throws effect_update_depth_exceeded.
	it('applyTheme inside an $effect bumps it once and does not re-run the effect', () => {
		const probe = countEffectRuns(() => applyTheme(KOKOBRAIN_DEFAULT_THEME));
		try {
			flushSync();

			expect(probe.runs()).toBe(1);
			expect(appliedThemeStore.revision).toBe(1);
		} finally {
			probe.dispose();
		}
	});
});
