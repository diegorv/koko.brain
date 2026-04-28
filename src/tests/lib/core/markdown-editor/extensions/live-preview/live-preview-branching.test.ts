import { describe, it, expect, beforeEach } from 'vitest';

import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { livePreviewExtensions } from '$lib/core/markdown-editor/extensions/live-preview/live-preview';
import { newInlineExtensions } from '$lib/core/markdown-editor/extensions/live-preview/new/new-inline-extensions';
import { simpleWidgetPlugin } from '$lib/core/markdown-editor/extensions/live-preview/plugins/simple-widget-plugin';
import { inlineMarksPlugin } from '$lib/core/markdown-editor/extensions/live-preview/plugins/inline-marks-plugin';
import { markdownStylePlugin } from '$lib/core/markdown-editor/extensions/live-preview/plugins/markdown-style-plugin';
import { headingPlugin } from '$lib/core/markdown-editor/extensions/live-preview/plugins/heading-plugin';
import { blockquotePlugin } from '$lib/core/markdown-editor/extensions/live-preview/plugins/blockquote-plugin';
import { linkPlugin } from '$lib/core/markdown-editor/extensions/live-preview/plugins/link-plugin';
import { inlineCommentPlugin } from '$lib/core/markdown-editor/extensions/live-preview/plugins/inline-comment-plugin';
import { blockReferencePlugin } from '$lib/core/markdown-editor/extensions/live-preview/plugins/block-reference-plugin';
import { imagePlugin } from '$lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin';
import { footnotePlugin } from '$lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin';
import { wikilinkEmbedPlugin } from '$lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin';
import { metaBindInputPlugin } from '$lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin';

const RETIRED_INLINE_PLUGINS = [
	simpleWidgetPlugin,
	inlineMarksPlugin,
	markdownStylePlugin,
	headingPlugin,
	blockquotePlugin,
	linkPlugin,
	inlineCommentPlugin,
	blockReferencePlugin,
] as const;

const ALWAYS_ON_INLINE_PLUGINS = [
	imagePlugin,
	footnotePlugin,
	wikilinkEmbedPlugin,
	metaBindInputPlugin,
] as const;

describe('live-preview pipeline branching', () => {
	beforeEach(() => {
		settingsStore.reset();
	});

	describe('newInlineExtensions', () => {
		it('returns the HighlightStyle extension + inline formatting plugin (Phase 2 scaffold)', () => {
			const exts = newInlineExtensions();
			// Two top-level entries: HighlightStyle wrapper + ViewPlugin extension
			expect(exts.length).toBe(2);
		});
	});

	describe('livePreviewExtensions with flag OFF (default)', () => {
		it('includes all 8 retired inline plugins by reference identity', () => {
			expect(settingsStore.experimental.newLivePreview).toBe(false);
			const exts = livePreviewExtensions();
			for (const plugin of RETIRED_INLINE_PLUGINS) {
				expect(exts).toContain(plugin);
			}
		});

		it('preserves the exact pre-refactor ordering of inline plugins', () => {
			const exts = livePreviewExtensions();
			const expectedOrder = [
				simpleWidgetPlugin,
				inlineMarksPlugin,
				markdownStylePlugin,
				headingPlugin,
				blockquotePlugin,
				linkPlugin,
				imagePlugin,
				footnotePlugin,
				wikilinkEmbedPlugin,
				metaBindInputPlugin,
				inlineCommentPlugin,
				blockReferencePlugin,
			];
			const indices = expectedOrder.map((p) => exts.indexOf(p));
			// Every plugin must be present
			for (const idx of indices) expect(idx).toBeGreaterThan(-1);
			// Indices must be strictly increasing — i.e., relative order preserved
			for (let i = 1; i < indices.length; i++) {
				expect(indices[i]).toBeGreaterThan(indices[i - 1]);
			}
		});

		it('omits a retired plugin when its decorator is disabled', () => {
			settingsStore.toggleDecorator('markdownStyle', true);
			const exts = livePreviewExtensions();
			expect(exts).not.toContain(markdownStylePlugin);
			expect(exts).toContain(headingPlugin); // siblings unaffected
		});
	});

	describe('livePreviewExtensions with flag ON', () => {
		beforeEach(() => {
			settingsStore.updateExperimental({ newLivePreview: true });
		});

		it('excludes all 8 retired inline plugins', () => {
			const exts = livePreviewExtensions();
			for (const plugin of RETIRED_INLINE_PLUGINS) {
				expect(exts).not.toContain(plugin);
			}
		});

		it('still includes the always-on inline plugins (image, footnote, wikilinkEmbed, metaBindInput)', () => {
			const exts = livePreviewExtensions();
			for (const plugin of ALWAYS_ON_INLINE_PLUGINS) {
				expect(exts).toContain(plugin);
			}
		});
	});

	it('flag-on adds the new pipeline (HighlightStyle + inline plugin) after dropping the 8 retired plugins', () => {
		settingsStore.updateExperimental({ newLivePreview: false });
		const offCount = livePreviewExtensions().length;
		settingsStore.updateExperimental({ newLivePreview: true });
		const onCount = livePreviewExtensions().length;
		// Off path: 8 retired plugins. On path: 2 new entries (highlight + plugin).
		// Net = -8 + 2 = -6.
		expect(offCount - onCount).toBe(RETIRED_INLINE_PLUGINS.length - 2);
	});
});
