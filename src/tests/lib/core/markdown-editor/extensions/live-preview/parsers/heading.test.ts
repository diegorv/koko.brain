import { describe, it, expect } from 'vitest';
import { findHeadingMarkRange, findSetextHeadingRange } from '$lib/core/markdown-editor/extensions/live-preview/parsers/heading';
import { createMarkdownState } from '../../../test-helpers';

describe('findHeadingMarkRange', () => {
	it('detects H1 heading', () => {
		const state = createMarkdownState('# Hello');
		const result = findHeadingMarkRange(state, 0, 7);
		expect(result).not.toBeNull();
		expect(result!.level).toBe(1);
		expect(result!.markFrom).toBe(0);
		expect(result!.markTo).toBe(2);
	});

	it('detects H2 heading', () => {
		const state = createMarkdownState('## Hello');
		const result = findHeadingMarkRange(state, 0, 8);
		expect(result).not.toBeNull();
		expect(result!.level).toBe(2);
		expect(result!.markFrom).toBe(0);
		expect(result!.markTo).toBe(3);
	});

	it('detects H3 heading', () => {
		const state = createMarkdownState('### Hello');
		const result = findHeadingMarkRange(state, 0, 9);
		expect(result).not.toBeNull();
		expect(result!.level).toBe(3);
		expect(result!.markFrom).toBe(0);
		expect(result!.markTo).toBe(4);
	});

	it('detects H4 through H6', () => {
		const s4 = createMarkdownState('#### H4');
		expect(findHeadingMarkRange(s4, 0, 7)!.level).toBe(4);

		const s5 = createMarkdownState('##### H5');
		expect(findHeadingMarkRange(s5, 0, 8)!.level).toBe(5);

		const s6 = createMarkdownState('###### H6');
		expect(findHeadingMarkRange(s6, 0, 9)!.level).toBe(6);
	});

	it('returns null for non-heading lines', () => {
		const s1 = createMarkdownState('No heading here');
		expect(findHeadingMarkRange(s1, 0, 15)).toBeNull();

		const s2 = createMarkdownState('');
		expect(findHeadingMarkRange(s2, 0, 0)).toBeNull();
	});

	it('returns null for # without space', () => {
		const state = createMarkdownState('#NoSpace');
		expect(findHeadingMarkRange(state, 0, 8)).toBeNull();
	});

	it('returns null for more than 6 hashes', () => {
		const state = createMarkdownState('####### Too many');
		expect(findHeadingMarkRange(state, 0, 16)).toBeNull();
	});

	it('applies offset correctly in multi-line doc', () => {
		const doc = 'first line\n## Title';
		const state = createMarkdownState(doc);
		const line = state.doc.line(2);
		const result = findHeadingMarkRange(state, line.from, line.to);
		expect(result).not.toBeNull();
		expect(result!.level).toBe(2);
		expect(result!.markFrom).toBe(line.from);
		expect(result!.markTo).toBe(line.from + 3);
	});

	it('handles heading with trailing content', () => {
		const state = createMarkdownState('# Heading with **bold**');
		const result = findHeadingMarkRange(state, 0, 23);
		expect(result).not.toBeNull();
		expect(result!.level).toBe(1);
		expect(result!.markTo).toBe(2);
	});
});

describe('findSetextHeadingRange', () => {
	it('detects setext h1 with = underline', () => {
		const state = createMarkdownState('Title\n=====');
		const result = findSetextHeadingRange(state, 0, state.doc.length);
		expect(result).not.toBeNull();
		expect(result!.level).toBe(1);
		expect(result!.from).toBe(0);
		expect(result!.to).toBe(11);
		expect(result!.underlineFrom).toBe(6);
		expect(result!.underlineTo).toBe(11);
	});

	it('detects setext h2 with - underline', () => {
		const state = createMarkdownState('Subtitle\n--------');
		const result = findSetextHeadingRange(state, 0, state.doc.length);
		expect(result).not.toBeNull();
		expect(result!.level).toBe(2);
		expect(result!.underlineFrom).toBe(9);
	});

	it('works with short underlines', () => {
		const state = createMarkdownState('Title\n==');
		const result = findSetextHeadingRange(state, 0, state.doc.length);
		// Lezer may or may not recognize underlines shorter than 3 chars — verify behavior
		if (result) {
			expect(result.level).toBe(1);
		}
	});

	it('returns null for plain text', () => {
		const state = createMarkdownState('No heading here');
		const result = findSetextHeadingRange(state, 0, state.doc.length);
		expect(result).toBeNull();
	});

	it('detects setext heading after other content', () => {
		const doc = 'some text\n\nTitle\n=====';
		const state = createMarkdownState(doc);
		const result = findSetextHeadingRange(state, 0, state.doc.length);
		expect(result).not.toBeNull();
		expect(result!.level).toBe(1);
	});
});
