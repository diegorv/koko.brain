import { describe, it, expect } from 'vitest';
import { findFrontmatterBlock } from '$lib/core/markdown-editor/extensions/live-preview/parsers/frontmatter';

function makeLines(text: string) {
	const result: { text: string; from: number; to: number }[] = [];
	let pos = 0;
	for (const lineText of text.split('\n')) {
		result.push({ text: lineText, from: pos, to: pos + lineText.length });
		pos += lineText.length + 1;
	}
	return result;
}

describe('findFrontmatterBlock', () => {
	it('detects a simple frontmatter block', () => {
		const lines = makeLines('---\ntitle: Hello\n---\n# Content');
		const result = findFrontmatterBlock(lines);
		expect(result).not.toBeNull();
		expect(result!.openIdx).toBe(0);
		expect(result!.closeIdx).toBe(2);
	});

	it('detects frontmatter with multiple properties', () => {
		const lines = makeLines('---\ntitle: Hello\ntags: journal\ndate: 2024-01-01\n---');
		const result = findFrontmatterBlock(lines);
		expect(result).not.toBeNull();
		expect(result!.closeIdx).toBe(4);
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
	});

	it('handles --- with trailing spaces', () => {
		const lines = makeLines('---  \ntitle: Hello\n---  ');
		const result = findFrontmatterBlock(lines);
		expect(result).not.toBeNull();
		expect(result!.closeIdx).toBe(2);
	});

	it('stops at the first closing fence', () => {
		const lines = makeLines('---\ntitle: Hello\n---\n---\nother: value\n---');
		const result = findFrontmatterBlock(lines);
		expect(result).not.toBeNull();
		expect(result!.closeIdx).toBe(2);
	});
});
