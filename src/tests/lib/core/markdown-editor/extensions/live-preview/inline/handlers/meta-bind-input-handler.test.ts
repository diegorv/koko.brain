import { describe, it, expect, beforeEach } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';

import {
	buildInlineDecorations,
	registerLineHandler,
	_clearInlineHandlers,
} from '$lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin';
import { metaBindInputHandler } from '$lib/core/markdown-editor/extensions/live-preview/inline/handlers/meta-bind-input-handler';
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

describe('metaBindInputHandler', () => {
	beforeEach(() => {
		_clearInlineHandlers();
		registerLineHandler(metaBindInputHandler);
	});

	it('replaces `INPUT[inlineSelect(a,b,c):prop]` with a widget', () => {
		const doc = '---\nprop: a\n---\n\nline `INPUT[inlineSelect(a,b,c):prop]` more';
		const decos = build(doc, 0);
		const widget = decos.find((d) => d.spec.widget);
		expect(widget).toBeDefined();
	});

	it('replaces `INPUT[number():count]` with the number widget', () => {
		const doc = '---\ncount: 3\n---\n\nline `INPUT[number():count]` more';
		const decos = build(doc, 0);
		const widget = decos.find((d) => d.spec.widget);
		expect(widget).toBeDefined();
	});

	it('skips when cursor is on the input field', () => {
		const doc = 'line `INPUT[number():count]` more';
		const decos = build(doc, 10);
		expect(decos).toEqual([]);
	});
});
