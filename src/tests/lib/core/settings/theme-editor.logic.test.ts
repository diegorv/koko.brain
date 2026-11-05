import { describe, it, expect } from 'vitest';
import {
	camelCaseToLabel,
	isValidHex,
	normalizeHex,
	hexToColorInputValue,
	validateThemeName,
	serializeThemeForExport,
	parseThemeFromImport,
	MAX_THEME_FILE_LENGTH,
	UI_COLOR_GROUPS,
	SYNTAX_COLOR_GROUPS,
	PREVIEW_COLOR_GROUPS,
	WIKILINK_COLOR_GROUPS,
	CALLOUT_COLOR_GROUPS,
	COLOR_GROUP_LABELS,
	COLOR_GROUP_ORDER,
} from '#lib/core/settings/theme-editor.logic.js';
import {
	KOKOBRAIN_DEFAULT_THEME,
	BUILTIN_THEMES,
	mergeThemeWithDefaults,
} from '#lib/core/settings/theme.logic.js';
import type { ThemeColors } from '#lib/core/settings/theme.types.js';
import { TYPE_PALETTE_TOKENS } from '#lib/core/settings/theme-builder.logic.js';

const PARSE_ERROR = 'Invalid theme file: could not parse';

describe('camelCaseToLabel', () => {
	it('converts simple camelCase to spaced label', () => {
		expect(camelCaseToLabel('tabBar')).toBe('Tab Bar');
		expect(camelCaseToLabel('popoverForeground')).toBe('Popover Foreground');
	});

	it('handles single-word keys', () => {
		expect(camelCaseToLabel('background')).toBe('Background');
		expect(camelCaseToLabel('foreground')).toBe('Foreground');
	});

	it('handles trailing digits with space', () => {
		expect(camelCaseToLabel('heading1')).toBe('Heading 1');
		expect(camelCaseToLabel('heading6')).toBe('Heading 6');
		expect(camelCaseToLabel('blockquoteBg2')).toBe('Blockquote Bg 2');
	});

	it('handles three-part camelCase', () => {
		expect(camelCaseToLabel('activeLineGutter')).toBe('Active Line Gutter');
		expect(camelCaseToLabel('fileExplorerBg')).toBe('File Explorer Bg');
	});

	it('capitalizes first character', () => {
		expect(camelCaseToLabel('link')).toBe('Link');
		expect(camelCaseToLabel('url')).toBe('Url');
	});
});

describe('isValidHex', () => {
	it('accepts 6-char hex with #', () => {
		expect(isValidHex('#ff0000')).toBe(true);
		expect(isValidHex('#AABBCC')).toBe(true);
		expect(isValidHex('#21222e')).toBe(true);
	});

	it('accepts 6-char hex without #', () => {
		expect(isValidHex('ff0000')).toBe(true);
		expect(isValidHex('AABBCC')).toBe(true);
	});

	it('accepts 3-char hex with #', () => {
		expect(isValidHex('#f00')).toBe(true);
		expect(isValidHex('#ABC')).toBe(true);
	});

	it('accepts 3-char hex without #', () => {
		expect(isValidHex('f00')).toBe(true);
	});

	it('rejects invalid strings', () => {
		expect(isValidHex('')).toBe(false);
		expect(isValidHex('#')).toBe(false);
		expect(isValidHex('#gg0000')).toBe(false);
		expect(isValidHex('rgba(255,0,0,1)')).toBe(false);
		expect(isValidHex('oklch(0.5 0.2 240)')).toBe(false);
		expect(isValidHex('#12345')).toBe(false);
		expect(isValidHex('#1234567')).toBe(false);
	});
});

describe('normalizeHex', () => {
	it('adds # prefix if missing', () => {
		expect(normalizeHex('ff0000')).toBe('#ff0000');
	});

	it('keeps # prefix if present', () => {
		expect(normalizeHex('#ff0000')).toBe('#ff0000');
	});

	it('expands 3-char to 6-char', () => {
		expect(normalizeHex('#f00')).toBe('#ff0000');
		expect(normalizeHex('abc')).toBe('#aabbcc');
		expect(normalizeHex('#ABC')).toBe('#aabbcc');
	});

	it('lowercases the output', () => {
		expect(normalizeHex('#AABBCC')).toBe('#aabbcc');
		expect(normalizeHex('FF0000')).toBe('#ff0000');
	});
});

describe('hexToColorInputValue', () => {
	it('normalizes valid hex values', () => {
		expect(hexToColorInputValue('#ff0000')).toBe('#ff0000');
		expect(hexToColorInputValue('#ABC')).toBe('#aabbcc');
		expect(hexToColorInputValue('21222e')).toBe('#21222e');
	});

	it('returns #000000 for rgba values', () => {
		expect(hexToColorInputValue('rgba(255,255,255,0.06)')).toBe('#000000');
		expect(hexToColorInputValue('rgba(23, 26, 36, 0.3)')).toBe('#000000');
	});

	it('returns #000000 for oklch values', () => {
		expect(hexToColorInputValue('oklch(0.5 0.2 240)')).toBe('#000000');
	});

	it('returns #000000 for empty string', () => {
		expect(hexToColorInputValue('')).toBe('#000000');
	});
});

describe('validateThemeName', () => {
	it('returns null for a valid new name', () => {
		expect(validateThemeName('My Theme', [])).toBeNull();
		expect(validateThemeName('Dark Mode', ['Light Mode'])).toBeNull();
	});

	it('returns error for empty name', () => {
		expect(validateThemeName('', [])).toBe('Theme name cannot be empty');
		expect(validateThemeName('   ', [])).toBe('Theme name cannot be empty');
	});

	it('returns error for reserved default name', () => {
		expect(validateThemeName('KokoBrain Default', [])).toBe('"KokoBrain Default" is reserved');
	});

	it('returns error for duplicate name', () => {
		expect(validateThemeName('My Theme', ['My Theme', 'Other'])).toBe('A theme with this name already exists');
	});
});

describe('serializeThemeForExport', () => {
	it('produces valid JSON', () => {
		const json = serializeThemeForExport(KOKOBRAIN_DEFAULT_THEME);
		const parsed = JSON.parse(json);
		expect(parsed.name).toBe(KOKOBRAIN_DEFAULT_THEME.name);
		expect(parsed.colors.ui.background).toBe(KOKOBRAIN_DEFAULT_THEME.colors.ui.background);
	});

	it('is pretty-printed', () => {
		const json = serializeThemeForExport(KOKOBRAIN_DEFAULT_THEME);
		expect(json).toContain('\n');
		expect(json).toContain('  ');
	});
});

describe('parseThemeFromImport', () => {
	/** Parses and returns the error message, failing the test if the parse succeeded. */
	function errorOf(json: string): string {
		const result = parseThemeFromImport(json);
		if (result.ok) throw new Error('expected the import to be refused');
		return result.error;
	}

	it('parses valid theme JSON', () => {
		const json = JSON.stringify({ name: 'Test', colors: { ui: { background: '#fff' } } });
		const result = parseThemeFromImport(json);
		expect(result).toEqual({ ok: true, theme: { name: 'Test', colors: { ui: { background: '#fff' } } } });
	});

	it('accepts an exported theme that still carries the retired frontmatter tokens and drops them', () => {
		const json = JSON.stringify({
			name: 'Old',
			colors: { ui: { background: '#fff' }, preview: { frontmatterBg: '#eee', frontmatterBorder: '#ddd', embedBg: '#ccc' } },
		});
		expect(parseThemeFromImport(json)).toEqual({
			ok: true,
			theme: { name: 'Old', colors: { ui: { background: '#fff' }, preview: { embedBg: '#ccc' } } },
		});
	});

	it('refuses malformed JSON', () => {
		expect(errorOf('not json')).toBe(PARSE_ERROR);
		expect(errorOf('{incomplete')).toBe(PARSE_ERROR);
	});

	it('refuses empty input', () => {
		expect(errorOf('')).toBe(PARSE_ERROR);
	});

	it('refuses a missing or empty name', () => {
		const error = 'Invalid theme file: missing "name"';
		expect(errorOf(JSON.stringify({ colors: {} }))).toBe(error);
		expect(errorOf(JSON.stringify({ name: '', colors: {} }))).toBe(error);
		expect(errorOf(JSON.stringify({ name: '  ', colors: {} }))).toBe(error);
	});

	it('refuses missing or non-object colors', () => {
		const error = 'Invalid theme file: "colors" must be an object';
		expect(errorOf(JSON.stringify({ name: 'Test' }))).toBe(error);
		expect(errorOf(JSON.stringify({ name: 'Test', colors: null }))).toBe(error);
		expect(errorOf(JSON.stringify({ name: 'Test', colors: ['#fff'] }))).toBe(error);
	});

	it('refuses non-object input', () => {
		expect(errorOf('"string"')).toBe(PARSE_ERROR);
		expect(errorOf('42')).toBe(PARSE_ERROR);
		expect(errorOf('null')).toBe(PARSE_ERROR);
		expect(errorOf('[]')).toBe(PARSE_ERROR);
	});

	it('refuses a non-color value and names its token path', () => {
		const json = JSON.stringify({ name: 'Evil', colors: { preview: { embedBg: 'url(https://example.com/x)' } } });
		expect(errorOf(json)).toBe('Invalid theme file: "preview.embedBg" is not a valid color or token');
	});

	it('refuses a non-string value', () => {
		const json = JSON.stringify({ name: 'T', colors: { callout: { note: 42 } } });
		expect(errorOf(json)).toContain('"callout.note"');
	});

	it('refuses an unknown token key', () => {
		const json = JSON.stringify({ name: 'T', colors: { ui: { notAToken: '#fff' } } });
		expect(errorOf(json)).toContain('"ui.notAToken"');
	});

	it('refuses an unknown group', () => {
		const json = JSON.stringify({ name: 'T', colors: { bogus: { background: '#fff' } } });
		expect(errorOf(json)).toContain('"bogus"');
	});

	it('refuses a file over the size cap', () => {
		const json = JSON.stringify({ name: 'T', colors: {}, pad: 'x'.repeat(MAX_THEME_FILE_LENGTH) });
		expect(errorOf(json)).toBe(`Invalid theme file: larger than ${MAX_THEME_FILE_LENGTH} characters`);
	});

	it('imports a partial file, and missing tokens fill from the defaults', () => {
		const result = parseThemeFromImport(JSON.stringify({ name: 'Partial', colors: { ui: { background: '#123456' } } }));
		if (!result.ok) throw new Error(result.error);
		const colors = mergeThemeWithDefaults(result.theme.colors as Partial<ThemeColors>);
		expect(colors.ui.background).toBe('#123456');
		expect(colors.callout.note).toBe(KOKOBRAIN_DEFAULT_THEME.colors.callout.note);
	});

	it('re-imports a theme whose color-mix source tokens were expanded and exported', () => {
		const mix = 'color-mix(in srgb, #ffffff 50%, transparent)';
		const sources = { ui: { primary: mix, muted: mix }, syntax: { link: mix }, preview: { blockquoteBorder: mix } };
		const first = parseThemeFromImport(JSON.stringify({ name: 'Mix', colors: sources }));
		if (!first.ok) throw new Error(first.error);
		const theme = { name: 'Mix', colors: mergeThemeWithDefaults(first.theme.colors as Partial<ThemeColors>) };
		expect(parseThemeFromImport(serializeThemeForExport(theme))).toEqual({ ok: true, theme });
	});

	it('round-trips every built-in theme through export and import unchanged', () => {
		for (const theme of BUILTIN_THEMES) {
			const result = parseThemeFromImport(serializeThemeForExport(theme));
			expect(result, theme.name).toEqual({ ok: true, theme });
			if (result.ok) expect(mergeThemeWithDefaults(result.theme.colors), theme.name).toEqual(theme.colors);
		}
	});
});

describe('color group constants', () => {
	it('UI_COLOR_GROUPS covers every UI token exactly once', () => {
		const allKeys = UI_COLOR_GROUPS.flatMap((g) => g.keys);
		expect([...allKeys].sort()).toEqual(Object.keys(KOKOBRAIN_DEFAULT_THEME.colors.ui).sort());
	});

	it('shows the type palette, warning and success tokens in their own UI group', () => {
		const group = UI_COLOR_GROUPS.find((g) => g.label === 'Type Palette');
		expect(group?.keys).toEqual([...TYPE_PALETTE_TOKENS, 'warning', 'success']);
	});

	it('labels the rail and panel tokens "Rail and Panels"', () => {
		const group = UI_COLOR_GROUPS.find((g) => g.keys.includes('fileExplorerBg'));
		expect(group?.label).toBe('Rail and Panels');
		expect(UI_COLOR_GROUPS.map((g) => g.label)).not.toContain('Left Sidebar');
	});

	it('SYNTAX_COLOR_GROUPS covers all 19 syntax tokens', () => {
		const allKeys = SYNTAX_COLOR_GROUPS.flatMap((g) => g.keys);
		expect(allKeys).toHaveLength(19);
		expect(new Set(allKeys).size).toBe(19);
	});

	it('PREVIEW_COLOR_GROUPS covers every preview token exactly once', () => {
		const allKeys = PREVIEW_COLOR_GROUPS.flatMap((g) => g.keys);
		expect([...allKeys].sort()).toEqual(Object.keys(KOKOBRAIN_DEFAULT_THEME.colors.preview).sort());
	});

	it('WIKILINK_COLOR_GROUPS covers all 5 wikilink tokens', () => {
		const allKeys = WIKILINK_COLOR_GROUPS.flatMap((g) => g.keys);
		expect(allKeys).toHaveLength(5);
	});

	it('CALLOUT_COLOR_GROUPS covers all 6 callout tokens', () => {
		const allKeys = CALLOUT_COLOR_GROUPS.flatMap((g) => g.keys);
		expect(allKeys).toHaveLength(6);
	});

	it('COLOR_GROUP_ORDER has all 5 groups', () => {
		expect(COLOR_GROUP_ORDER).toEqual(['ui', 'syntax', 'preview', 'wikilink', 'callout']);
	});

	it('COLOR_GROUP_LABELS has labels for all groups', () => {
		expect(COLOR_GROUP_LABELS.ui).toBe('UI');
		expect(COLOR_GROUP_LABELS.syntax).toBe('Syntax');
		expect(COLOR_GROUP_LABELS.preview).toBe('Preview');
		expect(COLOR_GROUP_LABELS.wikilink).toBe('Wikilink');
		expect(COLOR_GROUP_LABELS.callout).toBe('Callout');
	});
});
