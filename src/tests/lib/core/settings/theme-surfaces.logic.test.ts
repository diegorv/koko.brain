import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { readableOn, resolveThemeColor, rowSurfaces, themeSurface, themeTint } from '#lib/core/settings/theme-surfaces.logic.js';
import { KOKOBRAIN_DEFAULT_THEME, LAVENDER_HAZE_THEME, themeColorsToCssVars } from '#lib/core/settings/theme.logic.js';
import { contrastRatio, mixColors, shiftLightness, tint } from '#lib/utils/color.js';

const LIGHT = { vars: themeColorsToCssVars(LAVENDER_HAZE_THEME.colors), isDark: false };
const DARK = { vars: themeColorsToCssVars(KOKOBRAIN_DEFAULT_THEME.colors), isDark: true };
const NONE = { vars: {}, isDark: true };

describe('themeSurface', () => {
	it('derives the light column tones the way app.css does', () => {
		const fe = LIGHT.vars['--file-explorer-bg'];
		expect(themeSurface(LIGHT, 'rail-bg')).toBe(mixColors(fe, '#000000', 0.04));
		expect(themeSurface(LIGHT, 'nav-bg')).toBe(fe);
		expect(themeSurface(LIGHT, 'list-bg')).toBe(mixColors(fe, LIGHT.vars['--editor-bg']));
	});

	it('derives the dark column tones the way app.css does', () => {
		const fe = DARK.vars['--file-explorer-bg'];
		expect(themeSurface(DARK, 'rail-bg')).toBe(shiftLightness(fe, -0.06));
		expect(themeSurface(DARK, 'nav-bg')).toBe(shiftLightness(fe, -0.03));
		expect(themeSurface(DARK, 'list-bg')).toBe(fe);
	});

	// The TS twins above copy these declarations; a change here must change them too.
	it('mirrors the column tone declarations app.css still has', () => {
		const css = readFileSync('src/app.css', 'utf8');
		expect(css).toContain('--rail-bg: color-mix(in oklch, var(--file-explorer-bg) 96%, black);');
		expect(css).toContain('--nav-bg: var(--file-explorer-bg);');
		expect(css).toContain('--list-bg: color-mix(in oklch, var(--file-explorer-bg) 50%, var(--editor-bg));');
		expect(css).toContain('--rail-bg: oklch(from var(--file-explorer-bg) calc(l - 0.06) c h);');
		expect(css).toContain('--nav-bg: oklch(from var(--file-explorer-bg) calc(l - 0.03) c h);');
		expect(css).toContain('--list-bg: var(--file-explorer-bg);');
	});

	it('reads any other surface from its theme variable', () => {
		expect(themeSurface(LIGHT, 'popover')).toBe(LIGHT.vars['--popover']);
		expect(themeSurface(LIGHT, 'editor-bg')).toBe(LIGHT.vars['--editor-bg']);
	});

	it('is null before a theme is applied or for an unknown variable', () => {
		expect(themeSurface(NONE, 'rail-bg')).toBeNull();
		expect(themeSurface(NONE, 'list-bg')).toBeNull();
		expect(themeSurface(NONE, 'popover')).toBeNull();
		expect(themeSurface(LIGHT, 'no-such-token')).toBeNull();
		expect(themeSurface({ vars: { '--file-explorer-bg': 'not a color' }, isDark: false }, 'rail-bg')).toBeNull();
	});
});

describe('themeTint', () => {
	it('composites a theme color at a share over a surface, as bg-x/25 paints', () => {
		const nav = themeSurface(LIGHT, 'nav-bg')!;
		expect(themeTint(LIGHT, 'file-explorer-primary', 0.25, 'nav-bg')).toBe(tint(LIGHT.vars['--file-explorer-primary'], 0.25, nav));
	});

	it('is null when either color is missing', () => {
		expect(themeTint(NONE, 'primary', 0.25, 'list-bg')).toBeNull();
		expect(themeTint(LIGHT, 'no-such-token', 0.25, 'list-bg')).toBeNull();
	});
});

describe('rowSurfaces', () => {
	it('lists a column with the hover (10%) and selected (25%) tints its rows paint', () => {
		expect(rowSurfaces(LIGHT, 'nav-bg', 'file-explorer-primary')).toEqual([
			themeSurface(LIGHT, 'nav-bg'),
			themeTint(LIGHT, 'file-explorer-primary', 0.1, 'nav-bg'),
			themeTint(LIGHT, 'file-explorer-primary', 0.25, 'nav-bg'),
		]);
	});

	it('is all null before a theme is applied', () => {
		expect(rowSurfaces(NONE, 'list-bg', 'primary')).toEqual([null, null, null]);
	});
});

describe('resolveThemeColor', () => {
	it('replaces a var() with the theme value and keeps any other color', () => {
		expect(resolveThemeColor(LIGHT, 'var(--type-green)')).toBe(LIGHT.vars['--type-green']);
		expect(resolveThemeColor(LIGHT, ' var( --type-green ) ')).toBe(LIGHT.vars['--type-green']);
		expect(resolveThemeColor(LIGHT, '#123456')).toBe('#123456');
		expect(resolveThemeColor(NONE, 'var(--type-green)')).toBeUndefined();
	});
});

describe('readableOn', () => {
	it('lifts a color until it reaches the minimum on every surface', () => {
		const rail = themeSurface(LIGHT, 'rail-bg');
		const popover = themeSurface(LIGHT, 'popover');
		expect(contrastRatio('#eab308', rail!)!).toBeLessThan(3);
		const out = readableOn(LIGHT, '#eab308', [rail, popover], 3)!;
		expect(contrastRatio(out, rail!)!).toBeGreaterThanOrEqual(3);
		expect(contrastRatio(out, popover!)!).toBeGreaterThanOrEqual(3);
	});

	it('resolves a theme variable, and keeps the variable when its value already passes', () => {
		const editor = themeSurface(LIGHT, 'editor-bg');
		expect(readableOn(LIGHT, 'var(--editor-fg)', [editor], 4.5)).toBe('var(--editor-fg)');
		const lifted = readableOn(LIGHT, 'var(--type-yellow)', [editor], 7)!;
		expect(lifted).toMatch(/^#[0-9a-f]{6}$/);
		expect(contrastRatio(lifted, editor!)!).toBeGreaterThanOrEqual(7);
	});

	it('returns the color unchanged when nothing can be measured', () => {
		expect(readableOn(LIGHT, undefined, [themeSurface(LIGHT, 'rail-bg')], 3)).toBeUndefined();
		expect(readableOn(NONE, '#eab308', [themeSurface(NONE, 'rail-bg')], 3)).toBe('#eab308');
		expect(readableOn(LIGHT, '#eab308', [], 3)).toBe('#eab308');
		expect(readableOn(LIGHT, 'var(--no-such-token)', [themeSurface(LIGHT, 'rail-bg')], 3)).toBe('var(--no-such-token)');
		expect(readableOn(LIGHT, 'currentColor', [themeSurface(LIGHT, 'rail-bg')], 3)).toBe('currentColor');
	});
});
