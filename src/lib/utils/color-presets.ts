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

/** Named color presets with full opacity: the kanban color swatches, and the hue the text and bar mixes start from. */
export const COLOR_PRESET_TEXT: Record<string, string> = Object.fromEntries(
	Object.entries(PALETTE).map(([name, val]) => [name, rgb(val)])
);

/**
 * Named color presets for text on a `COLOR_PRESET_BG` chip (kanban tags, the
 * collection `badge()`): the preset mixed toward `--editor-fg`, so it keeps a hue
 * cast and stays readable on the chip tint, also when the chip sits on a coloured
 * kanban card. `src/tests/lib/utils/color-presets.test.ts` gates the share at
 * 4.5:1 on the built-in and hard-palette themes.
 */
export const COLOR_PRESET_CHIP_TEXT: Record<string, string> = Object.fromEntries(
	Object.entries(PALETTE).map(([name, val]) => [name, `color-mix(in oklab, ${rgb(val)} 13%, var(--editor-fg))`])
);

/**
 * Named color presets for text on the bare collection surface (`color()`): no
 * tint sits under it, so it keeps more of the preset than chip text and the
 * colors stay apart. `src/tests/lib/features/collection/expression/evaluator.test.ts`
 * gates the share at 4.5:1 on the built-in and hard-palette themes.
 */
export const COLOR_PRESET_PLAIN_TEXT: Record<string, string> = Object.fromEntries(
	Object.entries(PALETTE).map(([name, val]) => [name, `color-mix(in oklab, ${rgb(val)} 20%, var(--editor-fg))`])
);

/**
 * Named color presets for a bar (the collection `progress()` fill and track
 * outline): the preset moved toward `--editor-fg` until it reaches 3:1, the
 * non-text minimum, on the collection surfaces of the built-in and hard-palette
 * themes (`src/tests/lib/features/collection/expression/evaluator.test.ts`).
 */
export const COLOR_PRESET_BAR: Record<string, string> = Object.fromEntries(
	Object.entries(PALETTE).map(([name, val]) => [name, `color-mix(in oklab, ${rgb(val)} 45%, var(--editor-fg))`])
);
