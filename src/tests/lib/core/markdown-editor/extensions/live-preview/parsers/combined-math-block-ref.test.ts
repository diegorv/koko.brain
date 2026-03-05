import { describe, it, expect } from 'vitest';
import { findInlineMathRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/math';
import { findBlockReference } from '$lib/core/markdown-editor/extensions/live-preview/parsers/block-reference';
import { findBoldRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/bold';
import { findItalicRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/italic';
import { findStrikethroughRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/strikethrough';
import { findInlineCodeRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/inline-code';
import { findHighlightRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/highlight';
import { findMarkdownLinkRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/link';
import { findWikilinkRanges } from '$lib/core/markdown-editor/extensions/wikilink/decoration.logic';
import { findHeadingMarkRange } from '$lib/core/markdown-editor/extensions/live-preview/parsers/heading';
import { findBlockquoteMarkRange } from '$lib/core/markdown-editor/extensions/live-preview/parsers/blockquote';
import { findTaskMarkerRange } from '$lib/core/markdown-editor/extensions/live-preview/parsers/task-list';
import { findInlineCommentRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/comment';
import { findFootnoteRefRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/footnote';
import { findImageRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/image';
import { findWikilinkEmbedRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed';
import { findOrderedListMarkRange } from '$lib/core/markdown-editor/extensions/live-preview/parsers/ordered-list';
import { createMarkdownState } from '../../../test-helpers';

// ============================================================
// Inline math + inline formatting
// ============================================================

describe('inline math + bold', () => {
	it('$x^2$ and **bold** — both detected independently', () => {
		const text = '$x^2$ and **bold**';
		const state = createMarkdownState(text);

		const maths = findInlineMathRanges(state, 0, text.length);
		expect(maths).toHaveLength(1);
		expect(maths[0].formula).toBe('x^2');

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
	});
});

describe('inline math + italic', () => {
	it('$E=mc^2$ *italic* — math and italic both detected', () => {
		const text = '$E=mc^2$ *italic*';
		const state = createMarkdownState(text);

		const maths = findInlineMathRanges(state, 0, text.length);
		expect(maths).toHaveLength(1);
		expect(maths[0].formula).toBe('E=mc^2');

		const italics = findItalicRanges(state, 0, text.length);
		expect(italics).toHaveLength(1);
	});
});

describe('inline math + strikethrough', () => {
	it('$\\alpha$ ~~strike~~ — math and strikethrough both detected', () => {
		const text = '$\\alpha$ ~~strike~~';
		const state = createMarkdownState(text);

		const maths = findInlineMathRanges(state, 0, text.length);
		expect(maths).toHaveLength(1);

		const strikes = findStrikethroughRanges(state, 0, text.length);
		expect(strikes).toHaveLength(1);
	});
});

describe('inline math + highlight', () => {
	it('$x$ and ==highlight== — math and highlight both detected', () => {
		const text = '$x$ and ==highlight==';
		const state = createMarkdownState(text);

		const maths = findInlineMathRanges(state, 0, text.length);
		expect(maths).toHaveLength(1);
		expect(maths[0].formula).toBe('x');

		const highlights = findHighlightRanges(state, 0, text.length);
		expect(highlights).toHaveLength(1);
	});
});

describe('inline math + link', () => {
	it('$x$ and [link](url) — math and link both detected', () => {
		const text = '$x$ and [link](url)';
		const state = createMarkdownState(text);

		const maths = findInlineMathRanges(state, 0, text.length);
		expect(maths).toHaveLength(1);

		const links = findMarkdownLinkRanges(state, 0, text.length);
		expect(links).toHaveLength(1);
	});
});

describe('inline math + wikilink', () => {
	it('$x$ and [[note]] — math and wikilink both detected', () => {
		const text = '$x$ and [[note]]';
		const state = createMarkdownState(text);

		const maths = findInlineMathRanges(state, 0, text.length);
		expect(maths).toHaveLength(1);

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].targetText).toBe('note');
	});
});

describe('inline math inside inline code (suppression)', () => {
	it('`$not math$` — inline code suppresses math inside', () => {
		const text = '`$not math$`';
		const state = createMarkdownState(text);

		const codes = findInlineCodeRanges(state, 0, text.length);
		expect(codes).toHaveLength(1);

		const maths = findInlineMathRanges(state, 0, text.length);
		expect(maths).toHaveLength(0);
	});
});

describe('inline math + heading', () => {
	it('# $x^2$ heading — heading and inline math both detected', () => {
		const text = '# $x^2$ heading';
		const state = createMarkdownState(text);

		const heading = findHeadingMarkRange(state, 0, text.length);
		expect(heading).not.toBeNull();
		expect(heading!.level).toBe(1);

		const maths = findInlineMathRanges(state, 0, text.length);
		expect(maths).toHaveLength(1);
		expect(maths[0].formula).toBe('x^2');
	});
});

describe('inline math + blockquote', () => {
	it('> $\\pi$ — blockquote and inline math', () => {
		const text = '> $\\pi$';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).not.toBeNull();

		const maths = findInlineMathRanges(state, 0, text.length);
		expect(maths).toHaveLength(1);
	});
});

describe('inline math + task list', () => {
	it('- [ ] $x^2$ task — task and inline math', () => {
		const text = '- [ ] $x^2$ task';
		const state = createMarkdownState(text);

		const task = findTaskMarkerRange(state, 0, text.length);
		expect(task).not.toBeNull();

		const maths = findInlineMathRanges(state, 0, text.length);
		expect(maths).toHaveLength(1);
	});
});

describe('multiple inline math on same line', () => {
	it('$a$ + $b$ = $c$ — three inline math ranges', () => {
		const text = '$a$ + $b$ = $c$';
		const state = createMarkdownState(text);

		const maths = findInlineMathRanges(state, 0, text.length);
		expect(maths).toHaveLength(3);
		expect(maths[0].formula).toBe('a');
		expect(maths[1].formula).toBe('b');
		expect(maths[2].formula).toBe('c');
	});
});

// ============================================================
// Block reference + inline formatting
// ============================================================

describe('block reference + bold', () => {
	it('**bold text** ^blockid — bold and block reference both detected', () => {
		const text = '**bold text** ^blockid';
		const state = createMarkdownState(text);

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);

		const ref = findBlockReference(text, 0);
		expect(ref).not.toBeNull();
		expect(ref!.id).toBe('blockid');
	});
});

describe('block reference + italic', () => {
	it('*italic* ^ref — italic and block reference both detected', () => {
		const text = '*italic* ^ref';
		const state = createMarkdownState(text);

		const italics = findItalicRanges(state, 0, text.length);
		expect(italics).toHaveLength(1);

		const ref = findBlockReference(text, 0);
		expect(ref).not.toBeNull();
		expect(ref!.id).toBe('ref');
	});
});

describe('block reference + heading', () => {
	it('# heading ^blockid — heading and block reference both detected', () => {
		const text = '# heading ^blockid';
		const state = createMarkdownState(text);

		const heading = findHeadingMarkRange(state, 0, text.length);
		expect(heading).not.toBeNull();
		expect(heading!.level).toBe(1);

		const ref = findBlockReference(text, 0);
		expect(ref).not.toBeNull();
		expect(ref!.id).toBe('blockid');
	});
});

describe('block reference + blockquote', () => {
	it('> text ^blockid — blockquote and block reference both detected', () => {
		const text = '> text ^blockid';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).not.toBeNull();

		const ref = findBlockReference(text, 0);
		expect(ref).not.toBeNull();
		expect(ref!.id).toBe('blockid');
	});
});

describe('block reference + task list', () => {
	it('- [ ] task ^blockid — task and block reference both detected', () => {
		const text = '- [ ] task ^blockid';
		const state = createMarkdownState(text);

		const task = findTaskMarkerRange(state, 0, text.length);
		expect(task).not.toBeNull();

		const ref = findBlockReference(text, 0);
		expect(ref).not.toBeNull();
		expect(ref!.id).toBe('blockid');
	});
});

describe('block reference + wikilink', () => {
	it('[[wikilink]] ^blockid — wikilink and block reference both detected', () => {
		const text = '[[wikilink]] ^blockid';

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].targetText).toBe('wikilink');

		const ref = findBlockReference(text, 0);
		expect(ref).not.toBeNull();
		expect(ref!.id).toBe('blockid');
	});
});

describe('block reference + link', () => {
	it('[link](url) ^blockid — link and block reference both detected', () => {
		const text = '[link](url) ^blockid';
		const state = createMarkdownState(text);

		const links = findMarkdownLinkRanges(state, 0, text.length);
		expect(links).toHaveLength(1);

		const ref = findBlockReference(text, 0);
		expect(ref).not.toBeNull();
		expect(ref!.id).toBe('blockid');
	});
});

describe('block reference + inline math', () => {
	it('$x^2$ ^ref — inline math and block reference both detected', () => {
		const text = '$x^2$ ^ref';
		const state = createMarkdownState(text);

		const maths = findInlineMathRanges(state, 0, text.length);
		expect(maths).toHaveLength(1);

		const ref = findBlockReference(text, 0);
		expect(ref).not.toBeNull();
		expect(ref!.id).toBe('ref');
	});
});

describe('block reference + highlight', () => {
	it('==highlighted== ^ref — highlight and block reference both detected', () => {
		const text = '==highlighted== ^ref';
		const state = createMarkdownState(text);

		const highlights = findHighlightRanges(state, 0, text.length);
		expect(highlights).toHaveLength(1);

		const ref = findBlockReference(text, 0);
		expect(ref).not.toBeNull();
		expect(ref!.id).toBe('ref');
	});
});

// ============================================================
// Inline math + more types
// ============================================================

describe('inline math + inline comment', () => {
	it('$x^2$ %%hidden%% — inline math and inline comment coexist', () => {
		const text = '$x^2$ %%hidden%%';
		const state = createMarkdownState(text);

		const maths = findInlineMathRanges(state, 0, text.length);
		expect(maths).toHaveLength(1);

		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(1);
	});
});

describe('inline math + footnote ref', () => {
	it('$x^2$ [^1] — inline math and footnote ref coexist', () => {
		const text = '$x^2$ [^1]';
		const state = createMarkdownState(text);

		const maths = findInlineMathRanges(state, 0, text.length);
		expect(maths).toHaveLength(1);

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
	});
});

describe('inline math + image', () => {
	it('$x$ ![alt](img.png) — inline math and image coexist', () => {
		const text = '$x$ ![alt](img.png)';
		const state = createMarkdownState(text);

		const maths = findInlineMathRanges(state, 0, text.length);
		expect(maths).toHaveLength(1);

		const images = findImageRanges(state, 0, text.length);
		expect(images).toHaveLength(1);
	});
});

describe('inline math + wikilink embed', () => {
	it('$x$ ![[note]] — inline math and wikilink embed coexist', () => {
		const text = '$x$ ![[note]]';
		const state = createMarkdownState(text);

		const maths = findInlineMathRanges(state, 0, text.length);
		expect(maths).toHaveLength(1);

		const embeds = findWikilinkEmbedRanges(text, 0);
		expect(embeds).toHaveLength(1);
	});
});

describe('inline math + ordered list', () => {
	it('1. $E=mc^2$ — ordered list and inline math', () => {
		const text = '1. $E=mc^2$';
		const state = createMarkdownState(text);

		const olMark = findOrderedListMarkRange(state, 0, text.length);
		expect(olMark).not.toBeNull();

		const maths = findInlineMathRanges(state, 0, text.length);
		expect(maths).toHaveLength(1);
	});
});

// ============================================================
// Block reference + more types
// ============================================================

describe('block reference + strikethrough', () => {
	it('~~strike~~ ^ref — strikethrough and block reference coexist', () => {
		const text = '~~strike~~ ^ref';
		const state = createMarkdownState(text);

		const strikes = findStrikethroughRanges(state, 0, text.length);
		expect(strikes).toHaveLength(1);

		const ref = findBlockReference(text, 0);
		expect(ref).not.toBeNull();
		expect(ref!.id).toBe('ref');
	});
});

describe('block reference + inline code', () => {
	it('`code` ^ref — inline code and block reference coexist', () => {
		const text = '`code` ^ref';
		const state = createMarkdownState(text);

		const codes = findInlineCodeRanges(state, 0, text.length);
		expect(codes).toHaveLength(1);

		const ref = findBlockReference(text, 0);
		expect(ref).not.toBeNull();
	});
});

describe('block reference + inline comment', () => {
	it('%%hidden%% ^ref — inline comment and block reference coexist', () => {
		const text = '%%hidden%% ^ref';
		const state = createMarkdownState(text);

		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(1);

		const ref = findBlockReference(text, 0);
		expect(ref).not.toBeNull();
	});
});

describe('block reference + footnote ref', () => {
	it('[^1] text ^ref — footnote ref and block reference coexist', () => {
		const text = '[^1] text ^ref';
		const state = createMarkdownState(text);

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);

		const blockRef = findBlockReference(text, 0);
		expect(blockRef).not.toBeNull();
	});
});

describe('block reference + image', () => {
	it('![alt](img.png) ^ref — image and block reference coexist', () => {
		const text = '![alt](img.png) ^ref';
		const state = createMarkdownState(text);

		const images = findImageRanges(state, 0, text.length);
		expect(images).toHaveLength(1);

		const ref = findBlockReference(text, 0);
		expect(ref).not.toBeNull();
	});
});

describe('block reference + wikilink embed', () => {
	it('![[embed]] ^ref — wikilink embed and block reference coexist', () => {
		const text = '![[embed]] ^ref';

		const embeds = findWikilinkEmbedRanges(text, 0);
		expect(embeds).toHaveLength(1);

		const ref = findBlockReference(text, 0);
		expect(ref).not.toBeNull();
	});
});

describe('block reference + ordered list', () => {
	it('1. item ^ref — ordered list and block reference', () => {
		const text = '1. item ^ref';
		const state = createMarkdownState(text);

		const olMark = findOrderedListMarkRange(state, 0, text.length);
		expect(olMark).not.toBeNull();

		const ref = findBlockReference(text, 0);
		expect(ref).not.toBeNull();
	});
});
