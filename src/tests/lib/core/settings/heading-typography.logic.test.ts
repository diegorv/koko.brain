import { describe, it, expect } from 'vitest';
import { FONT_WEIGHT_MAP, headingTypographyToCssVars } from '$lib/core/settings/heading-typography.logic';
import type { HeadingTypography } from '$lib/core/settings/settings.types';

const DEFAULT_TYPOGRAPHY: HeadingTypography = {
	h1: { fontSize: 2.058, lineHeight: 1.4, fontWeight: 'bold', letterSpacing: -0.02 },
	h2: { fontSize: 1.618, lineHeight: 1.4, fontWeight: 'bold', letterSpacing: -0.015 },
	h3: { fontSize: 1.272, lineHeight: 1.4, fontWeight: 'bold', letterSpacing: -0.01 },
	h4: { fontSize: 1.0, lineHeight: 1.6, fontWeight: 'bold', letterSpacing: 0 },
	h5: { fontSize: 1.0, lineHeight: 1.6, fontWeight: 'bold', letterSpacing: 0 },
	h6: { fontSize: 1.0, lineHeight: 1.6, fontWeight: 'bold', letterSpacing: 0 },
};

describe('FONT_WEIGHT_MAP', () => {
	it('maps bold to 700', () => {
		expect(FONT_WEIGHT_MAP.bold).toBe('700');
	});

	it('maps semibold to 600', () => {
		expect(FONT_WEIGHT_MAP.semibold).toBe('600');
	});

	it('maps normal to 400', () => {
		expect(FONT_WEIGHT_MAP.normal).toBe('400');
	});
});

describe('headingTypographyToCssVars', () => {
	it('generates 24 CSS variables (4 per heading level)', () => {
		const vars = headingTypographyToCssVars(DEFAULT_TYPOGRAPHY);
		expect(Object.keys(vars)).toHaveLength(24);
	});

	it('generates correct variable names for all levels', () => {
		const vars = headingTypographyToCssVars(DEFAULT_TYPOGRAPHY);
		for (const level of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
			expect(vars).toHaveProperty(`--heading-${level}-font-size`);
			expect(vars).toHaveProperty(`--heading-${level}-line-height`);
			expect(vars).toHaveProperty(`--heading-${level}-font-weight`);
			expect(vars).toHaveProperty(`--heading-${level}-letter-spacing`);
		}
	});

	it('generates correct h1 values', () => {
		const vars = headingTypographyToCssVars(DEFAULT_TYPOGRAPHY);
		expect(vars['--heading-h1-font-size']).toBe('2.058em');
		expect(vars['--heading-h1-line-height']).toBe('1.4');
		expect(vars['--heading-h1-font-weight']).toBe('700');
		expect(vars['--heading-h1-letter-spacing']).toBe('-0.02em');
	});

	it('generates correct h2 values', () => {
		const vars = headingTypographyToCssVars(DEFAULT_TYPOGRAPHY);
		expect(vars['--heading-h2-font-size']).toBe('1.618em');
		expect(vars['--heading-h2-line-height']).toBe('1.4');
		expect(vars['--heading-h2-font-weight']).toBe('700');
		expect(vars['--heading-h2-letter-spacing']).toBe('-0.015em');
	});

	it('generates correct h4 values (default/no-change level)', () => {
		const vars = headingTypographyToCssVars(DEFAULT_TYPOGRAPHY);
		expect(vars['--heading-h4-font-size']).toBe('1em');
		expect(vars['--heading-h4-line-height']).toBe('1.6');
		expect(vars['--heading-h4-font-weight']).toBe('700');
		expect(vars['--heading-h4-letter-spacing']).toBe('0em');
	});

	it('handles zero letter spacing', () => {
		const vars = headingTypographyToCssVars(DEFAULT_TYPOGRAPHY);
		expect(vars['--heading-h5-letter-spacing']).toBe('0em');
	});

	it('handles semibold and normal weights', () => {
		const custom: HeadingTypography = {
			...DEFAULT_TYPOGRAPHY,
			h1: { ...DEFAULT_TYPOGRAPHY.h1, fontWeight: 'semibold' },
			h2: { ...DEFAULT_TYPOGRAPHY.h2, fontWeight: 'normal' },
		};
		const vars = headingTypographyToCssVars(custom);
		expect(vars['--heading-h1-font-weight']).toBe('600');
		expect(vars['--heading-h2-font-weight']).toBe('400');
	});

	it('handles custom font sizes', () => {
		const custom: HeadingTypography = {
			...DEFAULT_TYPOGRAPHY,
			h1: { ...DEFAULT_TYPOGRAPHY.h1, fontSize: 3.5 },
		};
		const vars = headingTypographyToCssVars(custom);
		expect(vars['--heading-h1-font-size']).toBe('3.5em');
	});

	it('handles negative letter spacing correctly', () => {
		const custom: HeadingTypography = {
			...DEFAULT_TYPOGRAPHY,
			h3: { ...DEFAULT_TYPOGRAPHY.h3, letterSpacing: -0.05 },
		};
		const vars = headingTypographyToCssVars(custom);
		expect(vars['--heading-h3-letter-spacing']).toBe('-0.05em');
	});
});
