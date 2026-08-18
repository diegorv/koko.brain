import { describe, it, expect } from 'vitest';
import { findFootnoteRefRanges, findFootnoteDefRange, findInlineFootnoteRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/footnote';
import { findWikilinkRanges } from '$lib/core/markdown-editor/extensions/wikilink/decoration.logic';
import { findBlockquoteMarkRange } from '$lib/core/markdown-editor/extensions/live-preview/parsers/blockquote';
import { createMarkdownState } from '../../../test-helpers';

// ============================================================
// Footnote + inline formatting
// ============================================================

describe('footnote ref + bold', () => {
	it('**bold [^1]** text — footnote ref inside bold', () => {
		const text = '**bold [^1]** text';
		const state = createMarkdownState(text);

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('1');
	});
});

describe('footnote def + bold', () => {
	it('[^label]: **bold definition** — def marker detected', () => {
		const text = '[^label]: **bold definition**';
		const state = createMarkdownState(text);

		const def = findFootnoteDefRange(state, 0, text.length);
		expect(def).not.toBeNull();
		expect(def!.label).toBe('label');
	});
});

describe('inline footnote + bold', () => {
	it('^[inline note] and **bold** — inline footnote detected', () => {
		const text = '^[inline note] and **bold**';
		const state = createMarkdownState(text);

		const inlineFn = findInlineFootnoteRanges(state, 0, text.length);
		expect(inlineFn).toHaveLength(1);
		expect(inlineFn[0].textFrom).toBe(2);
		expect(inlineFn[0].textTo).toBe(13);
	});
});

// ============================================================
// Footnote ref inside structures
// ============================================================

describe('footnote ref + task list', () => {
	it('- [ ] text [^1] — footnote ref inside task list', () => {
		const text = '- [ ] text [^1]';
		const state = createMarkdownState(text);

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
	it('[link](url) and [^ref] — footnote ref detected next to a markdown link', () => {
		const text = '[link](url) and [^ref]';
		const state = createMarkdownState(text);

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('ref');
	});
});

describe('footnote ref + ordered list', () => {
	it('1. item [^3] — footnote ref in an ordered list item', () => {
		const text = '1. item [^3]';
		const state = createMarkdownState(text);

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
	it('==highlight== [^1] — footnote ref next to a highlight', () => {
		const text = '==highlight== [^1]';
		const state = createMarkdownState(text);

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('1');
	});
});

describe('footnote ref + inline math', () => {
	it('$x^2$ [^1] — footnote ref detected next to inline math', () => {
		const text = '$x^2$ [^1]';
		const state = createMarkdownState(text);

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('1');
	});
});

describe('inline footnote + italic', () => {
	it('^[inline note] *italic* — inline footnote detected', () => {
		const text = '^[inline note] *italic*';
		const state = createMarkdownState(text);

		const inlineFn = findInlineFootnoteRanges(state, 0, text.length);
		expect(inlineFn).toHaveLength(1);
		expect(inlineFn[0].textFrom).toBe(2);
		expect(inlineFn[0].textTo).toBe(13);
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
	it('^[note] ~~strike~~ — inline footnote detected', () => {
		const text = '^[note] ~~strike~~';
		const state = createMarkdownState(text);

		const inlineFn = findInlineFootnoteRanges(state, 0, text.length);
		expect(inlineFn).toHaveLength(1);
	});
});

describe('inline footnote + inline code', () => {
	it('^[note] `code` — inline footnote detected', () => {
		const text = '^[note] `code`';
		const state = createMarkdownState(text);

		const inlineFn = findInlineFootnoteRanges(state, 0, text.length);
		expect(inlineFn).toHaveLength(1);
	});
});

describe('inline footnote + highlight', () => {
	it('^[note] ==highlight== — inline footnote detected', () => {
		const text = '^[note] ==highlight==';
		const state = createMarkdownState(text);

		const inlineFn = findInlineFootnoteRanges(state, 0, text.length);
		expect(inlineFn).toHaveLength(1);
	});
});

describe('inline footnote + inline math', () => {
	it('^[note] $x^2$ — inline footnote detected next to inline math', () => {
		const text = '^[note] $x^2$';
		const state = createMarkdownState(text);

		const inlineFn = findInlineFootnoteRanges(state, 0, text.length);
		expect(inlineFn).toHaveLength(1);
	});
});

describe('inline footnote + link', () => {
	it('^[note] [link](url) — inline footnote detected next to a markdown link', () => {
		const text = '^[note] [link](url)';
		const state = createMarkdownState(text);

		const inlineFn = findInlineFootnoteRanges(state, 0, text.length);
		expect(inlineFn).toHaveLength(1);
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
	it('# heading ^[inline note] — inline footnote detected', () => {
		const text = '# heading ^[inline note]';
		const state = createMarkdownState(text);

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
	it('- [ ] ^[inline note] — inline footnote detected', () => {
		const text = '- [ ] ^[inline note]';
		const state = createMarkdownState(text);

		const inlineFn = findInlineFootnoteRanges(state, 0, text.length);
		expect(inlineFn).toHaveLength(1);
	});
});

describe('inline footnote + ordered list', () => {
	it('1. ^[inline note] — inline footnote detected', () => {
		const text = '1. ^[inline note]';
		const state = createMarkdownState(text);

		const inlineFn = findInlineFootnoteRanges(state, 0, text.length);
		expect(inlineFn).toHaveLength(1);
	});
});

// ============================================================
// Footnote def + more inline types
// ============================================================

describe('footnote def + italic', () => {
	it('[^1]: *italic definition* — def marker detected', () => {
		const text = '[^1]: *italic definition*';
		const state = createMarkdownState(text);

		const def = findFootnoteDefRange(state, 0, text.length);
		expect(def).not.toBeNull();
		expect(def!.label).toBe('1');
	});
});

describe('footnote def + link', () => {
	it('[^1]: [link](url) definition — def marker detected on a line with a link', () => {
		const text = '[^1]: [link](url) definition';
		const state = createMarkdownState(text);

		const def = findFootnoteDefRange(state, 0, text.length);
		expect(def).not.toBeNull();
	});
});

describe('footnote def + inline math', () => {
	it('[^1]: $x^2$ definition — def marker detected on a line with inline math', () => {
		const text = '[^1]: $x^2$ definition';
		const state = createMarkdownState(text);

		const def = findFootnoteDefRange(state, 0, text.length);
		expect(def).not.toBeNull();
	});
});

// ============================================================
// Footnote ref + image
// ============================================================

describe('footnote ref + image', () => {
	it('[^1] ![alt](img.png) — footnote ref detected', () => {
		const text = '[^1] ![alt](img.png)';
		const state = createMarkdownState(text);

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('1');
	});
});

describe('footnote ref + strikethrough', () => {
	it('[^1] ~~strike~~ — footnote ref detected', () => {
		const text = '[^1] ~~strike~~';
		const state = createMarkdownState(text);

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
	});
});

describe('footnote ref + inline code', () => {
	it('[^1] `code` — footnote ref detected', () => {
		const text = '[^1] `code`';
		const state = createMarkdownState(text);

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
	});
});
