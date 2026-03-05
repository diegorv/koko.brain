import { describe, it, expect } from 'vitest';
import { highlightCode } from '$lib/core/markdown-editor/extensions/live-preview/code-highlight.logic';

describe('highlightCode', () => {
	it('returns empty html for empty code', () => {
		const result = highlightCode('', 'javascript');
		expect(result.html).toBe('');
		expect(result.language).toBe('javascript');
	});

	it('highlights known language with hljs classes', () => {
		const result = highlightCode('const x = 1;', 'javascript');
		expect(result.html).toContain('hljs-');
		expect(result.html).toContain('const');
		expect(result.language).toBe('javascript');
	});

	it('highlights TypeScript', () => {
		const result = highlightCode('const x: number = 42;', 'typescript');
		expect(result.html).toContain('hljs-');
		expect(result.language).toBe('typescript');
	});

	it('highlights Python', () => {
		const result = highlightCode('def hello():\n    print("world")', 'python');
		expect(result.html).toContain('hljs-');
		expect(result.language).toBe('python');
	});

	it('returns escaped plain text for unknown language', () => {
		const result = highlightCode('some code here', 'unknownlang123');
		expect(result.html).toBe('some code here');
		expect(result.html).not.toContain('hljs-');
		expect(result.language).toBe('unknownlang123');
	});

	it('returns escaped plain text when no language specified', () => {
		const result = highlightCode('some text');
		expect(result.html).toBe('some text');
		expect(result.language).toBe('text');
	});

	it('escapes HTML special characters', () => {
		const result = highlightCode('<div class="test">&amp;</div>', 'unknownlang123');
		expect(result.html).toContain('&lt;');
		expect(result.html).toContain('&gt;');
		expect(result.html).toContain('&amp;amp;');
		expect(result.html).not.toContain('<div');
	});

	it('escapes special characters in highlighted code', () => {
		const result = highlightCode('const x = "<b>bold</b>";', 'javascript');
		// Even inside hljs spans, raw < should be escaped
		expect(result.html).not.toContain('<b>bold</b>');
		expect(result.html).toContain('&lt;b&gt;');
	});

	it('handles multiline code', () => {
		const code = 'function add(a, b) {\n  return a + b;\n}';
		const result = highlightCode(code, 'javascript');
		expect(result.html).toContain('hljs-');
		expect(result.html).toContain('\n');
	});

	it('handles Rust code', () => {
		const result = highlightCode('fn main() { println!("hello"); }', 'rust');
		expect(result.html).toContain('hljs-');
		expect(result.language).toBe('rust');
	});

	it('handles CSS code', () => {
		const result = highlightCode('.btn { color: red; }', 'css');
		expect(result.html).toContain('hljs-');
		expect(result.language).toBe('css');
	});
});
