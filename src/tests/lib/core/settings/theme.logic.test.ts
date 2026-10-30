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
	SAKURA_THEME,
	TWILIGHT_VIOLET_THEME,
} from '#lib/core/settings/theme.logic.js';

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
		const { taskChecked: _dropped, ...preview } = TWILIGHT_VIOLET_THEME.colors.preview;
		const merged = mergeThemeWithDefaults({ ...TWILIGHT_VIOLET_THEME.colors, preview: preview as typeof TWILIGHT_VIOLET_THEME.colors.preview });

		expect(merged.preview.taskChecked).toBe(TWILIGHT_VIOLET_THEME.colors.ui.primary);
		expect(merged.preview.taskChecked).not.toBe(KOKOBRAIN_DEFAULT_THEME.colors.preview.taskChecked);
	});

	it('keeps every token the partial provides', () => {
		expect(mergeThemeWithDefaults(SAKURA_THEME.colors)).toEqual(SAKURA_THEME.colors);
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
		const sakura = BUILTIN_THEMES.find((t) => t.name === 'Sakura')!;
		const stale = { name: 'Sakura', colors: { ...sakura.colors, ui: { ...sakura.colors.ui, primary: '#000000' } } };

		const result = normalizeAppearance({ builtinsFromCode: true, themes: [stale] });

		expect(result.themes.find((t) => t.name === 'Sakura')).toBe(sakura);
		expect(result.themes.some((t) => t.name.startsWith('Sakura ('))).toBe(false);
		expect(result.themes).toHaveLength(BUILTIN_THEMES.length);
	});

	it('keeps a pre-migration edit of a built-in as an "(edited)" copy next to the code version', () => {
		const sakura = BUILTIN_THEMES.find((t) => t.name === 'Sakura')!;
		const edited = { name: 'Sakura', colors: { ...sakura.colors, ui: { ...sakura.colors.ui, primary: '#000000' } } };

		const result = normalizeAppearance({ activeTheme: 'Sakura', themes: [edited] });

		expect(result.themes.find((t) => t.name === 'Sakura')).toBe(sakura);
		const copy = result.themes.find((t) => t.name === 'Sakura (edited)');
		expect(copy?.colors.ui.primary).toBe('#000000');
		expect(result.activeTheme).toBe('Sakura (edited)');
		expect(result.themes).toHaveLength(BUILTIN_THEMES.length + 1);
	});

	it('does not copy a pre-migration built-in that matches the code', () => {
		const result = normalizeAppearance({ activeTheme: 'Sakura', themes: BUILTIN_THEMES.map((t) => structuredClone(t)) });

		expect(result.themes.map((t) => t.name)).toEqual(BUILTIN_THEMES.map((t) => t.name));
		expect(result.activeTheme).toBe('Sakura');
	});

	it('never copies a preset theme on the first load (a difference there is a code change)', () => {
		const preset = BUILTIN_THEMES.find((t) => t.name === 'Tolaria Light')!;
		const older = { name: 'Tolaria Light', colors: { ...preset.colors, ui: { ...preset.colors.ui, primary: '#000000' } } };

		const result = normalizeAppearance({ activeTheme: 'Tolaria Light', themes: [older] });

		expect(result.themes.find((t) => t.name === 'Tolaria Light')).toBe(preset);
		expect(result.themes.some((t) => t.name.startsWith('Tolaria Light ('))).toBe(false);
		expect(result.activeTheme).toBe('Tolaria Light');
	});

	it('does not copy a pre-migration built-in that only lacks a token the built-in overrides', () => {
		const { tabBar: _missing, ...ui } = KOKOBRAIN_DEFAULT_THEME.colors.ui;
		const saved = { name: DEFAULT_THEME_NAME, colors: { ...KOKOBRAIN_DEFAULT_THEME.colors, ui: ui as typeof KOKOBRAIN_DEFAULT_THEME.colors.ui } };

		const result = normalizeAppearance({ activeTheme: DEFAULT_THEME_NAME, themes: [saved] });

		expect(result.themes.some((t) => t.name.endsWith('(edited)'))).toBe(false);
		expect(result.activeTheme).toBe(DEFAULT_THEME_NAME);
	});

	it('picks an unused name for the "(edited)" copy', () => {
		const sakura = BUILTIN_THEMES.find((t) => t.name === 'Sakura')!;
		const edited = { name: 'Sakura', colors: { ...sakura.colors, ui: { ...sakura.colors.ui, primary: '#000000' } } };
		const taken = { name: 'Sakura (edited)', colors: sakura.colors };

		const result = normalizeAppearance({ themes: [edited, taken] });

		expect(result.themes.some((t) => t.name === 'Sakura (edited 2)')).toBe(true);
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
		expect(KOKOBRAIN_DEFAULT_THEME.colors.syntax.heading6).toBe('#B19CD9');
	});
});

describe('DEFAULT_APPEARANCE', () => {
	it('uses default theme name as active', () => {
		expect(DEFAULT_APPEARANCE.activeTheme).toBe(DEFAULT_THEME_NAME);
	});

	it('contains all built-in themes', () => {
		expect(DEFAULT_APPEARANCE.themes[0]).toBe(KOKOBRAIN_DEFAULT_THEME);
		expect(DEFAULT_APPEARANCE.themes.map((t) => t.name)).toEqual([
			'KokoBrain Default', 'Sakura', 'Lavender Haze', 'Twilight Violet',
			'Zettlr Berlin Light', 'Zettlr Berlin Dark',
			'Zettlr Bielefeld Light', 'Zettlr Bielefeld Dark',
			'Zettlr Bordeaux Light', 'Zettlr Bordeaux Dark',
			'Zettlr Frankfurt Light', 'Zettlr Frankfurt Dark',
			'Zettlr Karl-Marx-Stadt Light', 'Zettlr Karl-Marx-Stadt Dark',
			'Tolaria Light', 'Tolaria Dark',
			'Foolscap', 'Sepia', 'Cool Mist', 'Mint Linen', 'Lumen Contrast', 'Ink Night', 'Deep Ocean', 'Graphite Violet',
		]);
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
