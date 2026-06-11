import { describe, it, expect } from 'vitest';
import {
	TAG_COLOR_PRESETS,
	TAG_COLOR_PRESET_ENTRIES,
	getTagColor,
	getContrastTextColor,
	setTagColor,
} from '$lib/features/tags/tag-colors.logic';

describe('TAG_COLOR_PRESETS', () => {
	it('has 6 preset colors', () => {
		expect(Object.keys(TAG_COLOR_PRESETS)).toHaveLength(6);
	});

	it('all values are valid hex colors', () => {
		for (const hex of Object.values(TAG_COLOR_PRESETS)) {
			expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
		}
	});

	it('TAG_COLOR_PRESET_ENTRIES matches TAG_COLOR_PRESETS', () => {
		expect(TAG_COLOR_PRESET_ENTRIES).toEqual(Object.entries(TAG_COLOR_PRESETS));
	});
});

describe('getTagColor', () => {
	const colorMap: Record<string, string> = {
		work: '#fb464c',
		personal: '#44cf6e',
		'project/frontend': '#a882ff',
	};

	it('returns exact match', () => {
		expect(getTagColor('work', colorMap)).toBe('#fb464c');
	});

	it('returns undefined when no match', () => {
		expect(getTagColor('unknown', colorMap)).toBeUndefined();
	});

	it('is case-insensitive', () => {
		expect(getTagColor('Work', colorMap)).toBe('#fb464c');
		expect(getTagColor('WORK', colorMap)).toBe('#fb464c');
	});

	it('matches nested tag paths', () => {
		expect(getTagColor('project/frontend', colorMap)).toBe('#a882ff');
	});

	it('returns undefined for empty color map', () => {
		expect(getTagColor('work', {})).toBeUndefined();
	});

	it('returns undefined for empty tag path', () => {
		expect(getTagColor('', colorMap)).toBeUndefined();
	});
});

describe('getContrastTextColor', () => {
	it('returns dark text for a light background (brightness > 150)', () => {
		// yellow preset: (224*299 + 222*587 + 113*114) / 1000 ≈ 210
		expect(getContrastTextColor('#e0de71')).toBe('#1e1e2e');
	});

	it('returns white text for a dark background (brightness <= 150)', () => {
		// red preset: (251*299 + 70*587 + 76*114) / 1000 ≈ 125
		expect(getContrastTextColor('#fb464c')).toBe('#ffffff');
	});

	it('returns white text for pure black', () => {
		expect(getContrastTextColor('#000000')).toBe('#ffffff');
	});

	it('returns dark text for pure white', () => {
		expect(getContrastTextColor('#ffffff')).toBe('#1e1e2e');
	});

	it('accepts hex strings without the # prefix', () => {
		expect(getContrastTextColor('000000')).toBe('#ffffff');
		expect(getContrastTextColor('ffffff')).toBe('#1e1e2e');
	});

	it('treats brightness exactly 150 as dark (white text)', () => {
		// #969696 → (150*299 + 150*587 + 150*114) / 1000 = 150 → not > 150
		expect(getContrastTextColor('#969696')).toBe('#ffffff');
	});

	it('picks a readable text color for every preset', () => {
		for (const hex of Object.values(TAG_COLOR_PRESETS)) {
			expect(['#1e1e2e', '#ffffff']).toContain(getContrastTextColor(hex));
		}
	});
});

describe('setTagColor', () => {
	it('sets a new color', () => {
		const result = setTagColor({}, 'work', '#fb464c');
		expect(result).toEqual({ work: '#fb464c' });
	});

	it('removes a color when value is undefined', () => {
		const result = setTagColor({ work: '#fb464c' }, 'work', undefined);
		expect(result).toEqual({});
	});

	it('does not mutate the original map', () => {
		const original = { work: '#fb464c' };
		const result = setTagColor(original, 'personal', '#44cf6e');
		expect(original).toEqual({ work: '#fb464c' });
		expect(result).toEqual({ work: '#fb464c', personal: '#44cf6e' });
	});

	it('stores keys as lowercase', () => {
		const result = setTagColor({}, 'Work', '#fb464c');
		expect(result).toEqual({ work: '#fb464c' });
	});

	it('removes using case-insensitive key', () => {
		const result = setTagColor({ work: '#fb464c' }, 'WORK', undefined);
		expect(result).toEqual({});
	});

	it('overwrites existing color for same tag', () => {
		const result = setTagColor({ work: '#fb464c' }, 'work', '#a882ff');
		expect(result).toEqual({ work: '#a882ff' });
	});

	it('handles nested tag paths', () => {
		const result = setTagColor({}, 'project/frontend', '#53dfdd');
		expect(result).toEqual({ 'project/frontend': '#53dfdd' });
	});
});
