import { describe, it, expect } from 'vitest';
import { isDarkColor, contrastRatio, ensureContrast, flatten } from '#lib/utils/color.js';

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

describe('contrastRatio', () => {
	it('computes WCAG ratios', () => {
		expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
		expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
	});

	it('returns null when a color cannot be parsed', () => {
		expect(contrastRatio('oklch(0.5 0.1 200)', '#ffffff')).toBeNull();
	});
});

describe('ensureContrast', () => {
	it('returns the color unchanged when it already passes', () => {
		expect(ensureContrast('#222222', '#ffffff', 4.5)).toBe('#222222');
	});

	it('darkens a failing color on a light background until it passes', () => {
		const out = ensureContrast('#e5b41f', '#ffffff', 4.5);
		expect(contrastRatio(out, '#ffffff')!).toBeGreaterThanOrEqual(4.5);
		expect(contrastRatio(out, '#ffffff')!).toBeLessThan(5.2);
	});

	it('lightens a failing color on a dark background until it passes', () => {
		const out = ensureContrast('#1d75b3', '#2b2b2c', 4.5);
		expect(contrastRatio(out, '#2b2b2c')!).toBeGreaterThanOrEqual(4.5);
	});

	it('keeps the hue family (a darkened yellow stays warm)', () => {
		const out = ensureContrast('#e5b41f', '#ffffff', 4.5);
		const [r, , b] = [1, 3, 5].map((i) => parseInt(out.slice(i, i + 2), 16));
		expect(r).toBeGreaterThan(b);
	});

	it('keeps light text light when white can reach the minimum', () => {
		// #c82828 is mid-luminance; white reaches 5.9:1 on it, so the fix must not flip to dark text
		const out = ensureContrast('#d0ccd8', '#c82828', 4.5);
		expect(contrastRatio(out, '#c82828')!).toBeGreaterThanOrEqual(4.5);
		expect(isDarkColor(out)).toBe(false);
	});

	it('flips to the other extreme only when its own side cannot reach the minimum', () => {
		// White on #f3333b tops out near 3.9:1, so dark text is the only way to 4.5
		const out = ensureContrast('#f9f9f5', '#f3333b', 4.5);
		expect(contrastRatio(out, '#f3333b')!).toBeGreaterThanOrEqual(4.5);
		expect(isDarkColor(out)).toBe(true);
	});

	it('reaches the minimum on a background where only black can (luminance just under 0.2)', () => {
		// White on #787878 is 4.41:1, black is 4.76:1
		const out = ensureContrast('#eeeeee', '#787878', 4.5);
		expect(contrastRatio(out, '#787878')!).toBeGreaterThanOrEqual(4.5);
	});

	it('keeps an 8-digit alpha suffix', () => {
		expect(ensureContrast('#e5b41f80', '#ffffff', 4.5)).toMatch(/^#[0-9a-f]{6}80$/);
	});

	it('leaves colors it cannot parse untouched', () => {
		expect(ensureContrast('oklch(0.5 0.1 200)', '#ffffff', 4.5)).toBe('oklch(0.5 0.1 200)');
	});
});

describe('flatten', () => {
	it('composites an 8-digit hex over a base color', () => {
		expect(flatten('#00000080', '#ffffff')).toBe('#7f7f7f');
	});

	it('returns opaque colors as 6-digit hex unchanged', () => {
		expect(flatten('#123456', '#ffffff')).toBe('#123456');
	});

	it('returns null for unparseable input', () => {
		expect(flatten('oklch(0.5 0.1 200)', '#ffffff')).toBeNull();
	});
});

describe('contrast with translucent colors', () => {
	it('measures a translucent foreground as composited over the background', () => {
		// 50% black over white reads as mid grey, far below opaque black's 21:1
		expect(contrastRatio('#00000080', '#ffffff')!).toBeLessThan(4.5);
	});

	it('lifts a translucent foreground until its composite passes', () => {
		const out = ensureContrast('#e5b41f80', '#ffffff', 3);
		expect(contrastRatio(out, '#ffffff')!).toBeGreaterThanOrEqual(3);
		expect(out).toMatch(/80$/);
	});
});
