import { describe, it, expect, beforeEach } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';

import {
	buildInlineDecorations,
	registerInlineHandler,
	_clearInlineHandlers,
} from '$lib/core/markdown-editor/extensions/live-preview/new/inline-formatting-plugin';
import { blockquoteHandler } from '$lib/core/markdown-editor/extensions/live-preview/new/handlers/blockquote-handler';
import { createMarkdownState } from '../../../../test-helpers';

interface Spec {
	class?: string;
}

function collect(decoSet: DecorationSet) {
	const result: { from: number; to: number; class: string | undefined }[] = [];
	const iter = decoSet.iter();
	while (iter.value) {
		result.push({ from: iter.from, to: iter.to, class: (iter.value.spec as Spec).class });
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

describe('blockquoteHandler', () => {
	beforeEach(() => {
		_clearInlineHandlers();
		registerInlineHandler(blockquoteHandler);
	});

	it('emits cm-lp-blockquote line deco for a single > line', () => {
		const decos = build('> quoted');
		const line = decos.find((d) => d.class === 'cm-lp-blockquote');
		expect(line).toBeDefined();
		expect(line!.from).toBe(0);
		expect(line!.to).toBe(0);
	});

	it('upgrades to cm-lp-blockquote-2 at depth 2', () => {
		const decos = build('> > deep');
		expect(decos.find((d) => d.class === 'cm-lp-blockquote-2')).toBeDefined();
	});

	it('upgrades to cm-lp-blockquote-3 at depth 3', () => {
		const decos = build('> > > deeper');
		expect(decos.find((d) => d.class === 'cm-lp-blockquote-3')).toBeDefined();
	});

	it('collapses depths > 3 to the depth-3 styling', () => {
		const decos = build('> > > > deepest');
		expect(decos.find((d) => d.class === 'cm-lp-blockquote-3')).toBeDefined();
	});

	it('hides > marks via cm-formatting-block when cursor is on another line', () => {
		// Two lines: first is blockquote, cursor on second (plain) line
		const doc = '> quoted\nplain';
		const decos = build(doc, doc.length - 1);
		const hidden = decos.find((d) => d.class === 'cm-formatting-block');
		expect(hidden).toBeDefined();
	});

	it('reveals > marks with -visible when cursor is on the blockquote line', () => {
		const decos = build('> quoted\nplain', 2);
		const revealed = decos.find(
			(d) => d.class === 'cm-formatting-block cm-formatting-block-visible',
		);
		expect(revealed).toBeDefined();
	});

	it('processes each blockquote line exactly once (no duplicate line decos)', () => {
		const decos = build('> a\n> b\n> c');
		const lineDecos = decos.filter((d) => d.class === 'cm-lp-blockquote');
		expect(lineDecos).toHaveLength(3);
	});

	it('skips callout lines (> [!note])', () => {
		const decos = build('> [!note] title\n> body');
		// The first line should not receive blockquote decos — calloutField owns it
		const firstLine = decos.filter((d) => d.class?.startsWith('cm-lp-blockquote') && d.from === 0);
		expect(firstLine).toEqual([]);
	});

	it('does not fire inside fenced code blocks', () => {
		const decos = build('```\n> not a quote\n```');
		expect(decos).toEqual([]);
	});
});
