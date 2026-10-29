import { describe, it, expect } from 'vitest';
import type { EditorState } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';

// No mocks for stores or logic files — real implementations per CLAUDE.md.

import { computeMermaidBlocks } from '#lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.js';
import { computeQueryjsBlocks } from '#lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.js';
import { computeCollectionBlocks } from '#lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.js';
import { MermaidWidget } from '#lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.js';
import { QueryjsBlockWidget } from '#lib/core/markdown-editor/extensions/live-preview/widgets/queryjs-block-widget.js';
import { CollectionBlockWidget } from '#lib/core/markdown-editor/extensions/live-preview/widgets/collection-block-widget.js';
import { createMarkdownState } from '../../../test-helpers';

/**
 * Which fences the mermaid, queryjs and collection decorators claim, and what
 * source each widget receives. The cursor sits on the first line ("text"), so
 * every detected block renders.
 */

/** A rendered block: opening-fence range and the source handed to the widget. */
interface Rendered {
	from: number;
	to: number;
	source: string;
}

/** Collects the widget decorations of a set as their range and widget source. */
function rendered(set: DecorationSet): Rendered[] {
	const out: Rendered[] = [];
	const iter = set.iter();
	while (iter.value) {
		const widget = (iter.value.spec as { widget?: unknown }).widget;
		if (widget instanceof MermaidWidget) out.push({ from: iter.from, to: iter.to, source: widget.source });
		else if (widget instanceof QueryjsBlockWidget) out.push({ from: iter.from, to: iter.to, source: widget.jsContent });
		else if (widget instanceof CollectionBlockWidget) out.push({ from: iter.from, to: iter.to, source: widget.yamlContent });
		iter.next();
	}
	return out;
}

/** Counts every decoration in a set (widget, hidden-line class and replace). */
function count(set: DecorationSet): number {
	let n = 0;
	const iter = set.iter();
	while (iter.value) {
		n++;
		iter.next();
	}
	return n;
}

const DECORATORS: { lang: string; compute: (state: EditorState) => DecorationSet }[] = [
	{ lang: 'mermaid', compute: computeMermaidBlocks },
	{ lang: 'queryjs', compute: computeQueryjsBlocks },
	{ lang: 'collection', compute: computeCollectionBlocks },
];

for (const { lang, compute } of DECORATORS) {
	const run = (doc: string) => compute(createMarkdownState(`text\n${doc}`, { cursor: 0 }));
	const at = (doc: string, needle: string) => 'text\n'.length + doc.indexOf(needle);

	describe(`${lang} fence detection`, () => {
		it('renders a closed block with the lines between the fences as source', () => {
			const doc = `\`\`\`${lang}\nline one\nline two\n\`\`\``;
			const set = run(doc);
			expect(rendered(set)).toEqual([
				{ from: at(doc, '```'), to: at(doc, '\nline one'), source: 'line one\nline two' },
			]);
			// widget + (hidden class + replace) for two content lines and the closing fence
			expect(count(set)).toBe(7);
		});

		it('renders an empty block with an empty source', () => {
			const doc = `\`\`\`${lang}\n\`\`\``;
			expect(rendered(run(doc))).toEqual([{ from: at(doc, '```'), to: at(doc, '\n```'), source: '' }]);
		});

		it('accepts spaces around the language and a longer fence', () => {
			const doc = `\`\`\`\`  ${lang}  \nbody\n\`\`\`\``;
			expect(rendered(run(doc)).map((r) => r.source)).toEqual(['body']);
		});

		it('does not close on a shorter fence', () => {
			const doc = `\`\`\`\`${lang}\na\n\`\`\`\nb\n\`\`\`\``;
			expect(rendered(run(doc)).map((r) => r.source)).toEqual(['a\n```\nb']);
		});

		it('does not close on a fence that carries an info string', () => {
			const doc = `\`\`\`${lang}\na\n\`\`\`js\nb\n\`\`\``;
			expect(rendered(run(doc)).map((r) => r.source)).toEqual(['a\n```js\nb']);
		});

		it('renders nothing for an unclosed block', () => {
			expect(count(run(`\`\`\`${lang}\nbody`))).toBe(0);
		});

		it('renders nothing when the info string has extra words', () => {
			expect(count(run(`\`\`\`${lang} extra\nbody\n\`\`\``))).toBe(0);
		});

		it('renders nothing for an indented opening fence', () => {
			expect(count(run(`  \`\`\`${lang}\nbody\n  \`\`\``))).toBe(0);
		});

		it('renders nothing for a fence inside a blockquote', () => {
			expect(count(run(`> \`\`\`${lang}\n> body\n> \`\`\``))).toBe(0);
		});

		it('renders two blocks separated by text', () => {
			const doc = `\`\`\`${lang}\na\n\`\`\`\nmiddle\n\`\`\`${lang}\nb\n\`\`\``;
			expect(rendered(run(doc)).map((r) => r.source)).toEqual(['a', 'b']);
		});
	});
}

describe('fence character per decorator', () => {
	const tilde = (lang: string) => `text\n~~~${lang}\nbody\n~~~`;

	it('mermaid accepts a tilde fence', () => {
		const state = createMarkdownState(tilde('mermaid'), { cursor: 0 });
		expect(rendered(computeMermaidBlocks(state)).map((r) => r.source)).toEqual(['body']);
	});

	it('queryjs ignores a tilde fence', () => {
		expect(count(computeQueryjsBlocks(createMarkdownState(tilde('queryjs'), { cursor: 0 })))).toBe(0);
	});

	it('collection ignores a tilde fence', () => {
		expect(count(computeCollectionBlocks(createMarkdownState(tilde('collection'), { cursor: 0 })))).toBe(0);
	});

	it('a tilde mermaid block is not closed by a backtick fence', () => {
		const doc = 'text\n~~~mermaid\na\n```\nb\n~~~';
		const state = createMarkdownState(doc, { cursor: 0 });
		expect(rendered(computeMermaidBlocks(state)).map((r) => r.source)).toEqual(['a\n```\nb']);
	});
});
