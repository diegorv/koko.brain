import { describe, it, expect } from 'vitest';
import { isDarkColor, contrastRatio, ensureContrast, flatten, mixColors } from '#lib/utils/color.js';

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

	it('reads oklch() values', () => {
		expect(isDarkColor('oklch(0.2 0.02 270)')).toBe(true);
		expect(isDarkColor('oklch(1 0 0)')).toBe(false);
	});

	it('returns null for empty or unparseable input', () => {
		expect(isDarkColor('')).toBeNull();
		expect(isDarkColor('oklch(foo)')).toBeNull();
		expect(isDarkColor('#12')).toBeNull();
	});
});

describe('oklch parsing', () => {
	it('converts through OKLab to the sRGB hex it names', () => {
		expect(flatten('oklch(1 0 0)', '#000000')).toBe('#ffffff');
		expect(flatten('oklch(0 0 0)', '#ffffff')).toBe('#000000');
		// The Default theme's selected row, documented as #242835 in sRGB
		expect(flatten('oklch(0.28 0.025 272)', '#000000')).toBe('#242835');
	});

	it('reads a percentage lightness, a deg hue and a percentage chroma (of 0.4)', () => {
		expect(flatten('oklch(28% 0.025 272deg)', '#000000')).toBe('#242835');
		expect(flatten('OKLCH(28% 6.25% 272)', '#000000')).toBe('#242835');
	});

	it('reads a / alpha and composites it', () => {
		expect(flatten('oklch(0 0 0 / 0.5)', '#ffffff')).toBe('#808080');
		expect(flatten('oklch(0 0 0 / 50%)', '#ffffff')).toBe('#808080');
	});

	it('clamps out-of-gamut colors to sRGB', () => {
		expect(flatten('oklch(0.7 0.4 30)', '#000000')).toMatch(/^#[0-9a-f]{6}$/);
	});

	it('returns null for malformed oklch', () => {
		expect(flatten('oklch(foo)', '#ffffff')).toBeNull();
		expect(flatten('oklch(0.5 0.1)', '#ffffff')).toBeNull();
		expect(flatten('oklch(0.5, 0.1, 200)', '#ffffff')).toBeNull();
	});

	it('returns null instead of throwing when a huge chroma overflows the conversion', () => {
		const huge = `oklch(0.5 1${'0'.repeat(110)} 270)`;
		expect(huge.length).toBeLessThanOrEqual(128);
		expect(isDarkColor(huge)).toBeNull();
		expect(flatten(huge, '#ffffff')).toBeNull();
	});
});

describe('contrastRatio', () => {
	it('computes WCAG ratios', () => {
		expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
		expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
	});

	it('reads oklch() colors', () => {
		// The Default theme's muted sidebar text on its navigator background
		const ratio = contrastRatio('oklch(0.55 0.06 268)', '#262938');
		expect(ratio).not.toBeNull();
		expect(ratio!).toBeLessThan(4.5);
	});

	it('returns null when a color cannot be parsed', () => {
		expect(contrastRatio('hsl(200 50% 50%)', '#ffffff')).toBeNull();
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

	it('lifts a failing oklch() color to a hex that passes', () => {
		const out = ensureContrast('oklch(0.55 0.06 268)', '#262938', 4.5);
		expect(out).toMatch(/^#[0-9a-f]{6}$/);
		expect(contrastRatio(out, '#262938')!).toBeGreaterThanOrEqual(4.5);
	});

	it('leaves colors it cannot parse untouched', () => {
		expect(ensureContrast('hsl(200 50% 50%)', '#ffffff', 4.5)).toBe('hsl(200 50% 50%)');
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
		expect(flatten('hsl(200 50% 50%)', '#ffffff')).toBeNull();
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

describe('mixColors', () => {
	it('returns the OKLab midpoint of two colors as hex', () => {
		expect(mixColors('#ffffff', '#ffffff')).toBe('#ffffff');
		expect(mixColors('#000000', '#000000')).toBe('#000000');
		const orange = mixColors('#ff0000', '#ffff00');
		expect(orange).toMatch(/^#[0-9a-f]{6}$/);
		expect(parseInt(orange!.slice(1, 3), 16)).toBe(255);
		const g = parseInt(orange!.slice(3, 5), 16);
		expect(g).toBeGreaterThan(80);
		expect(g).toBeLessThan(220);
	});

	it('weights the mix toward the second color', () => {
		expect(mixColors('#ff0000', '#0000ff', 0)).toBe('#ff0000');
		expect(mixColors('#ff0000', '#0000ff', 1)).toBe('#0000ff');
		expect(mixColors('#ff0000', '#0000ff', 0.5)).toBe(mixColors('#ff0000', '#0000ff'));
		const near = parseInt(mixColors('#000000', '#ffffff', 0.25)!.slice(1, 3), 16);
		const far = parseInt(mixColors('#000000', '#ffffff', 0.75)!.slice(1, 3), 16);
		expect(near).toBeLessThan(far);
	});

	it('returns null when either color is unparseable', () => {
		expect(mixColors('hsl(200 50% 50%)', '#ffffff')).toBeNull();
		expect(mixColors('#ffffff', '')).toBeNull();
	});
});
