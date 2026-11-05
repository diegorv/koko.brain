import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The radius ladder in `src/app.css`, and a ratchet on radii that bypass it.
 *
 * Tokens declared only inside `@theme inline` are inlined into each utility
 * and never exist at runtime, so scoped CSS, CodeMirror themes and DOM
 * builders could not write `var(--radius-md)`. Every rung must be declared
 * outside `@theme inline` and derive from `--radius`.
 *
 * The ratchet counts, per file, the sites that do not use a rung: bare
 * `rounded` (a fixed 4px), arbitrary `rounded-[...]` and px literals in a
 * border radius. The baselines only shrink.
 */

const ROOT = process.cwd();
const APP_CSS = readFileSync(join(ROOT, 'src/app.css'), 'utf8');

/** Removes every `@theme inline { ... }` block, matching braces. */
function withoutThemeInline(css: string): string {
	let out = '';
	let i = 0;
	for (;;) {
		const start = css.indexOf('@theme inline', i);
		if (start === -1) return out + css.slice(i);
		out += css.slice(i, start);
		let depth = 0;
		let j = css.indexOf('{', start);
		for (; j < css.length; j++) {
			if (css[j] === '{') depth++;
			else if (css[j] === '}' && --depth === 0) break;
		}
		i = j + 1;
	}
}

/** The value of the first `name: value;` declaration in `css`, or null. */
function declaration(css: string, name: string): string | null {
	const match = css.match(new RegExp(`${name}\\s*:\\s*([^;]+);`));
	return match ? match[1].trim() : null;
}

/** Evaluates `var(--radius)`, `Npx` and `calc(a +/- b ...)` in px. */
function evaluatePx(value: string, radiusPx: number): number {
	const expr = value
		.replaceAll('var(--radius)', `${radiusPx}px`)
		.replace(/^calc\((.*)\)$/, '$1')
		.trim();
	const terms = expr.match(/^(-?\d+(?:\.\d+)?)px((?:\s*[+-]\s*\d+(?:\.\d+)?px)*)$/);
	if (!terms) throw new Error(`cannot evaluate ${value}`);
	let total = Number(terms[1]);
	for (const [, op, n] of terms[2].matchAll(/([+-])\s*(\d+(?:\.\d+)?)px/g)) {
		total += op === '+' ? Number(n) : -Number(n);
	}
	return total;
}

const LADDER: Record<string, number> = {
	'--radius-xs': 4,
	'--radius-sm': 6,
	'--radius-md': 8,
	'--radius-lg': 10,
	'--radius-xl': 14,
};

describe('radius ladder', () => {
	const runtime = withoutThemeInline(APP_CSS);
	const radius = declaration(runtime, '--radius');

	it('sets --radius to 0.625rem (10px)', () => {
		expect(radius).toBe('0.625rem');
	});

	for (const [name, px] of Object.entries(LADDER)) {
		it(`declares ${name} outside @theme inline, ${px}px from --radius`, () => {
			const value = declaration(runtime, name);
			expect(value).not.toBeNull();
			expect(value).toContain('var(--radius)');
			expect(evaluatePx(value!, parseFloat(radius!) * 16)).toBe(px);
		});
	}

	it('strips @theme inline and evaluates calc()', () => {
		const css = '@theme inline { --a: 1px; } :root { --b: 2px; }';
		expect(withoutThemeInline(css)).toBe(' :root { --b: 2px; }');
		expect(evaluatePx('calc(var(--radius) - 6px)', 10)).toBe(4);
		expect(evaluatePx('calc(var(--radius) + 4px)', 10)).toBe(14);
		expect(evaluatePx('var(--radius)', 10)).toBe(10);
	});
});

const SCAN_DIR = 'src/lib';
const SKIP_DIR = 'src/lib/components/ui/';

/** Files whose radii are not ratcheted, each with its reason. */
const ALLOWED: Record<string, string> = {
	'src/lib/plugins/queryjs/kb-ui.ts':
		'KBAPI output: `borderRadius` is a public option (contract/kb-api.v1.ts), so changing it changes users\' dashboards',
	'src/lib/core/settings/sections/ThemePreview.svelte': '1px corners of a scaled mini mock',
};

/**
 * Bare `rounded` and its side or corner forms without a size (suffix `-l`,
 * `-t`, `-tl`, also behind a variant such as `hover:`): Tailwind's fixed
 * 0.25rem, off the ladder.
 * Class names only, so `.svelte` only: in `.ts` the word is a variable or prose.
 */
const BARE_ROUNDED_RE = /(?<![\w-])rounded(?:-(?:t|r|b|l|s|e|tl|tr|br|bl|ss|se|es|ee))?(?![\w[-])/g;

/** Arbitrary `rounded-[...]`, side forms included; `[inherit]` takes the parent's radius. */
const ARBITRARY_ROUNDED_RE = /(?<![\w-])rounded(?:-[a-z]{1,2})?-\[([^\]]*)\]/g;

/**
 * A border-radius declaration and its value, in CSS (`border-radius`, the
 * corner longhands, custom properties such as `--xy-node-border-radius`) or JS
 * (`borderRadius`, `borderTopLeftRadius`), written with `:` or `=`.
 */
const RADIUS_DECL_RE = /(?:border(?:-[a-z]+)*-radius|border(?:[A-Z][a-z]+)*Radius)['"]?\s*[:=]\s*([^;}\n,]*)/g;

/** Counts bare `rounded` classes in a component's source. */
function countBareRounded(text: string): number {
	return [...text.matchAll(BARE_ROUNDED_RE)].length;
}

/** Counts arbitrary `rounded-[...]` classes other than `rounded-[inherit]`. */
function countArbitraryRounded(text: string): number {
	return [...text.matchAll(ARBITRARY_ROUNDED_RE)].filter((m) => m[1] !== 'inherit').length;
}

/**
 * Counts border-radius declarations whose value holds a px literal. Allowed:
 * `0`, `50%`, `9999px`, `inherit` and any value that uses `var(`.
 */
function countRadiusPx(text: string): number {
	return [...text.matchAll(RADIUS_DECL_RE)].filter((m) => {
		const value = m[1];
		return !value.includes('var(') && /\d*\.?\d+px/.test(value.replaceAll('9999px', ''));
	}).length;
}

interface Rule {
	extensions: string[];
	count: (text: string) => number;
	baseline: Record<string, number>;
}

const RULES: Record<string, Rule> = {
	'bare rounded': {
		extensions: ['.svelte'],
		count: countBareRounded,
		baseline: {},
	},
	'arbitrary rounded-[...]': {
		extensions: ['.svelte'],
		count: countArbitraryRounded,
		baseline: {},
	},
	'px border radius': {
		extensions: ['.svelte', '.ts', '.css'],
		count: countRadiusPx,
		baseline: {
			'src/lib/features/canvas/CanvasContextMenu.svelte': 2,
			'src/lib/features/canvas/CanvasEdge.svelte': 1,
			'src/lib/features/canvas/CanvasFilePicker.svelte': 2,
			'src/lib/features/canvas/CanvasInner.svelte': 3,
			'src/lib/features/canvas/CanvasLinkInput.svelte': 3,
			'src/lib/features/canvas/FileNode.svelte': 2,
			'src/lib/features/canvas/GroupNode.svelte': 1,
			'src/lib/features/canvas/ImageNode.svelte': 1,
			'src/lib/features/canvas/LinkNode.svelte': 3,
			'src/lib/features/canvas/TextNode.svelte': 1,
			'src/lib/features/canvas/canvas-markdown.css': 4,
			'src/lib/features/canvas/canvas.logic.ts': 2,
			'src/lib/features/collection/collection-block-widget.ts': 2,
		},
	},
};

/** Every scanned source file under `src/lib`, shadcn's `components/ui` and the allowlist left out. */
function sourceFiles(): string[] {
	return readdirSync(join(ROOT, SCAN_DIR), { recursive: true, encoding: 'utf8' })
		.filter((name) => /\.(svelte|ts|css)$/.test(name))
		.map((name) => join(SCAN_DIR, name))
		.filter((path) => !path.startsWith(SKIP_DIR) && !(path in ALLOWED));
}

/** Site counts by file for one rule, files without a site left out. */
function scan(rule: Rule): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const path of sourceFiles()) {
		if (!rule.extensions.some((ext) => path.endsWith(ext))) continue;
		const n = rule.count(readFileSync(join(ROOT, path), 'utf8'));
		if (n > 0) counts[path] = n;
	}
	return counts;
}

describe('radius ratchet', () => {
	// toEqual fails on a grown count, on a file missing from the baseline and
	// on a count below its baseline: lower the baseline in the same change.
	for (const [name, rule] of Object.entries(RULES)) {
		it(`${name}: matches the per-file baseline`, () => {
			expect(scan(rule)).toEqual(rule.baseline);
		});
	}

	it('gives every allowlisted file a reason, and every one exists', () => {
		for (const [path, reason] of Object.entries(ALLOWED)) {
			expect(reason.trim()).not.toBe('');
			expect(() => readFileSync(join(ROOT, path))).not.toThrow();
		}
	});

	// Tailwind's source detection scans src/tests, so fixture class names are
	// built from parts: written whole, each one would land in the app's CSS.
	const R = ['round', 'ed'].join('');

	it('reports an added bare rounded, an arbitrary 3px rounded and borderRadius px', () => {
		expect(countBareRounded(`<div class="flex ${R} px-2">`)).toBe(1);
		expect(countBareRounded(`<b class="hover:${R}-l ${R}-t">`)).toBe(2);
		expect(countArbitraryRounded(`<div class="${R}-[3px]">`)).toBe(1);
		expect(countRadiusPx("const theme = { borderRadius: '5px' };")).toBe(1);
		expect(countRadiusPx('.node { border-radius: 4px 4px 0 0; }')).toBe(1);
		expect(countRadiusPx('--xy-node-border-radius: 8px;')).toBe(1);
		expect(countRadiusPx("el.style.cssText = 'padding: 2px; border-radius: 2px;';")).toBe(1);
	});

	it('leaves ladder classes and allowed values alone', () => {
		expect(countBareRounded(`<div class="${R}-md ${R}-full ${R}-t-sm ${R}-xs">`)).toBe(0);
		expect(countBareRounded(`<div class="after:${R}-[inherit] ${R}-lg">`)).toBe(0);
		expect(countArbitraryRounded(`<div class="after:${R}-[inherit]">`)).toBe(0);
		for (const value of ['0', '50%', '9999px', 'inherit', 'var(--radius-md)', 'calc(var(--radius) - 2px)']) {
			expect(countRadiusPx(`border-radius: ${value};`)).toBe(0);
			expect(countRadiusPx(`{ borderRadius: '${value}' }`)).toBe(0);
		}
	});
});
