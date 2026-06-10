// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { htmlLinksToMarkdown } from '$lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link.logic';

describe('htmlLinksToMarkdown', () => {
	it('converts a single anchor to a markdown link, keeping surrounding text', () => {
		const html = 'check <a href="https://example.com/doc">this doc</a> out';
		const plain = 'check this doc out';
		expect(htmlLinksToMarkdown(html, plain)).toBe('check [this doc](https://example.com/doc) out');
	});

	it('converts a Slack-style single anchor (label only in plain text)', () => {
		const html = '<meta charset="utf-8"><a href="https://acme.slack.com/archives/C01/p123">Thread about deploy</a>';
		const plain = 'Thread about deploy';
		expect(htmlLinksToMarkdown(html, plain)).toBe('[Thread about deploy](https://acme.slack.com/archives/C01/p123)');
	});

	it('inserts a bare URL when the anchor text equals its href', () => {
		const html = '<a href="https://example.com/x">https://example.com/x</a>';
		expect(htmlLinksToMarkdown(html, '')).toBe('https://example.com/x');
	});

	it('inserts a bare URL when the anchor text is empty', () => {
		const html = 'see <a href="https://example.com/y"></a> here';
		expect(htmlLinksToMarkdown(html, 'see  here')).toBe('see https://example.com/y here');
	});

	it('converts multiple anchors and keeps the text between them', () => {
		const html = 'read <a href="https://a.test/1">first</a> then <a href="https://b.test/2">second</a> today';
		const plain = 'read first then second today';
		expect(htmlLinksToMarkdown(html, plain)).toBe('read [first](https://a.test/1) then [second](https://b.test/2) today');
	});

	it('converts every anchor when at least one URL is missing from the plain text', () => {
		const html = '<a href="https://known.test/a">known</a> and <a href="https://new.test/b">new</a>';
		const plain = 'https://known.test/a and new';
		expect(htmlLinksToMarkdown(html, plain)).toBe('[known](https://known.test/a) and [new](https://new.test/b)');
	});

	it('decodes HTML entities in hrefs and text', () => {
		const html = '<a href="https://example.com/?a=1&amp;b=2">Tom &amp; Jerry</a>';
		const plain = 'Tom & Jerry';
		expect(htmlLinksToMarkdown(html, plain)).toBe('[Tom & Jerry](https://example.com/?a=1&b=2)');
	});

	it('flattens nested markup inside the anchor text', () => {
		const html = '<a href="https://example.com/z"><b>bold</b> label</a>';
		const plain = 'bold label';
		expect(htmlLinksToMarkdown(html, plain)).toBe('[bold label](https://example.com/z)');
	});

	it('returns null when the HTML has no anchor', () => {
		const html = '<b>just bold text</b>, no links';
		const plain = 'just bold text, no links';
		expect(htmlLinksToMarkdown(html, plain)).toBeNull();
	});

	it('returns null when every anchor URL is already in the plain text', () => {
		const html = 'see <a href="https://example.com/doc">https://example.com/doc</a>';
		const plain = 'see https://example.com/doc';
		expect(htmlLinksToMarkdown(html, plain)).toBeNull();
	});

	it('returns null for empty HTML', () => {
		expect(htmlLinksToMarkdown('', 'some plain text')).toBeNull();
	});

	it('returns null when anchors only have empty hrefs', () => {
		const html = '<a href="">label</a>';
		expect(htmlLinksToMarkdown(html, 'label')).toBeNull();
	});
});
