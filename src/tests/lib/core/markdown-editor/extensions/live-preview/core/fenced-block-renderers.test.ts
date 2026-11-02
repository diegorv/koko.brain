// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';

// No mocks for stores or logic files — real implementations per CLAUDE.md.

import { fencedBlockRenderers } from '#lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.js';
import { editorHost, NOOP_HOST } from '#lib/core/markdown-editor/editor-host.js';
import { queryjsBlockRenderer } from '#lib/plugins/queryjs/queryjs-block-widget.js';
import { collectionBlockRenderer } from '#lib/features/collection/collection-block-widget.js';
import { fakeBlockRenderer } from '../../../test-helpers';

describe('fencedBlockRenderers facet', () => {
	it('is empty when nothing is registered', () => {
		expect(EditorState.create({ doc: '' }).facet(fencedBlockRenderers).size).toBe(0);
	});

	it('maps each renderer by its language', () => {
		const queryjs = fakeBlockRenderer('queryjs');
		const collection = fakeBlockRenderer('collection');
		const state = EditorState.create({
			doc: '',
			extensions: [fencedBlockRenderers.of(queryjs), fencedBlockRenderers.of(collection)],
		});
		expect(state.facet(fencedBlockRenderers).get('queryjs')).toBe(queryjs);
		expect(state.facet(fencedBlockRenderers).get('collection')).toBe(collection);
	});

	it('keeps the first renderer when two claim one language', () => {
		const first = fakeBlockRenderer('queryjs');
		const second = fakeBlockRenderer('queryjs');
		const state = EditorState.create({
			doc: '',
			extensions: [fencedBlockRenderers.of(first), fencedBlockRenderers.of(second)],
		});
		expect(state.facet(fencedBlockRenderers).get('queryjs')).toBe(first);
	});
});

describe('renderer widgets compare content only', () => {
	for (const renderer of [queryjsBlockRenderer, collectionBlockRenderer]) {
		describe(renderer.language, () => {
			it('a widget equals one built by another renderer object for the same content', () => {
				const copy = { ...renderer, widget: (source: string) => renderer.widget(source) };
				expect(renderer.widget('same').eq(copy.widget('same'))).toBe(true);
			});

			it('a widget equals one built under another editor host', () => {
				const hostA = EditorState.create({ extensions: [editorHost.of(NOOP_HOST), fencedBlockRenderers.of(renderer)] });
				const hostB = EditorState.create({
					extensions: [editorHost.of({ ...NOOP_HOST }), fencedBlockRenderers.of(renderer)],
				});
				const a = hostA.facet(fencedBlockRenderers).get(renderer.language)!.widget('same');
				const b = hostB.facet(fencedBlockRenderers).get(renderer.language)!.widget('same');
				expect(a.eq(b)).toBe(true);
			});

			it('widgets with different content differ', () => {
				expect(renderer.widget('one').eq(renderer.widget('two'))).toBe(false);
			});
		});
	}
});
