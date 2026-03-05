import { describe, it, expect } from 'vitest';
import { findHighlightRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/highlight';
import { findBoldRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/bold';
import { findItalicRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/italic';
import { findStrikethroughRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/strikethrough';
import { findInlineCodeRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/inline-code';
import { findBoldItalicRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/bold-italic';
import { findInlineCommentRanges, findBlockComment } from '$lib/core/markdown-editor/extensions/live-preview/parsers/comment';
import { findHeadingMarkRange } from '$lib/core/markdown-editor/extensions/live-preview/parsers/heading';
import { findBlockquoteMarkRange } from '$lib/core/markdown-editor/extensions/live-preview/parsers/blockquote';
import { findTaskMarkerRange } from '$lib/core/markdown-editor/extensions/live-preview/parsers/task-list';
import { findOrderedListMarkRange } from '$lib/core/markdown-editor/extensions/live-preview/parsers/ordered-list';
import { findWikilinkRanges } from '$lib/core/markdown-editor/extensions/wikilink/decoration.logic';
import { findInlineMathRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/math';
import { findFootnoteRefRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/footnote';
import { findMarkdownLinkRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/link';
import { findImageRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/image';
import { createMarkdownState, makeLines } from '../../../test-helpers';

// ============================================================
// Highlight + inline formatting
// ============================================================

describe('highlight + bold', () => {
	it('==highlighted== and **bold** — both detected independently', () => {
		const text = '==highlighted== and **bold**';
		const state = createMarkdownState(text);

		const highlights = findHighlightRanges(state, 0, text.length);
		expect(highlights).toHaveLength(1);
		expect(highlights[0].textFrom).toBe(2);
		expect(highlights[0].textTo).toBe(13);

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
		expect(bolds[0].textFrom).toBe(22);
		expect(bolds[0].textTo).toBe(26);
	});
});

describe('highlight + strikethrough', () => {
	it('==highlight== and ~~strike~~ — highlight and strikethrough', () => {
		const text = '==highlight== and ~~strike~~';
		const state = createMarkdownState(text);

		const highlights = findHighlightRanges(state, 0, text.length);
		expect(highlights).toHaveLength(1);
		expect(highlights[0].textFrom).toBe(2);
		expect(highlights[0].textTo).toBe(11);

		const strikes = findStrikethroughRanges(state, 0, text.length);
		expect(strikes).toHaveLength(1);
		expect(strikes[0].textFrom).toBe(20);
		expect(strikes[0].textTo).toBe(26);
	});
});

describe('highlight + inline code', () => {
	it('==highlight== and `code` — highlight and inline code', () => {
		const text = '==highlight== and `code`';
		const state = createMarkdownState(text);

		const highlights = findHighlightRanges(state, 0, text.length);
		expect(highlights).toHaveLength(1);
		expect(highlights[0].textFrom).toBe(2);
		expect(highlights[0].textTo).toBe(11);

		const codes = findInlineCodeRanges(state, 0, text.length);
		expect(codes).toHaveLength(1);
		expect(codes[0].textFrom).toBe(19);
		expect(codes[0].textTo).toBe(23);
	});
});

describe('highlight wraps bold', () => {
	it('==**bold highlight**== — highlight wraps bold', () => {
		const text = '==**bold highlight**==';
		const state = createMarkdownState(text);

		const highlights = findHighlightRanges(state, 0, text.length);
		expect(highlights).toHaveLength(1);
		expect(highlights[0].textFrom).toBe(2);
		expect(highlights[0].textTo).toBe(20);

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
		expect(bolds[0].textFrom).toBe(4);
		expect(bolds[0].textTo).toBe(18);
	});
});

describe('bold wraps highlight', () => {
	it('**==highlighted bold==** — bold wraps highlight', () => {
		const text = '**==highlighted bold==**';
		const state = createMarkdownState(text);

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
		expect(bolds[0].textFrom).toBe(2);
		expect(bolds[0].textTo).toBe(22);

		const highlights = findHighlightRanges(state, 0, text.length);
		expect(highlights).toHaveLength(1);
		expect(highlights[0].textFrom).toBe(4);
		expect(highlights[0].textTo).toBe(20);
	});
});

describe('highlight + heading', () => {
	it('# ==highlighted heading== — heading and highlight both detected', () => {
		const text = '# ==highlighted heading==';

		const state = createMarkdownState(text);
		const heading = findHeadingMarkRange(state, 0, text.length);
		expect(heading).toEqual({ level: 1, markFrom: 0, markTo: 2 });

		const highlights = findHighlightRanges(state, 0, text.length);
		expect(highlights).toHaveLength(1);
		expect(highlights[0].textFrom).toBe(4);
		expect(highlights[0].textTo).toBe(23);
	});
});

describe('highlight + blockquote', () => {
	it('> ==highlighted quote== — blockquote and highlight both detected', () => {
		const text = '> ==highlighted quote==';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toEqual({ markFrom: 0, markTo: 2, depth: 1 });

		const highlights = findHighlightRanges(state, 0, text.length);
		expect(highlights).toHaveLength(1);
		expect(highlights[0].textFrom).toBe(4);
		expect(highlights[0].textTo).toBe(21);
	});
});

describe('highlight + bold-italic', () => {
	it('==***highlighted bold italic***== — highlight wraps bold-italic', () => {
		const text = '==***highlighted bold italic***==';
		const state = createMarkdownState(text);

		const highlights = findHighlightRanges(state, 0, text.length);
		expect(highlights).toHaveLength(1);
		expect(highlights[0].textFrom).toBe(2);
		expect(highlights[0].textTo).toBe(text.length - 2);

		const boldItalics = findBoldItalicRanges(state, 0, text.length);
		expect(boldItalics).toHaveLength(1);
		expect(boldItalics[0].textFrom).toBe(5);
		expect(boldItalics[0].textTo).toBe(28);
	});
});

describe('highlight + inline math', () => {
	it('==highlight== and $x^2$ — highlight and inline math both detected', () => {
		const text = '==highlight== and $x^2$';
		const state = createMarkdownState(text);

		const highlights = findHighlightRanges(state, 0, text.length);
		expect(highlights).toHaveLength(1);
		expect(highlights[0].textFrom).toBe(2);
		expect(highlights[0].textTo).toBe(11);

		const maths = findInlineMathRanges(state, 0, text.length);
		expect(maths).toHaveLength(1);
		expect(maths[0].formula).toBe('x^2');
	});
});

describe('highlight + footnote ref', () => {
	it('==highlight== [^1] — highlight and footnote ref coexist', () => {
		const text = '==highlight== [^1]';
		const state = createMarkdownState(text);

		const highlights = findHighlightRanges(state, 0, text.length);
		expect(highlights).toHaveLength(1);

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('1');
	});
});

// ============================================================
// Comment + inline formatting
// ============================================================

describe('inline comment + bold and italic', () => {
	it('**bold** %%hidden%% *italic* — comment and formatting detected independently', () => {
		const text = '**bold** %%hidden%% *italic*';
		const state = createMarkdownState(text);

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
		expect(bolds[0].textFrom).toBe(2);
		expect(bolds[0].textTo).toBe(6);

		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(1);
		expect(comments[0]).toEqual({ from: 9, to: 19 });

		const italics = findItalicRanges(state, 0, text.length);
		expect(italics).toHaveLength(1);
		expect(italics[0].textFrom).toBe(21);
		expect(italics[0].textTo).toBe(27);
	});
});

describe('block comment does not interfere with surrounding content', () => {
	it('bold before and italic after block comment', () => {
		const docText = '**bold**\n%%\nhidden\n%%\n*italic*';
		const lines = makeLines(docText);
		const state = createMarkdownState(docText);

		const blockComment = findBlockComment(lines, 1);
		expect(blockComment).not.toBeNull();
		expect(blockComment!.endIdx).toBe(3);

		const bolds = findBoldRanges(state, lines[0].from, lines[0].to);
		expect(bolds).toHaveLength(1);

		const italics = findItalicRanges(state, lines[4].from, lines[4].to);
		expect(italics).toHaveLength(1);
	});
});

describe('inline comment + heading', () => {
	it('# %%hidden%% heading — heading and inline comment', () => {
		const text = '# %%hidden%% heading';

		const state = createMarkdownState(text);
		const heading = findHeadingMarkRange(state, 0, text.length);
		expect(heading).toEqual({ level: 1, markFrom: 0, markTo: 2 });

		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(1);
		expect(comments[0]).toEqual({ from: 2, to: 12 });
	});
});

describe('inline comment + task marker', () => {
	it('- [ ] %%hidden%% task — task marker and inline comment', () => {
		const text = '- [ ] %%hidden%% task';
		const state = createMarkdownState(text);

		const task = findTaskMarkerRange(state, 0, text.length);
		expect(task).toEqual({ markerFrom: 2, markerTo: 5, checked: false });

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
	it('1. %%comment%% item — ordered list and inline comment', () => {
		const text = '1. %%comment%% item';
		const state = createMarkdownState(text);

		const olMark = findOrderedListMarkRange(state, 0, text.length);
		expect(olMark).not.toBeNull();

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
	it('%%hidden%% $x^2$ — inline comment and math both detected', () => {
		const text = '%%hidden%% $x^2$';
		const state = createMarkdownState(text);

		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(1);
		expect(comments[0]).toEqual({ from: 0, to: 10 });

		const maths = findInlineMathRanges(state, 0, text.length);
		expect(maths).toHaveLength(1);
		expect(maths[0].formula).toBe('x^2');
	});
});

// ============================================================
// Highlight + italic nesting
// ============================================================

describe('highlight + italic', () => {
	it('==*italic highlight*== — highlight wraps italic', () => {
		const text = '==*italic highlight*==';
		const state = createMarkdownState(text);

		const highlights = findHighlightRanges(state, 0, text.length);
		expect(highlights).toHaveLength(1);

		const italics = findItalicRanges(state, 0, text.length);
		expect(italics).toHaveLength(1);
	});

	it('*==highlighted italic==* — italic wraps highlight', () => {
		const text = '*==highlighted italic==*';
		const state = createMarkdownState(text);

		const italics = findItalicRanges(state, 0, text.length);
		expect(italics).toHaveLength(1);

		const highlights = findHighlightRanges(state, 0, text.length);
		expect(highlights).toHaveLength(1);
	});
});

// ============================================================
// Inline comment + more inline types
// ============================================================

describe('inline comment + strikethrough', () => {
	it('%%hidden%% ~~strike~~ — inline comment and strikethrough coexist', () => {
		const text = '%%hidden%% ~~strike~~';
		const state = createMarkdownState(text);

		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(1);

		const strikes = findStrikethroughRanges(state, 0, text.length);
		expect(strikes).toHaveLength(1);
	});
});

describe('inline comment + inline code', () => {
	it('%%hidden%% `code` — inline comment and inline code coexist', () => {
		const text = '%%hidden%% `code`';
		const state = createMarkdownState(text);

		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(1);

		const codes = findInlineCodeRanges(state, 0, text.length);
		expect(codes).toHaveLength(1);
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
	it('%%hidden%% [link](url) — inline comment and link coexist', () => {
		const text = '%%hidden%% [link](url)';
		const state = createMarkdownState(text);

		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(1);

		const links = findMarkdownLinkRanges(state, 0, text.length);
		expect(links).toHaveLength(1);
	});
});

describe('inline comment + image', () => {
	it('%%hidden%% ![alt](img.png) — inline comment and image coexist', () => {
		const text = '%%hidden%% ![alt](img.png)';
		const state = createMarkdownState(text);

		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(1);

		const images = findImageRanges(state, 0, text.length);
		expect(images).toHaveLength(1);
		expect(images[0].altText).toBe('alt');
	});
});
