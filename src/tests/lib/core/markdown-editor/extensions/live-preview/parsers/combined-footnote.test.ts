import { describe, it, expect } from 'vitest';
import { findFootnoteRefRanges, findFootnoteDefRange, findInlineFootnoteRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/footnote';
import { findBoldRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/bold';
import { findItalicRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/italic';
import { findMarkdownLinkRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/link';
import { findWikilinkRanges } from '$lib/core/markdown-editor/extensions/wikilink/decoration.logic';
import { findTaskMarkerRange } from '$lib/core/markdown-editor/extensions/live-preview/parsers/task-list';
import { findOrderedListMarkRange } from '$lib/core/markdown-editor/extensions/live-preview/parsers/ordered-list';
import { findBlockquoteMarkRange } from '$lib/core/markdown-editor/extensions/live-preview/parsers/blockquote';
import { findHighlightRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/highlight';
import { findInlineMathRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/math';
import { findStrikethroughRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/strikethrough';
import { findInlineCodeRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/inline-code';
import { findHeadingMarkRange } from '$lib/core/markdown-editor/extensions/live-preview/parsers/heading';
import { findImageRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/image';
import { createMarkdownState } from '../../../test-helpers';

// ============================================================
// Footnote + inline formatting
// ============================================================

describe('footnote ref + bold', () => {
	it('**bold [^1]** text — footnote ref inside bold', () => {
		const text = '**bold [^1]** text';
		const state = createMarkdownState(text);

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
		expect(bolds[0].textFrom).toBe(2);
		expect(bolds[0].textTo).toBe(11);

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('1');
	});
});

describe('footnote def + bold', () => {
	it('[^label]: **bold definition** — def marker and bold both detected', () => {
		const text = '[^label]: **bold definition**';
		const state = createMarkdownState(text);

		const def = findFootnoteDefRange(state, 0, text.length);
		expect(def).not.toBeNull();
		expect(def!.label).toBe('label');

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
	});
});

describe('inline footnote + bold', () => {
	it('^[inline note] and **bold** — inline footnote and bold both detected', () => {
		const text = '^[inline note] and **bold**';
		const state = createMarkdownState(text);

		const inlineFn = findInlineFootnoteRanges(state, 0, text.length);
		expect(inlineFn).toHaveLength(1);
		expect(inlineFn[0].textFrom).toBe(2);
		expect(inlineFn[0].textTo).toBe(13);

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
		expect(bolds[0].textFrom).toBe(21);
		expect(bolds[0].textTo).toBe(25);
	});
});

// ============================================================
// Footnote ref inside structures
// ============================================================

describe('footnote ref + task list', () => {
	it('- [ ] text [^1] — footnote ref inside task list', () => {
		const text = '- [ ] text [^1]';
		const state = createMarkdownState(text);

		const task = findTaskMarkerRange(state, 0, text.length);
		expect(task).toEqual({ markerFrom: 2, markerTo: 5, checked: false });

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('1');
	});
});

describe('footnote ref + wikilink', () => {
	it('[[note]] and [^2] — wikilink and footnote ref coexist', () => {
		const text = '[[note]] and [^2]';
		const state = createMarkdownState(text);

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].targetText).toBe('note');

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('2');
	});
});

describe('footnote ref + markdown link', () => {
	it('[link](url) and [^ref] — markdown link and footnote ref coexist', () => {
		const text = '[link](url) and [^ref]';

		const state = createMarkdownState(text);
		const links = findMarkdownLinkRanges(state, 0, text.length);
		expect(links).toHaveLength(1);
		expect(links[0].textFrom).toBe(1);
		expect(links[0].textTo).toBe(5);

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('ref');
	});
});

describe('footnote ref + ordered list', () => {
	it('1. item [^3] — ordered list and footnote ref', () => {
		const text = '1. item [^3]';
		const state = createMarkdownState(text);

		const olMark = findOrderedListMarkRange(state, 0, text.length);
		expect(olMark).not.toBeNull();
		expect(olMark!.number).toBe(1);

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('3');
	});
});

describe('footnote ref + blockquote', () => {
	it('> [^note] — blockquote and footnote ref', () => {
		const text = '> [^note]';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toEqual({ markFrom: 0, markTo: 2, depth: 1 });

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('note');
	});
});

// ============================================================
// Footnote + more inline
// ============================================================

describe('footnote ref + highlight', () => {
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

describe('footnote ref + inline math', () => {
	it('$x^2$ [^1] — inline math and footnote ref coexist', () => {
		const text = '$x^2$ [^1]';
		const state = createMarkdownState(text);

		const maths = findInlineMathRanges(state, 0, text.length);
		expect(maths).toHaveLength(1);
		expect(maths[0].formula).toBe('x^2');

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('1');
	});
});

describe('inline footnote + italic', () => {
	it('^[inline note] *italic* — inline footnote and italic coexist', () => {
		const text = '^[inline note] *italic*';
		const state = createMarkdownState(text);

		const inlineFn = findInlineFootnoteRanges(state, 0, text.length);
		expect(inlineFn).toHaveLength(1);
		expect(inlineFn[0].textFrom).toBe(2);
		expect(inlineFn[0].textTo).toBe(13);

		const italics = findItalicRanges(state, 0, text.length);
		expect(italics).toHaveLength(1);
	});
});

describe('multiple footnote refs on same line', () => {
	it('[^1] [^2] [^3] — multiple footnote refs on one line', () => {
		const text = '[^1] [^2] [^3]';
		const state = createMarkdownState(text);
		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(3);
		expect(refs.map((r) => r.label)).toEqual(['1', '2', '3']);
	});
});

describe('footnote ref not confused with wikilink', () => {
	it('[^1] is not confused with [[wikilink]] — footnote ref vs wikilink', () => {
		const text = '[^1] and [[note]]';
		const state = createMarkdownState(text);

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('1');

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].targetText).toBe('note');

		expect(refs[0].fullTo).toBeLessThan(wikilinks[0].openBracketFrom);
	});
});

// ============================================================
// Inline footnote + more types
// ============================================================

describe('inline footnote + strikethrough', () => {
	it('^[note] ~~strike~~ — inline footnote and strikethrough coexist', () => {
		const text = '^[note] ~~strike~~';
		const state = createMarkdownState(text);

		const inlineFn = findInlineFootnoteRanges(state, 0, text.length);
		expect(inlineFn).toHaveLength(1);

		const strikes = findStrikethroughRanges(state, 0, text.length);
		expect(strikes).toHaveLength(1);
	});
});

describe('inline footnote + inline code', () => {
	it('^[note] `code` — inline footnote and inline code coexist', () => {
		const text = '^[note] `code`';
		const state = createMarkdownState(text);

		const inlineFn = findInlineFootnoteRanges(state, 0, text.length);
		expect(inlineFn).toHaveLength(1);

		const codes = findInlineCodeRanges(state, 0, text.length);
		expect(codes).toHaveLength(1);
	});
});

describe('inline footnote + highlight', () => {
	it('^[note] ==highlight== — inline footnote and highlight coexist', () => {
		const text = '^[note] ==highlight==';
		const state = createMarkdownState(text);

		const inlineFn = findInlineFootnoteRanges(state, 0, text.length);
		expect(inlineFn).toHaveLength(1);

		const highlights = findHighlightRanges(state, 0, text.length);
		expect(highlights).toHaveLength(1);
	});
});

describe('inline footnote + inline math', () => {
	it('^[note] $x^2$ — inline footnote and inline math coexist', () => {
		const text = '^[note] $x^2$';
		const state = createMarkdownState(text);

		const inlineFn = findInlineFootnoteRanges(state, 0, text.length);
		expect(inlineFn).toHaveLength(1);

		const maths = findInlineMathRanges(state, 0, text.length);
		expect(maths).toHaveLength(1);
	});
});

describe('inline footnote + link', () => {
	it('^[note] [link](url) — inline footnote and link coexist', () => {
		const text = '^[note] [link](url)';
		const state = createMarkdownState(text);

		const inlineFn = findInlineFootnoteRanges(state, 0, text.length);
		expect(inlineFn).toHaveLength(1);

		const links = findMarkdownLinkRanges(state, 0, text.length);
		expect(links).toHaveLength(1);
	});
});

describe('inline footnote + wikilink', () => {
	it('^[note] [[wikilink]] — inline footnote and wikilink coexist', () => {
		const text = '^[note] [[wikilink]]';
		const state = createMarkdownState(text);

		const inlineFn = findInlineFootnoteRanges(state, 0, text.length);
		expect(inlineFn).toHaveLength(1);

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
	});
});

// ============================================================
// Inline footnote in containers
// ============================================================

describe('inline footnote + heading', () => {
	it('# heading ^[inline note] — heading and inline footnote', () => {
		const text = '# heading ^[inline note]';
		const state = createMarkdownState(text);

		const heading = findHeadingMarkRange(state, 0, text.length);
		expect(heading).not.toBeNull();
		expect(heading!.level).toBe(1);

		const inlineFn = findInlineFootnoteRanges(state, 0, text.length);
		expect(inlineFn).toHaveLength(1);
	});
});

describe('inline footnote + blockquote', () => {
	it('> ^[inline note] — blockquote and inline footnote', () => {
		const text = '> ^[inline note]';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).not.toBeNull();

		const inlineFn = findInlineFootnoteRanges(state, 0, text.length);
		expect(inlineFn).toHaveLength(1);
	});
});

describe('inline footnote + task list', () => {
	it('- [ ] ^[inline note] — task and inline footnote', () => {
		const text = '- [ ] ^[inline note]';
		const state = createMarkdownState(text);

		const task = findTaskMarkerRange(state, 0, text.length);
		expect(task).not.toBeNull();

		const inlineFn = findInlineFootnoteRanges(state, 0, text.length);
		expect(inlineFn).toHaveLength(1);
	});
});

describe('inline footnote + ordered list', () => {
	it('1. ^[inline note] — ordered list and inline footnote', () => {
		const text = '1. ^[inline note]';
		const state = createMarkdownState(text);

		const olMark = findOrderedListMarkRange(state, 0, text.length);
		expect(olMark).not.toBeNull();

		const inlineFn = findInlineFootnoteRanges(state, 0, text.length);
		expect(inlineFn).toHaveLength(1);
	});
});

// ============================================================
// Footnote def + more inline types
// ============================================================

describe('footnote def + italic', () => {
	it('[^1]: *italic definition* — def marker and italic both detected', () => {
		const text = '[^1]: *italic definition*';
		const state = createMarkdownState(text);

		const def = findFootnoteDefRange(state, 0, text.length);
		expect(def).not.toBeNull();
		expect(def!.label).toBe('1');

		const italics = findItalicRanges(state, 0, text.length);
		expect(italics).toHaveLength(1);
	});
});

describe('footnote def + link', () => {
	it('[^1]: [link](url) definition — def marker and link both detected', () => {
		const text = '[^1]: [link](url) definition';
		const state = createMarkdownState(text);

		const def = findFootnoteDefRange(state, 0, text.length);
		expect(def).not.toBeNull();

		const links = findMarkdownLinkRanges(state, 0, text.length);
		expect(links).toHaveLength(1);
	});
});

describe('footnote def + inline math', () => {
	it('[^1]: $x^2$ definition — def marker and inline math both detected', () => {
		const text = '[^1]: $x^2$ definition';
		const state = createMarkdownState(text);

		const def = findFootnoteDefRange(state, 0, text.length);
		expect(def).not.toBeNull();

		const maths = findInlineMathRanges(state, 0, text.length);
		expect(maths).toHaveLength(1);
		expect(maths[0].formula).toBe('x^2');
	});
});

// ============================================================
// Footnote ref + image
// ============================================================

describe('footnote ref + image', () => {
	it('[^1] ![alt](img.png) — footnote ref and image coexist', () => {
		const text = '[^1] ![alt](img.png)';
		const state = createMarkdownState(text);

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('1');

		const images = findImageRanges(state, 0, text.length);
		expect(images).toHaveLength(1);
	});
});

describe('footnote ref + strikethrough', () => {
	it('[^1] ~~strike~~ — footnote ref and strikethrough coexist', () => {
		const text = '[^1] ~~strike~~';
		const state = createMarkdownState(text);

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);

		const strikes = findStrikethroughRanges(state, 0, text.length);
		expect(strikes).toHaveLength(1);
	});
});

describe('footnote ref + inline code', () => {
	it('[^1] `code` — footnote ref and inline code coexist', () => {
		const text = '[^1] `code`';
		const state = createMarkdownState(text);

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);

		const codes = findInlineCodeRanges(state, 0, text.length);
		expect(codes).toHaveLength(1);
	});
});
