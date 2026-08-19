// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import type { Extension } from '@codemirror/state';

// No mocks for stores or logic files — real implementations per CLAUDE.md.

import { livePreviewExtensions } from '$lib/core/markdown-editor/extensions/live-preview/live-preview';
import {
	BLOCK_DECORATOR_NAMES,
	DECORATOR_NAMES,
	INLINE_PLUGIN_NAMES,
} from '$lib/core/markdown-editor/extensions/live-preview/core/decorator-names';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';

/**
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

	it('exposes 22 unique decorator names', () => {
		expect(DECORATOR_NAMES).toHaveLength(22);
		expect(new Set(DECORATOR_NAMES).size).toBe(22);
	});

	it.each(EXTENSION_OWNING_NAMES)('disabling %s uninstalls its extension', (name) => {
		const baseline = installedCount(livePreviewExtensions());

		settingsStore.toggleDecorator(name, true);

		expect(installedCount(livePreviewExtensions())).toBeLessThan(baseline);
	});

	it('leaves the array untouched for an unknown name', () => {
		const baseline = installedCount(livePreviewExtensions());

		settingsStore.toggleDecorator('notADecorator', true);

		expect(installedCount(livePreviewExtensions())).toBe(baseline);
		settingsStore.toggleDecorator('notADecorator', false);
	});
});
