import { describe, it, expect } from 'vitest';
import { findFrontmatterBlock } from '$lib/core/markdown-editor/extensions/live-preview/parsers/frontmatter';
import { findAllFencedCodeBlocks } from '$lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block';
import { findBlockComment } from '$lib/core/markdown-editor/extensions/live-preview/parsers/comment';
import { findAllTables } from '$lib/core/markdown-editor/extensions/live-preview/parsers/table';
import { findAllBlockMath, findInlineMathRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/math';
import { findHeadingMarkRange } from '$lib/core/markdown-editor/extensions/live-preview/parsers/heading';
import { findBoldRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/bold';
import { findItalicRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/italic';
import { findStrikethroughRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/strikethrough';
import { findHighlightRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/highlight';
import { findInlineCodeRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/inline-code';
import { findMarkdownLinkRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/link';
import { findWikilinkRanges } from '$lib/core/markdown-editor/extensions/wikilink/decoration.logic';
import { findFootnoteRefRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/footnote';
import { findMermaidBlock } from '$lib/core/markdown-editor/extensions/live-preview/parsers/mermaid';
import { findCollectionBlock } from '$lib/core/markdown-editor/extensions/live-preview/parsers/collection-block';
import { findMetaBindButtonBlock } from '$lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-button';
import { createMarkdownState, makeLines } from '../../../test-helpers';

// ============================================================
// Frontmatter + heading adjacency
// ============================================================

describe('frontmatter + heading', () => {
	it('frontmatter followed immediately by heading (no blank line)', () => {
		const docText = '---\ntitle: Test\n---\n# Heading';
		const lines = makeLines(docText);

		const fm = findFrontmatterBlock(lines);
		expect(fm).not.toBeNull();
		expect(fm!.openIdx).toBe(0);
		expect(fm!.closeIdx).toBe(2);
		expect(fm!.properties).toEqual([{ key: 'title', value: 'Test' }]);

		const state = createMarkdownState(docText);
		const heading = findHeadingMarkRange(state, lines[3].from, lines[3].to);
		expect(heading).not.toBeNull();
		expect(heading!.level).toBe(1);
	});

	it('frontmatter does not extend past closing fence', () => {
		const lines = makeLines('---\nkey: val\n---\nnot frontmatter');

		const fm = findFrontmatterBlock(lines);
		expect(fm).not.toBeNull();
		expect(fm!.closeIdx).toBe(2);

		expect(lines[3].text).toBe('not frontmatter');
	});
});

// ============================================================
// Code block containing markdown syntax
// ============================================================

describe('code block containing bold syntax', () => {
	it('fenced code block containing bold — bold NOT detected inside code block', () => {
		const docText = '```\n**bold inside code**\n```';
		const lines = makeLines(docText);
		const state = createMarkdownState(docText);

		const blocks = findAllFencedCodeBlocks(state);
		expect(blocks).toHaveLength(1);

		const bolds = findBoldRanges(state, lines[1].from, lines[1].to);
		expect(bolds).toHaveLength(0);
	});
});

describe('code block containing heading syntax', () => {
	it('fenced code block containing heading — heading NOT detected inside code block', () => {
		const docText = '```\n# Not a heading\n```';
		const lines = makeLines(docText);
		const state = createMarkdownState(docText);

		const blocks = findAllFencedCodeBlocks(state);
		expect(blocks).toHaveLength(1);

		const heading = findHeadingMarkRange(state, lines[1].from, lines[1].to);
		expect(heading).toBeNull();
	});
});

describe('code block with language tag', () => {
	it('fenced code block with language tag', () => {
		const docText = '```javascript\nconst x = 1;\n```';
		const state = createMarkdownState(docText);

		const blocks = findAllFencedCodeBlocks(state);
		expect(blocks).toHaveLength(1);
		expect(blocks[0].language).toBe('javascript');
	});
});

// ============================================================
// Block comment containing other syntax
// ============================================================

describe('block comment containing bold', () => {
	it('block comment containing bold — Lezer still detects bold (does not know about %% comments)', () => {
		const docText = '%%\n**bold inside comment**\n%%';
		const lines = makeLines(docText);
		const state = createMarkdownState(docText);

		const comment = findBlockComment(lines, 0);
		expect(comment).not.toBeNull();
		expect(comment!.endIdx).toBe(2);

		// Lezer doesn't know about Obsidian's %% block comments, so bold is still detected
		const bolds = findBoldRanges(state, lines[1].from, lines[1].to);
		expect(bolds).toHaveLength(1);
	});
});

describe('block comment containing heading', () => {
	it('block comment containing heading syntax', () => {
		const docText = '%%\n# heading inside comment\n%%';
		const lines = makeLines(docText);

		const comment = findBlockComment(lines, 0);
		expect(comment).not.toBeNull();
		expect(comment!.endIdx).toBe(2);

		// Lezer doesn't know about Obsidian's %% block comments
		const state = createMarkdownState(docText);
		const heading = findHeadingMarkRange(state, lines[1].from, lines[1].to);
		expect(heading).not.toBeNull();
		expect(heading!.level).toBe(1);
	});
});

// ============================================================
// Adjacent multi-line blocks
// ============================================================

describe('table immediately after code block', () => {
	it('table immediately after code block', () => {
		const docText = '```\ncode\n```\n| A | B |\n| --- | --- |\n| 1 | 2 |';
		const state = createMarkdownState(docText);

		const blocks = findAllFencedCodeBlocks(state);
		expect(blocks).toHaveLength(1);

		const tables = findAllTables(state);
		expect(tables).toHaveLength(1);
		expect(tables[0].startLine).toBe(4);
		expect(tables[0].endLine).toBe(6);
	});
});

describe('two tables separated by text', () => {
	it('two tables separated by text', () => {
		const docText = '| A |\n| --- |\n| 1 |\n\ntext\n\n| B |\n| --- |\n| 2 |';
		const state = createMarkdownState(docText);

		const tables = findAllTables(state);
		expect(tables).toHaveLength(2);
		expect(tables[0].startLine).toBe(1);
		expect(tables[0].endLine).toBe(3);
		expect(tables[1].startLine).toBe(7);
		expect(tables[1].endLine).toBe(9);
	});
});

describe('frontmatter then table', () => {
	it('frontmatter then table', () => {
		const docText = '---\ntitle: T\n---\n| A | B |\n| --- | --- |\n| 1 | 2 |';
		const lines = makeLines(docText);
		const state = createMarkdownState(docText);

		const fm = findFrontmatterBlock(lines);
		expect(fm).not.toBeNull();
		expect(fm!.closeIdx).toBe(2);

		const tables = findAllTables(state);
		expect(tables).toHaveLength(1);
		expect(tables[0].startLine).toBe(4);
	});
});

// ============================================================
// Block math adjacency
// ============================================================

describe('block math + adjacent structures', () => {
	it('block math followed by heading', () => {
		const docText = '$$\nx^2 + y^2 = z^2\n$$\n# Heading';
		const lines = makeLines(docText);
		const state = createMarkdownState(docText);

		const blockMaths = findAllBlockMath(state);
		expect(blockMaths).toHaveLength(1);
		expect(blockMaths[0].formula).toBe('x^2 + y^2 = z^2');

		const heading = findHeadingMarkRange(state, lines[3].from, lines[3].to);
		expect(heading).not.toBeNull();
		expect(heading!.level).toBe(1);
	});

	it('code block then block math', () => {
		const docText = '```\ncode\n```\n$$\nE=mc^2\n$$';
		const state = createMarkdownState(docText);

		const codeBlocks = findAllFencedCodeBlocks(state);
		expect(codeBlocks).toHaveLength(1);

		const blockMaths = findAllBlockMath(state);
		expect(blockMaths).toHaveLength(1);
		expect(blockMaths[0].formula).toBe('E=mc^2');
	});

	it('two block maths separated by text', () => {
		const docText = '$$\na\n$$\n\ntext\n\n$$\nb\n$$';
		const state = createMarkdownState(docText);

		const blockMaths = findAllBlockMath(state);
		expect(blockMaths).toHaveLength(2);
		expect(blockMaths[0].formula).toBe('a');
		expect(blockMaths[1].formula).toBe('b');
	});
});

describe('frontmatter + code block', () => {
	it('frontmatter then code block — both detected independently', () => {
		const docText = '---\ntitle: Test\n---\n```js\nconst x = 1;\n```';
		const lines = makeLines(docText);
		const state = createMarkdownState(docText);

		const fm = findFrontmatterBlock(lines);
		expect(fm).not.toBeNull();
		expect(fm!.closeIdx).toBe(2);

		const codeBlocks = findAllFencedCodeBlocks(state);
		expect(codeBlocks).toHaveLength(1);
		expect(codeBlocks[0].language).toBe('js');
	});
});

describe('multiple block types in sequence', () => {
	it('frontmatter → heading → code block → table — all detected in sequence', () => {
		const docText = '---\ntitle: T\n---\n# Heading\n```\ncode\n```\n| A |\n| --- |\n| 1 |';
		const lines = makeLines(docText);
		const state = createMarkdownState(docText);

		const fm = findFrontmatterBlock(lines);
		expect(fm).not.toBeNull();

		const heading = findHeadingMarkRange(state, lines[3].from, lines[3].to);
		expect(heading).not.toBeNull();
		expect(heading!.level).toBe(1);

		const codeBlocks = findAllFencedCodeBlocks(state);
		expect(codeBlocks).toHaveLength(1);

		const tables = findAllTables(state);
		expect(tables).toHaveLength(1);
	});
});

// ============================================================
// Code block suppression of inline syntax
// ============================================================

describe('code block suppresses italic', () => {
	it('fenced code block containing italic — italic NOT detected inside code block', () => {
		const docText = '```\n*italic inside code*\n```';
		const lines = makeLines(docText);
		const state = createMarkdownState(docText);

		const blocks = findAllFencedCodeBlocks(state);
		expect(blocks).toHaveLength(1);

		const italics = findItalicRanges(state, lines[1].from, lines[1].to);
		expect(italics).toHaveLength(0);
	});
});

describe('code block suppresses strikethrough', () => {
	it('fenced code block containing strikethrough — strikethrough NOT detected inside code block', () => {
		const docText = '```\n~~strike inside code~~\n```';
		const lines = makeLines(docText);
		const state = createMarkdownState(docText);

		const blocks = findAllFencedCodeBlocks(state);
		expect(blocks).toHaveLength(1);

		const strikes = findStrikethroughRanges(state, lines[1].from, lines[1].to);
		expect(strikes).toHaveLength(0);
	});
});

describe('code block suppresses highlight', () => {
	it('fenced code block containing highlight — highlight NOT detected inside code block', () => {
		const docText = '```\n==highlight inside code==\n```';
		const lines = makeLines(docText);
		const state = createMarkdownState(docText);

		const blocks = findAllFencedCodeBlocks(state);
		expect(blocks).toHaveLength(1);

		const highlights = findHighlightRanges(state, lines[1].from, lines[1].to);
		expect(highlights).toHaveLength(0);
	});
});

describe('code block suppresses inline code', () => {
	it('fenced code block containing backticks — inline code NOT detected inside code block', () => {
		const docText = '```\n`code inside code`\n```';
		const lines = makeLines(docText);
		const state = createMarkdownState(docText);

		const blocks = findAllFencedCodeBlocks(state);
		expect(blocks).toHaveLength(1);

		const codes = findInlineCodeRanges(state, lines[1].from, lines[1].to);
		expect(codes).toHaveLength(0);
	});
});

describe('code block suppresses inline math', () => {
	it('fenced code block containing math — inline math NOT detected inside code block', () => {
		const docText = '```\n$x^2$\n```';
		const lines = makeLines(docText);
		const state = createMarkdownState(docText);

		const blocks = findAllFencedCodeBlocks(state);
		expect(blocks).toHaveLength(1);

		const maths = findInlineMathRanges(state, lines[1].from, lines[1].to);
		expect(maths).toHaveLength(0);
	});
});

describe('code block suppresses link', () => {
	it('fenced code block containing link — link NOT detected inside code block', () => {
		const docText = '```\n[link](url)\n```';
		const lines = makeLines(docText);
		const state = createMarkdownState(docText);

		const blocks = findAllFencedCodeBlocks(state);
		expect(blocks).toHaveLength(1);

		const links = findMarkdownLinkRanges(state, lines[1].from, lines[1].to);
		expect(links).toHaveLength(0);
	});
});

describe('code block does not suppress wikilink (regex-based)', () => {
	it('fenced code block containing wikilink — wikilink IS detected (regex, not Lezer)', () => {
		const docText = '```\n[[note]]\n```';
		const lines = makeLines(docText);

		const blocks = findAllFencedCodeBlocks(createMarkdownState(docText));
		expect(blocks).toHaveLength(1);

		// Wikilink parser is regex-based, so it still finds the wikilink text
		const wikilinks = findWikilinkRanges(lines[1].text, lines[1].from);
		expect(wikilinks).toHaveLength(1);
	});
});

describe('code block does not suppress footnote ref (regex-based)', () => {
	it('fenced code block containing footnote ref — footnote ref IS detected (regex, not Lezer)', () => {
		const docText = '```\n[^1]\n```';
		const lines = makeLines(docText);
		const state = createMarkdownState(docText);

		const blocks = findAllFencedCodeBlocks(state);
		expect(blocks).toHaveLength(1);

		// Footnote ref parser is regex-based
		const refs = findFootnoteRefRanges(state, lines[1].from, lines[1].to);
		expect(refs).toHaveLength(1);
	});
});

// ============================================================
// More block adjacency combinations
// ============================================================

describe('frontmatter + block math', () => {
	it('frontmatter then block math — both detected independently', () => {
		const docText = '---\ntitle: T\n---\n\n$$\nx^2\n$$';
		const lines = makeLines(docText);
		const state = createMarkdownState(docText);

		const fm = findFrontmatterBlock(lines);
		expect(fm).not.toBeNull();
		expect(fm!.closeIdx).toBe(2);

		const blockMaths = findAllBlockMath(state);
		expect(blockMaths).toHaveLength(1);
		expect(blockMaths[0].formula).toBe('x^2');
	});
});

describe('frontmatter + block comment', () => {
	it('frontmatter then block comment — both detected independently', () => {
		const docText = '---\ntitle: T\n---\n%%\nhidden\n%%';
		const lines = makeLines(docText);

		const fm = findFrontmatterBlock(lines);
		expect(fm).not.toBeNull();
		expect(fm!.closeIdx).toBe(2);

		const comment = findBlockComment(lines, 3);
		expect(comment).not.toBeNull();
		expect(comment!.endIdx).toBe(5);
	});
});

describe('frontmatter + mermaid', () => {
	it('frontmatter then mermaid — both detected independently', () => {
		const docText = '---\ntitle: T\n---\n```mermaid\ngraph TD\n```';
		const lines = makeLines(docText);

		const fm = findFrontmatterBlock(lines);
		expect(fm).not.toBeNull();
		expect(fm!.closeIdx).toBe(2);

		const mermaid = findMermaidBlock(lines, 3);
		expect(mermaid).not.toBeNull();
		expect(mermaid!.block.diagramSource).toBe('graph TD');
	});
});

describe('block math + table adjacency', () => {
	it('block math then table — both detected', () => {
		const docText = '$$\nx^2\n$$\n| A |\n| --- |\n| 1 |';
		const state = createMarkdownState(docText);

		const blockMaths = findAllBlockMath(state);
		expect(blockMaths).toHaveLength(1);

		const tables = findAllTables(state);
		expect(tables).toHaveLength(1);
	});
});

describe('block comment + table adjacency', () => {
	it('block comment then table — both detected', () => {
		const docText = '%%\nhidden\n%%\n| A |\n| --- |\n| 1 |';
		const lines = makeLines(docText);
		const state = createMarkdownState(docText);

		const comment = findBlockComment(lines, 0);
		expect(comment).not.toBeNull();
		expect(comment!.endIdx).toBe(2);

		const tables = findAllTables(state);
		expect(tables).toHaveLength(1);
	});
});

describe('block comment + fenced code adjacency', () => {
	it('block comment then code block — both detected', () => {
		const docText = '%%\nhidden\n%%\n```\ncode\n```';
		const lines = makeLines(docText);
		const state = createMarkdownState(docText);

		const comment = findBlockComment(lines, 0);
		expect(comment).not.toBeNull();

		const blocks = findAllFencedCodeBlocks(state);
		expect(blocks).toHaveLength(1);
	});
});

describe('mermaid + table adjacency', () => {
	it('mermaid then table — both detected', () => {
		const docText = '```mermaid\ngraph TD\n```\n| A |\n| --- |\n| 1 |';
		const lines = makeLines(docText);
		const state = createMarkdownState(docText);

		const mermaid = findMermaidBlock(lines, 0);
		expect(mermaid).not.toBeNull();

		const tables = findAllTables(state);
		expect(tables).toHaveLength(1);
	});
});

describe('mermaid + code block adjacency', () => {
	it('mermaid then regular code block — both detected', () => {
		const docText = '```mermaid\ngraph TD\n```\n```js\nconst x = 1;\n```';
		const lines = makeLines(docText);
		const state = createMarkdownState(docText);

		const mermaid = findMermaidBlock(lines, 0);
		expect(mermaid).not.toBeNull();
		expect(mermaid!.block.diagramSource).toBe('graph TD');

		const codeBlocks = findAllFencedCodeBlocks(state);
		expect(codeBlocks).toHaveLength(2);
	});
});

describe('mermaid + block math adjacency', () => {
	it('mermaid then block math — both detected', () => {
		const docText = '```mermaid\ngraph TD\n```\n\n$$\nx^2\n$$';
		const lines = makeLines(docText);
		const state = createMarkdownState(docText);

		const mermaid = findMermaidBlock(lines, 0);
		expect(mermaid).not.toBeNull();

		const blockMaths = findAllBlockMath(state);
		expect(blockMaths).toHaveLength(1);
	});
});

describe('collection block + code block adjacency', () => {
	it('collection then code block — both detected', () => {
		const docText = '```collection\nfilter: tag = #test\n```\n```js\ncode\n```';
		const lines = makeLines(docText);
		const state = createMarkdownState(docText);

		const collection = findCollectionBlock(lines, 0);
		expect(collection).not.toBeNull();
		expect(collection!.block.yamlContent).toBe('filter: tag = #test');

		const codeBlocks = findAllFencedCodeBlocks(state);
		expect(codeBlocks).toHaveLength(2);
	});
});

describe('meta-bind-button + heading adjacency', () => {
	it('heading then meta-bind-button block — both detected', () => {
		const docText = '# Title\n```meta-bind-button\nlabel: Click\n```';
		const lines = makeLines(docText);
		const state = createMarkdownState(docText);

		const heading = findHeadingMarkRange(state, lines[0].from, lines[0].to);
		expect(heading).not.toBeNull();
		expect(heading!.level).toBe(1);

		const btn = findMetaBindButtonBlock(lines, 1);
		expect(btn).not.toBeNull();
		expect(btn!.block.yamlContent).toBe('label: Click');
	});
});
