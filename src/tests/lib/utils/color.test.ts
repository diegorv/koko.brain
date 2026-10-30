import { describe, it, expect } from 'vitest';
import { isDarkColor } from '#lib/utils/color.js';

describe('isDarkColor', () => {
	it('detects dark hex backgrounds', () => {
		expect(isDarkColor('#2a2e3d')).toBe(true);
		expect(isDarkColor('#000')).toBe(true);
		expect(isDarkColor('#0d1b2aff')).toBe(true);
	});

	it('detects light hex backgrounds', () => {
		expect(isDarkColor('#ffffff')).toBe(false);
		expect(isDarkColor('#FDF5F5')).toBe(false);
		expect(isDarkColor('#fff')).toBe(false);
	});

	it('reads rgb() and rgba() values', () => {
		expect(isDarkColor('rgb(30, 30, 30)')).toBe(true);
		expect(isDarkColor('rgba(245, 245, 245, 1)')).toBe(false);
	});

	it('trims whitespace from computed style values', () => {
		expect(isDarkColor('  #ffffff ')).toBe(false);
	});

	it('returns null for empty or unparseable input', () => {
		expect(isDarkColor('')).toBeNull();
		expect(isDarkColor('oklch(0.2 0.02 270)')).toBeNull();
		expect(isDarkColor('#12')).toBeNull();
	});
});
