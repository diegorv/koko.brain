import { describe, it, expect } from 'vitest';
import { findImageRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/image';
import { createMarkdownState } from '../../../test-helpers';

describe('findImageRanges', () => {
	it('detects basic image ![alt](url)', () => {
		const doc = '![photo](image.png)';
		const state = createMarkdownState(doc);
		const ranges = findImageRanges(state, 0, doc.length);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].fullFrom).toBe(0);
		expect(ranges[0].fullTo).toBe(19);
		expect(ranges[0].altText).toBe('photo');
		expect(ranges[0].url).toBe('image.png');
	});

	it('detects image with empty alt text', () => {
		const doc = '![](image.png)';
		const state = createMarkdownState(doc);
		const ranges = findImageRanges(state, 0, doc.length);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].altText).toBe('');
		expect(ranges[0].url).toBe('image.png');
	});

	it('detects image with title', () => {
		const doc = '![alt](image.png "My Title")';
		const state = createMarkdownState(doc);
		const ranges = findImageRanges(state, 0, doc.length);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].altText).toBe('alt');
		expect(ranges[0].url).toBe('image.png');
	});

	it('detects image with http URL', () => {
		const doc = '![pic](https://example.com/img.jpg)';
		const state = createMarkdownState(doc);
		const ranges = findImageRanges(state, 0, doc.length);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].url).toBe('https://example.com/img.jpg');
	});

	it('detects multiple images on one line', () => {
		const doc = '![a](a.png) ![b](b.png)';
		const state = createMarkdownState(doc);
		const ranges = findImageRanges(state, 0, doc.length);
		expect(ranges).toHaveLength(2);
		expect(ranges[0].altText).toBe('a');
		expect(ranges[1].altText).toBe('b');
	});

	it('returns empty array when no images present', () => {
		const state = createMarkdownState('no images here');
		expect(findImageRanges(state, 0, 14)).toHaveLength(0);
	});

	it('does not match regular links (without !)', () => {
		const state = createMarkdownState('[text](url)');
		expect(findImageRanges(state, 0, 11)).toHaveLength(0);
	});

	it('applies offset correctly', () => {
		const doc = 'a'.repeat(100) + '\n![alt](img.png)';
		const state = createMarkdownState(doc);
		const line = state.doc.line(2);
		const ranges = findImageRanges(state, line.from, line.to);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].fullFrom).toBe(101);
		expect(ranges[0].fullTo).toBe(116);
	});

	it('does not match images inside fenced code blocks', () => {
		const doc = '```\n![alt](img.png)\n```';
		const state = createMarkdownState(doc);
		expect(findImageRanges(state, 0, doc.length)).toHaveLength(0);
	});
});
