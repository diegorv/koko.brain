import { describe, it, expect } from 'vitest';

import { readSource as read, settingsFiles } from './settings-files';

/**
 * Source scan of the Settings panel and its pages for the heading rules no
 * single section test can hold: every page title, sub-heading and intro
 * paragraph looks the same on every page. The pages are the `*Section.svelte`
 * files `SettingsPanel.svelte` imports, plus the components they reach through
 * local imports (`./ThemeEditor.svelte`, `./HeadingTypographyEditor.svelte`, ...).
 */

/** Class tokens, without `{...}` expressions and without margin/padding utilities. */
function styleTokens(classAttr: string): string[] {
	return classAttr
		.replace(/\{[^}]*\}/g, ' ')
		.split(/\s+/)
		.filter((token) => token && !/^-?[mp][trblxy]?-/.test(token))
		.sort();
}

const marginBottoms = (classAttr: string) => classAttr.split(/\s+/).filter((token) => /^m[by]-/.test(token));

interface Heading {
	site: string;
	tag: string;
	classAttr: string;
}

function headings(): Heading[] {
	const found: Heading[] = [];
	for (const path of settingsFiles()) {
		for (const m of read(path).matchAll(/<(h[2-6])\b[^>]*?\bclass="([^"]*)"/g)) {
			found.push({ site: `${path}:${m[1]}`, tag: m[1], classAttr: m[2] });
		}
	}
	return found;
}

describe('Settings headings', () => {
	it('scans the panel and its pages', () => {
		const files = settingsFiles();
		expect(files).toContain('src/lib/core/settings/sections/PeriodicNotesSection.svelte');
		expect(files).toContain('src/lib/plugins/queryjs/QueryjsSection.svelte');
		expect(files).toContain('src/lib/core/settings/sections/HeadingTypographyEditor.svelte');
		expect(headings().filter((h) => h.tag === 'h3').length).toBeGreaterThan(10);
	});

	it('gives every title one style, with the same space under it', () => {
		const titles = headings().filter((h) => h.tag === 'h2');
		expect(titles.length).toBeGreaterThan(15);
		// These titles sit in a header row that carries the space under them: the
		// Trash page's row (mb-4) and the panel's sidebar row (h-14, not a page title).
		const titlesInRow = ['src/lib/app/SettingsPanel.svelte:h2', 'src/lib/core/settings/sections/TrashSection.svelte:h2'];
		expect(titles.map((h) => h.site)).toEqual(expect.arrayContaining(titlesInRow));
		const off = titles.filter((h) => {
			const margin = marginBottoms(h.classAttr).join(' ');
			return styleTokens(h.classAttr).join(' ') !== 'font-semibold text-lg' || margin !== (titlesInRow.includes(h.site) ? '' : 'mb-4');
		});
		expect(off.map((h) => `${h.site} "${h.classAttr}"`)).toEqual([]);
	});

	it('styles every sub-heading with the section label alone', () => {
		const sub = headings().filter((h) => h.tag !== 'h2');
		const off = sub.filter((h) => styleTokens(h.classAttr).join(' ') !== 'section-label');
		expect(off.map((h) => `${h.site} "${h.classAttr}"`)).toEqual([]);
	});

	it('sets every intro paragraph under a title in one size', () => {
		const intros: { site: string; sizes: string[] }[] = [];
		for (const path of settingsFiles()) {
			for (const m of read(path).matchAll(/<h2\b[^>]*>[^<]*<\/h2>\s*<p\b[^>]*?\bclass="([^"]*)"/g)) {
				intros.push({ site: path, sizes: m[1].split(/\s+/).filter((t) => /^text-(xs|sm|base|lg|\[)/.test(t)) });
			}
		}
		expect(intros.map((i) => i.site)).toEqual(
			expect.arrayContaining(['src/lib/core/settings/sections/QuickCaptureSection.svelte', 'src/lib/plugins/queryjs/QueryjsSection.svelte']),
		);
		expect(intros.filter((i) => i.sizes.join(' ') !== 'text-sm').map((i) => `${i.site} ${i.sizes.join(' ')}`)).toEqual([]);
	});
});
