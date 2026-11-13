// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

// No mocks for stores or logic files — real implementations per CLAUDE.md.

import { livePreviewExtensions } from '#lib/core/markdown-editor/extensions/live-preview/live-preview.js';
import {
	BLOCK_DECORATOR_NAMES,
	DECORATOR_LABELS,
	DECORATOR_NAMES,
	INLINE_PLUGIN_NAMES,
} from '#lib/core/markdown-editor/extensions/live-preview/core/decorator-names.js';
import { fencedBlockRenderers } from '#lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.js';
import { markdownLanguage } from '#lib/core/markdown-editor/highlight-styles.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { createMarkdownState, fakeBlockRenderer } from '../../test-helpers';

/**
 * The array-shape tests below install no fenced-block renderer, so queryjs and
 * collection blocks would render raw there; the last suite installs the
 * registry and checks those two kill-switches against the rendered DOM.
 *
 * Every name whose kill-switch removes whole extensions from the array. The
 * `INLINE_HANDLER_NAMES` group instead shrinks the handler registry inside one
 * plugin — covered by `inline/inline-extensions.test.ts` and
 * `inline/pipeline-dom.test.ts`.
 */
const EXTENSION_OWNING_NAMES = [...BLOCK_DECORATOR_NAMES, ...INLINE_PLUGIN_NAMES];

/** Extension arrays nest; count the leaves so a nested push still registers. */
function installedCount(exts: Extension[]): number {
	return (exts as unknown[]).flat(Infinity).length;
}

describe('live-preview decorator kill-switches', () => {
	afterEach(() => {
		for (const name of DECORATOR_NAMES) settingsStore.toggleDecorator(name, false);
	});

	it('gives every decorator name one non-empty, unique label, and no extra ones', () => {
		expect(Object.keys(DECORATOR_LABELS).sort()).toEqual([...DECORATOR_NAMES].sort());
		const labels = Object.values(DECORATOR_LABELS);
		expect(labels.every((label) => label.trim().length > 0)).toBe(true);
		expect(new Set(labels).size).toBe(DECORATOR_NAMES.length);
	});

	it('exposes 22 unique decorator names', () => {
		expect(DECORATOR_NAMES).toHaveLength(22);
		expect(new Set(DECORATOR_NAMES).size).toBe(22);
	});

	it.each(EXTENSION_OWNING_NAMES)('disabling %s uninstalls its extension', (name) => {
		const baseline = installedCount(livePreviewExtensions(settingsStore.disabledDecorators));

		settingsStore.toggleDecorator(name, true);

		expect(installedCount(livePreviewExtensions(settingsStore.disabledDecorators))).toBeLessThan(baseline);
	});

	it('leaves the array untouched for an unknown name', () => {
		const baseline = installedCount(livePreviewExtensions(settingsStore.disabledDecorators));

		settingsStore.toggleDecorator('notADecorator', true);

		expect(installedCount(livePreviewExtensions(settingsStore.disabledDecorators))).toBe(baseline);
		settingsStore.toggleDecorator('notADecorator', false);
	});
});

describe('fenced-block kill-switches with the renderer registry installed', () => {
	const DOC = 'text\n\n```queryjs\nrun()\n```\n\n```collection\nsource: notes\n```\n\nend';

	afterEach(() => {
		for (const name of DECORATOR_NAMES) settingsStore.toggleDecorator(name, false);
		document.body.replaceChildren();
	});

	/** Sources of the rendered fenced-block widgets in a view mounted with both renderers. */
	function renderedBlocks(): string[] {
		const state = createMarkdownState(DOC, {
			cursor: 0,
			extensions: [
				markdownLanguage(),
				fencedBlockRenderers.of(fakeBlockRenderer('queryjs')),
				fencedBlockRenderers.of(fakeBlockRenderer('collection')),
				livePreviewExtensions(settingsStore.disabledDecorators),
			],
		});
		const view = new EditorView({ state, parent: document.body.appendChild(document.createElement('div')) });
		const sources = [...view.dom.querySelectorAll('.cm-test-fenced-block')].map((el) => el.textContent);
		view.destroy();
		return sources;
	}

	it('renders both blocks with every switch on', () => {
		expect(renderedBlocks()).toEqual(['run()', 'source: notes']);
	});

	it('disabling queryjs leaves the queryjs block raw', () => {
		settingsStore.toggleDecorator('queryjs', true);
		expect(renderedBlocks()).toEqual(['source: notes']);
	});

	it('disabling collectionBlock leaves the collection block raw', () => {
		settingsStore.toggleDecorator('collectionBlock', true);
		expect(renderedBlocks()).toEqual(['run()']);
	});
});
