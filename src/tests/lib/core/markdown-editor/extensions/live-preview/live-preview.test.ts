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

		// New pipeline ships at least the syntaxHighlighting + unified plugin.
		expect(newExts.length).toBeGreaterThan(0);
		// Combined output is the shared head/tail plus exactly newExts, not legacy.
		expect(combined.length).toBe(sharedExtensionsLength() + newExts.length);

		// Sanity: legacy output still non-empty (not accidentally emptied by flag state)
		expect(legacy.length).toBeGreaterThan(0);
	});

	it('returns a smaller array with the flag on than with it off (for now)', () => {
		// Phase 2 scaffolds only 2 new extensions while legacy ships 11+; the new
		// path will grow in Phases 3–10. The check is ">=" so this spec doesn't
		// become brittle as handlers migrate over.
		settingsStore.updateExperimental({ newLivePreview: false });
		const off = livePreviewExtensions().length;

		settingsStore.updateExperimental({ newLivePreview: true });
		const on = livePreviewExtensions().length;

		expect(off).toBeGreaterThanOrEqual(on);
	});
});

/**
 * Length of the shared head/block/tail extensions on both branches —
 * everything in livePreviewExtensions() that is NOT the inline pipeline.
 * Used to verify flag branch shape independently of how many extensions the
 * shared segments contribute.
 */
function sharedExtensionsLength(): number {
	const previous = settingsStore.experimental.newLivePreview;
	settingsStore.updateExperimental({ newLivePreview: false });
	const combined = livePreviewExtensions().length;
	const legacy = legacyInlineExtensions().length;
	settingsStore.updateExperimental({ newLivePreview: previous });
	return combined - legacy;
}
