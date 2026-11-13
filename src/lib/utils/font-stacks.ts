/**
 * Font stacks shared by every place that sets a `font-family` from TypeScript,
 * so code and app text render in one face per role on every machine.
 */

/** Monospace stack for inline code, code blocks and code-like labels. */
export const MONO_FONT_STACK = 'MonoLisa, ui-monospace, SFMono-Regular, Menlo, monospace';

/**
 * App sans stack. Mirrors the `body` font-family in `src/app.css`, which CSS
 * cannot import; `font-stacks.test.ts` fails when the two drift apart.
 */
export const APP_SANS_FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

/** CSS generic families: quoting one turns it into a (missing) family name. */
const GENERIC_FAMILIES = new Set([
	'serif',
	'sans-serif',
	'monospace',
	'cursive',
	'fantasy',
	'system-ui',
	'ui-serif',
	'ui-sans-serif',
	'ui-monospace',
	'ui-rounded',
	'math',
	'emoji',
	'fangsong',
]);

/**
 * Makes a `font-family` value safe for CSS. A single family name is wrapped in
 * double quotes, since an unquoted name with a digit-led word or a symbol
 * (`Font Awesome 6 Free`) is invalid and the whole declaration is dropped.
 * A comma list, an already-quoted name and a generic family are returned as
 * written (trimmed); an empty value returns `''`.
 */
export function quoteFontFamily(value: string): string {
	const trimmed = value.trim();
	if (trimmed === '' || trimmed.includes(',')) return trimmed;
	// One quoted string only: `"Foo" "Bar"` starts and ends with a quote but is two.
	if (/^"(?:[^"\\]|\\.)*"$|^'(?:[^'\\]|\\.)*'$/.test(trimmed)) return trimmed;
	if (GENERIC_FAMILIES.has(trimmed.toLowerCase())) return trimmed;
	return `"${trimmed.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * The editor `font-family`: the user's value (quoted when it is a single name)
 * followed by the app sans stack, so a font the machine lacks falls back to the
 * system sans instead of the WebView default.
 */
export function editorFontFamily(value: string): string {
	const family = quoteFontFamily(value);
	return family === '' ? APP_SANS_FONT_STACK : `${family}, ${APP_SANS_FONT_STACK}`;
}
