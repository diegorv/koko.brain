import type { HeadingFontWeight, HeadingTypography } from './settings.types';

/** Maps HeadingFontWeight to CSS font-weight numeric values */
export const FONT_WEIGHT_MAP: Record<HeadingFontWeight, string> = {
	bold: '700',
	semibold: '600',
	normal: '400',
};

/** Heading levels in order */
const HEADING_LEVELS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;

/**
 * Converts heading typography settings into a flat map of CSS variable
 * name → value pairs, ready to be set on `document.documentElement.style`.
 *
 * Generated variables per level (e.g. for h1):
 * - `--heading-h1-font-size`      → `2.058em`
 * - `--heading-h1-line-height`    → `1.4`
 * - `--heading-h1-font-weight`    → `700`
 * - `--heading-h1-letter-spacing` → `-0.02em`
 */
export function headingTypographyToCssVars(typography: HeadingTypography): Record<string, string> {
	const vars: Record<string, string> = {};

	for (const level of HEADING_LEVELS) {
		const settings = typography[level];
		vars[`--heading-${level}-font-size`] = `${settings.fontSize}em`;
		vars[`--heading-${level}-line-height`] = `${settings.lineHeight}`;
		vars[`--heading-${level}-font-weight`] = FONT_WEIGHT_MAP[settings.fontWeight];
		vars[`--heading-${level}-letter-spacing`] = `${settings.letterSpacing}em`;
	}

	return vars;
}
