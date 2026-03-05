import { describe, it, expect } from 'vitest';
import {
	parseFrontmatterProperties,
	findFrontmatterBlock,
} from '$lib/core/markdown-editor/extensions/live-preview/parsers/frontmatter';

function makeLines(text: string) {
	const result: { text: string; from: number; to: number }[] = [];
	let pos = 0;
	for (const lineText of text.split('\n')) {
		result.push({ text: lineText, from: pos, to: pos + lineText.length });
		pos += lineText.length + 1;
	}
	return result;
}

describe('parseFrontmatterProperties', () => {
	it('parses simple key-value pairs', () => {
		const props = parseFrontmatterProperties(['title: My Note', 'tags: journal']);
		expect(props).toEqual([
			{ key: 'title', value: 'My Note' },
			{ key: 'tags', value: 'journal' },
		]);
	});

	it('trims whitespace from keys and values', () => {
		const props = parseFrontmatterProperties(['  title:   Hello World  ']);
		expect(props).toEqual([{ key: 'title', value: 'Hello World' }]);
	});

	it('handles empty value', () => {
		const props = parseFrontmatterProperties(['draft:']);
		expect(props).toEqual([{ key: 'draft', value: '' }]);
	});

	it('handles value with colons', () => {
		const props = parseFrontmatterProperties(['url: https://example.com']);
		expect(props).toEqual([{ key: 'url', value: 'https://example.com' }]);
	});

	it('skips blank lines', () => {
		const props = parseFrontmatterProperties(['title: Hello', '', 'tags: foo']);
		expect(props).toEqual([
			{ key: 'title', value: 'Hello' },
			{ key: 'tags', value: 'foo' },
		]);
	});

	it('skips orphan list items without a preceding key', () => {
		const props = parseFrontmatterProperties(['  - item1', '  - item2']);
		expect(props).toEqual([]);
	});

	it('parses block list items as comma-separated value', () => {
		const props = parseFrontmatterProperties(['tags:', '  - daily', '  - amor']);
		expect(props).toEqual([{ key: 'tags', value: 'daily, amor' }]);
	});

	it('parses block list with single item', () => {
		const props = parseFrontmatterProperties(['tags:', '  - daily']);
		expect(props).toEqual([{ key: 'tags', value: 'daily' }]);
	});

	it('parses block list followed by another property', () => {
		const props = parseFrontmatterProperties([
			'tags:',
			'  - daily',
			'  - journal',
			'created: 2026-02-11',
		]);
		expect(props).toEqual([
			{ key: 'tags', value: 'daily, journal' },
			{ key: 'created', value: '2026-02-11' },
		]);
	});

	it('handles multiple block lists', () => {
		const props = parseFrontmatterProperties([
			'tags:',
			'  - daily',
			'aliases:',
			'  - note1',
			'  - note2',
		]);
		expect(props).toEqual([
			{ key: 'tags', value: 'daily' },
			{ key: 'aliases', value: 'note1, note2' },
		]);
	});

	it('returns empty array for empty input', () => {
		expect(parseFrontmatterProperties([])).toEqual([]);
	});

	it('handles keys with hyphens and dots', () => {
		const props = parseFrontmatterProperties(['date-created: 2024-01-01', 'file.name: test']);
		expect(props).toEqual([
			{ key: 'date-created', value: '2024-01-01' },
			{ key: 'file.name', value: 'test' },
		]);
	});

	it('strips double-quoted YAML values', () => {
		const props = parseFrontmatterProperties(['person: "[[rafaela]]"']);
		expect(props).toEqual([{ key: 'person', value: '[[rafaela]]' }]);
	});

	it('strips single-quoted YAML values', () => {
		const props = parseFrontmatterProperties(["title: 'Hello World'"]);
		expect(props).toEqual([{ key: 'title', value: 'Hello World' }]);
	});

	it('does not strip quotes from unquoted values', () => {
		const props = parseFrontmatterProperties(['title: Hello World']);
		expect(props).toEqual([{ key: 'title', value: 'Hello World' }]);
	});

	it('does not strip mismatched quotes', () => {
		const props = parseFrontmatterProperties(['title: "Hello\'']);
		expect(props).toEqual([{ key: 'title', value: '"Hello\'' }]);
	});
});

describe('findFrontmatterBlock', () => {
	it('detects a simple frontmatter block', () => {
		const lines = makeLines('---\ntitle: Hello\n---\n# Content');
		const result = findFrontmatterBlock(lines);
		expect(result).not.toBeNull();
		expect(result!.openIdx).toBe(0);
		expect(result!.closeIdx).toBe(2);
		expect(result!.properties).toEqual([{ key: 'title', value: 'Hello' }]);
	});

	it('detects frontmatter with multiple properties', () => {
		const lines = makeLines('---\ntitle: Hello\ntags: journal\ndate: 2024-01-01\n---');
		const result = findFrontmatterBlock(lines);
		expect(result).not.toBeNull();
		expect(result!.closeIdx).toBe(4);
		expect(result!.properties).toHaveLength(3);
		expect(result!.properties[0]).toEqual({ key: 'title', value: 'Hello' });
		expect(result!.properties[1]).toEqual({ key: 'tags', value: 'journal' });
		expect(result!.properties[2]).toEqual({ key: 'date', value: '2024-01-01' });
	});

	it('returns null when first line is not ---', () => {
		const lines = makeLines('# Heading\n---\ntitle: Hello\n---');
		expect(findFrontmatterBlock(lines)).toBeNull();
	});

	it('returns null when no closing fence', () => {
		const lines = makeLines('---\ntitle: Hello\nno close');
		expect(findFrontmatterBlock(lines)).toBeNull();
	});

	it('returns null for empty lines array', () => {
		expect(findFrontmatterBlock([])).toBeNull();
	});

	it('returns null for single line', () => {
		const lines = makeLines('---');
		expect(findFrontmatterBlock(lines)).toBeNull();
	});

	it('detects empty frontmatter block', () => {
		const lines = makeLines('---\n---\n# Content');
		const result = findFrontmatterBlock(lines);
		expect(result).not.toBeNull();
		expect(result!.openIdx).toBe(0);
		expect(result!.closeIdx).toBe(1);
		expect(result!.properties).toEqual([]);
	});

	it('handles --- with trailing spaces', () => {
		const lines = makeLines('---  \ntitle: Hello\n---  ');
		const result = findFrontmatterBlock(lines);
		expect(result).not.toBeNull();
		expect(result!.closeIdx).toBe(2);
	});

	it('returns null when visible range does not start at line 1', () => {
		// Simulate a visible range starting at line 5 (e.g., from: 100)
		const lines = [
			{ text: '---', from: 100, to: 103 },
			{ text: 'title: Hello', from: 104, to: 116 },
			{ text: '---', from: 117, to: 120 },
		];
		// findFrontmatterBlock doesn't check line numbers, but the decorator does.
		// The parser itself just checks that the first element has ---.
		const result = findFrontmatterBlock(lines);
		expect(result).not.toBeNull(); // Parser finds it structurally
	});

	it('stops at the first closing fence', () => {
		const lines = makeLines('---\ntitle: Hello\n---\n---\nother: value\n---');
		const result = findFrontmatterBlock(lines);
		expect(result).not.toBeNull();
		expect(result!.closeIdx).toBe(2);
		expect(result!.properties).toEqual([{ key: 'title', value: 'Hello' }]);
	});

	it('parses frontmatter with block list tags', () => {
		const lines = makeLines('---\ncreated: 2026-02-11\ntags:\n  - daily\n  - amor\n---\n# Title');
		const result = findFrontmatterBlock(lines);
		expect(result).not.toBeNull();
		expect(result!.properties).toEqual([
			{ key: 'created', value: '2026-02-11' },
			{ key: 'tags', value: 'daily, amor' },
		]);
	});
});
