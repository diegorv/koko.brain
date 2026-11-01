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

	it('gives the type palette and warning tokens a static fallback in :root and .dark', () => {
		const appCss = readFileSync('src/app.css', 'utf8');
		const block = (selector: string) => {
			const start = appCss.indexOf(`\n${selector} {`);
			const body = appCss.slice(start, appCss.indexOf('\n}', start));
			return Object.fromEntries([...body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
		};
		const names = [...TYPE_PALETTE_NAMES.map((n) => `--type-${n}`), '--warning'];
		const pick = (vars: Record<string, string>) => Object.fromEntries(names.map((n) => [n, vars[n]]));
		expect(pick(block('.dark'))).toEqual(pick(themeColorsToCssVars(KOKOBRAIN_DEFAULT_THEME.colors)));
		expect(pick(block(':root'))).toEqual(pick(themeColorsToCssVars(LAVENDER_HAZE_THEME.colors)));
	});
});
