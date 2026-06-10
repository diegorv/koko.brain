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

	it('converts <br> line breaks to newlines', () => {
		const html = 'first line<br>second line<br><a href="https://x.test/a">label</a>';
		const plain = 'first line\nsecond line\nlabel';
		expect(htmlLinksToMarkdown(html, plain)).toBe('first line\nsecond line\n[label](https://x.test/a)');
	});

	it('preserves blank lines from consecutive <br>', () => {
		const html = 'header<br><br><a href="https://x.test/a">label</a>';
		expect(htmlLinksToMarkdown(html, '')).toBe('header\n\n[label](https://x.test/a)');
	});

	it('separates block elements with newlines', () => {
		const html = '<p>intro</p><div><a href="https://x.test/b">doc</a></div><p>outro</p>';
		const plain = 'intro\ndoc\noutro';
		expect(htmlLinksToMarkdown(html, plain)).toBe('intro\n[doc](https://x.test/b)\noutro');
	});

	it('does not double newlines for nested blocks', () => {
		const html = '<div><p>a</p></div><div><p><a href="https://x.test/c">c</a></p></div>';
		expect(htmlLinksToMarkdown(html, 'a\nc')).toBe('a\n[c](https://x.test/c)');
	});

	it('trims leading and trailing newlines from the result', () => {
		const html = '<p><a href="https://x.test/d">only</a></p>';
		expect(htmlLinksToMarkdown(html, 'only')).toBe('[only](https://x.test/d)');
	});

	it('keeps each line of a multi-line Slack message on its own line', () => {
		const html =
			'<p>Ana Dornelas [3:00 PM]</p>' +
			'<p><a href="https://docs.google.com/presentation/d/123/edit#slide=1">Bre-b Product Review</a></p>' +
			'<p>Plan to win de U18:</p>' +
			'<p><a href="https://a.test/1">Primeiro checkpoint</a></p>' +
			'<p><a href="https://a.test/2">Segundo Checkpoint</a></p>';
		const plain = 'Ana Dornelas [3:00 PM]\nBre-b Product Review\nPlan to win de U18:\nPrimeiro checkpoint\nSegundo Checkpoint';
		expect(htmlLinksToMarkdown(html, plain)).toBe(
			'Ana Dornelas [3:00 PM]\n' +
			'[Bre-b Product Review](https://docs.google.com/presentation/d/123/edit#slide=1)\n' +
			'Plan to win de U18:\n' +
			'[Primeiro checkpoint](https://a.test/1)\n' +
			'[Segundo Checkpoint](https://a.test/2)'
		);
	});

	it('collapses whitespace runs inside anchor labels', () => {
		const html = '<a href="https://x.test/e">multi\n  word   label</a>';
		expect(htmlLinksToMarkdown(html, '')).toBe('[multi word label](https://x.test/e)');
	});
});
