/** Base RGB values for the shared color palette */
const PALETTE: Record<string, [number, number, number]> = {
	blue:   [66, 153, 225],
	green:  [72, 187, 120],
	red:    [239, 68, 68],
	orange: [237, 137, 54],
	purple: [139, 108, 239],
	yellow: [234, 179, 8],
	gray:   [160, 160, 160],
};

/** Builds an rgba() string from a palette entry */
function rgba([r, g, b]: [number, number, number], alpha: number): string {
	return `rgba(${r},${g},${b},${alpha})`;
}

/** Builds an rgb() string from a palette entry */
function rgb([r, g, b]: [number, number, number]): string {
	return `rgb(${r},${g},${b})`;
}

/** Named color presets with background (low opacity) variant. Used by QueryJS cards. */
export const COLOR_PRESET_BG: Record<string, string> = Object.fromEntries(
	Object.entries(PALETTE).map(([name, val]) => [name, rgba(val, 0.15)])
);

/** Named color presets with full opacity for text/bars. Used by Collection display functions. */
export const COLOR_PRESET_TEXT: Record<string, string> = Object.fromEntries(
	Object.entries(PALETTE).map(([name, val]) => [name, rgb(val)])
);

/** Available color preset names */
export type ColorPresetName = keyof typeof PALETTE;
