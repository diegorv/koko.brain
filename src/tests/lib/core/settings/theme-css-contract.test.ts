import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { themeColorsToCssVars, KOKOBRAIN_DEFAULT_THEME, LAVENDER_HAZE_THEME } from '#lib/core/settings/theme.logic.js';
import { TYPE_PALETTE_NAMES } from '#lib/core/settings/theme-builder.logic.js';

/** Theme groups whose CSS variables carry a prefix; UI tokens map to unprefixed shadcn names. */
const THEMED = '(?:lp|syntax|wikilink|callout)';

function sourceFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return sourceFiles(path);
		return /\.(ts|svelte|css)$/.test(name) ? [path] : [];
	});
}

const sources = sourceFiles('src/lib').map((file) => ({ file, text: readFileSync(file, 'utf8') }));
const emitted = new Set(Object.keys(themeColorsToCssVars(KOKOBRAIN_DEFAULT_THEME.colors)));
const definedInAppCss = new Set(
	[...readFileSync('src/app.css', 'utf8').matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]),
);

describe('theme CSS variable contract', () => {
	it('defines every themed variable that is read without a fallback', () => {
		const undefinedReads = new Set<string>();
		for (const { file, text } of sources) {
			for (const [, name] of text.matchAll(new RegExp(`var\\(\\s*(--${THEMED}-[a-z0-9-]+)\\)`, 'g'))) {
				if (!emitted.has(name) && !definedInAppCss.has(name)) undefinedReads.add(`${name} (${file})`);
			}
		}
		expect([...undefinedReads].sort()).toEqual([]);
	});

	it('emits every syntax, wikilink and callout variable the app reads', () => {
		const missing = new Set<string>();
		for (const { file, text } of sources) {
			for (const [, name] of text.matchAll(/var\(\s*(--(?:syntax|wikilink|callout)-[a-z0-9-]+)/g)) {
				if (!emitted.has(name)) missing.add(`${name} (${file})`);
			}
		}
		expect([...missing].sort()).toEqual([]);
	});

	it('reads every themed variable a theme emits', () => {
		const read = new Set<string>();
		for (const { text } of sources) {
			for (const [, name] of text.matchAll(new RegExp(`var\\(\\s*(--${THEMED}-[a-z0-9-]+)`, 'g'))) read.add(name);
		}
		const unread = [...emitted].filter((name) => new RegExp(`^--${THEMED}-`).test(name) && !read.has(name));
		expect(unread.sort()).toEqual([]);
	});

	it('derives code block, code syntax and meta-bind colors from theme variables', () => {
		const appCss = readFileSync('src/app.css', 'utf8');
		const hardcoded = [...appCss.matchAll(/(--lp-(?:codeblock|syntax|meta-bind)-[a-z0-9-]+)\s*:\s*([^;]+);/g)]
			.filter(([, name, value]) => !emitted.has(name) && !value.includes('var('))
			.map(([, name, value]) => `${name}: ${value}`);
		expect(hardcoded).toEqual([]);
	});

	it('gives the type palette, warning, success and elevation tokens a static fallback in :root and .dark', () => {
		const appCss = readFileSync('src/app.css', 'utf8');
		const block = (selector: string) => {
			const start = appCss.indexOf(`\n${selector} {`);
			const body = appCss.slice(start, appCss.indexOf('\n}', start));
			return Object.fromEntries([...body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
		};
		const names = [
			...TYPE_PALETTE_NAMES.map((n) => `--type-${n}`),
			'--warning',
			'--success',
			'--elev-shadow-1',
			'--elev-shadow-2',
			'--elev-shadow-3',
			'--elev-ring',
			'--elev-scrim',
		];
		const pick = (vars: Record<string, string>) => Object.fromEntries(names.map((n) => [n, vars[n]]));
		expect(pick(block('.dark'))).toEqual(pick(themeColorsToCssVars(KOKOBRAIN_DEFAULT_THEME.colors)));
		expect(pick(block(':root'))).toEqual(pick(themeColorsToCssVars(LAVENDER_HAZE_THEME.colors)));
	});

	it('makes dark: utilities follow the html.dark class, not the OS appearance', () => {
		const lines = readFileSync('src/app.css', 'utf8').split('\n').map((l) => l.trim());
		expect(lines).toContain('@custom-variant dark (&:where(.dark, .dark *));');
	});

	it('derives every column tone in light and dark, and names it for Tailwind', () => {
		const appCss = readFileSync('src/app.css', 'utf8');
		// The theme thumbnail re-derives the tones through these scopes, so each block must serve both selectors.
		const declaredIn = (selectors: string, name: string) =>
			[...appCss.matchAll(new RegExp(`\\n${selectors} \\{[^}]*`, 'g'))].some((m) => m[0].includes(`\n\t${name}:`));
		const light = ':root,\\n\\.column-tones';
		const dark = '\\.dark,\\n\\.column-tones-dark';
		for (const name of ['--rail-bg', '--nav-bg', '--list-bg']) {
			expect(declaredIn(light, name), `${name} in the light block`).toBe(true);
			expect(declaredIn(dark, name), `${name} in the dark block`).toBe(true);
			expect(appCss, `${name} in @theme`).toContain(`--color-${name.slice(2)}: var(${name});`);
		}
		expect(declaredIn(light, '--rail-muted-fg')).toBe(true);
		// Equal specificity: only source order lets the dark block win on an element that matches both.
		expect(appCss.indexOf('\n:root,\n.column-tones {')).toBeLessThan(appCss.indexOf('\n.dark,\n.column-tones-dark {'));
		expect(appCss).toContain('--color-rail-muted-fg: var(--rail-muted-fg);');
	});

	it('declares no variable only in .dark that a light theme would then lose', () => {
		// A light theme removes html.dark, so a variable that is neither emitted
		// by the theme nor declared outside .dark is undefined there.
		const appCss = readFileSync('src/app.css', 'utf8');
		const start = appCss.indexOf('\n.dark {');
		const end = appCss.indexOf('\n}', start);
		const names = (css: string) => new Set([...css.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
		const outside = names(appCss.slice(0, start) + appCss.slice(end));
		const darkOnly = [...names(appCss.slice(start, end))].filter((name) => !emitted.has(name) && !outside.has(name));
		expect(darkOnly.sort()).toEqual([]);
	});

	it('mirrors the Default heading ramp in the .dark fallback', () => {
		const appCss = readFileSync('src/app.css', 'utf8');
		const start = appCss.indexOf('\n.dark {');
		const body = appCss.slice(start, appCss.indexOf('\n}', start));
		const fallback = Object.fromEntries([...body.matchAll(/(--syntax-heading[1-6])\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
		const vars = themeColorsToCssVars(KOKOBRAIN_DEFAULT_THEME.colors);
		const expected = Object.fromEntries([1, 2, 3, 4, 5, 6].map((n) => [`--syntax-heading${n}`, vars[`--syntax-heading${n}`]]));
		expect(fallback).toEqual(expected);
	});
});
