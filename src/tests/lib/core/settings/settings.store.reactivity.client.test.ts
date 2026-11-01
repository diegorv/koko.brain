// @vitest-environment jsdom
// jsdom: vitest then resolves the Svelte client runtime, where effects really re-run.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flushSync } from 'svelte';

import { DEFAULT_SETTINGS } from '#lib/core/settings/settings.store.svelte.js';

import { countEffectRuns, settingsStore } from '../../../fixtures/settings-effect-probe.svelte.js';

/**
 * A layout write (a rail click, a sidebar toggle) must only wake readers of the
 * layout keys it changed. Replacing the settings root re-ran every settings
 * reader in the app, which cost a 300-500 ms main-thread stall per rail click.
 */
describe('settingsStore.updateLayout reactivity (client runtime)', () => {
	let probe: ReturnType<typeof countEffectRuns> | null = null;

	beforeEach(() => {
		settingsStore.reset();
	});

	afterEach(() => {
		probe?.dispose();
		probe = null;
	});

	it('does not re-run an effect that reads an unrelated setting', () => {
		probe = countEffectRuns(() => settingsStore.debugLogToFile);
		flushSync();
		const before = probe.runs();

		settingsStore.updateLayout({ railItem: 'files' });
		flushSync();

		expect(probe.runs()).toBe(before);
	});

	it('re-runs an effect that reads the layout key it changed', () => {
		probe = countEffectRuns(() => settingsStore.layout.railItem);
		flushSync();
		const before = probe.runs();

		settingsStore.updateLayout({ railItem: 'files' === settingsStore.layout.railItem ? 'today' : 'files' });
		flushSync();

		expect(probe.runs()).toBe(before + 1);
	});

	it('does not re-run a reader of another layout key', () => {
		probe = countEffectRuns(() => settingsStore.layout.noteListSize);
		flushSync();
		const before = probe.runs();

		settingsStore.updateLayout({ rightSidebarVisible: !settingsStore.layout.rightSidebarVisible });
		flushSync();

		expect(probe.runs()).toBe(before);
	});

	it('does not leak a layout write into DEFAULT_SETTINGS after reset', () => {
		const defaultItem = DEFAULT_SETTINGS.layout.railItem;
		settingsStore.reset();
		settingsStore.updateLayout({ railItem: `${defaultItem}-changed` });

		expect(DEFAULT_SETTINGS.layout.railItem).toBe(defaultItem);
		settingsStore.reset();
		expect(settingsStore.layout.railItem).toBe(defaultItem);
	});
});
