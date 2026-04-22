import { describe, it, expect, beforeEach } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';

import {
	buildInlineDecorations,
	registerInlineHandler,
	_clearInlineHandlers,
} from '$lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin';
import {
	imageHandler,
	parseImageAlt,
} from '$lib/core/markdown-editor/extensions/live-preview/inline/handlers/image-handler';
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

describe('parseImageAlt', () => {
	it('returns altText alone when no |size suffix', () => {
		expect(parseImageAlt('hello')).toEqual({ altText: 'hello' });
	});

	it('parses |width suffix', () => {
		expect(parseImageAlt('alt|100')).toEqual({ altText: 'alt', width: 100 });
	});

	it('parses |widthxheight suffix', () => {
		expect(parseImageAlt('alt|100x200')).toEqual({ altText: 'alt', width: 100, height: 200 });
	});

	it('falls back to altText when suffix is not numeric', () => {
		expect(parseImageAlt('alt|bogus')).toEqual({ altText: 'alt|bogus' });
	});
});

describe('imageHandler', () => {
	beforeEach(() => {
		_clearInlineHandlers();
		registerInlineHandler(imageHandler);
	});

	it('replaces ![alt](url) with an ImageWidget when cursor is away', () => {
		const decos = build('text\n![pic](http://example.com/x.png)\nmore', 0);
		const widget = decos.find((d) => d.spec.widget);
		expect(widget).toBeDefined();
	});

	it('leaves the raw markdown alone when cursor is on the image', () => {
		const doc = '![pic](http://example.com/x.png)';
		const decos = build(doc, 3);
		expect(decos).toEqual([]);
	});
});
