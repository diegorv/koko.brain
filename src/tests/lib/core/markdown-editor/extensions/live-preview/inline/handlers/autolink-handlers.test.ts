import { describe, it, expect, beforeEach } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import {
	autolinkHandler,
	extendedAutolinkHandler,
} from '$lib/core/markdown-editor/extensions/live-preview/inline/handlers/autolink-handlers';
import { buildInlineDecorations } from '$lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin';
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
		{ nodeHandlers: [autolinkHandler], lineHandlers: [extendedAutolinkHandler] },
	);
	const result: DecoSpec[] = [];
	const iter = set.iter();
	while (iter.value) {
		result.push({ from: iter.from, to: iter.to, class: (iter.value.spec as { class: string }).class });
		iter.next();
	}
	return result;
}

describe('autolinkHandler — `<url>` autolinks', () => {
	beforeEach(() => settingsStore.reset());

	it('hides angle brackets and styles URL when cursor away', () => {
		const doc = 'visit <https://example.com> here\n\nplain';
		const decos = build(doc, doc.length);
		const linkText = decos.find((d) => d.class === 'cm-lp-link');
		const formatting = decos.filter((d) => d.class === 'cm-formatting-inline');
		expect(linkText).toBeDefined();
		expect(formatting).toHaveLength(2);
	});

	it('shows source when cursor is inside the autolink', () => {
		const doc = 'visit <https://example.com> here';
		const decos = build(doc, 10);
		expect(decos.find((d) => d.class === 'cm-lp-link')).toBeUndefined();
	});
});

describe('extendedAutolinkHandler — bare https://… URLs', () => {
	beforeEach(() => settingsStore.reset());

	it('styles a bare URL when cursor away', () => {
		const doc = 'visit https://example.com here\n\nplain';
		const decos = build(doc, doc.length);
		const linkText = decos.find((d) => d.class === 'cm-lp-link');
		expect(linkText).toBeDefined();
	});

	it('does not double-decorate a URL inside [text](url)', () => {
		// The Link covers `[label](https://example.com)`. The bare URL inside
		// should NOT also be decorated by the extended autolink handler.
		const doc = '[label](https://example.com)';
		const decos = build(doc, doc.length);
		// Without linkHandler registered, only extendedAutolinkHandler runs.
		// It should still skip the URL because the Lezer Link node covers it.
		const linkTexts = decos.filter((d) => d.class === 'cm-lp-link');
		expect(linkTexts).toHaveLength(0);
	});

	it('does not double-decorate a URL inside <…>', () => {
		const doc = 'visit <https://example.com> here';
		const decos = build(doc, doc.length);
		// The Autolink covers the URL — extended handler should skip.
		// Only autolinkHandler emits cm-lp-link.
		const linkTexts = decos.filter((d) => d.class === 'cm-lp-link');
		// Single linkText from autolinkHandler (1), not two
		expect(linkTexts).toHaveLength(1);
	});

	it('emits no decoration for plain text', () => {
		expect(build('plain text without urls')).toEqual([]);
	});

	it('skips a bare URL inside a fenced code block', () => {
		expect(build('```\nhttps://fake.com\n```')).toEqual([]);
	});
});
