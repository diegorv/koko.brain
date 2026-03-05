import { describe, it, expect } from 'vitest';
import {
	findInlineCommentRanges,
	findBlockComment,
} from '$lib/core/markdown-editor/extensions/live-preview/parsers/comment';
import { createMarkdownState } from '../../../test-helpers';

function makeLines(text: string) {
	const result: { text: string; from: number; to: number }[] = [];
	let pos = 0;
	for (const lineText of text.split('\n')) {
		result.push({ text: lineText, from: pos, to: pos + lineText.length });
		pos += lineText.length + 1;
	}
	return result;
}

describe('findInlineCommentRanges', () => {
	it('detects %%text%% inline comment', () => {
		const state = createMarkdownState('%%hidden%%');
		const ranges = findInlineCommentRanges(state, 0, 10);
		expect(ranges).toHaveLength(1);
		expect(ranges[0]).toEqual({ from: 0, to: 10 });
	});

	it('detects multiple inline comments on one line', () => {
		const doc = '%%a%% text %%b%%';
		const state = createMarkdownState(doc);
		const ranges = findInlineCommentRanges(state, 0, doc.length);
		expect(ranges).toHaveLength(2);
		expect(ranges[0]).toEqual({ from: 0, to: 5 });
		expect(ranges[1]).toEqual({ from: 11, to: 16 });
	});

	it('returns empty array when no comment present', () => {
		const state = createMarkdownState('no comment here');
		expect(findInlineCommentRanges(state, 0, 15)).toHaveLength(0);
	});

	it('returns empty for single percent signs', () => {
		const state = createMarkdownState('%not a comment%');
		expect(findInlineCommentRanges(state, 0, 15)).toHaveLength(0);
	});

	it('returns empty for empty comment %%%%', () => {
		const state = createMarkdownState('%%%%');
		expect(findInlineCommentRanges(state, 0, 4)).toHaveLength(0);
	});

	it('applies offset correctly', () => {
		const doc = 'a'.repeat(50) + '\n%%hidden%%';
		const state = createMarkdownState(doc);
		const line = state.doc.line(2);
		const ranges = findInlineCommentRanges(state, line.from, line.to);
		expect(ranges).toHaveLength(1);
		expect(ranges[0]).toEqual({ from: 51, to: 61 });
	});

	it('handles comment with spaces inside', () => {
		const doc = '%%a long comment%%';
		const state = createMarkdownState(doc);
		const ranges = findInlineCommentRanges(state, 0, doc.length);
		expect(ranges).toHaveLength(1);
		expect(ranges[0]).toEqual({ from: 0, to: 18 });
	});

	it('handles comment surrounded by text', () => {
		const doc = 'before %%hidden%% after';
		const state = createMarkdownState(doc);
		const ranges = findInlineCommentRanges(state, 0, doc.length);
		expect(ranges).toHaveLength(1);
		expect(ranges[0]).toEqual({ from: 7, to: 17 });
	});

	it('detects comment with formatting inside', () => {
		const doc = '%%**bold** comment%%';
		const state = createMarkdownState(doc);
		const ranges = findInlineCommentRanges(state, 0, doc.length);
		expect(ranges).toHaveLength(1);
		expect(ranges[0]).toEqual({ from: 0, to: 20 });
	});
});

describe('findBlockComment', () => {
	it('detects a simple block comment', () => {
		const lines = makeLines('%%\nhidden content\n%%');
		const result = findBlockComment(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.endIdx).toBe(2);
		expect(result!.block.openFenceFrom).toBe(0);
		expect(result!.block.openFenceTo).toBe(2);
		expect(result!.block.closeFenceFrom).toBe(18);
		expect(result!.block.closeFenceTo).toBe(20);
	});

	it('detects a multi-line block comment', () => {
		const lines = makeLines('%%\nline 1\nline 2\nline 3\n%%');
		const result = findBlockComment(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.endIdx).toBe(4);
	});

	it('returns null when line is not a block comment fence', () => {
		const lines = makeLines('regular text\nnot a comment');
		const result = findBlockComment(lines, 0);
		expect(result).toBeNull();
	});

	it('returns null for unclosed block comment', () => {
		const lines = makeLines('%%\nhidden content\nno close');
		const result = findBlockComment(lines, 0);
		expect(result).toBeNull();
	});

	it('does not match inline comment as block comment', () => {
		const lines = makeLines('%%inline%%');
		const result = findBlockComment(lines, 0);
		expect(result).toBeNull();
	});

	it('handles %% with trailing spaces', () => {
		const lines = makeLines('%%  \nhidden\n%%  ');
		const result = findBlockComment(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.endIdx).toBe(2);
	});

	it('detects block comment starting at non-zero index', () => {
		const lines = makeLines('some text\n%%\nhidden\n%%\nmore text');
		const result = findBlockComment(lines, 1);
		expect(result).not.toBeNull();
		expect(result!.endIdx).toBe(3);
		expect(result!.block.openFenceFrom).toBe(lines[1].from);
		expect(result!.block.closeFenceTo).toBe(lines[3].to);
	});

	it('returns null when starting at a non-fence line', () => {
		const lines = makeLines('some text\n%%\nhidden\n%%');
		const result = findBlockComment(lines, 0);
		expect(result).toBeNull();
	});
});
