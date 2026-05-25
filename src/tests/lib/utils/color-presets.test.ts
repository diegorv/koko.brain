import { describe, it, expect } from 'vitest';
import { COLOR_PRESET_BG, COLOR_PRESET_TEXT } from '$lib/utils/color-presets';

const EXPECTED_KEYS = ['blue', 'green', 'red', 'orange', 'purple', 'yellow', 'gray'];

describe('color-presets', () => {
	describe('COLOR_PRESET_BG', () => {
		it('contains all 7 palette colors', () => {
			expect(Object.keys(COLOR_PRESET_BG).sort()).toEqual([...EXPECTED_KEYS].sort());
		});

		it('values are rgba() strings with alpha 0.15', () => {
			for (const value of Object.values(COLOR_PRESET_BG)) {
				expect(value).toMatch(/^rgba\(\d+,\d+,\d+,0\.15\)$/);
			}
		});

		it('blue preset has correct RGB values', () => {
			expect(COLOR_PRESET_BG.blue).toBe('rgba(66,153,225,0.15)');
		});
	});

	describe('COLOR_PRESET_TEXT', () => {
		it('contains all 7 palette colors', () => {
			expect(Object.keys(COLOR_PRESET_TEXT).sort()).toEqual([...EXPECTED_KEYS].sort());
		});

		it('values are rgb() strings without alpha', () => {
			for (const value of Object.values(COLOR_PRESET_TEXT)) {
				expect(value).toMatch(/^rgb\(\d+,\d+,\d+\)$/);
			}
		});
	});

	it('BG and TEXT maps share the same key set', () => {
		expect(Object.keys(COLOR_PRESET_BG).sort()).toEqual(Object.keys(COLOR_PRESET_TEXT).sort());
	});
});
