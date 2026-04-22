import { describe, it, expect, beforeEach } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';

import {
	buildInlineDecorations,
	registerLineHandler,
	_clearInlineHandlers,
} from '$lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin';
import { footnoteHandler } from '$lib/core/markdown-editor/extensions/live-preview/inline/handlers/footnote-handlers';
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

describe('footnoteHandler', () => {
	beforeEach(() => {
		_clearInlineHandlers();
		registerLineHandler(footnoteHandler);
	});

	it('emits cm-lp-footnote-ref on [^label] references', () => {
		const decos = build('See [^1] earlier\n\n[^1]: a note', 0);
		const ref = decos.find((d) => d.class === 'cm-lp-footnote-ref');
		expect(ref).toBeDefined();
	});

	it('emits cm-lp-footnote-def-marker on definition markers', () => {
		const decos = build('text\n\n[^1]: the definition', 0);
		const marker = decos.find((d) => d.class === 'cm-lp-footnote-def-marker');
		expect(marker).toBeDefined();
	});

	it('emits inline footnote ^[text] with formatting marks', () => {
		const decos = build('inline ^[side note] text\n', 0);
		const formatting = decos.filter((d) => d.class === 'cm-formatting-inline');
		const ref = decos.find((d) => d.class === 'cm-lp-footnote-ref');
		expect(formatting).toHaveLength(2);
		expect(ref).toBeDefined();
	});

	it('skips when cursor is on the footnote reference', () => {
		const doc = 'See [^1] earlier';
		const decos = build(doc, 5);
		expect(decos.filter((d) => d.class === 'cm-lp-footnote-ref')).toEqual([]);
	});
});
