import { describe, it, expect } from 'vitest';
import {
	findHeadingPosition,
	findBlockIdPosition,
} from '$lib/core/markdown-editor/extensions/wikilink/navigation.logic';

describe('findHeadingPosition', () => {
	const doc = [
		'# Title',
		'',
		'Some paragraph text.',
		'',
		'## Section One',
		'',
		'Content here.',
		'',
		'### Subsection',
		'',
		'More content.',
	].join('\n');

	it('finds h1 heading position', () => {
		expect(findHeadingPosition(doc, 'Title')).toBe(0);
	});

	it('finds h2 heading position', () => {
		// "# Title\n\nSome paragraph text.\n\n" = 8 + 1 + 21 + 1 = 31
		expect(findHeadingPosition(doc, 'Section One')).toBe(31);
	});

	it('finds h3 heading position', () => {
		expect(findHeadingPosition(doc, 'Subsection')).toBe(62);
	});

	it('matches case-insensitively', () => {
		expect(findHeadingPosition(doc, 'title')).toBe(0);
		expect(findHeadingPosition(doc, 'SECTION ONE')).toBe(31);
	});

	it('returns null for non-existent heading', () => {
		expect(findHeadingPosition(doc, 'Missing')).toBeNull();
	});

	it('returns null for empty content', () => {
		expect(findHeadingPosition('', 'Title')).toBeNull();
	});

	it('does not match non-heading lines', () => {
		expect(findHeadingPosition(doc, 'Some paragraph text.')).toBeNull();
	});

	it('handles heading with extra spaces', () => {
		const content = '#  Spaced Heading\ntext';
		expect(findHeadingPosition(content, 'Spaced Heading')).toBe(0);
	});

	it('finds first matching heading when duplicates exist', () => {
		const content = '# Intro\n\n## Intro\n\ntext';
		expect(findHeadingPosition(content, 'Intro')).toBe(0);
	});
});

describe('findBlockIdPosition', () => {
	const doc = [
		'# Title',
		'',
		'This is a paragraph. ^para-1',
		'',
		'Another paragraph. ^para-2',
		'',
		'- List item ^list-item',
	].join('\n');

	it('finds block id at end of paragraph', () => {
		// "# Title\n\n" = 9
		expect(findBlockIdPosition(doc, 'para-1')).toBe(9);
	});

	it('finds second block id', () => {
		expect(findBlockIdPosition(doc, 'para-2')).toBe(39);
	});

	it('finds block id on list item', () => {
		expect(findBlockIdPosition(doc, 'list-item')).toBe(67);
	});

	it('returns null for non-existent block id', () => {
		expect(findBlockIdPosition(doc, 'missing')).toBeNull();
	});

	it('returns null for empty content', () => {
		expect(findBlockIdPosition('', 'id')).toBeNull();
	});

	it('does not match partial block ids', () => {
		const content = 'text ^block-id-long';
		expect(findBlockIdPosition(content, 'block-id')).toBeNull();
	});

	it('handles block id with trailing whitespace', () => {
		const content = 'text ^my-id  ';
		expect(findBlockIdPosition(content, 'my-id')).toBe(0);
	});

	it('handles block id as only content on line', () => {
		const content = '^standalone-id';
		expect(findBlockIdPosition(content, 'standalone-id')).toBe(0);
	});
});
