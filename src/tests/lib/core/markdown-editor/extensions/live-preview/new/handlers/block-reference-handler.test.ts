import { describe, it, expect, beforeEach } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';

import {
	buildInlineDecorations,
	registerLineHandler,
	_clearInlineHandlers,
} from '$lib/core/markdown-editor/extensions/live-preview/new/inline-formatting-plugin';
import { blockReferenceHandler } from '$lib/core/markdown-editor/extensions/live-preview/new/handlers/block-reference-handler';
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

describe('blockReferenceHandler', () => {
	beforeEach(() => {
		_clearInlineHandlers();
		registerLineHandler(blockReferenceHandler);
	});

	it('hides ^ref when cursor is on another line', () => {
		const decos = build('some text ^abc123\nother line', 20);
		const hidden = decos.find((d) => d.class === 'cm-lp-block-ref cm-lp-block-ref-hidden');
		expect(hidden).toBeDefined();
	});

	it('shows ^ref dimmed when cursor is on the same line', () => {
		const decos = build('some text ^abc123', 3);
		const shown = decos.find((d) => d.class === 'cm-lp-block-ref');
		expect(shown).toBeDefined();
	});

	it('produces no decoration for a plain line', () => {
		expect(build('plain line')).toEqual([]);
	});

	it('does not fire inside fenced code blocks', () => {
		const decos = build('```\nnot text ^xyz\n```');
		expect(decos).toEqual([]);
	});
});
