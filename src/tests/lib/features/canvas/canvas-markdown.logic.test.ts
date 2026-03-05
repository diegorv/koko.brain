import { describe, it, expect } from 'vitest';
import { renderCanvasMarkdown } from '$lib/features/canvas/canvas-markdown.logic';

describe('renderCanvasMarkdown', () => {
	it('returns empty string for empty input', () => {
		expect(renderCanvasMarkdown('')).toBe('');
	});

	it('returns empty string for null', () => {
		expect(renderCanvasMarkdown(null)).toBe('');
	});

	it('returns empty string for undefined', () => {
		expect(renderCanvasMarkdown(undefined)).toBe('');
	});

	it('renders a heading', () => {
		const result = renderCanvasMarkdown('# Hello');
		expect(result).toContain('<h1');
		expect(result).toContain('Hello');
	});

	it('renders h2 and h3', () => {
		expect(renderCanvasMarkdown('## Sub')).toContain('<h2');
		expect(renderCanvasMarkdown('### Sub')).toContain('<h3');
	});

	it('renders bold text', () => {
		const result = renderCanvasMarkdown('**bold**');
		expect(result).toContain('<strong>bold</strong>');
	});

	it('renders italic text', () => {
		const result = renderCanvasMarkdown('*italic*');
		expect(result).toContain('<em>italic</em>');
	});

	it('renders links', () => {
		const result = renderCanvasMarkdown('[text](https://example.com)');
		expect(result).toContain('<a');
		expect(result).toContain('href="https://example.com"');
		expect(result).toContain('text');
	});

	it('renders inline code', () => {
		const result = renderCanvasMarkdown('`code`');
		expect(result).toContain('<code>code</code>');
	});

	it('renders code blocks', () => {
		const result = renderCanvasMarkdown('```\nconsole.log("hi")\n```');
		expect(result).toContain('<pre>');
		expect(result).toContain('<code>');
	});

	it('renders unordered lists', () => {
		const result = renderCanvasMarkdown('- item 1\n- item 2');
		expect(result).toContain('<ul>');
		expect(result).toContain('<li>');
	});

	it('renders ordered lists', () => {
		const result = renderCanvasMarkdown('1. first\n2. second');
		expect(result).toContain('<ol>');
		expect(result).toContain('<li>');
	});

	it('renders GFM tables', () => {
		const result = renderCanvasMarkdown('| A | B |\n| --- | --- |\n| 1 | 2 |');
		expect(result).toContain('<table>');
		expect(result).toContain('<th>');
		expect(result).toContain('<td>');
	});

	it('renders line breaks with breaks: true', () => {
		const result = renderCanvasMarkdown('line1\nline2');
		expect(result).toContain('<br');
	});

	it('renders blockquotes', () => {
		const result = renderCanvasMarkdown('> quote');
		expect(result).toContain('<blockquote>');
	});

	it('renders strikethrough', () => {
		const result = renderCanvasMarkdown('~~strike~~');
		expect(result).toContain('<del>strike</del>');
	});
});

describe('renderCanvasMarkdown — XSS sanitization', () => {
	it('strips script tags', () => {
		const result = renderCanvasMarkdown('<script>alert("xss")</script>');
		expect(result).not.toContain('<script');
		expect(result).not.toContain('alert');
	});

	it('strips onerror event handlers from img tags', () => {
		const result = renderCanvasMarkdown('<img src="x" onerror="alert(1)">');
		expect(result).not.toContain('onerror');
		expect(result).not.toContain('alert');
		expect(result).toContain('<img'); // img tag itself is preserved
	});

	it('strips onclick event handlers', () => {
		const result = renderCanvasMarkdown('<div onclick="alert(1)">click me</div>');
		expect(result).not.toContain('onclick');
		expect(result).not.toContain('alert');
	});

	it('strips javascript: URLs from links', () => {
		const result = renderCanvasMarkdown('<a href="javascript:alert(1)">click</a>');
		expect(result).not.toContain('javascript:');
	});

	it('preserves safe HTML elements', () => {
		const result = renderCanvasMarkdown('<strong>bold</strong> and <em>italic</em>');
		expect(result).toContain('<strong>bold</strong>');
		expect(result).toContain('<em>italic</em>');
	});
});
