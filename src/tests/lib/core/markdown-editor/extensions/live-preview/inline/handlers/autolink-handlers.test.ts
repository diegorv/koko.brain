import { describe, it, expect, beforeEach } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';

import {
	buildInlineDecorations,
	registerInlineHandler,
	registerLineHandler,
	_clearInlineHandlers,
} from '$lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin';
import {
	autolinkNodeHandlers,
	autolinkLineHandlers,
} from '$lib/core/markdown-editor/extensions/live-preview/inline/handlers/autolink-handlers';
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

describe('autolinkHandler (Lezer node)', () => {
	beforeEach(() => {
		_clearInlineHandlers();
		for (const h of autolinkNodeHandlers) registerInlineHandler(h);
	});

	it('emits brackets + text classes for <url>', () => {
		const decos = build('see <https://example.com> link\nnext', 32);
		const formatting = decos.filter((d) => d.class === 'cm-formatting-inline');
		const text = decos.find((d) => d.class === 'cm-lp-link');
		expect(formatting.length).toBe(2);
		expect(text).toBeDefined();
	});

	it('skips when cursor is on the autolink', () => {
		expect(build('see <https://example.com>', 10)).toEqual([]);
	});
});

describe('extendedAutolinkHandler (line handler)', () => {
	beforeEach(() => {
		_clearInlineHandlers();
		for (const h of autolinkLineHandlers) registerLineHandler(h);
	});

	it('styles a bare URL on its own line', () => {
		const decos = build('link: https://example.com here\nnext', 32);
		const text = decos.find((d) => d.class === 'cm-lp-link');
		expect(text).toBeDefined();
	});

	it('skips a URL that is already inside a markdown Link node', () => {
		// The URL inside [text](https://...) should not be double-decorated
		_clearInlineHandlers();
		for (const h of autolinkLineHandlers) registerLineHandler(h);
		const decos = build('[hi](https://example.com) text\nnext', 32);
		expect(decos).toEqual([]);
	});

	it('skips when cursor is on the URL', () => {
		expect(build('bare https://example.com end', 10)).toEqual([]);
	});

	it('does not fire inside fenced code blocks', () => {
		expect(build('```\nhttps://example.com\n```')).toEqual([]);
	});
});
