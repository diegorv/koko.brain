import { describe, it, expect, beforeEach } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';

import {
	buildInlineDecorations,
	registerLineHandler,
	_clearInlineHandlers,
} from '$lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin';
import { inlineCommentHandler } from '$lib/core/markdown-editor/extensions/live-preview/inline/handlers/inline-comment-handler';
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

describe('inlineCommentHandler', () => {
	beforeEach(() => {
		_clearInlineHandlers();
		registerLineHandler(inlineCommentHandler);
	});

	it('hides %%comment%% when cursor is elsewhere', () => {
		// Cursor at pos 0, comment later on the line
		const decos = build('text %%hidden%% after', 0);
		const hidden = decos.find(
			(d) => d.class === 'cm-lp-inline-comment cm-lp-inline-comment-hidden',
		);
		expect(hidden).toBeDefined();
	});

	it('shows dimmed when cursor is inside the comment', () => {
		const doc = 'text %%visible%% after';
		const decos = build(doc, 8); // cursor inside "visible"
		const shown = decos.find((d) => d.class === 'cm-lp-inline-comment');
		expect(shown).toBeDefined();
	});

	it('produces no decorations for a plain line', () => {
		expect(build('plain line with no comment')).toEqual([]);
	});

	it('covers multiple comments on the same line', () => {
		const decos = build('%%a%% middle %%b%%', 0);
		const all = decos.filter((d) => d.class?.startsWith('cm-lp-inline-comment'));
		expect(all).toHaveLength(2);
	});

	it('does not fire inside fenced code blocks', () => {
		const decos = build('```\n%%not hidden%%\n```');
		expect(decos).toEqual([]);
	});
});
