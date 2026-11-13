import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Source scan of the chrome's class strings for two state-style rules:
 * - a control revealed by `group-hover:opacity-100` is also revealed on
 *   keyboard focus, by `group-focus-within` on the same group or by the
 *   element's own `focus-within`;
 * - no `transition-all` (it animates layout) and no `hover:scale` (it moves
 *   chrome under the pointer and makes stacked rows overlap).
 * shadcn's `components/ui` is out of scope.
 */

const ROOT = process.cwd();
const SCAN_DIRS = ['src/lib', 'src/routes'];
const SKIP_DIR = 'src/lib/components/ui/';

function sourceFiles(): string[] {
	return SCAN_DIRS.flatMap((dir) =>
		readdirSync(join(ROOT, dir), { recursive: true, encoding: 'utf8' })
			.filter((name) => /\.(svelte|ts)$/.test(name))
			.map((name) => join(dir, name)),
	).filter((path) => !path.startsWith(SKIP_DIR));
}

/** A class string, or a source line outside any `class="..."`, with its 1-based line. */
interface Unit {
	line: number;
	text: string;
}

/**
 * Splits a source into units: every `class="..."` value (which may span
 * lines), then every line with those values blanked out, so a class string
 * built in a script still gets checked line by line.
 */
function classUnits(source: string): Unit[] {
	const units: Unit[] = [];
	const rest = source.replace(/\bclass="([^"]*)"/g, (whole: string, value: string, offset: number) => {
		units.push({ line: source.slice(0, offset).split('\n').length, text: value });
		return whole.replace(/[^\n]/g, ' ');
	});
	rest.split('\n').forEach((text, i) => units.push({ line: i + 1, text }));
	return units;
}

const HOVER_REVEAL_RE = /(?<![\w-])group-hover(\/[\w-]+)?:opacity-100(?![\w-])/g;
const OWN_FOCUS_REVEAL_RE = /(?<![\w-])focus-within:opacity-100(?![\w-])/;

/** Counts hover reveals in one class string that have no focus reveal. */
function countHoverOnlyReveals(text: string): number {
	return [...text.matchAll(HOVER_REVEAL_RE)].filter((m) => {
		const focusReveal = `group-focus-within${m[1] ?? ''}:opacity-100`;
		return !text.includes(focusReveal) && !OWN_FOCUS_REVEAL_RE.test(text);
	}).length;
}

const TRANSITION_ALL_RE = /(?<![\w-])transition-all(?![\w-])/g;
const HOVER_SCALE_RE = /(?<![\w-])(?:group-|peer-)?hover(?:\/[\w-]+)?:scale-/g;

/** Counts `transition-all` and `hover:scale` utilities in one class string. */
function countMotionChrome(text: string): number {
	return [...text.matchAll(TRANSITION_ALL_RE)].length + [...text.matchAll(HOVER_SCALE_RE)].length;
}

/** `file:line` for every unit of the chrome where `count` finds a site. */
function sites(count: (text: string) => number): string[] {
	const found: string[] = [];
	for (const path of sourceFiles()) {
		for (const unit of classUnits(readFileSync(join(ROOT, path), 'utf8'))) {
			if (count(unit.text) > 0) found.push(`${path}:${unit.line}`);
		}
	}
	return found;
}

describe('chrome state styles', () => {
	it('reveals every group-hover control on keyboard focus too', () => {
		expect(sites(countHoverOnlyReveals)).toEqual([]);
	});

	it('uses no transition-all or hover:scale', () => {
		expect(sites(countMotionChrome)).toEqual([]);
	});

	// Tailwind's source detection scans src/tests, so fixture class names the
	// app does not otherwise use are built from parts: written whole, each one
	// would land in the app's CSS.
	const OP = ['opacity', '100'].join('-');
	const GH = ['group', 'hover'].join('-');
	const GFW = ['group', 'focus', 'within'].join('-');
	const TA = ['transition', 'all'].join('-');
	const SC = ['scale', '110'].join('-');

	it('reports a hover reveal without a focus reveal of the same group', () => {
		expect(countHoverOnlyReveals(`opacity-0 ${GH}:${OP}`)).toBe(1);
		expect(countHoverOnlyReveals(`${GH}/rel:${OP} ${GFW}:${OP}`)).toBe(1);
		expect(countHoverOnlyReveals(`${GH}:${OP} ${GFW}/rel:${OP}`)).toBe(1);
	});

	it('accepts a group-focus-within or own focus-within reveal', () => {
		expect(countHoverOnlyReveals(`${GH}:${OP} ${GFW}:${OP}`)).toBe(0);
		expect(countHoverOnlyReveals(`${GH}/rel:${OP} ${GFW}/rel:${OP}`)).toBe(0);
		expect(countHoverOnlyReveals(`focus-within:${OP} ${GH}/lane:${OP}`)).toBe(0);
		expect(countHoverOnlyReveals(`${GH}:text-primary`)).toBe(0);
	});

	it('reports transition-all and every hover:scale form', () => {
		expect(countMotionChrome(`p-1 ${TA}`)).toBe(1);
		expect(countMotionChrome(`hover:${SC}`)).toBe(1);
		expect(countMotionChrome(`${GH}:${SC} ${GH}/row:${SC}`)).toBe(2);
		expect(countMotionChrome('transition-colors transition-opacity duration-100')).toBe(0);
	});

	it('keeps a multi-line class string as one unit, at its first line', () => {
		const source = `<div>\n<button\n\tclass="opacity-0 ${GH}:${OP}\n\t\t${GFW}:${OP}"\n>`;
		const units = classUnits(source);
		expect(units[0]).toEqual({ line: 3, text: `opacity-0 ${GH}:${OP}\n\t\t${GFW}:${OP}` });
		expect(units.map((u) => countHoverOnlyReveals(u.text))).toEqual(units.map(() => 0));
	});
});
