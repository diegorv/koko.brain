import { describe, it, expect } from 'vitest';
import {
	extractHeadingSection,
	extractBlockContent,
	stripFrontmatter,
	getNotePreview,
} from '$lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic';

describe('extractHeadingSection', () => {
	const content = `# Title

Some intro text.

## Section A

Content of section A.
More content.

## Section B

Content of section B.

### Subsection B1

Subsection content.

## Section C

Last section.`;

	it('extracts a top-level heading section', () => {
		const result = extractHeadingSection(content, 'Section A');
		expect(result).toBe('## Section A\n\nContent of section A.\nMore content.');
	});

	it('extracts a section that includes subsections', () => {
		const result = extractHeadingSection(content, 'Section B');
		expect(result).toBe('## Section B\n\nContent of section B.\n\n### Subsection B1\n\nSubsection content.');
	});

	it('extracts the last section until end of file', () => {
		const result = extractHeadingSection(content, 'Section C');
		expect(result).toBe('## Section C\n\nLast section.');
	});

	it('extracts a subsection', () => {
		const result = extractHeadingSection(content, 'Subsection B1');
		expect(result).toBe('### Subsection B1\n\nSubsection content.');
	});

	it('is case-insensitive', () => {
		const result = extractHeadingSection(content, 'section a');
		expect(result).not.toBeNull();
		expect(result).toContain('Content of section A.');
	});

	it('returns null for non-existent heading', () => {
		expect(extractHeadingSection(content, 'Non-existent')).toBeNull();
	});

	it('returns null for empty content', () => {
		expect(extractHeadingSection('', 'Title')).toBeNull();
	});

	it('handles heading with trailing whitespace', () => {
		const result = extractHeadingSection('## My Heading  \n\nContent here.', 'My Heading');
		expect(result).toBe('## My Heading  \n\nContent here.');
	});
});

describe('extractBlockContent', () => {
	it('extracts a line with a block ID', () => {
		const content = 'Some random text here ^abc123';
		expect(extractBlockContent(content, 'abc123')).toBe('Some random text here');
	});

	it('extracts block from multi-line content', () => {
		const content = `First line
Second line ^block1
Third line`;
		expect(extractBlockContent(content, 'block1')).toBe('Second line');
	});

	it('returns null for non-existent block ID', () => {
		const content = 'No block IDs here';
		expect(extractBlockContent(content, 'missing')).toBeNull();
	});

	it('handles the user example: ^5ki07f', () => {
		const content = 'ghiueghi uehgiuehgiuehgiu iueghiuehgiuehiug heghiuehg iugheiughieuhgiugh iguheiugheiughiue giheihgiuehiugheiugh giuehgiuehiu aage ^5ki07f';
		const result = extractBlockContent(content, '5ki07f');
		expect(result).toBe('ghiueghi uehgiuehgiuehgiu iueghiuehgiuehiug heghiuehg iugheiughieuhgiugh iguheiugheiughiue giheihgiuehiugheiugh giuehgiuehiu aage');
	});

	it('returns null for empty content', () => {
		expect(extractBlockContent('', 'abc')).toBeNull();
	});

	it('handles block ID at start of line (standalone marker)', () => {
		const content = 'Line one\n^standalone\nLine three';
		expect(extractBlockContent(content, 'standalone')).toBe('');
	});
});

describe('stripFrontmatter', () => {
	it('strips YAML frontmatter', () => {
		const content = `---
title: Test
---

Body content.`;
		expect(stripFrontmatter(content)).toBe('Body content.');
	});

	it('returns content as-is when no frontmatter', () => {
		const content = 'Just regular content.';
		expect(stripFrontmatter(content)).toBe('Just regular content.');
	});

	it('handles incomplete frontmatter (no closing ---)', () => {
		const content = '---\ntitle: Test\nStill going';
		expect(stripFrontmatter(content)).toBe(content);
	});

	it('does not match --- inside YAML values', () => {
		const content = `---
title: A---B
---

Body text`;
		expect(stripFrontmatter(content)).toBe('Body text');
	});

	it('handles frontmatter with closing delimiter at end of string', () => {
		const content = '---\ntitle: Test\n---';
		expect(stripFrontmatter(content)).toBe('');
	});
});

describe('getNotePreview', () => {
	it('returns full body for short content', () => {
		const content = `---
title: Test
---

Short note.`;
		expect(getNotePreview(content)).toBe('Short note.');
	});

	it('truncates long content with ellipsis', () => {
		const longBody = 'A'.repeat(600);
		const content = longBody;
		const result = getNotePreview(content);
		expect(result.length).toBe(501); // 500 + ellipsis char
		expect(result.endsWith('\u2026')).toBe(true);
	});

	it('returns body without frontmatter', () => {
		const content = `---
tags: [test]
---

# My Note

Some content here.`;
		const result = getNotePreview(content);
		expect(result).toBe('# My Note\n\nSome content here.');
	});

	it('returns empty string for empty content', () => {
		expect(getNotePreview('')).toBe('');
	});

	it('returns empty string for frontmatter-only content', () => {
		expect(getNotePreview('---\ntitle: Test\n---')).toBe('');
	});
});
