import { describe, it, expect, beforeEach } from 'vitest';
import { EditorSelection, type Range } from '@codemirror/state';
import type { Decoration } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import {
	linkHandler,
	linkReferenceHandler,
} from '#lib/core/markdown-editor/extensions/live-preview/inline/handlers/markdown-link-handlers.js';
import { buildInlineDecorations } from '#lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.js';
import { revealPredicate } from '#lib/core/markdown-editor/extensions/live-preview/core/reveal.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { createMarkdownState } from '../../../../test-helpers';

interface DecoSpec { from: number; to: number; class: string }

function build(doc: string, cursor?: number): DecoSpec[] {
	const state = createMarkdownState(doc).update({
		selection: cursor !== undefined ? EditorSelection.single(cursor) : undefined,
	}).state;
	const set = buildInlineDecorations(
		state,
		[{ from: 0, to: state.doc.length }],
		{ nodeHandlers: [linkHandler, linkReferenceHandler], lineHandlers: [] },
	);
	const result: DecoSpec[] = [];
	const iter = set.iter();
	while (iter.value) {
		// A point decoration spanning text is a `Decoration.replace`: the syntax is
		// removed from the DOM, reported here as the `replace` sentinel class.
		const cls = iter.value.point && iter.from < iter.to ? 'replace' : (iter.value.spec as { class: string }).class;
		result.push({ from: iter.from, to: iter.to, class: cls });
		iter.next();
	}
	return result;
}

describe('linkHandler — inline `[text](url)`', () => {
	beforeEach(() => settingsStore.reset());

	it('hides brackets/parens and styles label when cursor away', () => {
		const doc = '[label](https://example.com)\n\nplain';
		const decos = build(doc, doc.length);
		const linkText = decos.find((d) => d.class === 'cm-lp-link');
		const formatting = decos.filter((d) => d.class === 'replace');
		expect(linkText).toBeDefined();
		expect(formatting.length).toBeGreaterThanOrEqual(2);
	});

	it('shows source when cursor is inside the link', () => {
		const doc = '[label](https://example.com)\n\nplain';
		const decos = build(doc, 3); // cursor inside "label"
		const linkText = decos.find((d) => d.class === 'cm-lp-link');
		expect(linkText).toBeUndefined();
	});

	it('shows source when the cursor is elsewhere on the link line', () => {
		const doc = 'see [label](https://example.com) here\n\nplain';
		const decos = build(doc, 1); // cursor on "see"
		expect(decos).toEqual([]);
	});

	it('emits no decoration for a non-link line', () => {
		expect(build('plain text')).toEqual([]);
	});
});

describe('linkHandler — reference link `[text][ref]`', () => {
	beforeEach(() => settingsStore.reset());

	it('hides brackets and styles label when cursor away', () => {
		const doc = '[label][ref]\n\n[ref]: https://example.com';
		const decos = build(doc, doc.length);
		// Reference link emits cm-lp-link on label + replaces the brackets
		const linkText = decos.find((d) => d.class === 'cm-lp-link');
		expect(linkText).toBeDefined();
	});
});

describe('linkHandler — link spanning more than one line', () => {
	beforeEach(() => settingsStore.reset());

	// A replace across a line break is illegal from the inline ViewPlugin, so a
	// link whose hidden syntax crosses a line renders its source instead.
	it.each([
		['newline before the destination', '[a](\n/url)\n\nplain'],
		['newline inside the title', '[a](/url "t\nx")\n\nplain'],
		['newline inside the reference label', '[foo][bar\nbaz]\n\n[bar baz]: /url\n\nplain'],
	])('emits no replace containing a line break for a link with a %s', (_name, doc) => {
		const decos = build(doc, doc.length);
		const crossing = decos.filter((d) => d.class === 'replace' && doc.slice(d.from, d.to).includes('\n'));
		expect(crossing).toEqual([]);
		expect(decos.find((d) => d.class === 'cm-lp-link')).toBeUndefined();
	});

	// Only the hidden syntax must stay on one line; the styled label is a mark,
	// and a mark may cross a line break.
	it.each([
		['inline link', '[a\nb](/url)\n\nplain'],
		['reference link', '[a\nb][ref]\n\n[ref]: /url\n\nplain'],
	])('styles a %s whose label wraps but whose hidden parts are single-line', (_name, doc) => {
		const decos = build(doc, doc.length);
		const crossing = decos.filter((d) => d.class === 'replace' && doc.slice(d.from, d.to).includes('\n'));
		expect(crossing).toEqual([]);
		expect(decos.find((d) => d.class === 'cm-lp-link')).toEqual({ from: 1, to: 4, class: 'cm-lp-link' });
		expect(decos.filter((d) => d.class === 'replace')).toHaveLength(2);
	});
});

describe('linkHandler — empty label', () => {
	beforeEach(() => settingsStore.reset());

	// A mark over an empty label is illegal: `Decoration.mark().range(a, a)`
	// throws, which used to crash the whole inline plugin. The link shows source.
	// The handler is called directly: through `buildInlineDecorations` a throw
	// would be caught by the pipeline's handler isolation and hide the bug.
	it.each([
		['inline link', '[](https://example.com)\n\nplain'],
		['reference link', '[][ref]\n\n[ref]: https://example.com\n\nplain'],
	])('emits no zero-length range for an empty-label %s', (_name, doc) => {
		const state = createMarkdownState(doc).update({ selection: EditorSelection.single(doc.length) }).state;
		const decorations: Range<Decoration>[] = [];
		let links = 0;
		syntaxTree(state).iterate({
			enter: (node) => {
				if (node.name !== 'Link') return;
				links++;
				linkHandler.decorate({ node, state, isRevealed: revealPredicate(state), decorations, scratch: new Map() });
			},
		});
		expect(links).toBe(1);
		expect(decorations.filter((d) => d.from === d.to)).toEqual([]);
		expect(decorations).toEqual([]);
	});
});

describe('linkReferenceHandler — definition `[ref]: url`', () => {
	beforeEach(() => settingsStore.reset());

	it('dims the whole definition line via cm-lp-link-ref-def when cursor away', () => {
		const doc = '[ref]: https://example.com\n\nplain';
		const decos = build(doc, doc.length);
		const dim = decos.find((d) => d.class === 'cm-lp-link-ref-def');
		expect(dim).toBeDefined();
	});

	it('does not dim when cursor is on the definition line', () => {
		const doc = '[ref]: https://example.com\n\nplain';
		const decos = build(doc, 3);
		const dim = decos.find((d) => d.class === 'cm-lp-link-ref-def');
		expect(dim).toBeUndefined();
	});
});

describe('block context skip', () => {
	beforeEach(() => settingsStore.reset());

	it('does not decorate `[text](url)`-looking lines inside a fenced code block', () => {
		const decos = build('```\n[fake](https://x.com)\n```');
		expect(decos.find((d) => d.class === 'cm-lp-link')).toBeUndefined();
	});
});
