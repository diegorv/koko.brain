// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
	sanitizeHtml,
	sanitizeSvgContent,
	sanitizeSnippetHtml,
	sanitizeMermaidSvg,
} from '$lib/utils/sanitize';

// ---------------------------------------------------------------------------
// sanitizeHtml
// ---------------------------------------------------------------------------
describe('sanitizeHtml', () => {
	it('allows safe rich-text tags', () => {
		const input = '<p>Hello <strong>world</strong></p>';
		expect(sanitizeHtml(input)).toContain('<p>');
		expect(sanitizeHtml(input)).toContain('<strong>');
	});

	it('strips <script> tags', () => {
		const result = sanitizeHtml('<p>text</p><script>alert(1)</script>');
		expect(result).not.toContain('<script>');
		expect(result).not.toContain('alert(1)');
	});

	it('strips inline event handlers', () => {
		const result = sanitizeHtml('<p onclick="alert(1)">click me</p>');
		expect(result).not.toContain('onclick');
	});

	it('allows safe style attributes', () => {
		const result = sanitizeHtml('<p style="color:red">text</p>');
		expect(result).toContain('style=');
		expect(result).toContain('color:red');
	});

	it('strips <iframe> tags', () => {
		const result = sanitizeHtml('<iframe src="https://evil.com"></iframe>');
		expect(result).not.toContain('<iframe');
	});

	it('strips javascript: href', () => {
		const result = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
		expect(result).not.toContain('javascript:');
	});

	it('allows safe <a href>', () => {
		const result = sanitizeHtml('<a href="https://example.com">link</a>');
		expect(result).toContain('href="https://example.com"');
	});

	it('allows <mark> tags', () => {
		const result = sanitizeHtml('<p>foo <mark>bar</mark> baz</p>');
		expect(result).toContain('<mark>bar</mark>');
	});

	it('returns empty string for empty input', () => {
		expect(sanitizeHtml('')).toBe('');
	});

	it('allows <audio> with src and controls', () => {
		const result = sanitizeHtml('<audio src="file.mp3" controls></audio>');
		expect(result).toContain('<audio');
		expect(result).toContain('src="file.mp3"');
		expect(result).toContain('controls');
	});

	it('allows <audio> with <source> children', () => {
		const result = sanitizeHtml('<audio controls><source src="file.mp3" type="audio/mpeg"></audio>');
		expect(result).toContain('<audio');
		expect(result).toContain('<source');
		expect(result).toContain('type="audio/mpeg"');
	});

	it('allows audio attributes loop and preload', () => {
		const result = sanitizeHtml('<audio src="file.mp3" controls loop preload="metadata"></audio>');
		expect(result).toContain('loop');
		expect(result).toContain('preload');
	});

	it('strips event handlers on <audio>', () => {
		const result = sanitizeHtml('<audio src="file.mp3" onerror="alert(1)" controls></audio>');
		expect(result).not.toContain('onerror');
	});

	it('allows <video> with src and controls', () => {
		const result = sanitizeHtml('<video src="file.mp4" controls></video>');
		expect(result).toContain('<video');
		expect(result).toContain('src="file.mp4"');
		expect(result).toContain('controls');
	});

	it('allows <video> with <source> children', () => {
		const result = sanitizeHtml('<video controls><source src="file.mp4" type="video/mp4"></video>');
		expect(result).toContain('<video');
		expect(result).toContain('<source');
		expect(result).toContain('type="video/mp4"');
	});

	it('allows video poster attribute', () => {
		const result = sanitizeHtml('<video src="file.mp4" poster="thumb.jpg" controls></video>');
		expect(result).toContain('poster="thumb.jpg"');
	});

	it('strips event handlers on <video>', () => {
		const result = sanitizeHtml('<video src="file.mp4" onerror="alert(1)" controls></video>');
		expect(result).not.toContain('onerror');
	});
});

// ---------------------------------------------------------------------------
// sanitizeSvgContent
// ---------------------------------------------------------------------------
describe('sanitizeSvgContent', () => {
	it('allows SVG shape elements', () => {
		const input = '<path d="M10 10 L20 20" /><circle cx="5" cy="5" r="3" />';
		const result = sanitizeSvgContent(input);
		expect(result).toContain('<path');
		expect(result).toContain('<circle');
	});

	it('strips <script> inside SVG', () => {
		const result = sanitizeSvgContent('<path d="M0 0"/><script>alert(1)</script>');
		expect(result).not.toContain('<script>');
		expect(result).not.toContain('alert(1)');
	});

	it('strips onload event handler', () => {
		const result = sanitizeSvgContent('<rect onload="alert(1)" width="10" height="10"/>');
		expect(result).not.toContain('onload');
	});

	it('strips onerror event handler', () => {
		const result = sanitizeSvgContent('<image href="x" onerror="alert(1)"/>');
		expect(result).not.toContain('onerror');
	});

	it('returns empty string for empty input', () => {
		expect(sanitizeSvgContent('')).toBe('');
	});
});

// ---------------------------------------------------------------------------
// sanitizeSnippetHtml
// ---------------------------------------------------------------------------
describe('sanitizeSnippetHtml', () => {
	it('preserves <mark> tags', () => {
		const result = sanitizeSnippetHtml('foo <mark>bar</mark> baz');
		expect(result).toBe('foo <mark>bar</mark> baz');
	});

	it('escapes < and > outside mark tags', () => {
		const result = sanitizeSnippetHtml('foo <b>bold</b> bar');
		expect(result).toContain('&lt;b&gt;');
		expect(result).not.toContain('<b>');
	});

	it('escapes & ampersand', () => {
		const result = sanitizeSnippetHtml('foo & bar');
		expect(result).toContain('&amp;');
	});

	it('escapes double quotes', () => {
		const result = sanitizeSnippetHtml('say "hello"');
		expect(result).toContain('&quot;');
	});

	it('escapes single quotes', () => {
		const result = sanitizeSnippetHtml("it's fine");
		expect(result).toContain('&#39;');
	});

	it('handles case-insensitive <MARK> tags', () => {
		const result = sanitizeSnippetHtml('foo <MARK>bar</MARK> baz');
		expect(result).toContain('<mark>bar</mark>');
	});

	it('strips script injection attempts', () => {
		const result = sanitizeSnippetHtml('<script>alert(1)</script>');
		expect(result).not.toContain('<script>');
		expect(result).toContain('&lt;script&gt;');
	});

	it('returns empty string for empty input', () => {
		expect(sanitizeSnippetHtml('')).toBe('');
	});
});

// ---------------------------------------------------------------------------
// sanitizeMermaidSvg
// ---------------------------------------------------------------------------
describe('sanitizeMermaidSvg', () => {
	it('allows valid SVG output', () => {
		const svg = '<svg viewBox="0 0 100 100"><rect width="100" height="100"/></svg>';
		const result = sanitizeMermaidSvg(svg);
		expect(result).toContain('<svg');
		expect(result).toContain('<rect');
	});

	it('strips <script> tags', () => {
		const svg = '<svg><script>alert(1)</script><rect width="10" height="10"/></svg>';
		const result = sanitizeMermaidSvg(svg);
		expect(result).not.toContain('<script>');
		expect(result).not.toContain('alert(1)');
	});

	it('strips onload event handler', () => {
		const svg = '<svg onload="alert(1)"><rect width="10" height="10"/></svg>';
		const result = sanitizeMermaidSvg(svg);
		expect(result).not.toContain('onload');
	});

	it('strips onerror event handler', () => {
		const svg = '<svg><image href="x" onerror="alert(1)"/></svg>';
		const result = sanitizeMermaidSvg(svg);
		expect(result).not.toContain('onerror');
	});

	it('returns empty string for empty input', () => {
		expect(sanitizeMermaidSvg('')).toBe('');
	});
});
