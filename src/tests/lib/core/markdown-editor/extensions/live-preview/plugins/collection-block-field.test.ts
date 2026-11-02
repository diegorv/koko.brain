import { describe, it, expect } from 'vitest';
import type { EditorState } from '@codemirror/state';
import { computeCollectionBlocks } from '#lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.js';
import {
	fencedBlockRenderers,
	type FencedBlockRenderer,
} from '#lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.js';
import { FakeBlockWidget, createMarkdownState, fakeBlockRenderer, testMarkdown, withFullParse } from '../../../test-helpers';

function createState(
	doc: string,
	cursor?: number,
	renderers: FencedBlockRenderer[] = [fakeBlockRenderer('collection')],
): EditorState {
	return createMarkdownState(doc, {
		cursor,
		extensions: [testMarkdown(), ...renderers.map((r) => fencedBlockRenderers.of(r))],
	});
}

/** The sources of the widgets in a decoration set, in document order. */
function widgetSources(state: EditorState): string[] {
	const out: string[] = [];
	const iter = computeCollectionBlocks(state).iter();
	while (iter.value) {
		const widget = (iter.value.spec as { widget?: unknown }).widget;
		if (widget instanceof FakeBlockWidget) out.push(widget.source);
		iter.next();
	}
	return out;
}

function collectDecos(state: EditorState): { from: number; to: number }[] {
	const val = computeCollectionBlocks(state);
	const result: { from: number; to: number }[] = [];
	const iter = val.iter();
	while (iter.value) {
		result.push({ from: iter.from, to: iter.to });
		iter.next();
	}
	return result;
}

const COLLECTION_BLOCK = 'text\n```collection\nsource: notes\n```';

describe('collectionBlockField renderer lookup', () => {
	const DOC = 'text\n```collection\na: 1\n```\nmiddle\n```collection\nb: 2\n```';

	it('produces no decoration when no renderer is registered', () => {
		expect(collectDecos(createState(DOC, 0, []))).toHaveLength(0);
	});

	it('ignores a renderer registered for another language', () => {
		expect(collectDecos(createState(DOC, 0, [fakeBlockRenderer('queryjs')]))).toHaveLength(0);
	});

	it('builds one widget per fenced block with the registered renderer', () => {
		expect(widgetSources(createState(DOC, 0))).toEqual(['a: 1', 'b: 2']);
	});
});

describe('collectionBlockField', () => {
	it('decorates a collection block when cursor is outside', () => {
		const state = createState(COLLECTION_BLOCK, 0); // cursor on "text"
		const decos = collectDecos(state);
		// Widget on opening fence + (hiddenLineDeco + replace) per remaining line
		// "```collection" -> widget, "source: notes" -> hidden+replace, "```" -> hidden+replace
		expect(decos).toHaveLength(5);
		// First decoration is the widget on the opening fence line
		const blockStart = COLLECTION_BLOCK.indexOf('```collection');
		const blockStartEnd = blockStart + '```collection'.length;
		expect(decos[0].from).toBe(blockStart);
		expect(decos[0].to).toBe(blockStartEnd);
	});

	it('does not decorate when cursor is inside the block', () => {
		const doc = '```collection\nsource: notes\n```';
		const state = createState(doc, 10); // cursor inside YAML content
		expect(collectDecos(state)).toHaveLength(0);
	});

	it('produces no decorations without collection blocks', () => {
		const state = createState('plain text\nno collection', 0);
		expect(collectDecos(state)).toHaveLength(0);
	});

	it('does not match regular code blocks', () => {
		const doc = 'text\n```javascript\nconst x = 1;\n```';
		const state = createState(doc, 0);
		expect(collectDecos(state)).toHaveLength(0);
	});

	it('handles multiple collection blocks', () => {
		const doc = 'text\n```collection\na: 1\n```\nmiddle\n```collection\nb: 2\n```';
		const state = createState(doc, 0);
		const decos = collectDecos(state);
		// Each block: 1 widget + 2 hiddenLineDeco + 2 replace = 5 decos × 2 blocks = 10
		expect(decos).toHaveLength(10);
	});

	it('updates when document changes', () => {
		const state = createState('plain text', 0);
		expect(collectDecos(state)).toHaveLength(0);

		const next = withFullParse(() =>
			state.update({
				changes: {
					from: 0,
					to: state.doc.length,
					insert: 'text\n```collection\nsource: notes\n```',
				},
			}).state,
		);
		expect(collectDecos(next).length).toBeGreaterThan(0);
	});
});
