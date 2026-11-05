import { describe, it, expect } from 'vitest';
import {
	isThemeColorValue,
	findInvalidThemeToken,
	withoutRetiredTokens,
	MAX_COLOR_VALUE_LENGTH,
} from '#lib/core/settings/theme-validation.logic.js';
import { BUILTIN_THEMES } from '#lib/core/settings/theme.logic.js';
import { alpha } from '#lib/core/settings/theme-builder.logic.js';

describe('isThemeColorValue', () => {
	it('accepts every token of every built-in theme', () => {
		for (const theme of BUILTIN_THEMES) {
			for (const [group, tokens] of Object.entries(theme.colors)) {
				for (const [key, value] of Object.entries(tokens as Record<string, string>)) {
					expect(isThemeColorValue(value), `${theme.name} ${group}.${key} = ${value}`).toBe(true);
				}
			}
		}
	});

	it.each([
		'#abc',
		'#ABCD',
		'#a1b2c3',
		'#a1b2c3d4',
		'rgb(10, 20, 30)',
		'rgb(10 20 30 / 50%)',
		'rgba(10, 20, 30, 0.5)',
		'hsl(210, 40%, 50%)',
		'hsla(210, 40%, 50%, .3)',
		'oklch(0.28 0.025 272)',
		'oklch(28% 0.025 272 / 0.5)',
		'transparent',
		'color-mix(in srgb, #a1b2c3 50%, transparent)',
		'color-mix(in srgb, oklch(0.73 0.08 278) 12%, transparent)',
	])('accepts %s', (value) => {
		expect(isThemeColorValue(value)).toBe(true);
	});

	it('accepts what alpha() emits for a non-hex color', () => {
		expect(isThemeColorValue(alpha('oklch(0.55 0.06 268)', '33'))).toBe(true);
		expect(isThemeColorValue(alpha('#a1b2c3', '33'))).toBe(true);
	});

	it.each([
		['url', 'url(https://example.com/x)'],
		['var', 'var(--background)'],
		['expression', 'expression(alert(1))'],
		['semicolon', '#fff; background: red'],
		['open brace', '#fff{'],
		['close brace', '}#fff'],
		['double quote', 'rgb("1", 2, 3)'],
		['single quote', "'#fff'"],
		['backslash', '\\23 fff'],
		['empty string', ''],
		['hex with 5 digits', '#abcde'],
		['hex without #', 'abcdef'],
		['named color other than transparent', 'red'],
		['non-numeric argument', 'rgb(a, b, c)'],
		['nested url in rgb', 'rgb(url(x), 2, 3)'],
		['too few arguments', 'rgb(1, 2)'],
		['too many arguments', 'rgb(1, 2, 3, 4, 5)'],
		['other color-mix space', 'color-mix(in oklch, #fff 50%, transparent)'],
		['color-mix with url', 'color-mix(in srgb, url(x) 50%, transparent)'],
		['color-mix not toward transparent', 'color-mix(in srgb, #fff 50%, #000)'],
		['nested color-mix', 'color-mix(in srgb, color-mix(in srgb, #fff 50%, transparent) 50%, transparent)'],
		['leading space', ' #fff'],
		['image-set', 'image-set("x.png" 1x)'],
	])('rejects %s', (_label, value) => {
		expect(isThemeColorValue(value)).toBe(false);
	});

	it('rejects non-string values', () => {
		for (const value of [null, undefined, 42, true, {}, [], ['#fff']]) {
			expect(isThemeColorValue(value)).toBe(false);
		}
	});

	it('rejects values over the length cap, even when the grammar would match', () => {
		const long = `rgb(${'1'.repeat(MAX_COLOR_VALUE_LENGTH)}, 2, 3)`;
		expect(long.length).toBeGreaterThan(MAX_COLOR_VALUE_LENGTH);
		expect(isThemeColorValue(long)).toBe(false);
	});
});

describe('findInvalidThemeToken', () => {
	it('returns null for every built-in theme', () => {
		for (const theme of BUILTIN_THEMES) {
			expect(findInvalidThemeToken(theme.colors), theme.name).toBeNull();
		}
	});

	it('returns null for an empty or partial token map', () => {
		expect(findInvalidThemeToken({})).toBeNull();
		expect(findInvalidThemeToken({ ui: { background: '#fff' } })).toBeNull();
		expect(findInvalidThemeToken({ preview: {} })).toBeNull();
	});

	it('names the first invalid value by its group.key path', () => {
		expect(
			findInvalidThemeToken({
				ui: { background: '#fff' },
				preview: { embedBg: 'url(https://example.com/x)', link: 'var(--x)' },
			}),
		).toBe('preview.embedBg');
	});

	it('names an unknown token key', () => {
		expect(findInvalidThemeToken({ ui: { background: '#fff', notAToken: '#fff' } })).toBe('ui.notAToken');
	});

	it('names an unknown group', () => {
		expect(findInvalidThemeToken({ ui: {}, bogus: { background: '#fff' } })).toBe('bogus');
	});

	it('names a group that is not an object', () => {
		expect(findInvalidThemeToken({ ui: '#fff' })).toBe('ui');
		expect(findInvalidThemeToken({ ui: null })).toBe('ui');
		expect(findInvalidThemeToken({ ui: ['#fff'] })).toBe('ui');
	});

	it('names a non-string value', () => {
		expect(findInvalidThemeToken({ callout: { note: 12 } })).toBe('callout.note');
	});

	it('rejects a colors value that is not an object', () => {
		for (const value of [null, undefined, '#fff', 42, []]) {
			expect(findInvalidThemeToken(value)).toBe('colors');
		}
	});

	it('does not accept inherited keys such as __proto__ or toString', () => {
		expect(findInvalidThemeToken(JSON.parse('{"__proto__": {"background": "#fff"}}'))).toBe('__proto__');
		expect(findInvalidThemeToken({ ui: { toString: '#fff' } })).toBe('ui.toString');
	});

	it('skips the retired frontmatter tokens, whatever they hold', () => {
		expect(findInvalidThemeToken({ preview: { frontmatterBg: '#fff', frontmatterBorder: 'url(x)' } })).toBeNull();
	});

	it('still names a retired key under another group', () => {
		expect(findInvalidThemeToken({ ui: { frontmatterBg: '#fff' } })).toBe('ui.frontmatterBg');
	});
});

describe('withoutRetiredTokens', () => {
	it('drops the retired frontmatter tokens and keeps every other token', () => {
		const colors = { ui: { background: '#fff' }, preview: { frontmatterBg: '#111', frontmatterBorder: '#222', embedBg: '#333' } };
		expect(withoutRetiredTokens(colors)).toEqual({ ui: { background: '#fff' }, preview: { embedBg: '#333' } });
	});

	it('returns an empty map unchanged', () => {
		expect(withoutRetiredTokens({})).toEqual({});
	});

	it('does not mutate its input', () => {
		const colors = { preview: { frontmatterBg: '#111' } };
		withoutRetiredTokens(colors);
		expect(colors).toEqual({ preview: { frontmatterBg: '#111' } });
	});
});
