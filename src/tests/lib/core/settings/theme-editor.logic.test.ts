import { describe, it, expect } from 'vitest';
import {
	camelCaseToLabel,
	isValidHex,
	normalizeHex,
	hexToColorInputValue,
	validateThemeName,
	serializeThemeForExport,
	parseThemeFromImport,
	UI_COLOR_GROUPS,
	SYNTAX_COLOR_GROUPS,
	PREVIEW_COLOR_GROUPS,
	WIKILINK_COLOR_GROUPS,
	CALLOUT_COLOR_GROUPS,
	COLOR_GROUP_LABELS,
	COLOR_GROUP_ORDER,
} from '$lib/core/settings/theme-editor.logic';
import { KOKOBRAIN_DEFAULT_THEME } from '$lib/core/settings/theme.logic';

describe('camelCaseToLabel', () => {
	it('converts simple camelCase to spaced label', () => {
		expect(camelCaseToLabel('tabBar')).toBe('Tab Bar');
		expect(camelCaseToLabel('cardForeground')).toBe('Card Foreground');
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
	it('parses valid theme JSON', () => {
		const json = JSON.stringify({ name: 'Test', colors: { ui: { background: '#fff' } } });
		const result = parseThemeFromImport(json);
		expect(result).not.toBeNull();
		expect(result!.name).toBe('Test');
	});

	it('returns null for malformed JSON', () => {
		expect(parseThemeFromImport('not json')).toBeNull();
		expect(parseThemeFromImport('{incomplete')).toBeNull();
	});

	it('returns null when name is missing', () => {
		expect(parseThemeFromImport(JSON.stringify({ colors: {} }))).toBeNull();
	});

	it('returns null when name is empty', () => {
		expect(parseThemeFromImport(JSON.stringify({ name: '', colors: {} }))).toBeNull();
		expect(parseThemeFromImport(JSON.stringify({ name: '  ', colors: {} }))).toBeNull();
	});

	it('returns null when colors is missing', () => {
		expect(parseThemeFromImport(JSON.stringify({ name: 'Test' }))).toBeNull();
	});

	it('returns null for non-object input', () => {
		expect(parseThemeFromImport('"string"')).toBeNull();
		expect(parseThemeFromImport('42')).toBeNull();
		expect(parseThemeFromImport('null')).toBeNull();
	});

	it('roundtrips with serializeThemeForExport', () => {
		const json = serializeThemeForExport(KOKOBRAIN_DEFAULT_THEME);
		const result = parseThemeFromImport(json);
		expect(result).not.toBeNull();
		expect(result!.name).toBe(KOKOBRAIN_DEFAULT_THEME.name);
		expect(result!.colors.ui.background).toBe(KOKOBRAIN_DEFAULT_THEME.colors.ui.background);
		expect(result!.colors.callout.note).toBe(KOKOBRAIN_DEFAULT_THEME.colors.callout.note);
	});
});

describe('color group constants', () => {
	it('UI_COLOR_GROUPS covers all 33 UI tokens', () => {
		const allKeys = UI_COLOR_GROUPS.flatMap((g) => g.keys);
		expect(allKeys).toHaveLength(33);
		// Verify no duplicates
		expect(new Set(allKeys).size).toBe(33);
	});

	it('SYNTAX_COLOR_GROUPS covers all 19 syntax tokens', () => {
		const allKeys = SYNTAX_COLOR_GROUPS.flatMap((g) => g.keys);
		expect(allKeys).toHaveLength(19);
		expect(new Set(allKeys).size).toBe(19);
	});

	it('PREVIEW_COLOR_GROUPS covers all 51 preview tokens', () => {
		const allKeys = PREVIEW_COLOR_GROUPS.flatMap((g) => g.keys);
		expect(allKeys).toHaveLength(51);
		expect(new Set(allKeys).size).toBe(51);
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
