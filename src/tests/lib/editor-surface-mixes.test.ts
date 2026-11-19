import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BUILTIN_THEMES, themeColorsToCssVars } from '#lib/core/settings/theme.logic.js';
import { apcaContrast, contrastRatio, flatten, mixColors, tint } from '#lib/utils/color.js';
import { HARD_DARK_PALETTE_THEMES, HARD_PALETTE_THEMES } from '../fixtures/hard-palette-themes.fixture';

/**
 * Text that `app.css` colors with a `color-mix` of theme tokens, or draws on
 * one: code block header and tokens, event pills, meta-bind button hovers and
 * search snippet matches. Each mix is read from the stylesheet and resolved
 * with `mixColors` over the theme's CSS variables, then measured as small text
 * (4.5:1 and |Lc| 45).
 */

const CSS = readFileSync(resolve(__dirname, '../../app.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');

const THEMES = [...BUILTIN_THEMES, ...HARD_PALETTE_THEMES, ...HARD_DARK_PALETTE_THEMES];

/** The one value `name` is declared with in app.css. */
function declared(name: string): string {
	const values = [...CSS.matchAll(new RegExp(`(?:^|[;{\\s])${name}\\s*:\\s*([^;]+);`, 'g'))].map((m) => m[1].trim());
	expect(values, name).toHaveLength(1);
	return values[0];
}

const MIX = /^color-mix\(in oklab, (.+?) (\d+)%, (.+)\)$/;

/**
 * An app.css value as an opaque hex: a hex, `var(--x)` read from `vars` (an
 * app.css-only variable resolved from its own declaration), or
 * `color-mix(in oklab, A N%, B)` as `mixColors(A, B, 1 - N%)`. Translucent
 * colors are flattened over the editor background.
 */
function resolveColor(value: string, vars: Record<string, string>): string {
	const mix = MIX.exec(value);
	if (mix) return mixColors(resolveColor(mix[1], vars), resolveColor(mix[3], vars), 1 - Number(mix[2]) / 100)!;
	const ref = /^var\((--[\w-]+)\)$/.exec(value);
	const color = ref ? (vars[ref[1]] ?? resolveColor(declared(ref[1]), vars)) : value;
	return flatten(color, vars['--editor-bg'])!;
}

/** Whether `fg` reads as small text on `bg`, else the measured pair. */
function failure(label: string, fg: string, bg: string): string | null {
	const ratio = contrastRatio(fg, bg)!;
	const lc = Math.abs(apcaContrast(fg, bg)!);
	return ratio >= 4.5 - 0.005 && lc >= 45 - 0.05 ? null : `${label} ${ratio.toFixed(2)} Lc ${lc.toFixed(1)}`;
}

/** Runs `check` over every theme's CSS variables and returns the failures. */
function failures(check: (vars: Record<string, string>) => [string, string, string][]): string[] {
	return THEMES.flatMap(({ name, colors }) => {
		const vars = themeColorsToCssVars(colors);
		return check(vars).map(([label, fg, bg]) => failure(`${name} ${label}`, fg, bg)).filter((f): f is string => f !== null);
	});
}

describe('resolveColor', () => {
	it('resolves a mix, a variable and a hex', () => {
		const vars = { '--editor-bg': '#ffffff', '--a': '#000000' };
		expect(resolveColor('#123456', vars)).toBe('#123456');
		expect(resolveColor('var(--a)', vars)).toBe('#000000');
		expect(resolveColor('color-mix(in oklab, var(--a) 100%, #ffffff)', vars)).toBe('#000000');
		expect(resolveColor('color-mix(in oklab, var(--a) 0%, #ffffff)', vars)).toBe('#ffffff');
	});
});

describe('code block header and tokens', () => {
	it('reads the language label and copy button on the header and on the copy hover fill', () => {
		expect(failures((vars) => {
			const header = resolveColor(declared('--lp-codeblock-header-bg'), vars);
			const hover = flatten(vars['--lp-collection-table-hover'], header)!;
			expect(declared('--lp-codeblock-copy-hover')).toBe('var(--lp-collection-table-hover)');
			const lang = resolveColor(declared('--lp-codeblock-lang'), vars);
			const copy = resolveColor(declared('--lp-codeblock-copy'), vars);
			return [['language label', lang, header], ['copy button', copy, header], ['hovered copy button', copy, hover]];
		})).toEqual([]);
	});

	it('reads punctuation and comments on the code block', () => {
		expect(failures((vars) => {
			const block = flatten(vars['--lp-codeblock-bg'], vars['--editor-bg'])!;
			return [
				['punctuation', resolveColor(declared('--lp-syntax-punctuation'), vars), block],
				['comment', resolveColor(declared('--lp-syntax-comment'), vars), block],
			];
		})).toEqual([]);
	});
});

describe('event pills', () => {
	const HUES = ['green', 'purple', 'cyan', 'orange', 'pink', 'blue'];

	it('reads each event pill text on its pill', () => {
		expect(failures((vars) => HUES.map((hue): [string, string, string] => [
			`${hue} event`, resolveColor(declared(`--event-${hue}-fg`), vars), resolveColor(declared(`--event-${hue}-bg`), vars),
		]))).toEqual([]);
	});
});

describe('meta-bind and QueryJS button hovers', () => {
	it('reads the primary and destructive labels on their fills at rest and on hover', () => {
		expect(failures((vars) => [
			['primary button', resolveColor(declared('--lp-meta-bind-btn-primary-text'), vars), resolveColor(declared('--lp-meta-bind-btn-primary-bg'), vars)],
			['hovered primary button', resolveColor(declared('--lp-meta-bind-btn-primary-text'), vars), resolveColor(declared('--lp-meta-bind-btn-primary-hover'), vars)],
			['destructive button', resolveColor(declared('--lp-meta-bind-btn-destructive-text'), vars), resolveColor(declared('--lp-meta-bind-btn-destructive-bg'), vars)],
			['hovered destructive button', resolveColor(declared('--lp-meta-bind-btn-destructive-text'), vars), resolveColor(declared('--lp-meta-bind-btn-destructive-hover'), vars)],
		])).toEqual([]);
	});
});

describe('search snippet matches', () => {
	const mark = /\[data-search-result\] mark\s*\{([^}]*)\}/.exec(CSS)?.[1] ?? '';

	it('draws a match in the sidebar text color on the highlight', () => {
		expect(mark).toContain('background-color: var(--lp-highlight-bg);');
		expect(mark).toContain('color: var(--file-explorer-fg);');
	});

	it('reads the match on the highlight over the list surfaces, light and dark, at rest and on a hovered row', () => {
		expect(failures((vars) => {
			const sidebar = vars['--file-explorer-bg'];
			// `--list-bg`: the sidebar on dark themes, halfway to the editor on light ones. app.css mixes
			// it in oklch, this in OKLab: both interpolate L linearly, so the two midpoints share their
			// lightness and differ only in chroma and hue, which move contrast little. The ends are measured too.
			const lists = [sidebar, mixColors(sidebar, vars['--editor-bg'], 0.5)!, vars['--editor-bg']];
			// SearchResult.svelte's row: `hover:bg-file-explorer-accent/60` over the list surface
			const surfaces = lists.flatMap((list) => [list, tint(vars['--file-explorer-accent'], 0.6, list)!]);
			return surfaces.map((surface): [string, string, string] => [
				`match over ${surface}`, vars['--file-explorer-fg'], flatten(vars['--lp-highlight-bg'], surface)!,
			]);
		})).toEqual([]);
	});
});
