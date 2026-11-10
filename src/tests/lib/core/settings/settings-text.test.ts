import { describe, it, expect } from 'vitest';

import { readSource, settingsFiles } from './settings-files';

/**
 * Source scan of the Settings panel and its pages: text sizes come from the
 * chrome type scale in `src/app.css`, so a note or status looks the same on
 * every page. The one exception is the intro paragraph under a page title,
 * whose size `settings-headings.test.ts` holds.
 */

/** The one style of an intro paragraph under a page title. */
const INTRO_CLASS = 'mb-4 text-sm text-muted-foreground';

/** An intro directly under the title. Appearance keeps an `{#if}` between them, so the class is what marks an intro. */
const INTRO_UNDER_TITLE = /<h2\b[^>]*>[^<]*<\/h2>\s*<p\b[^>]*?\bclass="([^"]*)"/g;

/** The source without the class attribute of its intro paragraphs. */
const withoutIntro = (source: string) => source.replaceAll(`class="${INTRO_CLASS}"`, 'class=""');

/** `file:line token` of every Tailwind size outside the type scale. */
function offScale(path: string, source: string): string[] {
	const scanned = withoutIntro(source);
	const lineOf = (index: number) => scanned.slice(0, index).split('\n').length;
	return [...scanned.matchAll(/\btext-(xs|sm|base)\b/g)].map((m) => `${path}:${lineOf(m.index)} ${m[0]}`);
}

/** The classes of every paragraph in the source, intro paragraphs excluded. */
function noteClasses(source: string): string[] {
	return [...withoutIntro(source).matchAll(/<p\b[^>]*?\bclass="([^"]+)"/g)].map((m) => m[1]);
}

describe('Settings text', () => {
	it('flags a Tailwind size outside the intro, not the scale roles', () => {
		const lt = '<';
		const fixture = [
			`${lt}h2 class="mb-4 text-lg">Title${lt}/h2>`,
			`${lt}p class="${INTRO_CLASS}">Intro${lt}/p>`,
			`${lt}span class="text-xs">a${lt}/span>`,
			`${lt}span class="text-meta">b${lt}/span>`,
		].join('\n');
		expect(offScale('f', fixture)).toEqual(['f:3 text-xs']);
	});

	it('takes every size from the type scale', () => {
		const off = settingsFiles().flatMap((path) => offScale(path, readSource(path)));
		expect(off).toEqual([]);
	});

	it('sets every note and message in the meta role', () => {
		const off = settingsFiles().flatMap((path) =>
			noteClasses(readSource(path))
				.filter((classes) => !/\btext-meta\b/.test(classes))
				.map((classes) => `${path} "${classes}"`),
		);
		expect(off).toEqual([]);
	});

	it('gives every intro paragraph under a title one style', () => {
		const off = settingsFiles().flatMap((path) =>
			[...readSource(path).matchAll(INTRO_UNDER_TITLE)]
				.filter((m) => m[1] !== INTRO_CLASS)
				.map((m) => `${path} "${m[1]}"`),
		);
		expect(off).toEqual([]);
	});

	it('keeps at most one intro paragraph on a page', () => {
		const counts = settingsFiles().map((path) => readSource(path).split(`class="${INTRO_CLASS}"`).length - 1);
		expect(Math.max(...counts)).toBe(1);
	});

	it('aligns a note after a row with the text inside the row', () => {
		const notes = [
			'src/lib/core/settings/sections/TypesSection.svelte',
			'src/lib/features/todoist-sync/TodoistSection.svelte',
			'src/lib/core/settings/sections/SentrySection.svelte',
		];
		for (const path of notes) {
			for (const classes of noteClasses(readSource(path))) expect(classes, path).toMatch(/\bpx-4\b/);
		}
	});
});
