import { describe, it, expect } from 'vitest';
import {
	findMarkdownLinkRanges,
	findMarkdownLinkUrlAtPosition,
	findAutolinkRanges,
	findExtendedAutolinkRanges,
} from '$lib/core/markdown-editor/extensions/live-preview/parsers/link';
import { createMarkdownState } from '../../../test-helpers';

describe('findMarkdownLinkRanges', () => {
	it('parses a basic [text](url) link', () => {
		const doc = '[click here](http://example.com)';
		const state = createMarkdownState(doc);
		const ranges = findMarkdownLinkRanges(state, 0, doc.length);
		expect(ranges).toHaveLength(1);
		const r = ranges[0];
		expect(r.openBracketFrom).toBe(0);
		expect(r.openBracketTo).toBe(1);
		expect(r.textFrom).toBe(1);
		expect(r.textTo).toBe(11);
		expect(r.closeBracketUrlFrom).toBe(11);
		expect(r.closeBracketUrlTo).toBe(32);
	});

	it('parses a link with title [text](url "title")', () => {
		const doc = '[link](http://example.com "My Title")';
		const state = createMarkdownState(doc);
		const ranges = findMarkdownLinkRanges(state, 0, doc.length);
		expect(ranges).toHaveLength(1);
		const r = ranges[0];
		expect(r.openBracketFrom).toBe(0);
		expect(r.openBracketTo).toBe(1);
		expect(r.textFrom).toBe(1);
		expect(r.textTo).toBe(5);
		expect(r.closeBracketUrlFrom).toBe(5);
		expect(r.closeBracketUrlTo).toBe(37);
	});

	it('parses multiple links on one line', () => {
		const doc = 'See [A](a.md) and [B](b.md)';
		const state = createMarkdownState(doc);
		const ranges = findMarkdownLinkRanges(state, 0, doc.length);
		expect(ranges).toHaveLength(2);
		expect(ranges[0].textFrom).toBe(5);
		expect(ranges[0].textTo).toBe(6);
		expect(ranges[1].textFrom).toBe(19);
		expect(ranges[1].textTo).toBe(20);
	});

	it('returns empty array when no links present', () => {
		const doc = 'No links here';
		const state = createMarkdownState(doc);
		expect(findMarkdownLinkRanges(state, 0, doc.length)).toHaveLength(0);
	});

	it('returns empty for text without link syntax', () => {
		const state = createMarkdownState('[no url]');
		expect(findMarkdownLinkRanges(state, 0, 8)).toHaveLength(0);
	});

	it('matches link with empty URL (valid markdown)', () => {
		const state = createMarkdownState('[text]()');
		const ranges = findMarkdownLinkRanges(state, 0, 8);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].textFrom).toBe(1);
		expect(ranges[0].textTo).toBe(5);
	});

	it('applies offset correctly', () => {
		const doc = 'a'.repeat(100) + '\n[link](url)';
		const state = createMarkdownState(doc);
		const line = state.doc.line(2);
		const ranges = findMarkdownLinkRanges(state, line.from, line.to);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].openBracketFrom).toBe(101);
		expect(ranges[0].textFrom).toBe(102);
		expect(ranges[0].textTo).toBe(106);
		expect(ranges[0].closeBracketUrlTo).toBe(112);
	});

	it('does not match wikilinks [[note]]', () => {
		const state = createMarkdownState('[[note]]');
		expect(findMarkdownLinkRanges(state, 0, 8)).toHaveLength(0);
	});

	it('handles link text with special characters', () => {
		const doc = '[hello world!](http://example.com)';
		const state = createMarkdownState(doc);
		const ranges = findMarkdownLinkRanges(state, 0, doc.length);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].textFrom).toBe(1);
		expect(ranges[0].textTo).toBe(13);
	});

	it('does not match links inside fenced code blocks', () => {
		const doc = '```\n[link](url)\n```';
		const state = createMarkdownState(doc);
		expect(findMarkdownLinkRanges(state, 0, doc.length)).toHaveLength(0);
	});
});

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

describe('findAutolinkRanges', () => {
	it('detects URL autolink <https://example.com>', () => {
		const doc = 'Visit <https://example.com> now';
		const state = createMarkdownState(doc);
		const ranges = findAutolinkRanges(state, 0, doc.length);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].url).toBe('https://example.com');
		expect(ranges[0].from).toBe(6);
		expect(ranges[0].to).toBe(27);
	});

	it('detects email autolink <user@example.com>', () => {
		const doc = 'Email <user@example.com> for info';
		const state = createMarkdownState(doc);
		const ranges = findAutolinkRanges(state, 0, doc.length);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].url).toBe('user@example.com');
	});

	it('returns empty for plain text', () => {
		const state = createMarkdownState('no autolinks here');
		const ranges = findAutolinkRanges(state, 0, state.doc.length);
		expect(ranges).toHaveLength(0);
	});

	it('returns empty for bare URLs without angle brackets', () => {
		const state = createMarkdownState('https://example.com');
		const ranges = findAutolinkRanges(state, 0, state.doc.length);
		expect(ranges).toHaveLength(0);
	});

	it('detects multiple autolinks on one line', () => {
		const doc = '<https://a.com> and <https://b.com>';
		const state = createMarkdownState(doc);
		const ranges = findAutolinkRanges(state, 0, doc.length);
		expect(ranges).toHaveLength(2);
		expect(ranges[0].url).toBe('https://a.com');
		expect(ranges[1].url).toBe('https://b.com');
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
