/** Preset tag colors (same palette as canvas) */
export const TAG_COLOR_PRESETS: Record<string, string> = {
	red: '#fb464c',
	orange: '#e9973f',
	yellow: '#e0de71',
	green: '#44cf6e',
	cyan: '#53dfdd',
	purple: '#a882ff',
};

/** All preset color entries as [name, hex] tuples for iteration */
export const TAG_COLOR_PRESET_ENTRIES = Object.entries(TAG_COLOR_PRESETS) as [string, string][];

/**
 * Looks up the color for a tag from the color map.
 * Tags are compared case-insensitively (keys stored lowercase).
 * Returns the hex color string or undefined if none assigned.
 */
export function getTagColor(
	tagPath: string,
	colorMap: Record<string, string>,
): string | undefined {
	return colorMap[tagPath.toLowerCase()];
}

/**
 * Returns a contrasting text color (white or dark) for the given hex background.
 * Uses perceived brightness formula: (R*299 + G*587 + B*114) / 1000.
 */
export function getContrastTextColor(hex: string): string {
	const h = hex.replace('#', '');
	const r = parseInt(h.substring(0, 2), 16);
	const g = parseInt(h.substring(2, 4), 16);
	const b = parseInt(h.substring(4, 6), 16);
	const brightness = (r * 299 + g * 587 + b * 114) / 1000;
	return brightness > 150 ? '#1e1e2e' : '#ffffff';
}

/**
 * Returns an updated color map with the given tag color set or removed.
 * If `color` is undefined, removes the entry. Otherwise, sets it.
 * Returns a new object (does not mutate the input).
 */
export function setTagColor(
	colorMap: Record<string, string>,
	tagPath: string,
	color: string | undefined,
): Record<string, string> {
	const lower = tagPath.toLowerCase();
	const next = { ...colorMap };
	if (color === undefined) {
		delete next[lower];
	} else {
		next[lower] = color;
	}
	return next;
}
