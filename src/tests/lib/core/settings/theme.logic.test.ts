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
} from '$lib/core/settings/theme.logic';

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
		expect(camelToKebab('cardForeground')).toBe('card-foreground');
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
		expect(vars['--lp-frontmatter-label']).toBe('#cdd6f4');
	});

	it('maps wikilink colors with wikilink- prefix', () => {
		const vars = themeColorsToCssVars(KOKOBRAIN_DEFAULT_THEME.colors);
		expect(vars['--wikilink-bracket']).toBe('#64748b');
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
		expect(result.themes).toHaveLength(1);
		expect(result.themes[0].name).toBe(DEFAULT_THEME_NAME);
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
		expect(result.themes).toHaveLength(2);
		expect(result.themes[0].name).toBe(DEFAULT_THEME_NAME);
		expect(result.themes[1].name).toBe('Custom');
	});

	it('does not duplicate default theme if already present', () => {
		const result = normalizeAppearance({
			themes: [KOKOBRAIN_DEFAULT_THEME],
		});
		expect(result.themes).toHaveLength(1);
		expect(result.themes[0].name).toBe(DEFAULT_THEME_NAME);
	});

	it('preserves activeTheme from input', () => {
		const result = normalizeAppearance({
			activeTheme: 'My Theme',
		});
		expect(result.activeTheme).toBe('My Theme');
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

	it('contains only the built-in theme', () => {
		expect(DEFAULT_APPEARANCE.themes).toHaveLength(1);
		expect(DEFAULT_APPEARANCE.themes[0]).toBe(KOKOBRAIN_DEFAULT_THEME);
	});
});
