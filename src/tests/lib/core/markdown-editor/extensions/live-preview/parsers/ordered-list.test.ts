import { describe, it, expect } from 'vitest';
import { findOrderedListMarkRange } from '$lib/core/markdown-editor/extensions/live-preview/parsers/ordered-list';
import { createMarkdownState } from '../../../test-helpers';

describe('findOrderedListMarkRange', () => {
	it('detects 1. item', () => {
		const state = createMarkdownState('1. First item');
		const result = findOrderedListMarkRange(state, 0, 13);
		expect(result).not.toBeNull();
		expect(result!.markFrom).toBe(0);
		expect(result!.markTo).toBe(3);
		expect(result!.number).toBe(1);
	});

	it('detects multi-digit numbers', () => {
		const state = createMarkdownState('10. Tenth item');
		const result = findOrderedListMarkRange(state, 0, 14);
		expect(result).not.toBeNull();
		expect(result!.markFrom).toBe(0);
		expect(result!.markTo).toBe(4);
		expect(result!.number).toBe(10);
	});

	it('detects indented list items', () => {
		const doc = '1. Parent\n   2. Indented';
		const state = createMarkdownState(doc);
		const line = state.doc.line(2);
		const result = findOrderedListMarkRange(state, line.from, line.to);
		expect(result).not.toBeNull();
		expect(result!.markFrom).toBe(13);
		expect(result!.markTo).toBe(16);
		expect(result!.number).toBe(2);
	});

	it('returns null for non-ordered-list lines', () => {
		const state1 = createMarkdownState('plain text');
		expect(findOrderedListMarkRange(state1, 0, 10)).toBeNull();
		const state2 = createMarkdownState('');
		expect(findOrderedListMarkRange(state2, 0, 0)).toBeNull();
	});

	it('returns null when no space after dot', () => {
		const state = createMarkdownState('1.no space');
		expect(findOrderedListMarkRange(state, 0, 10)).toBeNull();
	});

	it('returns null for unordered list', () => {
		const state = createMarkdownState('- item');
		expect(findOrderedListMarkRange(state, 0, 6)).toBeNull();
	});

	it('applies offset correctly', () => {
		const doc = 'a'.repeat(100) + '\n1. item';
		const state = createMarkdownState(doc);
		const line = state.doc.line(2);
		const result = findOrderedListMarkRange(state, line.from, line.to);
		expect(result).not.toBeNull();
		expect(result!.markFrom).toBe(101);
		expect(result!.markTo).toBe(104);
	});

	it('detects large numbers', () => {
		const state = createMarkdownState('999. item');
		const result = findOrderedListMarkRange(state, 0, 9);
		expect(result).not.toBeNull();
		expect(result!.number).toBe(999);
		expect(result!.markTo).toBe(5);
	});

	it('does not match ordered lists inside fenced code blocks', () => {
		const doc = '```\n1. not a list\n```';
		const state = createMarkdownState(doc);
		expect(findOrderedListMarkRange(state, 0, doc.length)).toBeNull();
	});
});
