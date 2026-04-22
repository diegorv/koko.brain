import { describe, it, expect, beforeEach } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';

import {
	buildInlineDecorations,
	registerLineHandler,
	_clearInlineHandlers,
} from '$lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin';
import { wikilinkEmbedHandler } from '$lib/core/markdown-editor/extensions/live-preview/inline/handlers/wikilink-embed-handler';
import { createMarkdownState } from '../../../../test-helpers';

function collect(decoSet: DecorationSet) {
	const result: { from: number; to: number; spec: Record<string, unknown> }[] = [];
	const iter = decoSet.iter();
	while (iter.value) {
		result.push({ from: iter.from, to: iter.to, spec: iter.value.spec as Record<string, unknown> });
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

describe('wikilinkEmbedHandler', () => {
	beforeEach(() => {
		_clearInlineHandlers();
		registerLineHandler(wikilinkEmbedHandler);
	});

	it('replaces image embed ![[image.png]] with a widget', () => {
		const decos = build('before\n![[pic.png]]\nafter', 0);
		const widget = decos.find((d) => d.spec.widget);
		expect(widget).toBeDefined();
	});

	it('replaces note embed ![[Note]] with a widget', () => {
		const decos = build('before\n![[SomeNote]]\nafter', 0);
		const widget = decos.find((d) => d.spec.widget);
		expect(widget).toBeDefined();
	});

	it('skips when cursor is on the embed', () => {
		const doc = '![[pic.png]]';
		const decos = build(doc, 3);
		expect(decos).toEqual([]);
	});
});
