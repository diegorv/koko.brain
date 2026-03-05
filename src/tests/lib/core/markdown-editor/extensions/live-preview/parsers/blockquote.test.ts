import { describe, it, expect } from 'vitest';
import { findBlockquoteMarkRange } from '$lib/core/markdown-editor/extensions/live-preview/parsers/blockquote';
import { createMarkdownState } from '../../../test-helpers';

describe('findBlockquoteMarkRange', () => {
	it('detects > mark with space (depth 1)', () => {
		const state = createMarkdownState('> Hello');
		const result = findBlockquoteMarkRange(state, 0, 7);
		expect(result).not.toBeNull();
		expect(result!.markFrom).toBe(0);
		expect(result!.markTo).toBe(2);
		expect(result!.depth).toBe(1);
	});

	it('detects > mark without space (depth 1)', () => {
		const state = createMarkdownState('>Hello');
		const result = findBlockquoteMarkRange(state, 0, 6);
		expect(result).not.toBeNull();
		expect(result!.markFrom).toBe(0);
		expect(result!.markTo).toBe(1);
		expect(result!.depth).toBe(1);
	});

	it('detects > > nested (depth 2)', () => {
		const state = createMarkdownState('> > nested');
		const result = findBlockquoteMarkRange(state, 0, 10);
		expect(result).not.toBeNull();
		expect(result!.markFrom).toBe(0);
		expect(result!.markTo).toBe(4);
		expect(result!.depth).toBe(2);
	});

	it('detects > > > triple nested (depth 3)', () => {
		const state = createMarkdownState('> > > deep');
		const result = findBlockquoteMarkRange(state, 0, 10);
		expect(result).not.toBeNull();
		expect(result!.markFrom).toBe(0);
		expect(result!.markTo).toBe(6);
		expect(result!.depth).toBe(3);
	});

	it('detects >> without spaces (depth 2)', () => {
		const state = createMarkdownState('>>nested');
		const result = findBlockquoteMarkRange(state, 0, 8);
		expect(result).not.toBeNull();
		expect(result!.markFrom).toBe(0);
		expect(result!.markTo).toBe(2);
		expect(result!.depth).toBe(2);
	});

	it('returns null for callout lines', () => {
		const s1 = createMarkdownState('> [!note]');
		expect(findBlockquoteMarkRange(s1, 0, 9)).toBeNull();

		const s2 = createMarkdownState('> [!warning] Title');
		expect(findBlockquoteMarkRange(s2, 0, 18)).toBeNull();
	});

	it('returns null for hyphenated callout lines', () => {
		const s1 = createMarkdownState('> [!check-mark]');
		expect(findBlockquoteMarkRange(s1, 0, 15)).toBeNull();

		const s2 = createMarkdownState('> [!to-do] My tasks');
		expect(findBlockquoteMarkRange(s2, 0, 19)).toBeNull();
	});

	it('returns null for non-blockquote lines', () => {
		const state = createMarkdownState('plain text');
		expect(findBlockquoteMarkRange(state, 0, 10)).toBeNull();
	});

	it('applies offset correctly in multi-line doc', () => {
		const doc = 'first line\n> Quote';
		const state = createMarkdownState(doc);
		const line = state.doc.line(2);
		const result = findBlockquoteMarkRange(state, line.from, line.to);
		expect(result).not.toBeNull();
		expect(result!.markFrom).toBe(line.from);
		expect(result!.markTo).toBe(line.from + 2);
		expect(result!.depth).toBe(1);
	});

	it('applies offset correctly for nested in multi-line doc', () => {
		const doc = 'first line\n> > nested';
		const state = createMarkdownState(doc);
		const line = state.doc.line(2);
		const result = findBlockquoteMarkRange(state, line.from, line.to);
		expect(result).not.toBeNull();
		expect(result!.markFrom).toBe(line.from);
		expect(result!.markTo).toBe(line.from + 4);
		expect(result!.depth).toBe(2);
	});

	it('returns null for blockquote inside fenced code block', () => {
		const doc = '```\n> not a blockquote\n```';
		const state = createMarkdownState(doc);
		const line = state.doc.line(2);
		const result = findBlockquoteMarkRange(state, line.from, line.to);
		expect(result).toBeNull();
	});
});
