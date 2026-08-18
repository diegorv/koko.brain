import { describe, it, expect } from 'vitest';
import { findInlineCommentRanges, findBlockComment } from '$lib/core/markdown-editor/extensions/live-preview/parsers/comment';
import { findBlockquoteMarkRange } from '$lib/core/markdown-editor/extensions/live-preview/parsers/blockquote';
import { findWikilinkRanges } from '$lib/core/markdown-editor/extensions/wikilink/decoration.logic';
import { findFootnoteRefRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/footnote';
import { createMarkdownState, makeLines } from '../../../test-helpers';

// ============================================================
// Highlight + inline formatting
// ============================================================

describe('highlight + blockquote', () => {
	it('> ==highlighted quote== — blockquote mark detected', () => {
		const text = '> ==highlighted quote==';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toEqual({ markFrom: 0, markTo: 2, depth: 1 });
	});
});

describe('highlight + footnote ref', () => {
	it('==highlight== [^1] — footnote ref detected next to a highlight', () => {
		const text = '==highlight== [^1]';
		const state = createMarkdownState(text);

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('1');
	});
});

// ============================================================
// Comment + inline formatting
// ============================================================

describe('inline comment + bold and italic', () => {
	it('**bold** %%hidden%% *italic* — inline comment detected between formatting', () => {
		const text = '**bold** %%hidden%% *italic*';
		const state = createMarkdownState(text);

		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(1);
		expect(comments[0]).toEqual({ from: 9, to: 19 });
	});
});

describe('block comment does not interfere with surrounding content', () => {
	it('bold before and italic after block comment', () => {
		const docText = '**bold**\n%%\nhidden\n%%\n*italic*';
		const lines = makeLines(docText);

		const blockComment = findBlockComment(lines, 1);
		expect(blockComment).not.toBeNull();
		expect(blockComment!.endIdx).toBe(3);
	});
});

describe('inline comment + heading', () => {
	it('# %%hidden%% heading — inline comment detected on a heading line', () => {
		const text = '# %%hidden%% heading';
		const state = createMarkdownState(text);

		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(1);
		expect(comments[0]).toEqual({ from: 2, to: 12 });
	});
});

describe('inline comment + task marker', () => {
	it('- [ ] %%hidden%% task — inline comment detected on a task line', () => {
		const text = '- [ ] %%hidden%% task';
		const state = createMarkdownState(text);

		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(1);
		expect(comments[0]).toEqual({ from: 6, to: 16 });
	});
});

describe('inline comment + blockquote', () => {
	it('> %%hidden%% — blockquote and inline comment', () => {
		const text = '> %%hidden%%';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toEqual({ markFrom: 0, markTo: 2, depth: 1 });

		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(1);
		expect(comments[0]).toEqual({ from: 2, to: 12 });
	});
});

describe('inline comment + ordered list', () => {
	it('1. %%comment%% item — inline comment detected on an ordered list line', () => {
		const text = '1. %%comment%% item';
		const state = createMarkdownState(text);

		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(1);
		expect(comments[0]).toEqual({ from: 3, to: 14 });
	});
});

describe('inline comment + wikilink', () => {
	it('[[note]] %%hidden%% — wikilink and inline comment', () => {
		const text = '[[note]] %%hidden%%';
		const state = createMarkdownState(text);

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].targetText).toBe('note');

		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(1);
		expect(comments[0]).toEqual({ from: 9, to: 19 });
	});
});

describe('inline comment + inline math', () => {
	it('%%hidden%% $x^2$ — inline comment detected next to inline math', () => {
		const text = '%%hidden%% $x^2$';
		const state = createMarkdownState(text);

		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(1);
		expect(comments[0]).toEqual({ from: 0, to: 10 });
	});
});

// ============================================================
// Inline comment + more inline types
// ============================================================

describe('inline comment + strikethrough', () => {
	it('%%hidden%% ~~strike~~ — inline comment detected next to strikethrough', () => {
		const text = '%%hidden%% ~~strike~~';
		const state = createMarkdownState(text);

		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(1);
	});
});

describe('inline comment + inline code', () => {
	it('%%hidden%% `code` — inline comment detected next to a code span', () => {
		const text = '%%hidden%% `code`';
		const state = createMarkdownState(text);

		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(1);
	});
});

describe('inline comment + footnote ref', () => {
	it('%%hidden%% [^1] — inline comment and footnote ref coexist', () => {
		const text = '%%hidden%% [^1]';
		const state = createMarkdownState(text);

		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(1);

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('1');
	});
});

describe('inline comment + link', () => {
	it('%%hidden%% [link](url) — inline comment detected next to a markdown link', () => {
		const text = '%%hidden%% [link](url)';
		const state = createMarkdownState(text);

		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(1);
	});
});

describe('inline comment + image', () => {
	it('%%hidden%% ![alt](img.png) — inline comment detected next to an image', () => {
		const text = '%%hidden%% ![alt](img.png)';
		const state = createMarkdownState(text);

		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(1);
	});
});
