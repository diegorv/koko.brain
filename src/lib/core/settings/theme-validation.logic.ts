import { KOKOBRAIN_DEFAULT_THEME } from './theme.logic';

/** Longest accepted color value, in characters. */
export const MAX_COLOR_VALUE_LENGTH = 128;

const NUM = String.raw`[+-]?(?:\d+(?:\.\d+)?|\.\d+)%?`;
const SEP = String.raw`(?:\s*[,/]\s*|\s+)`;
const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FUNCTION = new RegExp(String.raw`^(?:rgba?|hsla?|oklch)\(\s*${NUM}(?:${SEP}${NUM}){2,3}\s*\)$`, 'i');
const COLOR_MIX = /^color-mix\(\s*in\s+srgb\s*,\s*(.+?)\s+\d+(?:\.\d+)?%\s*,\s*transparent\s*\)$/i;

/** True for a hex, numeric-argument color function, or `transparent`; never a `color-mix`. */
function isBaseColor(value: string): boolean {
	return HEX.test(value) || FUNCTION.test(value) || value.toLowerCase() === 'transparent';
}

/**
 * True when `value` is a color a theme token may hold. Theme values are written
 * into CSS custom properties on the document root, so anything outside this
 * grammar (`url()`, `var()`, `;`, quotes, ...) is refused: the CSP allows
 * `img-src https:`, and a `url()` in a shared theme would make the app fetch it.
 * Accepts hex (3/4/6/8 digits), `rgb()/rgba()/hsl()/hsla()/oklch()` with numeric
 * arguments only, `transparent`, and the `color-mix(in srgb, <color> N%, transparent)`
 * that `alpha()` in `theme-builder.logic.ts` emits.
 */
export function isThemeColorValue(value: unknown): boolean {
	if (typeof value !== 'string' || value.length > MAX_COLOR_VALUE_LENGTH) return false;
	if (isBaseColor(value)) return true;
	const mix = COLOR_MIX.exec(value);
	return mix !== null && isBaseColor(mix[1]);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * `<group>.<key>` paths of tokens the app no longer has. Saved, exported and
 * catalog themes written before their removal still carry them, so validation
 * skips them and `withoutRetiredTokens` drops them: such a theme keeps loading
 * and the value never reaches CSS.
 */
const RETIRED_THEME_TOKENS: ReadonlySet<string> = new Set(['preview.frontmatterBg', 'preview.frontmatterBorder']);

/**
 * Checks a full or partial theme token map (`{ group: { key: color } }`).
 * Returns the path of the first problem: `colors` when the map itself is not an
 * object, `<group>` for an unknown group or one that is not an object, and
 * `<group>.<key>` for an unknown token or a value `isThemeColorValue` refuses.
 * Returns null when every present value is valid; missing tokens are allowed,
 * and retired tokens are skipped whatever they hold.
 */
export function findInvalidThemeToken(colors: unknown): string | null {
	if (!isPlainObject(colors)) return 'colors';
	const known: Record<string, object> = { ...KOKOBRAIN_DEFAULT_THEME.colors };
	for (const [group, tokens] of Object.entries(colors)) {
		if (!Object.hasOwn(known, group) || !isPlainObject(tokens)) return group;
		for (const [key, value] of Object.entries(tokens)) {
			if (RETIRED_THEME_TOKENS.has(`${group}.${key}`)) continue;
			if (!Object.hasOwn(known[group], key) || !isThemeColorValue(value)) return `${group}.${key}`;
		}
	}
	return null;
}

/**
 * Returns a copy of a token map that `findInvalidThemeToken` accepted, without
 * the retired tokens. Every group is kept, even one left empty.
 */
export function withoutRetiredTokens<T extends object>(colors: T): T {
	const out: Record<string, Record<string, unknown>> = {};
	for (const [group, tokens] of Object.entries(colors) as [string, Record<string, unknown>][]) {
		out[group] = Object.fromEntries(Object.entries(tokens).filter(([key]) => !RETIRED_THEME_TOKENS.has(`${group}.${key}`)));
	}
	return out as T;
}
