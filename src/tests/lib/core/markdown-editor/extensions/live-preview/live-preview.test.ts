import { describe, it, expect, beforeEach } from 'vitest';

import {
	livePreviewExtensions,
	legacyInlineExtensions,
	newInlineExtensions,
} from '$lib/core/markdown-editor/extensions/live-preview/live-preview';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';

describe('livePreviewExtensions — flag branching', () => {
	beforeEach(() => {
		settingsStore.reset();
	});

	it('defaults to legacy inline extensions when experimental.newLivePreview is off', () => {
		expect(settingsStore.experimental.newLivePreview).toBe(false);

		const legacy = legacyInlineExtensions();
		const combined = livePreviewExtensions();

		// Legacy path contributes non-empty extensions
		expect(legacy.length).toBeGreaterThan(0);
		// Combined output contains the legacy inline extensions plus shared head/tail
		expect(combined.length).toBeGreaterThan(legacy.length);
	});

	it('swaps to newInlineExtensions when flag is on', () => {
		settingsStore.updateExperimental({ newLivePreview: true });
		expect(settingsStore.experimental.newLivePreview).toBe(true);

		const newExts = newInlineExtensions();
		const legacy = legacyInlineExtensions();
		const combined = livePreviewExtensions();

		// New pipeline is empty during Phase 0 scaffolding
		expect(newExts).toEqual([]);
		// Combined output is legacy.length smaller when the flag is on
		expect(combined.length).toBe(
			legacyInlineExtensionsLengthWhenOn() + newExts.length,
		);

		// Sanity: legacy output still non-empty (not accidentally emptied by flag state)
		expect(legacy.length).toBeGreaterThan(0);
	});

	it('returns different-length arrays between flag states', () => {
		settingsStore.updateExperimental({ newLivePreview: false });
		const off = livePreviewExtensions().length;

		settingsStore.updateExperimental({ newLivePreview: true });
		const on = livePreviewExtensions().length;

		expect(off).toBeGreaterThan(on);
	});
});

/**
 * Computes the length of `livePreviewExtensions()` minus the legacy inline
 * plugins — i.e. the shared head/block/tail extensions that live on both
 * paths. Used to verify the flag branch shape independently of how many
 * extensions the shared segments contribute.
 */
function legacyInlineExtensionsLengthWhenOn(): number {
	// Temporarily flip to off, measure combined, subtract legacy inline count.
	const previous = settingsStore.experimental.newLivePreview;
	settingsStore.updateExperimental({ newLivePreview: false });
	const combined = livePreviewExtensions().length;
	const legacy = legacyInlineExtensions().length;
	settingsStore.updateExperimental({ newLivePreview: previous });
	return combined - legacy;
}
