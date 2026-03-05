import { describe, it, expect } from 'vitest';
import {
	detectBlockElement,
	generateBlockId,
	buildWikilinkText,
} from '$lib/features/copy-block-link/copy-block-link.logic';

describe('detectBlockElement', () => {
	it('detects h1 heading', () => {
		const result = detectBlockElement('# Title');
		expect(result).toEqual({ type: 'heading', headingText: 'Title', existingBlockId: null });
	});

	it('detects h2 heading', () => {
		const result = detectBlockElement('## Section');
		expect(result).toEqual({ type: 'heading', headingText: 'Section', existingBlockId: null });
	});

	it('detects h3 heading', () => {
		const result = detectBlockElement('### Subsection');
		expect(result).toEqual({ type: 'heading', headingText: 'Subsection', existingBlockId: null });
	});

	it('detects h6 heading', () => {
		const result = detectBlockElement('###### Deep');
		expect(result).toEqual({ type: 'heading', headingText: 'Deep', existingBlockId: null });
	});

	it('strips block ID from heading text', () => {
		const result = detectBlockElement('## My Heading ^abc123');
		expect(result).toEqual({ type: 'heading', headingText: 'My Heading', existingBlockId: 'abc123' });
	});

	it('detects unordered list item with dash', () => {
		const result = detectBlockElement('- List item');
		expect(result).toEqual({ type: 'list-item', headingText: null, existingBlockId: null });
	});

	it('detects unordered list item with asterisk', () => {
		const result = detectBlockElement('* List item');
		expect(result).toEqual({ type: 'list-item', headingText: null, existingBlockId: null });
	});

	it('detects unordered list item with plus', () => {
		const result = detectBlockElement('+ List item');
		expect(result).toEqual({ type: 'list-item', headingText: null, existingBlockId: null });
	});

	it('detects indented list item', () => {
		const result = detectBlockElement('  - Nested item');
		expect(result).toEqual({ type: 'list-item', headingText: null, existingBlockId: null });
	});

	it('detects ordered list item', () => {
		const result = detectBlockElement('1. First item');
		expect(result).toEqual({ type: 'list-item', headingText: null, existingBlockId: null });
	});

	it('detects indented ordered list item', () => {
		const result = detectBlockElement('   2. Second');
		expect(result).toEqual({ type: 'list-item', headingText: null, existingBlockId: null });
	});

	it('detects plain paragraph as block', () => {
		const result = detectBlockElement('This is a paragraph.');
		expect(result).toEqual({ type: 'block', headingText: null, existingBlockId: null });
	});

	it('detects blockquote as block', () => {
		const result = detectBlockElement('> A quote');
		expect(result).toEqual({ type: 'block', headingText: null, existingBlockId: null });
	});

	it('detects code fence as block', () => {
		const result = detectBlockElement('```typescript');
		expect(result).toEqual({ type: 'block', headingText: null, existingBlockId: null });
	});

	it('detects empty line as block', () => {
		const result = detectBlockElement('');
		expect(result).toEqual({ type: 'block', headingText: null, existingBlockId: null });
	});

	it('preserves existing block ID on list item', () => {
		const result = detectBlockElement('- Task item ^todo1');
		expect(result).toEqual({ type: 'list-item', headingText: null, existingBlockId: 'todo1' });
	});

	it('preserves existing block ID on paragraph', () => {
		const result = detectBlockElement('Some text ^my-block');
		expect(result).toEqual({ type: 'block', headingText: null, existingBlockId: 'my-block' });
	});
});

describe('generateBlockId', () => {
	it('returns a string of length 6', () => {
		expect(generateBlockId()).toHaveLength(6);
	});

	it('contains only lowercase alphanumeric characters', () => {
		for (let i = 0; i < 20; i++) {
			expect(generateBlockId()).toMatch(/^[a-z0-9]{6}$/);
		}
	});

	it('generates different IDs on subsequent calls', () => {
		const ids = new Set(Array.from({ length: 50 }, () => generateBlockId()));
		// With 36^6 possible IDs, collisions in 50 samples are practically impossible
		expect(ids.size).toBeGreaterThan(45);
	});
});

describe('buildWikilinkText', () => {
	it('builds heading link', () => {
		const element = { type: 'heading' as const, headingText: 'My Section', existingBlockId: null };
		expect(buildWikilinkText('Note', element, null, false)).toBe('[[Note#My Section]]');
	});

	it('builds heading embed', () => {
		const element = { type: 'heading' as const, headingText: 'My Section', existingBlockId: null };
		expect(buildWikilinkText('Note', element, null, true)).toBe('![[Note#My Section]]');
	});

	it('builds block ID link', () => {
		const element = { type: 'block' as const, headingText: null, existingBlockId: null };
		expect(buildWikilinkText('Note', element, 'abc123', false)).toBe('[[Note#^abc123]]');
	});

	it('builds block ID embed', () => {
		const element = { type: 'block' as const, headingText: null, existingBlockId: null };
		expect(buildWikilinkText('Note', element, 'abc123', true)).toBe('![[Note#^abc123]]');
	});

	it('builds list-item link with block ID', () => {
		const element = { type: 'list-item' as const, headingText: null, existingBlockId: 'xyz' };
		expect(buildWikilinkText('My Note', element, 'xyz', false)).toBe('[[My Note#^xyz]]');
	});

	it('builds list-item embed with block ID', () => {
		const element = { type: 'list-item' as const, headingText: null, existingBlockId: 'xyz' };
		expect(buildWikilinkText('My Note', element, 'xyz', true)).toBe('![[My Note#^xyz]]');
	});

	it('handles empty note name gracefully', () => {
		const element = { type: 'block' as const, headingText: null, existingBlockId: null };
		expect(buildWikilinkText('', element, 'abc', false)).toBe('[[#^abc]]');
	});

	it('falls back to block ID when heading type has null headingText', () => {
		const element = { type: 'heading' as const, headingText: null, existingBlockId: null };
		expect(buildWikilinkText('Note', element, 'fallback', false)).toBe('[[Note#^fallback]]');
	});
});
