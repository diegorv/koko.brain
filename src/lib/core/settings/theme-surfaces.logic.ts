import { ensureContrastOn, mixColors, shiftLightness, tint } from '#lib/utils/color.js';

/** The applied theme as `appliedThemeStore` exposes it: its CSS variables and its mode. */
export interface AppliedThemeColors {
	/** CSS variables of the applied theme, `--editor-bg` etc. */
	readonly vars: Readonly<Record<string, string>>;
	/** Whether the applied theme is dark (the `.dark` class on the root) */
	readonly isDark: boolean;
}

/**
 * The color of a surface under the applied theme: the column tones app.css
 * derives from `--file-explorer-bg` (`rail-bg`, `nav-bg`, `list-bg`, the `:root`
 * and `.dark` rules above `.column-tones`), else the theme variable `--<name>`.
 * The derived tones are TS twins of those CSS rules: the rail and nav steps are
 * exact, the light `list-bg` mixes in OKLab where CSS mixes in oklch. Null before
 * a theme is applied or when the value does not parse.
 */
export function themeSurface(theme: AppliedThemeColors, name: string): string | null {
	const fe = theme.vars['--file-explorer-bg'];
	switch (name) {
		case 'rail-bg':
			return fe ? (theme.isDark ? shiftLightness(fe, -0.06) : mixColors(fe, '#000000', 0.04)) : null;
		case 'nav-bg':
			return fe ? (theme.isDark ? shiftLightness(fe, -0.03) : fe) : null;
		case 'list-bg': {
			const editor = theme.vars['--editor-bg'];
			if (!fe) return null;
			return theme.isDark ? fe : editor ? mixColors(fe, editor) : null;
		}
		default:
			return theme.vars[`--${name}`] ?? null;
	}
}

/**
 * The theme color `--<color>` at `share` over the surface `name`, as Tailwind's
 * `bg-<color>/25` paints it there (a selected or hovered row). Null when either is missing.
 */
export function themeTint(theme: AppliedThemeColors, color: string, share: number, surface: string): string | null {
	const fg = theme.vars[`--${color}`];
	const bg = themeSurface(theme, surface);
	return fg && bg ? tint(fg, share, bg) : null;
}

/**
 * The surfaces a row's colored icon or title sits on: the `column` and the hover
 * (10%) and selected (25%) tints of `tint` its rows paint (`hover:bg-<tint>/10`,
 * `bg-<tint>/25`). Missing ones are null.
 */
export function rowSurfaces(theme: AppliedThemeColors, column: string, tint: string): (string | null)[] {
	return [themeSurface(theme, column), themeTint(theme, tint, 0.1, column), themeTint(theme, tint, 0.25, column)];
}

/** `color` with a `var(--x)` replaced by the theme's value of `--x` (undefined when it has none); any other color as is. */
export function resolveThemeColor(theme: AppliedThemeColors, color: string): string | undefined {
	const ref = /^var\(\s*--([\w-]+)\s*\)$/.exec(color.trim());
	return ref ? theme.vars[`--${ref[1]}`] : color;
}

/**
 * `color` lifted to `min` contrast on every one of `surfaces` (`ensureContrastOn`),
 * for a fixed or user-chosen hue drawn as text (4.5) or a meaningful icon (3).
 * A `var(--x)` is resolved from the theme first and kept as is when its value
 * already passes. Returns `color` unchanged when it, or every surface, is missing
 * or cannot be measured.
 */
export function readableOn(
	theme: AppliedThemeColors,
	color: string | undefined,
	surfaces: (string | null)[],
	min: number,
): string | undefined {
	if (!color) return color;
	const value = resolveThemeColor(theme, color);
	const bgs = surfaces.filter((s): s is string => !!s);
	if (!value || bgs.length === 0) return color;
	const out = ensureContrastOn(value, bgs, min);
	return out === value ? color : out;
}
