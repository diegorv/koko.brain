// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';

import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { KOKOBRAIN_DEFAULT_THEME } from '#lib/core/settings/theme.logic.js';
import { applyTheme, applyActiveTheme, applyStoredTheme, THEME_VARS_STORAGE_KEY } from '#lib/core/settings/theme.service.js';
import type { Theme, ThemeColors } from '#lib/core/settings/theme.types.js';

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

	it('applyStoredTheme only applies custom-property entries with string values', () => {
		localStorage.setItem(THEME_VARS_STORAGE_KEY, JSON.stringify({ '--popover': '#abcdef', color: 'red', '--x': 5 }));

		applyStoredTheme();

		expect(document.documentElement.style.getPropertyValue('--popover')).toBe('#abcdef');
		expect(document.documentElement.style.getPropertyValue('color')).toBe('');
		expect(document.documentElement.style.getPropertyValue('--x')).toBe('');
	});
});
