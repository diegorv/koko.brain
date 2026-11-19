const NUM = String.raw`[+-]?(?:\d+(?:\.\d*)?|\.\d+)`;
/** CSS `oklch(L C H / A)`: L number or %, C number or % (100% = 0.4), H in degrees, optional alpha number or %. */
const OKLCH = new RegExp(
	String.raw`^oklch\(\s*(${NUM})(%?)\s+(${NUM})(%?)\s+(${NUM})(?:deg)?\s*(?:\/\s*(${NUM})(%?)\s*)?\)$`,
	'i',
);

const COMMA = String.raw`\s*,\s*`;
const SPACE = String.raw`\s+`;
const SLASH = String.raw`\s*\/\s*`;
/** Optional alpha after `sep`, a number or a percentage. */
const alphaAfter = (sep: string) => String.raw`(?:${sep}(${NUM})(%?))?`;
/**
 * CSS `rgb()`/`rgba()`, channels 0-255 or %, optional alpha: the legacy form
 * separates everything with commas, the modern one uses spaces and a `/` alpha.
 * CSS rejects a mix of the two, so each form is its own pattern.
 */
const rgbForm = (sep: string, alphaSep: string) =>
	new RegExp(String.raw`^rgba?\(\s*(${NUM})(%?)${sep}(${NUM})(%?)${sep}(${NUM})(%?)${alphaAfter(alphaSep)}\s*\)$`, 'i');
const RGB = [rgbForm(COMMA, COMMA), rgbForm(SPACE, SLASH)];
/** CSS `hsl()`/`hsla()`, legacy comma or modern space form as for `rgb()`: H in degrees, S and L in % (the % sign optional). */
const hslForm = (sep: string, alphaSep: string) =>
	new RegExp(String.raw`^hsla?\(\s*(${NUM})(?:deg)?${sep}(${NUM})%?${sep}(${NUM})%?${alphaAfter(alphaSep)}\s*\)$`, 'i');
const HSL = [hslForm(COMMA, COMMA), hslForm(SPACE, SLASH)];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** A captured alpha (number, or percentage when `pct` is set) as 0-1; 1 when absent. */
const alphaOf = (n: string | undefined, pct: string | undefined) =>
	n === undefined ? 1 : clamp01(Number(n) / (pct ? 100 : 1));

/** HSL (hue in degrees, saturation and lightness 0-1) to 0-255 channels, by the CSS Color 4 formula. */
function hslToRgb(hue: number, s: number, l: number): [number, number, number] {
	const h = ((hue % 360) + 360) % 360;
	const a = s * Math.min(l, 1 - l);
	const f = (n: number) => {
		const k = (n + h / 30) % 12;
		return (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255;
	};
	return [f(0), f(8), f(4)];
}

/**
 * Parses `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()`/`rgba()` and
 * `hsl()`/`hsla()` (comma or space syntax) and `oklch()` into 0-255 channels
 * plus 0-1 alpha; null otherwise. oklch is clamped to the sRGB gamut.
 */
function parseRgba(color: string): [number, number, number, number] | null {
	const value = color.trim();
	const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(value);
	if (hex) {
		const h = hex[1].length <= 4 ? [...hex[1]].map((c) => c + c).join('') : hex[1];
		const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
		return [r, g, b, h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1];
	}
	const ok = OKLCH.exec(value);
	if (ok) {
		const L = clamp01(Number(ok[1]) / (ok[2] ? 100 : 1));
		const C = Math.max(0, ok[4] ? (Number(ok[3]) / 100) * 0.4 : Number(ok[3]));
		const h = (Number(ok[5]) * Math.PI) / 180;
		const a = ok[6] === undefined ? 1 : clamp01(Number(ok[6]) / (ok[7] ? 100 : 1));
		// A huge chroma overflows to NaN channels, whose hex does not parse back
		const rgb = parseRgba(oklabToHex([L, C * Math.cos(h), C * Math.sin(h)]));
		return rgb ? [rgb[0], rgb[1], rgb[2], a] : null;
	}
	const rgb = RGB[0].exec(value) ?? RGB[1].exec(value);
	if (rgb) {
		const channel = (n: string, pct: string) => Math.min(255, Math.max(0, pct ? (Number(n) / 100) * 255 : Number(n)));
		return [channel(rgb[1], rgb[2]), channel(rgb[3], rgb[4]), channel(rgb[5], rgb[6]), alphaOf(rgb[7], rgb[8])];
	}
	const hsl = HSL[0].exec(value) ?? HSL[1].exec(value);
	if (!hsl) return null;
	const [r, g, b] = hslToRgb(Number(hsl[1]), clamp01(Number(hsl[2]) / 100), clamp01(Number(hsl[3]) / 100));
	return [r, g, b, alphaOf(hsl[4], hsl[5])];
}

/** Parses a color into opaque 0-255 channels, ignoring alpha; null when unparseable. */
function parseRgb(color: string): [number, number, number] | null {
	const rgba = parseRgba(color);
	return rgba ? [rgba[0], rgba[1], rgba[2]] : null;
}

/** 0-255 channels to hex: 6 digits for RGB, 8 with a fourth (alpha) channel. */
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

/**
 * Composites `color` at `share` of its own alpha over the opaque `base` into a
 * 6-digit hex: what Tailwind's `bg-x/25` or `color-mix(in oklch, x 18%, transparent)`
 * paints over a surface. Null when either is unparseable.
 */
export function tint(color: string, share: number, base: string): string | null {
	const fg = parseRgba(color);
	const bg = parseRgb(base);
	if (!fg || !bg) return null;
	const a = fg[3] * share;
	return toHex([0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a)));
}

/**
 * `color` with its alpha scaled by `share` (0-1), as an 8-digit hex: the
 * translucent twin of `tint`, for a background that must stay see-through.
 * Null when the color is unparseable.
 */
export function fade(color: string, share: number): string | null {
	const rgba = parseRgba(color);
	if (!rgba) return null;
	return toHex([rgba[0], rgba[1], rgba[2], clamp01(rgba[3] * share) * 255]);
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
 * false when light, null when the value is not a hex, rgb(), hsl() or oklch() color.
 */
export function isDarkColor(color: string): boolean | null {
	const rgb = parseRgb(color);
	return rgb ? luminance(rgb) < 0.2 : null;
}

/**
 * WCAG contrast ratio of foreground `a` on background `b`, with a translucent `a`
 * composited over `b` (`b`'s own alpha is ignored; flatten it first). Null when
 * either is not a hex, rgb(), hsl() or oklch() color.
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
 * True when `fg` reaches `min` WCAG contrast and `minLc` APCA |Lc| on `bg`;
 * false when it does not or either color is unparseable.
 */
function passes(fg: string, bg: string, min: number, minLc: number): boolean {
	if ((contrastRatio(fg, bg) ?? 0) < min) return false;
	return minLc <= 0 || Math.abs(apcaContrast(fg, bg) ?? 0) >= minLc;
}

/**
 * Returns `fg` moved in OKLab toward white or black by the smallest 1% step that
 * reaches `min` WCAG contrast on `bg`, and `minLc` APCA |Lc| when given, keeping
 * its hue family and any 8-digit alpha suffix. It moves away from `bg` on fg's
 * own side (lighter text gets lighter) unless only the other extreme can reach
 * the minimum. When neither black nor white reaches both gates, the APCA gate is
 * dropped. Unparseable colors are returned as is.
 */
export function ensureContrast(fg: string, bg: string, min: number, minLc = 0): string {
	const ratio = contrastRatio(fg, bg);
	const rgb = parseRgb(fg);
	const bgRgb = parseRgb(bg);
	if (ratio === null || !rgb || !bgRgb || passes(fg, bg, min, minLc)) return fg;
	// On a mid-tone background APCA may be out of reach; WCAG alone then decides
	const lc = passes('#ffffff', bg, min, minLc) || passes('#000000', bg, min, minLc) ? minLc : 0;
	if (lc !== minLc && ratio >= min) return fg;
	const suffix = /^#[0-9a-f]{8}$/i.test(fg.trim()) ? fg.trim().slice(7) : '';
	const from = toOklab(rgb.map(toLinear));
	// Prefer the extreme on fg's own side of bg; switch only when that side cannot reach `min`.
	const whiteOk = passes('#ffffff', bg, min, lc);
	const blackOk = passes('#000000', bg, min, lc);
	const towardWhite = luminance(rgb) > luminance(bgRgb) ? whiteOk || !blackOk : !blackOk && whiteOk;
	const to = towardWhite ? toOklab([1, 1, 1]) : toOklab([0, 0, 0]);
	let out = fg;
	for (let step = 1; step <= 100; step++) {
		const t = step / 100;
		out = oklabToHex(from.map((v, i) => v + (to[i] - v) * t));
		if (passes(out + suffix, bg, min, lc)) break;
	}
	return out + suffix;
}

/**
 * `ensureContrast` against several backgrounds at once (a row and its hover or
 * selected tint): lifts `fg` until it reaches `min` (and `minLc`) on each of
 * `bgs`. Backgrounds on both sides of `fg` can pull it apart, so the passes are
 * bounded. Returns `fg` itself when it already passes everywhere or cannot be parsed.
 */
export function ensureContrastOn(fg: string, bgs: string[], min: number, minLc = 0): string {
	let out = fg;
	for (let pass = 0; pass < 4; pass++) {
		const before = out;
		for (const bg of bgs) out = ensureContrast(out, bg, min, minLc);
		if (out === before) break;
	}
	return out;
}

/**
 * Moves a color's OKLab lightness by `delta` (-1 to 1) keeping a and b, the TS
 * twin of CSS `oklch(from x calc(l + delta) c h)`, as a 6-digit hex clamped to
 * the sRGB gamut. Alpha is dropped. Null when the color is unparseable.
 */
export function shiftLightness(color: string, delta: number): string | null {
	const rgb = parseRgb(color);
	if (!rgb) return null;
	const [L, A, B] = toOklab(rgb.map(toLinear));
	return oklabToHex([Math.min(1, Math.max(0, L + delta)), A, B]);
}

/**
 * OKLab mix of two colors as a 6-digit hex (alpha ignored): `t` is the share of
 * `b`, 0.5 (the midpoint) by default. Null when either is unparseable.
 */
export function mixColors(a: string, b: string, t = 0.5): string | null {
	const x = parseRgb(a);
	const y = parseRgb(b);
	if (!x || !y) return null;
	const p = toOklab(x.map(toLinear));
	const q = toOklab(y.map(toLinear));
	return oklabToHex(p.map((v, i) => v + (q[i] - v) * t));
}

/**
 * Perceptual distance between two colors: the Euclidean OKLab distance scaled by
 * 100 (black to white is 100), alpha ignored. Null when either is unparseable.
 */
export function colorDistance(a: string, b: string): number | null {
	const x = parseRgb(a);
	const y = parseRgb(b);
	if (!x || !y) return null;
	const p = toOklab(x.map(toLinear));
	const q = toOklab(y.map(toLinear));
	return Math.hypot(...p.map((v, i) => v - q[i])) * 100;
}

/**
 * APCA screen luminance of 0-255 channels: a plain 2.4 gamma and a soft clamp
 * near black (APCA-W3 0.0.98G constants, https://github.com/Myndex/apca-w3).
 */
function apcaLuminance([r, g, b]: [number, number, number]): number {
	const y = 0.2126729 * (r / 255) ** 2.4 + 0.7151522 * (g / 255) ** 2.4 + 0.072175 * (b / 255) ** 2.4;
	return y < 0.022 ? y + (0.022 - y) ** 1.414 : y;
}

/**
 * Signed APCA lightness contrast Lc of `text` on `bg`, both opaque: positive for
 * dark text on a light background, negative for light on dark, about -108 to 106.
 */
function apcaLc(text: [number, number, number], bg: [number, number, number]): number {
	const t = apcaLuminance(text);
	const b = apcaLuminance(bg);
	if (Math.abs(b - t) < 0.0005) return 0;
	const sapc = b > t ? (b ** 0.56 - t ** 0.57) * 1.14 : (b ** 0.65 - t ** 0.62) * 1.14;
	if (Math.abs(sapc) < 0.1) return 0;
	return (sapc > 0 ? sapc - 0.027 : sapc + 0.027) * 100;
}

/**
 * Signed APCA Lc of `text` on `bg` (APCA-W3 0.0.98G), with a translucent `text`
 * composited over `bg` (`bg`'s own alpha is ignored). Positive for dark text on
 * a light background, negative for light on dark; |Lc| 45 is the floor for
 * muted and small text. Null when either color is unparseable.
 */
export function apcaContrast(text: string, bg: string): number | null {
	const flat = flatten(text, bg);
	const x = flat ? parseRgb(flat) : null;
	const y = parseRgb(bg);
	return x && y ? apcaLc(x, y) : null;
}

/**
 * Fill and text for a label drawn on `color` (a badge, an event bar). The text
 * is black or white, whichever APCA rates more legible: WCAG 2's ratio prefers
 * black on mid blues, purples and reds, where black reads poorly. The fill then
 * moves in OKLab (darker under white, lighter under black) only as far as WCAG 2
 * AA needs, 4.5:1. Null when `color` is unparseable.
 */
export function labelColors(color: string): { fill: string; text: '#000000' | '#ffffff' } | null {
	const rgb = parseRgb(color);
	if (!rgb) return null;
	const text = Math.abs(apcaLc([255, 255, 255], rgb)) > Math.abs(apcaLc([0, 0, 0], rgb)) ? '#ffffff' : '#000000';
	return { fill: ensureContrast(color, text, 4.5), text };
}
