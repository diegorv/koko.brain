import { describe, expect, it } from 'vitest';

import { buildPageMap, pageName, rewriteLinks } from '../../../scripts/sync-wiki-docs.mjs';

describe('pageName', () => {
	it('keeps the top-level page names', () => {
		expect(pageName('README.md')).toBe('Home');
		expect(pageName('01-getting-started.md')).toBe('Getting Started');
		expect(pageName('28-mods.md')).toBe('Mods');
	});

	it('prefixes pages in a subfolder with the folder name', () => {
		expect(pageName('mods/README.md')).toBe('Mods Reference');
		expect(pageName('mods/01-anatomy-and-loading.md')).toBe('Mods Anatomy And Loading');
		expect(pageName('mods/13-api-reference.md')).toBe('Mods Api Reference');
	});
});

describe('rewriteLinks', () => {
	const map = buildPageMap([
		'README.md',
		'04-markdown.md',
		'28-mods.md',
		'mods/README.md',
		'mods/04-vault-files.md',
		'mods/14-cookbook.md',
	]);
	const docsUrl = 'https://github.com/o/r/blob/main/help/documentation/';

	it('rewrites links into a subfolder', () => {
		expect(rewriteLinks('[C](mods/14-cookbook.md)', '28-mods.md', map)).toBe('[C](Mods-Cookbook)');
		expect(rewriteLinks('[R](mods/README.md)', 'README.md', map)).toBe('[R](Mods-Reference)');
	});

	it('keeps the anchor', () => {
		expect(rewriteLinks('[C](mods/14-cookbook.md#5-set-toggle)', '28-mods.md', map)).toBe(
			'[C](Mods-Cookbook#5-set-toggle)',
		);
		expect(rewriteLinks('[M](04-markdown.md#tables)', '28-mods.md', map)).toBe('[M](Markdown#tables)');
	});

	it('resolves a link against the folder of the file that holds it', () => {
		expect(rewriteLinks('[V](04-vault-files.md)', 'mods/14-cookbook.md', map)).toBe('[V](Mods-Vault-Files)');
		expect(rewriteLinks('[U](../28-mods.md)', 'mods/14-cookbook.md', map)).toBe('[U](Mods)');
		expect(rewriteLinks('[I](README.md)', 'mods/14-cookbook.md', map)).toBe('[I](Mods-Reference)');
	});

	it('points a link that leaves the docs folder at the file in the repo', () => {
		expect(rewriteLinks('[P](../../PRIVACY.md)', '28-mods.md', map, docsUrl)).toBe(
			'[P](https://github.com/o/r/blob/main/PRIVACY.md)',
		);
		expect(rewriteLinks('[H](../../examples/mods/hello/)', 'mods/14-cookbook.md', map, docsUrl)).toBe(
			'[H](https://github.com/o/r/blob/main/help/examples/mods/hello/)',
		);
		expect(rewriteLinks('[A](../../docs/adr/0029.md#why)', '27-calendar.md', map, docsUrl)).toBe(
			'[A](https://github.com/o/r/blob/main/docs/adr/0029.md#why)',
		);
	});

	it('leaves other links alone', () => {
		const text = '[a](https://x.dev/a.md) [b](#local) [c](screenshots/x.png) [d](url) [e](99-none.md)';
		expect(rewriteLinks(text, '28-mods.md', map, docsUrl)).toBe(text);
	});
});
