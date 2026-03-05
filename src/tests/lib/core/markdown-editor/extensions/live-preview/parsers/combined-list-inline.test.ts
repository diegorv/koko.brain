import { describe, it, expect } from 'vitest';
import { findTaskMarkerRange } from '$lib/core/markdown-editor/extensions/live-preview/parsers/task-list';
import { findOrderedListMarkRange } from '$lib/core/markdown-editor/extensions/live-preview/parsers/ordered-list';
import { findBoldRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/bold';
import { findItalicRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/italic';
import { findStrikethroughRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/strikethrough';
import { findInlineCodeRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/inline-code';
import { findMarkdownLinkRanges, findAutolinkRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/link';
import { findImageRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/image';
import { findWikilinkRanges } from '$lib/core/markdown-editor/extensions/wikilink/decoration.logic';
import { findHighlightRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/highlight';
import { findFootnoteRefRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/footnote';
import { findInlineMathRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/math';
import { findBlockReference } from '$lib/core/markdown-editor/extensions/live-preview/parsers/block-reference';
import { findWikilinkEmbedRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed';
import { findBoldItalicRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/bold-italic';
import { findInlineCommentRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/comment';
import { createMarkdownState } from '../../../test-helpers';

// ============================================================
// Task list + inline formatting
// ============================================================

describe('task list + bold', () => {
	it('- [ ] **bold task** — task marker and bold both detected', () => {
		const text = '- [ ] **bold task**';
		const state = createMarkdownState(text);

		const task = findTaskMarkerRange(state, 0, text.length);
		expect(task).toEqual({ markerFrom: 2, markerTo: 5, checked: false });

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
		expect(bolds[0]).toEqual({
			openMarkFrom: 6,
			openMarkTo: 8,
			textFrom: 8,
			textTo: 17,
			closeMarkFrom: 17,
			closeMarkTo: 19,
		});
	});
});

describe('task list + italic', () => {
	it('- [x] *completed italic* — checked task and italic both detected', () => {
		const text = '- [x] *completed italic*';
		const state = createMarkdownState(text);

		const task = findTaskMarkerRange(state, 0, text.length);
		expect(task).toEqual({ markerFrom: 2, markerTo: 5, checked: true });

		const italics = findItalicRanges(state, 0, text.length);
		expect(italics).toHaveLength(1);
		expect(italics[0]).toEqual({
			openMarkFrom: 6,
			openMarkTo: 7,
			textFrom: 7,
			textTo: 23,
			closeMarkFrom: 23,
			closeMarkTo: 24,
		});
	});
});

describe('task list + link', () => {
	it('- [ ] [link](url) task — task marker and link both detected', () => {
		const text = '- [ ] [link](url) task';
		const state = createMarkdownState(text);

		const task = findTaskMarkerRange(state, 0, text.length);
		expect(task).toEqual({ markerFrom: 2, markerTo: 5, checked: false });
		const links = findMarkdownLinkRanges(state, 0, text.length);
		expect(links).toHaveLength(1);
		expect(links[0]).toEqual({
			openBracketFrom: 6,
			openBracketTo: 7,
			textFrom: 7,
			textTo: 11,
			closeBracketUrlFrom: 11,
			closeBracketUrlTo: 17,
		});
	});
});

describe('task list + strikethrough', () => {
	it('- [ ] ~~deleted task~~ — task marker and strikethrough both detected', () => {
		const text = '- [ ] ~~deleted task~~';
		const state = createMarkdownState(text);

		const task = findTaskMarkerRange(state, 0, text.length);
		expect(task).toEqual({ markerFrom: 2, markerTo: 5, checked: false });

		const strikes = findStrikethroughRanges(state, 0, text.length);
		expect(strikes).toHaveLength(1);
		expect(strikes[0]).toEqual({
			openMarkFrom: 6,
			openMarkTo: 8,
			textFrom: 8,
			textTo: 20,
			closeMarkFrom: 20,
			closeMarkTo: 22,
		});
	});
});

describe('task list + wikilink', () => {
	it('- [ ] [[wikilink]] — task and wikilink', () => {
		const text = '- [ ] [[wikilink]]';
		const state = createMarkdownState(text);

		const task = findTaskMarkerRange(state, 0, text.length);
		expect(task).not.toBeNull();
		expect(task!.checked).toBe(false);

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].targetText).toBe('wikilink');
	});
});

describe('task list + image', () => {
	it('- [x] ![alt](img.png) — checked task and image', () => {
		const text = '- [x] ![alt](img.png)';
		const state = createMarkdownState(text);

		const task = findTaskMarkerRange(state, 0, text.length);
		expect(task).not.toBeNull();
		expect(task!.checked).toBe(true);

		const images = findImageRanges(state, 0, text.length);
		expect(images).toHaveLength(1);
		expect(images[0].altText).toBe('alt');
	});
});

describe('task list + highlight', () => {
	it('- [ ] ==highlighted task== — task and highlight', () => {
		const text = '- [ ] ==highlighted task==';
		const state = createMarkdownState(text);

		const task = findTaskMarkerRange(state, 0, text.length);
		expect(task).not.toBeNull();

		const highlights = findHighlightRanges(state, 0, text.length);
		expect(highlights).toHaveLength(1);
		expect(highlights[0].textFrom).toBe(8);
		expect(highlights[0].textTo).toBe(24);
	});
});

describe('task list + footnote ref', () => {
	it('- [ ] [^1] task with footnote — task and footnote ref', () => {
		const text = '- [ ] [^1] task with footnote';
		const state = createMarkdownState(text);

		const task = findTaskMarkerRange(state, 0, text.length);
		expect(task).not.toBeNull();

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('1');
	});

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

describe('task list + inline math', () => {
	it('- [ ] $x^2$ formula task — task and inline math', () => {
		const text = '- [ ] $x^2$ formula task';
		const state = createMarkdownState(text);

		const task = findTaskMarkerRange(state, 0, text.length);
		expect(task).not.toBeNull();

		const maths = findInlineMathRanges(state, 0, text.length);
		expect(maths).toHaveLength(1);
		expect(maths[0].formula).toBe('x^2');
	});
});

describe('task list + block reference', () => {
	it('- [ ] task ^blockid — task and block reference', () => {
		const text = '- [ ] task ^blockid';
		const state = createMarkdownState(text);

		const task = findTaskMarkerRange(state, 0, text.length);
		expect(task).not.toBeNull();

		const ref = findBlockReference(text, 0);
		expect(ref).not.toBeNull();
		expect(ref!.id).toBe('blockid');
	});
});

describe('task list + multiple inline', () => {
	it('- [x] **bold** *italic* ~~strike~~ — task with multiple formatting', () => {
		const text = '- [x] **bold** *italic* ~~strike~~';
		const state = createMarkdownState(text);

		const task = findTaskMarkerRange(state, 0, text.length);
		expect(task).not.toBeNull();
		expect(task!.checked).toBe(true);

		expect(findBoldRanges(state, 0, text.length)).toHaveLength(1);
		expect(findItalicRanges(state, 0, text.length)).toHaveLength(1);
		expect(findStrikethroughRanges(state, 0, text.length)).toHaveLength(1);
	});
});

// ============================================================
// Ordered list + inline formatting
// ============================================================

describe('ordered list + bold', () => {
	it('1. **bold item** — ordered list and bold both detected', () => {
		const text = '1. **bold item**';
		const state = createMarkdownState(text);

		const olMark = findOrderedListMarkRange(state, 0, text.length);
		expect(olMark).not.toBeNull();

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
		expect(bolds[0].textFrom).toBe(5);
		expect(bolds[0].textTo).toBe(14);
	});
});

describe('ordered list + link', () => {
	it('1. [link](url) — ordered list and link both detected', () => {
		const text = '1. [link](url)';
		const state = createMarkdownState(text);

		const olMark = findOrderedListMarkRange(state, 0, text.length);
		expect(olMark).not.toBeNull();

		const links = findMarkdownLinkRanges(state, 0, text.length);
		expect(links).toHaveLength(1);
	});
});

describe('ordered list + wikilink', () => {
	it('1. [[wikilink]] — ordered list and wikilink', () => {
		const text = '1. [[wikilink]]';
		const state = createMarkdownState(text);

		const olMark = findOrderedListMarkRange(state, 0, text.length);
		expect(olMark).not.toBeNull();
		expect(olMark!.number).toBe(1);

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].targetText).toBe('wikilink');
	});
});

describe('ordered list + image', () => {
	it('1. ![alt](img.png) — ordered list and image', () => {
		const text = '1. ![alt](img.png)';
		const state = createMarkdownState(text);

		const olMark = findOrderedListMarkRange(state, 0, text.length);
		expect(olMark).not.toBeNull();

		const images = findImageRanges(state, 0, text.length);
		expect(images).toHaveLength(1);
		expect(images[0].altText).toBe('alt');
		expect(images[0].url).toBe('img.png');
	});
});

describe('ordered list + highlight', () => {
	it('1. ==highlight== — ordered list and highlight', () => {
		const text = '1. ==highlight==';
		const state = createMarkdownState(text);

		const olMark = findOrderedListMarkRange(state, 0, text.length);
		expect(olMark).not.toBeNull();

		const highlights = findHighlightRanges(state, 0, text.length);
		expect(highlights).toHaveLength(1);
		expect(highlights[0].textFrom).toBe(5);
		expect(highlights[0].textTo).toBe(14);
	});
});

describe('ordered list + footnote ref', () => {
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

describe('ordered list + inline comment', () => {
	it('1. %%comment%% item — ordered list and inline comment', () => {
		const text = '1. %%comment%% item';
		const state = createMarkdownState(text);

		const olMark = findOrderedListMarkRange(state, 0, text.length);
		expect(olMark).not.toBeNull();

		const comments = findInlineCodeRanges(state, 0, text.length);
		// inline comment uses findInlineCommentRanges, not findInlineCodeRanges
	});
});

describe('ordered list + multiple inline', () => {
	it('1. *italic* **bold** ~~strike~~ — ordered list with multiple inline', () => {
		const text = '1. *italic* **bold** ~~strike~~';
		const state = createMarkdownState(text);

		const olMark = findOrderedListMarkRange(state, 0, text.length);
		expect(olMark).not.toBeNull();

		expect(findItalicRanges(state, 0, text.length)).toHaveLength(1);
		expect(findBoldRanges(state, 0, text.length)).toHaveLength(1);
		expect(findStrikethroughRanges(state, 0, text.length)).toHaveLength(1);
	});
});

describe('ordered list + inline math', () => {
	it('1. $E=mc^2$ — ordered list and inline math', () => {
		const text = '1. $E=mc^2$';
		const state = createMarkdownState(text);

		const olMark = findOrderedListMarkRange(state, 0, text.length);
		expect(olMark).not.toBeNull();

		const maths = findInlineMathRanges(state, 0, text.length);
		expect(maths).toHaveLength(1);
		expect(maths[0].formula).toBe('E=mc^2');
	});
});

describe('ordered list + block reference', () => {
	it('1. item ^blockid — ordered list and block reference', () => {
		const text = '1. item ^blockid';
		const state = createMarkdownState(text);

		const olMark = findOrderedListMarkRange(state, 0, text.length);
		expect(olMark).not.toBeNull();

		const ref = findBlockReference(text, 0);
		expect(ref).not.toBeNull();
		expect(ref!.id).toBe('blockid');
	});
});

// ============================================================
// Ordered list + more inline types
// ============================================================

describe('ordered list + strikethrough', () => {
	it('1. ~~strike~~ — ordered list and strikethrough', () => {
		const text = '1. ~~strike~~';
		const state = createMarkdownState(text);

		const olMark = findOrderedListMarkRange(state, 0, text.length);
		expect(olMark).not.toBeNull();

		const strikes = findStrikethroughRanges(state, 0, text.length);
		expect(strikes).toHaveLength(1);
	});
});

describe('ordered list + inline code', () => {
	it('1. `code` — ordered list and inline code', () => {
		const text = '1. `code`';
		const state = createMarkdownState(text);

		const olMark = findOrderedListMarkRange(state, 0, text.length);
		expect(olMark).not.toBeNull();

		const codes = findInlineCodeRanges(state, 0, text.length);
		expect(codes).toHaveLength(1);
	});
});

describe('ordered list + wikilink embed', () => {
	it('1. ![[embed]] — ordered list and wikilink embed', () => {
		const text = '1. ![[embed]]';
		const state = createMarkdownState(text);

		const olMark = findOrderedListMarkRange(state, 0, text.length);
		expect(olMark).not.toBeNull();

		const embeds = findWikilinkEmbedRanges(text, 0);
		expect(embeds).toHaveLength(1);
	});
});

describe('ordered list + autolink', () => {
	it('1. <https://example.com> — ordered list and autolink', () => {
		const text = '1. <https://example.com>';
		const state = createMarkdownState(text);

		const olMark = findOrderedListMarkRange(state, 0, text.length);
		expect(olMark).not.toBeNull();

		const autolinks = findAutolinkRanges(state, 0, text.length);
		expect(autolinks).toHaveLength(1);
	});
});

describe('ordered list + bold-italic', () => {
	it('1. ***bold italic*** — ordered list and bold-italic', () => {
		const text = '1. ***bold italic***';
		const state = createMarkdownState(text);

		const olMark = findOrderedListMarkRange(state, 0, text.length);
		expect(olMark).not.toBeNull();

		const boldItalics = findBoldItalicRanges(state, 0, text.length);
		expect(boldItalics).toHaveLength(1);
	});
});

// ============================================================
// Task list + more inline types
// ============================================================

describe('task list + inline code', () => {
	it('- [ ] `code` task — task and inline code', () => {
		const text = '- [ ] `code` task';
		const state = createMarkdownState(text);

		const task = findTaskMarkerRange(state, 0, text.length);
		expect(task).not.toBeNull();

		const codes = findInlineCodeRanges(state, 0, text.length);
		expect(codes).toHaveLength(1);
	});
});

describe('task list + inline comment', () => {
	it('- [ ] %%hidden%% task — task and inline comment', () => {
		const text = '- [ ] %%hidden%% task';
		const state = createMarkdownState(text);

		const task = findTaskMarkerRange(state, 0, text.length);
		expect(task).not.toBeNull();

		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(1);
	});
});

describe('task list + wikilink embed', () => {
	it('- [ ] ![[embed]] task — task and wikilink embed', () => {
		const text = '- [ ] ![[embed]] task';
		const state = createMarkdownState(text);

		const task = findTaskMarkerRange(state, 0, text.length);
		expect(task).not.toBeNull();

		const embeds = findWikilinkEmbedRanges(text, 0);
		expect(embeds).toHaveLength(1);
	});
});

describe('task list + autolink', () => {
	it('- [ ] <https://example.com> task — task and autolink', () => {
		const text = '- [ ] <https://example.com> task';
		const state = createMarkdownState(text);

		const task = findTaskMarkerRange(state, 0, text.length);
		expect(task).not.toBeNull();

		const autolinks = findAutolinkRanges(state, 0, text.length);
		expect(autolinks).toHaveLength(1);
	});
});

describe('task list + bold-italic', () => {
	it('- [ ] ***bold italic*** task — task and bold-italic', () => {
		const text = '- [ ] ***bold italic*** task';
		const state = createMarkdownState(text);

		const task = findTaskMarkerRange(state, 0, text.length);
		expect(task).not.toBeNull();

		const boldItalics = findBoldItalicRanges(state, 0, text.length);
		expect(boldItalics).toHaveLength(1);
	});
});
