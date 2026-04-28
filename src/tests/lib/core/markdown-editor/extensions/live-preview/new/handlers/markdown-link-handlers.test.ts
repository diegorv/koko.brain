import { describe, it, expect, beforeEach } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import {
	linkHandler,
	linkReferenceHandler,
} from '$lib/core/markdown-editor/extensions/live-preview/new/handlers/markdown-link-handlers';
import { buildInlineDecorations } from '$lib/core/markdown-editor/extensions/live-preview/new/inline-formatting-plugin';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
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
		result.push({ from: iter.from, to: iter.to, class: (iter.value.spec as { class: string }).class });
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
		const formatting = decos.filter((d) => d.class === 'cm-formatting-inline');
		expect(linkText).toBeDefined();
		expect(formatting.length).toBeGreaterThanOrEqual(2);
	});

	it('shows source when cursor is inside the link', () => {
		const doc = '[label](https://example.com)\n\nplain';
		const decos = build(doc, 3); // cursor inside "label"
		const linkText = decos.find((d) => d.class === 'cm-lp-link');
		expect(linkText).toBeUndefined();
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
		// Reference link emits cm-lp-link on label + cm-formatting-inline on brackets
		const linkText = decos.find((d) => d.class === 'cm-lp-link');
		expect(linkText).toBeDefined();
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
