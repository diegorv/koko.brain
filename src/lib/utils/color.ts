/** Parses `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb()` and `rgba()` into 0-255 channels plus 0-1 alpha; null otherwise. */
function parseRgba(color: string): [number, number, number, number] | null {
	const value = color.trim();
	const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(value);
	if (hex) {
		const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1];
		const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
		return [r, g, b, h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1];
	}
	const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/i.exec(value);
	return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), rgb[4] === undefined ? 1 : Number(rgb[4])] : null;
}

/** Parses a color into opaque 0-255 channels, ignoring alpha; null when unparseable. */
function parseRgb(color: string): [number, number, number] | null {
	const rgba = parseRgba(color);
	return rgba ? [rgba[0], rgba[1], rgba[2]] : null;
}

/** 0-255 channels to a 6-digit hex. */
function toHex(rgb: number[]): string {
	return '#' + rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('');
}

/** Composites `color` (alpha honored) over the opaque `base` into a 6-digit hex; null when either is unparseable. */
export function flatten(color: string, base: string): string | null {
	const fg = parseRgba(color);
	const bg = parseRgb(base);
	if (!fg || !bg) return null;
	const a = fg[3];
	return toHex([0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a)));
}

/** sRGB channel (0-255) to linear light (0-1). */
function toLinear(c: number): number {
	const s = c / 255;
	return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of 0-255 channels. */
function luminance([r, g, b]: [number, number, number]): number {
	return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * True when a background color is dark (WCAG relative luminance below 0.2),
 * false when light, null when the value is not a hex or rgb() color.
 */
export function isDarkColor(color: string): boolean | null {
	const rgb = parseRgb(color);
	return rgb ? luminance(rgb) < 0.2 : null;
}

/**
 * WCAG contrast ratio of foreground `a` on background `b`, with a translucent `a`
 * composited over `b` (`b`'s own alpha is ignored; flatten it first). Null when
 * either is not a hex or rgb() color.
 */
export function contrastRatio(a: string, b: string): number | null {
	const flat = flatten(a, b);
	const x = flat ? parseRgb(flat) : null;
	const y = parseRgb(b);
	if (!x || !y) return null;
	const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p);
	return (hi + 0.05) / (lo + 0.05);
}

/** Linear sRGB (0-1) to OKLab. */
function toOklab([r, g, b]: number[]): number[] {
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	return [
		0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
	];
}

/** OKLab to a 6-digit hex, clamping to the sRGB gamut. */
function oklabToHex([L, A, B]: number[]): string {
	const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
	const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
	const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
	const linear = [
		4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
	];
	return '#' + linear
		.map((c) => {
			const v = Math.min(1, Math.max(0, c));
			const srgb = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
			return Math.round(srgb * 255).toString(16).padStart(2, '0');
		})
		.join('');
}

/**
 * Returns `fg` moved in OKLab toward white or black by the smallest 1% step that
 * reaches `min` contrast on `bg`, keeping its hue family and any 8-digit alpha
 * suffix. It moves away from `bg` on fg's own side (lighter text gets lighter)
 * unless only the other extreme can reach `min`. Unparseable colors are returned as is.
 */
export function ensureContrast(fg: string, bg: string, min: number): string {
	const ratio = contrastRatio(fg, bg);
	const rgb = parseRgb(fg);
	const bgRgb = parseRgb(bg);
	if (ratio === null || !rgb || !bgRgb || ratio >= min) return fg;
	const suffix = /^#[0-9a-f]{8}$/i.test(fg.trim()) ? fg.trim().slice(7) : '';
	const from = toOklab(rgb.map(toLinear));
	// Prefer the extreme on fg's own side of bg; switch only when that side cannot reach `min`.
	const whiteOk = (contrastRatio('#ffffff', bg) ?? 0) >= min;
	const blackOk = (contrastRatio('#000000', bg) ?? 0) >= min;
	const towardWhite = luminance(rgb) > luminance(bgRgb) ? whiteOk || !blackOk : !blackOk && whiteOk;
	const to = towardWhite ? toOklab([1, 1, 1]) : toOklab([0, 0, 0]);
	let out = fg;
	for (let step = 1; step <= 100; step++) {
		const t = step / 100;
		out = oklabToHex(from.map((v, i) => v + (to[i] - v) * t));
		if ((contrastRatio(out + suffix, bg) ?? 0) >= min) break;
	}
	return out + suffix;
}
