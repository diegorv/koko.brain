import { describe, it, expect, beforeEach } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';

import {
	buildInlineDecorations,
	registerInlineHandler,
	_clearInlineHandlers,
} from '$lib/core/markdown-editor/extensions/live-preview/new/inline-formatting-plugin';
import { markdownLinkHandlers } from '$lib/core/markdown-editor/extensions/live-preview/new/handlers/markdown-link-handlers';
import { createMarkdownState } from '../../../../test-helpers';

function collect(decoSet: DecorationSet) {
	const result: { from: number; to: number; class: string | undefined }[] = [];
	const iter = decoSet.iter();
	while (iter.value) {
		result.push({
			from: iter.from,
			to: iter.to,
			class: (iter.value.spec as { class?: string }).class,
		});
		iter.next();
	}
	return result;
}

function build(doc: string, cursor?: number) {
	const state = createMarkdownState(doc).update({
		selection: cursor !== undefined ? EditorSelection.single(cursor) : undefined,
	}).state;
	return collect(buildInlineDecorations(state, [{ from: 0, to: state.doc.length }]));
}

describe('markdownLinkHandlers', () => {
	beforeEach(() => {
		_clearInlineHandlers();
		for (const h of markdownLinkHandlers) registerInlineHandler(h);
	});

	describe('inline link', () => {
		it('emits cm-lp-link on text + cm-formatting-inline on brackets/url', () => {
			// Cursor on the second line so the link is non-touched
			const decos = build('[hello](https://example.com)\nplain', 32);
			const formatted = decos.filter((d) => d.class === 'cm-formatting-inline');
			const text = decos.find((d) => d.class === 'cm-lp-link');
			expect(formatted.length).toBeGreaterThanOrEqual(2);
			expect(text).toBeDefined();
		});

		it('leaves the link alone when cursor is inside', () => {
			const decos = build('[hello](https://example.com)', 3);
			expect(decos).toEqual([]);
		});
	});

	describe('reference link', () => {
		it('emits cm-lp-link + cm-formatting-inline for [text][ref] form', () => {
			const doc = '[hello][ref]\n\n[ref]: https://example.com';
			const decos = build(doc, doc.length - 1);
			const text = decos.find((d) => d.class === 'cm-lp-link');
			expect(text).toBeDefined();
		});
	});

	describe('link reference definition', () => {
		it('dims the whole [ref]: url line with cm-lp-link-ref-def', () => {
			const doc = '[ref]: https://example.com\nplain';
			// Cursor on the plain line
			const decos = build(doc, doc.length - 1);
			const dim = decos.find((d) => d.class === 'cm-lp-link-ref-def');
			expect(dim).toBeDefined();
			expect(dim!.from).toBe(0);
		});

		it('leaves the ref definition alone when cursor is on it', () => {
			const decos = build('[ref]: https://example.com', 5);
			expect(decos).toEqual([]);
		});
	});

	describe('block context skip', () => {
		it('does not fire inside fenced code blocks', () => {
			expect(build('```\n[x](y)\n```')).toEqual([]);
		});
	});
});
