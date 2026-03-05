import { describe, it, expect } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import { buildLinkDecorations } from '$lib/core/markdown-editor/extensions/live-preview/plugins/link-plugin';
import { createMarkdownState } from '../../../test-helpers';

/** Collects decoration info from a DecorationSet */
function collectDecos(decoSet: ReturnType<typeof buildLinkDecorations>) {
	const result: { from: number; to: number; class?: string }[] = [];
	const iter = decoSet.iter();
	while (iter.value) {
		const spec = iter.value.spec as { class?: string };
		result.push({
			from: iter.from,
			to: iter.to,
			class: spec.class,
		});
		iter.next();
	}
	return result;
}

/** Creates state with cursor at given position and returns link decorations for full doc */
function buildLinks(doc: string, cursor?: number) {
	const baseState = createMarkdownState(doc);
	const safeCursor =
		cursor !== undefined ? Math.min(cursor, baseState.doc.length) : undefined;
	const state = baseState.update({
		selection: safeCursor !== undefined ? EditorSelection.single(safeCursor) : undefined,
	}).state;
	return collectDecos(buildLinkDecorations(state, [{ from: 0, to: state.doc.length }]));
}

describe('linkPlugin — buildLinkDecorations', () => {
	describe('markdown links [text](url)', () => {
		it('creates decorations for a basic link when cursor is outside', () => {
			const doc = 'hello [click](https://example.com) world';
			const decos = buildLinks(doc, 0);
			// 3 decorations: mark [, style text, mark ](url)
			expect(decos).toHaveLength(3);
			// Opening [ uses cm-formatting-inline
			expect(decos[0].class).toBe('cm-formatting-inline');
			expect(decos[0].from).toBe(6);
			expect(decos[0].to).toBe(7);
			// Link text styled
			expect(decos[1].class).toBe('cm-lp-link');
			expect(decos[1].from).toBe(7);
			expect(decos[1].to).toBe(12);
			// ](url) uses cm-formatting-inline
			expect(decos[2].class).toBe('cm-formatting-inline');
			expect(decos[2].from).toBe(12);
			expect(decos[2].to).toBe(34);
		});

		it('shows source when cursor is on the link', () => {
			const doc = '[click](https://example.com)';
			const decos = buildLinks(doc, 3); // cursor inside "click"
			expect(decos).toHaveLength(0);
		});

		it('shows source when cursor is on the URL part', () => {
			const doc = '[click](https://example.com)';
			const decos = buildLinks(doc, 15); // cursor inside URL
			expect(decos).toHaveLength(0);
		});

		it('handles multiple links on the same line', () => {
			const doc = '[a](url1) and [b](url2)\ntext';
			const decos = buildLinks(doc, 26); // cursor on "text"
			// 2 links × 3 decorations = 6
			expect(decos).toHaveLength(6);
		});
	});

	describe('wikilinks [[target]]', () => {
		it('creates decorations for a basic wikilink when cursor is outside', () => {
			const doc = 'hello [[note]] world';
			const decos = buildLinks(doc, 0);
			// 3 decorations: mark [[, style target, mark ]]
			expect(decos).toHaveLength(3);
			// Opening [[ uses cm-formatting-inline
			expect(decos[0].class).toBe('cm-formatting-inline');
			expect(decos[0].from).toBe(6);
			expect(decos[0].to).toBe(8);
			// Target styled
			expect(decos[1].class).toBe('cm-lp-wikilink');
			expect(decos[1].from).toBe(8);
			expect(decos[1].to).toBe(12);
			// Closing ]] uses cm-formatting-inline
			expect(decos[2].class).toBe('cm-formatting-inline');
			expect(decos[2].from).toBe(12);
			expect(decos[2].to).toBe(14);
		});

		it('shows source when cursor is on the wikilink', () => {
			const doc = '[[note]]';
			const decos = buildLinks(doc, 4); // cursor inside "note"
			expect(decos).toHaveLength(0);
		});

		it('handles wikilink with heading [[target#heading]]', () => {
			const doc = '[[note#section]]\ntext';
			const decos = buildLinks(doc, 19); // cursor on "text"
			expect(decos).toHaveLength(3);
			// Styled content includes target + heading
			const styled = decos.find((d) => d.class === 'cm-lp-wikilink');
			expect(styled).toBeDefined();
			expect(styled!.from).toBe(2); // "note#section"
			expect(styled!.to).toBe(14);
		});

		it('handles wikilink with display text [[target|display]]', () => {
			const doc = '[[note|Display Text]]\ntext';
			const decos = buildLinks(doc, 24); // cursor on "text"
			expect(decos).toHaveLength(3);
			const styled = decos.find((d) => d.class === 'cm-lp-wikilink');
			expect(styled).toBeDefined();
			expect(styled!.from).toBe(7); // after |
			expect(styled!.to).toBe(19);
		});

		it('handles wikilink with block-id [[target#^block-id]]', () => {
			const doc = '[[note#^abc123]]\ntext';
			const decos = buildLinks(doc, 19); // cursor on "text"
			expect(decos).toHaveLength(3);
			const styled = decos.find((d) => d.class === 'cm-lp-wikilink');
			expect(styled).toBeDefined();
		});

		it('ignores empty wikilinks [[]]', () => {
			const doc = '[[]] text';
			const decos = buildLinks(doc, 7);
			expect(decos).toHaveLength(0);
		});
	});

	describe('per-element cursor sensitivity', () => {
		it('only shows source for the link under cursor, not all links', () => {
			const doc = '[first](url1) and [second](url2)';
			const decos = buildLinks(doc, 2); // cursor on "first"
			// First link: no decorations (cursor on it)
			// Second link: 3 decorations
			expect(decos).toHaveLength(3);
			expect(decos[0].from).toBe(18);
		});

		it('only shows source for wikilink under cursor', () => {
			const doc = '[[first]] and [[second]]';
			const decos = buildLinks(doc, 4); // cursor on "first"
			expect(decos).toHaveLength(3);
			expect(decos[0].from).toBe(14);
		});
	});

	describe('block context skip', () => {
		it('produces no link decorations inside fenced code blocks', () => {
			const doc = '```\n[link](url)\n```';
			const decos = buildLinks(doc, 0);
			expect(decos).toHaveLength(0);
		});

		it('produces no wikilink decorations inside fenced code blocks', () => {
			const doc = '```\n[[note]]\n```';
			const decos = buildLinks(doc, 0);
			expect(decos).toHaveLength(0);
		});

		it('decorates links outside code blocks but not inside', () => {
			const doc = '[real](url)\n```\n[fake](url)\n```\ntext';
			const decos = buildLinks(doc, 33); // cursor on "text"
			const linkStyles = decos.filter((d) => d.class === 'cm-lp-link');
			expect(linkStyles).toHaveLength(1);
			expect(linkStyles[0].from).toBe(1);
		});
	});

	describe('mixed links', () => {
		it('decorates both markdown links and wikilinks on the same line', () => {
			const doc = '[md link](url) and [[wiki link]]\ntext';
			const decos = buildLinks(doc, 35); // cursor on "text"
			const mdStyles = decos.filter((d) => d.class === 'cm-lp-link');
			const wikiStyles = decos.filter((d) => d.class === 'cm-lp-wikilink');
			expect(mdStyles).toHaveLength(1);
			expect(wikiStyles).toHaveLength(1);
		});
	});

	describe('uses Decoration.mark() pattern (not Decoration.replace)', () => {
		it('all link formatting marks use cm-formatting-inline class', () => {
			const doc = 'hello [click](https://example.com) world';
			const decos = buildLinks(doc, 0);
			const formatMarks = decos.filter((d) => d.class === 'cm-formatting-inline');
			expect(formatMarks).toHaveLength(2);
		});

		it('wikilink brackets use cm-formatting-inline class', () => {
			const doc = 'hello [[note]] world';
			const decos = buildLinks(doc, 0);
			const formatMarks = decos.filter((d) => d.class === 'cm-formatting-inline');
			expect(formatMarks).toHaveLength(2);
		});
	});
});
