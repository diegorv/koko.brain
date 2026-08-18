import { describe, it, expect } from 'vitest';
import {
	findMarkdownLinkUrlAtPosition,
	findExtendedAutolinkRanges,
} from '$lib/core/markdown-editor/extensions/live-preview/parsers/link';
import { createMarkdownState } from '../../../test-helpers';

describe('findMarkdownLinkUrlAtPosition', () => {
	it('returns URL when position is inside link text', () => {
		const doc = '[click here](http://example.com)';
		const state = createMarkdownState(doc);
		const result = findMarkdownLinkUrlAtPosition(state, 0, doc.length, 5);
		expect(result).toBe('http://example.com');
	});

	it('returns null when position is outside any link', () => {
		const doc = 'Some text [link](url)';
		const state = createMarkdownState(doc);
		const result = findMarkdownLinkUrlAtPosition(state, 0, doc.length, 3);
		expect(result).toBeNull();
	});

	it('returns correct URL for second link on same line', () => {
		const doc = 'See [A](a.md) and [B](b.md)';
		const state = createMarkdownState(doc);
		const result = findMarkdownLinkUrlAtPosition(state, 0, doc.length, 19);
		expect(result).toBe('b.md');
	});

	it('returns null when line has no links', () => {
		const doc = 'Just plain text';
		const state = createMarkdownState(doc);
		const result = findMarkdownLinkUrlAtPosition(state, 0, doc.length, 5);
		expect(result).toBeNull();
	});

	it('handles offset correctly', () => {
		const doc = 'a'.repeat(50) + '\n[link](http://example.com)';
		const state = createMarkdownState(doc);
		const line = state.doc.line(2);
		const result = findMarkdownLinkUrlAtPosition(state, line.from, line.to, 53);
		expect(result).toBe('http://example.com');
	});

	it('returns URL at start boundary of link text', () => {
		const doc = '[link](url)';
		const state = createMarkdownState(doc);
		const result = findMarkdownLinkUrlAtPosition(state, 0, doc.length, 1);
		expect(result).toBe('url');
	});

	it('returns URL at end boundary of link text', () => {
		const doc = '[link](url)';
		const state = createMarkdownState(doc);
		const result = findMarkdownLinkUrlAtPosition(state, 0, doc.length, 5);
		expect(result).toBe('url');
	});
});

describe('findExtendedAutolinkRanges', () => {
	it('detects a bare https URL', () => {
		const ranges = findExtendedAutolinkRanges('Visit https://example.com now', 0);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].url).toBe('https://example.com');
		expect(ranges[0].from).toBe(6);
		expect(ranges[0].to).toBe(25);
	});

	it('detects a bare http URL', () => {
		const ranges = findExtendedAutolinkRanges('Visit http://example.com now', 0);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].url).toBe('http://example.com');
	});

	it('strips trailing period', () => {
		const ranges = findExtendedAutolinkRanges('See https://example.com.', 0);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].url).toBe('https://example.com');
	});

	it('handles URL with path', () => {
		const ranges = findExtendedAutolinkRanges('Visit https://example.com/path/to/page today', 0);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].url).toBe('https://example.com/path/to/page');
	});

	it('handles balanced parentheses in URL (Wikipedia)', () => {
		const ranges = findExtendedAutolinkRanges('See https://en.wikipedia.org/wiki/Foo_(bar) here', 0);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].url).toBe('https://en.wikipedia.org/wiki/Foo_(bar)');
	});

	it('strips unbalanced trailing parenthesis', () => {
		const ranges = findExtendedAutolinkRanges('(see https://example.com)', 0);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].url).toBe('https://example.com');
	});

	it('detects multiple bare URLs on one line', () => {
		const ranges = findExtendedAutolinkRanges('Visit https://a.com and https://b.com', 0);
		expect(ranges).toHaveLength(2);
		expect(ranges[0].url).toBe('https://a.com');
		expect(ranges[1].url).toBe('https://b.com');
	});

	it('returns empty for plain text without URLs', () => {
		const ranges = findExtendedAutolinkRanges('no urls here', 0);
		expect(ranges).toHaveLength(0);
	});

	it('applies offset correctly', () => {
		const ranges = findExtendedAutolinkRanges('Visit https://example.com', 100);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].from).toBe(106);
		expect(ranges[0].to).toBe(125);
	});

	it('does not match URL at start of line without preceding space', () => {
		const ranges = findExtendedAutolinkRanges('https://example.com', 0);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].url).toBe('https://example.com');
	});

	it('does not match visithttps://example.com (no space before)', () => {
		const ranges = findExtendedAutolinkRanges('visithttps://example.com', 0);
		expect(ranges).toHaveLength(0);
	});
});
