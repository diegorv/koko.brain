import { describe, it, expect } from 'vitest';
import {
	camelToKebab,
	themeColorsToCssVars,
	mergeThemeWithDefaults,
	normalizeAppearance,
	findThemeByName,
	KOKOBRAIN_DEFAULT_THEME,
	DEFAULT_THEME_NAME,
	DEFAULT_APPEARANCE,
	BUILTIN_THEMES,
	isBuiltinTheme,
	LAVENDER_HAZE_THEME,
} from '#lib/core/settings/theme.logic.js';
import { TYPE_PALETTE_TOKENS, buildTheme, coreFromColors } from '#lib/core/settings/theme-builder.logic.js';
import type { ThemeColors } from '#lib/core/settings/theme.types.js';
import { contrastRatio } from '#lib/utils/color.js';

describe('camelToKebab', () => {
	it('converts camelCase to kebab-case', () => {
		expect(camelToKebab('tabBar')).toBe('tab-bar');
		expect(camelToKebab('fileExplorerBg')).toBe('file-explorer-bg');
		expect(camelToKebab('heading1')).toBe('heading1');
	});

	it('handles single-word strings', () => {
		expect(camelToKebab('background')).toBe('background');
	});

	it('handles multiple uppercase letters', () => {
		expect(camelToKebab('popoverForeground')).toBe('popover-foreground');
		expect(camelToKebab('activeLineGutter')).toBe('active-line-gutter');
	});
});

describe('themeColorsToCssVars', () => {
	it('maps UI colors without prefix', () => {
		const vars = themeColorsToCssVars(KOKOBRAIN_DEFAULT_THEME.colors);
		expect(vars['--background']).toBe('#21222e');
		expect(vars['--tab-bar']).toBe('#5a5c79');
		expect(vars['--file-explorer-bg']).toBe('#262938');
	});

	it('maps syntax colors with syntax- prefix', () => {
		const vars = themeColorsToCssVars(KOKOBRAIN_DEFAULT_THEME.colors);
		expect(vars['--syntax-heading1']).toBe('#E8A5FF');
		expect(vars['--syntax-emphasis']).toBe('#93c5fd');
		expect(vars['--syntax-active-line-gutter']).toBe('#171a24');
	});

	it('maps preview colors with lp- prefix', () => {
		const vars = themeColorsToCssVars(KOKOBRAIN_DEFAULT_THEME.colors);
		expect(vars['--lp-link']).toBe('#60a5fa');
		expect(vars['--lp-codeblock-bg']).toBe('#1e1e2e');
		expect(vars['--lp-frontmatter-label']).toBeUndefined();
	});

	it('maps wikilink colors with wikilink- prefix', () => {
		const vars = themeColorsToCssVars(KOKOBRAIN_DEFAULT_THEME.colors);
		expect(vars['--wikilink-bracket']).toBe(KOKOBRAIN_DEFAULT_THEME.colors.wikilink.bracket);
		expect(vars['--wikilink-target']).toBe('#a78bfa');
	});

	it('maps callout colors with callout- prefix', () => {
		const vars = themeColorsToCssVars(KOKOBRAIN_DEFAULT_THEME.colors);
		expect(vars['--callout-note']).toBe('#60a5fa');
		expect(vars['--callout-tip']).toBe('#4ade80');
	});

	const ELEV_DARK = {
		'--elev-shadow-1': '#00000040',
		'--elev-shadow-2': '#00000073',
		'--elev-shadow-3': '#00000099',
		'--elev-ring': '#ffffff0f',
		'--elev-scrim': '#0000008c',
	};
	const elevVars = (vars: Record<string, string>) =>
		Object.fromEntries(Object.entries(vars).filter(([name]) => name.startsWith('--elev-')));

	it('emits the dark elevation values for a dark editor background', () => {
		expect(elevVars(themeColorsToCssVars(KOKOBRAIN_DEFAULT_THEME.colors))).toEqual(ELEV_DARK);
	});

	it('tints the light elevation values from the theme foreground', () => {
		expect(elevVars(themeColorsToCssVars(LAVENDER_HAZE_THEME.colors))).toEqual({
			'--elev-shadow-1': '#3028400f',
			'--elev-shadow-2': '#3028401a',
			'--elev-shadow-3': '#30284029',
			'--elev-ring': '#30284014',
			'--elev-scrim': '#30284040',
		});
	});

	it('treats an editor background it cannot parse as dark', () => {
		const colors = {
			...LAVENDER_HAZE_THEME.colors,
			ui: { ...LAVENDER_HAZE_THEME.colors.ui, editorBg: 'hsl(270 20% 95%)' },
		};
		expect(elevVars(themeColorsToCssVars(colors))).toEqual(ELEV_DARK);
	});

	it('leaves the elevation values to the stylesheet for colors without an editor background', () => {
		expect(themeColorsToCssVars({ ui: { background: '#111111' } } as unknown as ThemeColors)).toEqual({ '--background': '#111111' });
		expect(themeColorsToCssVars({} as ThemeColors)).toEqual({});
	});

	it('emits every theme token unchanged besides the elevation values', () => {
		const prefix = { ui: '', syntax: 'syntax-', preview: 'lp-', wikilink: 'wikilink-', callout: 'callout-' };
		for (const theme of BUILTIN_THEMES) {
			const expected: Record<string, string> = {};
			for (const [group, tokens] of Object.entries(theme.colors) as [keyof typeof prefix, Record<string, string>][]) {
				for (const [key, value] of Object.entries(tokens)) expected[`--${prefix[group]}${camelToKebab(key)}`] = value;
			}
			const { ...vars } = themeColorsToCssVars(theme.colors);
			for (const name of Object.keys(elevVars(vars))) delete vars[name];
			expect(vars, theme.name).toEqual(expected);
		}
	});
});

describe('mergeThemeWithDefaults', () => {
	it('returns full defaults when given empty partial', () => {
		const merged = mergeThemeWithDefaults({});
		expect(merged.ui.background).toBe(KOKOBRAIN_DEFAULT_THEME.colors.ui.background);
		expect(merged.syntax.heading1).toBe(KOKOBRAIN_DEFAULT_THEME.colors.syntax.heading1);
	});

	it('overrides only provided UI colors', () => {
		const merged = mergeThemeWithDefaults({
			ui: { ...KOKOBRAIN_DEFAULT_THEME.colors.ui, background: '#ff0000' },
		});
		expect(merged.ui.background).toBe('#ff0000');
		expect(merged.ui.foreground).toBe(KOKOBRAIN_DEFAULT_THEME.colors.ui.foreground);
	});

	it('returns exactly the default colors for an empty partial', () => {
		expect(mergeThemeWithDefaults({})).toEqual(KOKOBRAIN_DEFAULT_THEME.colors);
	});

	it('drops keys that are not theme tokens', () => {
		const stale = { ...KOKOBRAIN_DEFAULT_THEME.colors.ui, cardForeground: '#000000' };
		const merged = mergeThemeWithDefaults({ ui: stale });
		expect('cardForeground' in merged.ui).toBe(false);
	});

	it('derives a missing token from the theme\'s own colors, not from the default theme', () => {
		const { taskChecked: _dropped, ...preview } = LAVENDER_HAZE_THEME.colors.preview;
		const merged = mergeThemeWithDefaults({ ...LAVENDER_HAZE_THEME.colors, preview: preview as typeof LAVENDER_HAZE_THEME.colors.preview });

		expect(merged.preview.taskChecked).toBe(LAVENDER_HAZE_THEME.colors.ui.primary);
		expect(merged.preview.taskChecked).not.toBe(KOKOBRAIN_DEFAULT_THEME.colors.preview.taskChecked);
	});

	it('gives a user theme saved without the type palette and warning tokens derived ones', () => {
		// A theme with no overrides, so every token is what the builder derives from its core.
		const theme = buildTheme('Mine', coreFromColors(LAVENDER_HAZE_THEME.colors));
		const ui: Record<string, string> = { ...theme.colors.ui };
		for (const key of [...TYPE_PALETTE_TOKENS, 'warning']) delete ui[key];
		const merged = mergeThemeWithDefaults({ ...theme.colors, ui: ui as unknown as typeof theme.colors.ui });

		for (const key of [...TYPE_PALETTE_TOKENS, 'warning'] as const) {
			expect(merged.ui[key], key).toBe(theme.colors.ui[key]);
		}
		expect(merged.ui.typeRed).not.toBe(KOKOBRAIN_DEFAULT_THEME.colors.ui.typeRed);
	});

	it('gives a user theme saved without the success token one derived from its own green', () => {
		const theme = buildTheme('Mine', coreFromColors(LAVENDER_HAZE_THEME.colors));
		const { success: _dropped, ...ui } = theme.colors.ui;
		const merged = mergeThemeWithDefaults({ ...theme.colors, ui: ui as typeof theme.colors.ui });

		expect(merged.ui.success).toBe(theme.colors.ui.success);
		expect(merged.ui.success).not.toBe(KOKOBRAIN_DEFAULT_THEME.colors.ui.success);
	});

	it('keeps every token the partial provides', () => {
		expect(mergeThemeWithDefaults(LAVENDER_HAZE_THEME.colors)).toEqual(LAVENDER_HAZE_THEME.colors);
	});

	it('keeps unspecified groups at defaults', () => {
		const merged = mergeThemeWithDefaults({
			callout: { ...KOKOBRAIN_DEFAULT_THEME.colors.callout, note: '#aabbcc' },
		});
		expect(merged.callout.note).toBe('#aabbcc');
		expect(merged.ui.background).toBe(KOKOBRAIN_DEFAULT_THEME.colors.ui.background);
		expect(merged.syntax.heading1).toBe(KOKOBRAIN_DEFAULT_THEME.colors.syntax.heading1);
	});
});

describe('normalizeAppearance', () => {
	it('returns defaults for empty input', () => {
		const result = normalizeAppearance({});
		expect(result.activeTheme).toBe(DEFAULT_THEME_NAME);
		expect(result.themes).toHaveLength(BUILTIN_THEMES.length);
		expect(result.themes.some((t) => t.name === DEFAULT_THEME_NAME)).toBe(true);
	});

	it('prepends default theme if missing', () => {
		const customTheme = {
			name: 'Custom',
			colors: KOKOBRAIN_DEFAULT_THEME.colors,
		};
		const result = normalizeAppearance({
			activeTheme: 'Custom',
			themes: [customTheme],
		});
		expect(result.themes).toHaveLength(BUILTIN_THEMES.length + 1);
		expect(result.themes[0].name).toBe('Custom');
		expect(result.themes.some((t) => t.name === DEFAULT_THEME_NAME)).toBe(true);
	});

	it('does not duplicate built-in themes if already present', () => {
		const result = normalizeAppearance({
			themes: [KOKOBRAIN_DEFAULT_THEME],
		});
		expect(result.themes).toHaveLength(BUILTIN_THEMES.length);
		expect(result.themes.filter((t) => t.name === DEFAULT_THEME_NAME)).toHaveLength(1);
	});

	it('serves built-in themes from code even when a stale copy is saved', () => {
		const lavender = LAVENDER_HAZE_THEME;
		const stale = { name: 'Lavender Haze', colors: { ...lavender.colors, ui: { ...lavender.colors.ui, primary: '#000000' } } };

		const result = normalizeAppearance({ builtinsFromCode: true, themes: [stale] });

		expect(result.themes.find((t) => t.name === 'Lavender Haze')).toBe(lavender);
		expect(result.themes.some((t) => t.name.startsWith('Lavender Haze ('))).toBe(false);
		expect(result.themes).toHaveLength(BUILTIN_THEMES.length);
	});

	it('keeps a pre-migration edit of a built-in as an "(edited)" copy next to the code version', () => {
		const lavender = LAVENDER_HAZE_THEME;
		const edited = { name: 'Lavender Haze', colors: { ...lavender.colors, ui: { ...lavender.colors.ui, primary: '#000000' } } };

		const result = normalizeAppearance({ activeTheme: 'Lavender Haze', themes: [edited] });

		expect(result.themes.find((t) => t.name === 'Lavender Haze')).toBe(lavender);
		const copy = result.themes.find((t) => t.name === 'Lavender Haze (edited)');
		expect(copy?.colors.ui.primary).toBe('#000000');
		expect(result.activeTheme).toBe('Lavender Haze (edited)');
		expect(result.themes).toHaveLength(BUILTIN_THEMES.length + 1);
	});

	it('does not copy a pre-migration built-in that matches the code', () => {
		const result = normalizeAppearance({ activeTheme: 'Lavender Haze', themes: BUILTIN_THEMES.map((t) => structuredClone(t)) });

		expect(result.themes.map((t) => t.name)).toEqual(BUILTIN_THEMES.map((t) => t.name));
		expect(result.activeTheme).toBe('Lavender Haze');
	});

	it('does not copy a pre-migration built-in that only lacks a token the built-in overrides', () => {
		const { tabBar: _missing, ...ui } = KOKOBRAIN_DEFAULT_THEME.colors.ui;
		const saved = { name: DEFAULT_THEME_NAME, colors: { ...KOKOBRAIN_DEFAULT_THEME.colors, ui: ui as typeof KOKOBRAIN_DEFAULT_THEME.colors.ui } };

		const result = normalizeAppearance({ activeTheme: DEFAULT_THEME_NAME, themes: [saved] });

		expect(result.themes.some((t) => t.name.endsWith('(edited)'))).toBe(false);
		expect(result.activeTheme).toBe(DEFAULT_THEME_NAME);
	});

	it('picks an unused name for the "(edited)" copy', () => {
		const lavender = LAVENDER_HAZE_THEME;
		const edited = { name: 'Lavender Haze', colors: { ...lavender.colors, ui: { ...lavender.colors.ui, primary: '#000000' } } };
		const taken = { name: 'Lavender Haze (edited)', colors: lavender.colors };

		const result = normalizeAppearance({ themes: [edited, taken] });

		expect(result.themes.some((t) => t.name === 'Lavender Haze (edited 2)')).toBe(true);
	});

	it('marks the migration as done', () => {
		expect(normalizeAppearance({}).builtinsFromCode).toBe(true);
	});

	it('preserves activeTheme from input', () => {
		const result = normalizeAppearance({
			activeTheme: 'My Theme',
		});
		expect(result.activeTheme).toBe('My Theme');
	});
});

describe('isBuiltinTheme', () => {
	it('is true for every built-in theme name', () => {
		expect(BUILTIN_THEMES.every((t) => isBuiltinTheme(t.name))).toBe(true);
	});

	it('is false for user themes and the empty name', () => {
		expect(isBuiltinTheme('Sakura (edited)')).toBe(false);
		expect(isBuiltinTheme('')).toBe(false);
	});
});

describe('findThemeByName', () => {
	it('finds existing theme', () => {
		const theme = findThemeByName([KOKOBRAIN_DEFAULT_THEME], DEFAULT_THEME_NAME);
		expect(theme.name).toBe(DEFAULT_THEME_NAME);
	});

	it('falls back to default when name not found', () => {
		const theme = findThemeByName([KOKOBRAIN_DEFAULT_THEME], 'Nonexistent');
		expect(theme.name).toBe(DEFAULT_THEME_NAME);
	});
});

describe('KOKOBRAIN_DEFAULT_THEME', () => {
	it('has the correct name', () => {
		expect(KOKOBRAIN_DEFAULT_THEME.name).toBe('KokoBrain Default');
	});

	it('has all color groups', () => {
		expect(KOKOBRAIN_DEFAULT_THEME.colors.ui).toBeDefined();
		expect(KOKOBRAIN_DEFAULT_THEME.colors.syntax).toBeDefined();
		expect(KOKOBRAIN_DEFAULT_THEME.colors.preview).toBeDefined();
		expect(KOKOBRAIN_DEFAULT_THEME.colors.wikilink).toBeDefined();
		expect(KOKOBRAIN_DEFAULT_THEME.colors.callout).toBeDefined();
	});

	it('has valid heading colors', () => {
		expect(KOKOBRAIN_DEFAULT_THEME.colors.syntax.heading1).toBe('#E8A5FF');
		expect(KOKOBRAIN_DEFAULT_THEME.colors.syntax.heading6).toBe('#95a0b9');
	});

	it.each(BUILTIN_THEMES.map((t) => [t.name, t] as const))('%s colors H1 apart from its error red', (_name, theme) => {
		const { ui, syntax, callout } = theme.colors;
		const h1 = syntax.heading1.toLowerCase();
		for (const red of [ui.destructive, ui.typeRed, callout.caution]) expect(h1).not.toBe(red.toLowerCase());
	});
});

describe('built-in themes', () => {
	it.each([
		['KokoBrain Default', KOKOBRAIN_DEFAULT_THEME],
		['Lavender Haze', LAVENDER_HAZE_THEME],
	])('%s colors H6 with its muted text color', (_name, theme) => {
		expect(theme.colors.syntax.heading6).toBe(theme.colors.ui.mutedForeground);
	});

	it('Lavender Haze menus sit lighter than the page and apart from content blocks', () => {
		const { ui, preview } = LAVENDER_HAZE_THEME.colors;
		const popoverLightness = contrastRatio(ui.popover, '#000000');
		const pageLightness = contrastRatio(ui.editorBg, '#000000');
		expect(popoverLightness).not.toBeNull();
		expect(pageLightness).not.toBeNull();
		expect(popoverLightness!).toBeGreaterThan(pageLightness!);
		const popover = ui.popover.toLowerCase();
		for (const block of [preview.codeblockBg, ui.settingItemBg]) {
			expect(popover).not.toBe(block.toLowerCase());
		}
	});

	it('KokoBrain Default menus sit lighter than the editor and the sidebar, with readable muted text', () => {
		const { ui } = KOKOBRAIN_DEFAULT_THEME.colors;
		const popoverLightness = contrastRatio(ui.popover, '#000000');
		const editorLightness = contrastRatio(ui.editorBg, '#000000');
		const sidebarLightness = contrastRatio(ui.background, '#000000');
		expect(popoverLightness).not.toBeNull();
		expect(editorLightness).not.toBeNull();
		expect(sidebarLightness).not.toBeNull();
		expect(popoverLightness!).toBeGreaterThan(editorLightness!);
		expect(popoverLightness!).toBeGreaterThan(sidebarLightness!);
		expect(contrastRatio(ui.mutedForeground, ui.popover)!).toBeGreaterThanOrEqual(4.5);
	});
});

describe('DEFAULT_APPEARANCE', () => {
	it('uses default theme name as active', () => {
		expect(DEFAULT_APPEARANCE.activeTheme).toBe(DEFAULT_THEME_NAME);
	});

	it('starts with both one-time appearance migrations marked done', () => {
		expect(DEFAULT_APPEARANCE.builtinsFromCode).toBe(true);
		expect(DEFAULT_APPEARANCE.exBuiltinsMigrated).toBe(true);
	});

	it('contains all built-in themes', () => {
		expect(DEFAULT_APPEARANCE.themes[0]).toBe(KOKOBRAIN_DEFAULT_THEME);
		expect(DEFAULT_APPEARANCE.themes.map((t) => t.name)).toEqual(['KokoBrain Default', 'Lavender Haze']);
	});

	it('defines the nine type palette tokens and warning in every built-in theme', () => {
		expect(BUILTIN_THEMES.length).toBeGreaterThan(0);
		for (const theme of BUILTIN_THEMES) {
			for (const key of [...TYPE_PALETTE_TOKENS, 'warning'] as const) {
				expect(theme.colors.ui[key], `${theme.name} ${key}`).toMatch(/\S/);
			}
			const vars = themeColorsToCssVars(theme.colors);
			expect(vars['--type-green'], theme.name).toBe(theme.colors.ui.typeGreen);
			expect(vars['--warning'], theme.name).toBe(theme.colors.ui.warning);
		}
	});

	it('gives every built-in theme every token of the default theme', () => {
		const defaults = KOKOBRAIN_DEFAULT_THEME.colors;
		for (const theme of DEFAULT_APPEARANCE.themes) {
			for (const group of Object.keys(defaults) as (keyof typeof defaults)[]) {
				expect(Object.keys(theme.colors[group]).sort(), `${theme.name} ${group}`)
					.toEqual(Object.keys(defaults[group]).sort());
			}
		}
	});
});
