import { describe, it, expect } from 'vitest';
import { findBlockReference } from '$lib/core/markdown-editor/extensions/live-preview/parsers/block-reference';
import { findWikilinkRanges } from '$lib/core/markdown-editor/extensions/wikilink/decoration.logic';
import { findBlockquoteMarkRange } from '$lib/core/markdown-editor/extensions/live-preview/parsers/blockquote';
import { findInlineCommentRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/comment';
import { findFootnoteRefRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/footnote';
import { findWikilinkEmbedRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed';
import { createMarkdownState } from '../../../test-helpers';

// ============================================================
// Inline math + inline formatting
// ============================================================

describe('inline math + wikilink', () => {
	it('$x$ and [[note]] — wikilink detected next to inline math', () => {
		const text = '$x$ and [[note]]';

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].targetText).toBe('note');
	});
});

describe('inline math + blockquote', () => {
	it('> $\\pi$ — blockquote mark detected on a line with inline math', () => {
		const text = '> $\\pi$';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).not.toBeNull();
	});
});

// ============================================================
// Block reference + inline formatting
// ============================================================

describe('block reference + bold', () => {
	it('**bold text** ^blockid — block reference detected next to bold', () => {
		const text = '**bold text** ^blockid';

		const ref = findBlockReference(text, 0);
		expect(ref).not.toBeNull();
		expect(ref!.id).toBe('blockid');
	});
});

describe('block reference + italic', () => {
	it('*italic* ^ref — block reference detected next to italic', () => {
		const text = '*italic* ^ref';

		const ref = findBlockReference(text, 0);
		expect(ref).not.toBeNull();
		expect(ref!.id).toBe('ref');
	});
});

describe('block reference + heading', () => {
	it('# heading ^blockid — block reference detected on a heading line', () => {
		const text = '# heading ^blockid';

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
	it('- [ ] task ^blockid — block reference detected on a task line', () => {
		const text = '- [ ] task ^blockid';

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
	it('[link](url) ^blockid — block reference detected next to a markdown link', () => {
		const text = '[link](url) ^blockid';

		const ref = findBlockReference(text, 0);
		expect(ref).not.toBeNull();
		expect(ref!.id).toBe('blockid');
	});
});

describe('block reference + inline math', () => {
	it('$x^2$ ^ref — block reference detected next to inline math', () => {
		const text = '$x^2$ ^ref';

		const ref = findBlockReference(text, 0);
		expect(ref).not.toBeNull();
		expect(ref!.id).toBe('ref');
	});
});

describe('block reference + highlight', () => {
	it('==highlighted== ^ref — block reference detected next to a highlight', () => {
		const text = '==highlighted== ^ref';

		const ref = findBlockReference(text, 0);
		expect(ref).not.toBeNull();
		expect(ref!.id).toBe('ref');
	});
});

// ============================================================
// Inline math + more types
// ============================================================

describe('inline math + inline comment', () => {
	it('$x^2$ %%hidden%% — inline comment detected next to inline math', () => {
		const text = '$x^2$ %%hidden%%';
		const state = createMarkdownState(text);

		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(1);
	});
});

describe('inline math + footnote ref', () => {
	it('$x^2$ [^1] — footnote ref detected next to inline math', () => {
		const text = '$x^2$ [^1]';
		const state = createMarkdownState(text);

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
	});
});

describe('inline math + wikilink embed', () => {
	it('$x$ ![[note]] — wikilink embed detected next to inline math', () => {
		const text = '$x$ ![[note]]';

		const embeds = findWikilinkEmbedRanges(text, 0);
		expect(embeds).toHaveLength(1);
	});
});

// ============================================================
// Block reference + more types
// ============================================================

describe('block reference + strikethrough', () => {
	it('~~strike~~ ^ref — block reference detected next to strikethrough', () => {
		const text = '~~strike~~ ^ref';

		const ref = findBlockReference(text, 0);
		expect(ref).not.toBeNull();
		expect(ref!.id).toBe('ref');
	});
});

describe('block reference + inline code', () => {
	it('`code` ^ref — block reference detected next to a code span', () => {
		const text = '`code` ^ref';

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
	it('![alt](img.png) ^ref — block reference detected next to an image', () => {
		const text = '![alt](img.png) ^ref';

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
	it('1. item ^ref — block reference detected on an ordered list line', () => {
		const text = '1. item ^ref';

		const ref = findBlockReference(text, 0);
		expect(ref).not.toBeNull();
	});
});
