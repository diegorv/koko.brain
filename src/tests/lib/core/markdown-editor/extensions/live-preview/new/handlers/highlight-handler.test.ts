import { describe, it, expect, beforeEach } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';

import {
	buildInlineDecorations,
	registerInlineHandler,
	_clearInlineHandlers,
} from '$lib/core/markdown-editor/extensions/live-preview/new/inline-formatting-plugin';
import { highlightHandler } from '$lib/core/markdown-editor/extensions/live-preview/new/handlers/highlight-handler';
import { createMarkdownState } from '../../../../test-helpers';

function collect(decoSet: DecorationSet) {
	const result: { from: number; to: number; class: string }[] = [];
	const iter = decoSet.iter();
	while (iter.value) {
		result.push({
			from: iter.from,
			to: iter.to,
			class: (iter.value.spec as { class: string }).class,
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

describe('highlightHandler', () => {
	beforeEach(() => {
		_clearInlineHandlers();
		registerInlineHandler(highlightHandler);
	});

	it('emits cm-lp-highlight for a single ==text== occurrence', () => {
		const decos = build('==yellow==');
		expect(decos).toHaveLength(1);
		expect(decos[0].class).toBe('cm-lp-highlight');
		expect(decos[0].from).toBe(0);
		expect(decos[0].to).toBe(10);
	});

	it('covers multiple highlights on the same line', () => {
		const decos = build('==one== and ==two==');
		expect(decos).toHaveLength(2);
		expect(decos.every((d) => d.class === 'cm-lp-highlight')).toBe(true);
		expect(decos.map((d) => d.to - d.from)).toEqual([7, 7]);
	});

	it('emits nothing when no highlight appears', () => {
		expect(build('plain text')).toEqual([]);
	});

	it('does not fire inside fenced code blocks', () => {
		const decos = build('```\n==still fenced==\n```');
		expect(decos).toEqual([]);
	});

	it('is cursor-independent — same decorations with or without overlap', () => {
		const doc = '==hit== plain';
		const a = build(doc, 0);
		const b = build(doc, 10);
		expect(a).toEqual(b);
	});
});
