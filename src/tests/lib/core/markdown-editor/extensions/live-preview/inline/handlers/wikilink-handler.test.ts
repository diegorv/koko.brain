import { describe, it, expect, beforeEach } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';

import {
	buildInlineDecorations,
	registerLineHandler,
	_clearInlineHandlers,
} from '$lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin';
import { wikilinkHandler } from '$lib/core/markdown-editor/extensions/live-preview/inline/handlers/wikilink-handler';
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

describe('wikilinkHandler', () => {
	beforeEach(() => {
		_clearInlineHandlers();
		registerLineHandler(wikilinkHandler);
	});

	it('emits cm-formatting-inline on [[ and ]] and cm-lp-wikilink on the target', () => {
		const decos = build('[[Target]]\nnext', 12);
		const marks = decos.filter((d) => d.class === 'cm-formatting-inline');
		const text = decos.find((d) => d.class === 'cm-lp-wikilink');
		expect(marks.length).toBe(2);
		expect(text).toBeDefined();
	});

	it('handles [[target|display]] by hiding target and styling the display', () => {
		const decos = build('[[Target|Display]]\nnext', 20);
		const text = decos.find((d) => d.class === 'cm-lp-wikilink');
		expect(text).toBeDefined();
		// The styled text should start AFTER the pipe
		expect(text!.from).toBeGreaterThan(2);
	});

	it('styles [[target#heading]] through the heading end', () => {
		const decos = build('[[Note#Section]]\nnext', 18);
		const text = decos.find((d) => d.class === 'cm-lp-wikilink');
		expect(text).toBeDefined();
	});

	it('styles [[target#^block-id]] through the block id end', () => {
		const decos = build('[[Note#^abc]]\nnext', 15);
		const text = decos.find((d) => d.class === 'cm-lp-wikilink');
		expect(text).toBeDefined();
	});

	it('skips when cursor is inside the wikilink', () => {
		expect(build('[[Target]]', 3)).toEqual([]);
	});

	it('does not fire inside fenced code blocks', () => {
		expect(build('```\n[[Target]]\n```')).toEqual([]);
	});
});
