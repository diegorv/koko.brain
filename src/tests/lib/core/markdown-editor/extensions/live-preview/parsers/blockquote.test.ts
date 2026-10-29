import { describe, it, expect } from 'vitest';
import { findBlockquoteMarkRange } from '#lib/core/markdown-editor/extensions/live-preview/parsers/blockquote.js';
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

	it('starts the mark at the first > when a list marker precedes it', () => {
		const state = createMarkdownState('- > quote');
		const result = findBlockquoteMarkRange(state, 0, 9);
		expect(result).toEqual({ markFrom: 2, markTo: 4, depth: 1 });
	});

	it('keeps the leading indent of an indented quote outside the mark', () => {
		const state = createMarkdownState('  > quote');
		const result = findBlockquoteMarkRange(state, 0, 9);
		expect(result).toEqual({ markFrom: 2, markTo: 4, depth: 1 });
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

	it('returns null for content lines of a callout', () => {
		const state = createMarkdownState('> [!note] Title\n> body');
		const line = state.doc.line(2);
		expect(findBlockquoteMarkRange(state, line.from, line.to)).toBeNull();
	});

	it('returns null for a nested callout header and its content', () => {
		const state = createMarkdownState('> quote\n> > [!tip] Inner\n> > body');
		for (const n of [2, 3]) {
			const line = state.doc.line(n);
			expect(findBlockquoteMarkRange(state, line.from, line.to)).toBeNull();
		}
		const first = state.doc.line(1);
		expect(findBlockquoteMarkRange(state, first.from, first.to)).toEqual({ markFrom: 0, markTo: 2, depth: 1 });
	});

	it('returns the quote marks past the callout prefix for a plain quote nested in a callout', () => {
		const state = createMarkdownState('> [!note] T\n> > quoted\n> body');
		const line = state.doc.line(2);
		// The callout field hides the first `> `; this range covers only the second
		expect(findBlockquoteMarkRange(state, line.from, line.to)).toEqual({
			markFrom: line.from + 2,
			markTo: line.from + 4,
			depth: 1,
		});
		for (const n of [1, 3]) {
			const other = state.doc.line(n);
			expect(findBlockquoteMarkRange(state, other.from, other.to)).toBeNull();
		}
	});

	it('styles the outer plain quote when `> > [!tip]` opens it', () => {
		// The blank `>` line ends the inner quote; without it `> tail` would be a
		// lazy continuation of the callout's paragraph
		const state = createMarkdownState('> > [!tip] X\n> > body\n>\n> tail');
		for (const n of [1, 2]) {
			const line = state.doc.line(n);
			expect(findBlockquoteMarkRange(state, line.from, line.to)).toBeNull();
		}
		const tail = state.doc.line(4);
		expect(findBlockquoteMarkRange(state, tail.from, tail.to)).toEqual({
			markFrom: tail.from,
			markTo: tail.from + 2,
			depth: 1,
		});
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
