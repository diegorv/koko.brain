// @vitest-environment jsdom
// jsdom mirrors settings.service.test.ts: the persistence effect runs outside a
// mounted component tree, and the spike for issue 31 was proven under jsdom.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';
// vaultStore touches localStorage on open(); jsdom's own is not available here.
setupLocalStorage();

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(() => Promise.resolve()),
	mkdir: vi.fn(() => Promise.resolve()),
	exists: vi.fn(() => Promise.resolve(true)),
}));

import { writeTextFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import {
	startSettingsPersistence,
	stopSettingsPersistence,
	flushSettingsPersistence,
} from '$lib/core/settings/settings-persistence.svelte';

/** Lets the Svelte effect flush (microtask), then runs out the debounce window */
async function settle(ms = 500): Promise<void> {
	await vi.advanceTimersByTimeAsync(0);
	await vi.advanceTimersByTimeAsync(ms);
}

/** Parses the JSON handed to `writeTextFile` on the given call */
function writtenSettings(call = 0) {
	const [, content] = vi.mocked(writeTextFile).mock.calls[call];
	return JSON.parse(content as string);
}

describe('settings persistence', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(mkdir).mockResolvedValue(undefined);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		settingsStore.reset();
		vaultStore._reset();
		clearLocalStorage();
	});

	afterEach(async () => {
		// A session left running keeps writing into later tests in this file.
		await stopSettingsPersistence();
		vi.useRealTimers();
	});

	it('persists a mutation to the vault it was started with', async () => {
		startSettingsPersistence('/vault-a');

		settingsStore.updateLayout({ leftSidebarVisible: false });
		await settle();

		expect(writeTextFile).toHaveBeenCalledTimes(1);
		expect(vi.mocked(writeTextFile).mock.calls[0][0]).toBe('/vault-a/.kokobrain/settings.json');
		expect(writtenSettings().layout.leftSidebarVisible).toBe(false);
	});

	it('writes nothing before the debounce window elapses', async () => {
		startSettingsPersistence('/vault-a');

		settingsStore.updateLayout({ leftSidebarVisible: false });
		await vi.advanceTimersByTimeAsync(0);
		await vi.advanceTimersByTimeAsync(400);

		expect(writeTextFile).not.toHaveBeenCalled();
	});

	it('coalesces a burst of mutations into a single write', async () => {
		startSettingsPersistence('/vault-a');

		settingsStore.updateLayout({ leftSidebarVisible: false });
		settingsStore.updateLayout({ rightSidebarVisible: true });
		settingsStore.updateLayout({ leftPaneSize: 30 });
		settingsStore.updateLayout({ middlePanelSize: 40 });
		settingsStore.updateLayout({ sidebarMode: 'files' });
		await settle();

		expect(writeTextFile).toHaveBeenCalledTimes(1);
		const written = writtenSettings();
		expect(written.layout.leftSidebarVisible).toBe(false);
		expect(written.layout.sidebarMode).toBe('files');
	});

	it('keeps writing to the captured path after the vault store moves on', async () => {
		startSettingsPersistence('/vault-a');
		// Vault switch: the store points at B while A is still being torn down.
		vaultStore.open('/vault-b');

		settingsStore.updateLayout({ leftSidebarVisible: false });
		await settle();

		expect(writeTextFile).toHaveBeenCalledTimes(1);
		expect(vi.mocked(writeTextFile).mock.calls[0][0]).toBe('/vault-a/.kokobrain/settings.json');
	});

	it('writes nothing when a mutation leaves the serialized settings unchanged', async () => {
		startSettingsPersistence('/vault-a');

		settingsStore.updateLayout({ leftSidebarVisible: true });
		await settle();

		expect(writeTextFile).not.toHaveBeenCalled();
	});

	it('cancels the pending write when the settings are reverted inside the window', async () => {
		startSettingsPersistence('/vault-a');

		settingsStore.updateLayout({ leftSidebarVisible: false });
		await vi.advanceTimersByTimeAsync(0);
		settingsStore.updateLayout({ leftSidebarVisible: true });
		await settle();

		expect(writeTextFile).not.toHaveBeenCalled();
	});

	it('flush writes the pending change immediately', async () => {
		startSettingsPersistence('/vault-a');

		settingsStore.updateLayout({ leftSidebarVisible: false });
		await vi.advanceTimersByTimeAsync(0);
		await flushSettingsPersistence();

		expect(writeTextFile).toHaveBeenCalledTimes(1);
		expect(writtenSettings().layout.leftSidebarVisible).toBe(false);
	});

	it('flush is a no-op when nothing is pending', async () => {
		startSettingsPersistence('/vault-a');

		await flushSettingsPersistence();

		expect(writeTextFile).not.toHaveBeenCalled();
	});

	it('stop flushes the pending write, then ignores later mutations', async () => {
		startSettingsPersistence('/vault-a');

		settingsStore.updateLayout({ leftSidebarVisible: false });
		await vi.advanceTimersByTimeAsync(0);
		await stopSettingsPersistence();

		expect(writeTextFile).toHaveBeenCalledTimes(1);
		expect(writtenSettings().layout.leftSidebarVisible).toBe(false);

		settingsStore.updateLayout({ rightSidebarVisible: true });
		await settle();

		expect(writeTextFile).toHaveBeenCalledTimes(1);
	});

	it('disposes synchronously, so a reset right after an un-awaited stop is never written', async () => {
		startSettingsPersistence('/vault-a');

		// Land one write first, so `lastWritten` is no longer the start-up
		// baseline and a later serialization of DEFAULT_SETTINGS would differ
		// from it (otherwise the effect short-circuits and masks the bug).
		settingsStore.updateLayout({ leftSidebarVisible: false });
		await settle();
		expect(writeTextFile).toHaveBeenCalledTimes(1);

		// Hold the next write open past the whole debounce window: a stop that
		// disposed only after awaiting its flush would leave the effect live
		// long enough for the reset below to schedule and fire a write.
		let releaseWrite = (): void => {};
		vi.mocked(writeTextFile).mockImplementationOnce(
			() => new Promise<void>((resolve) => {
				releaseWrite = () => resolve();
			}),
		);
		settingsStore.updateLayout({ rightSidebarVisible: true });
		await vi.advanceTimersByTimeAsync(0);

		// Exactly what teardownVault does: fire-and-forget stop, then a few
		// lines later resetSettings() puts DEFAULT_SETTINGS in the store.
		void stopSettingsPersistence();
		settingsStore.reset();
		await settle();
		releaseWrite();
		await settle();

		// The defaults must never reach the vault being left.
		expect(writeTextFile).toHaveBeenCalledTimes(2);
		expect(writtenSettings(1).layout.rightSidebarVisible).toBe(true);
	});

	it('stop on an unstarted session writes nothing', async () => {
		await stopSettingsPersistence();

		expect(writeTextFile).not.toHaveBeenCalled();
	});

	it('logs and swallows a write failure instead of rejecting inside the effect', async () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.mocked(writeTextFile).mockRejectedValueOnce(new Error('disk full'));
		startSettingsPersistence('/vault-a');

		settingsStore.updateLayout({ leftSidebarVisible: false });
		await expect(settle()).resolves.toBeUndefined();

		expect(writeTextFile).toHaveBeenCalledTimes(1);
		consoleErrorSpy.mockRestore();
	});

	it('retries a failed write on the next mutation', async () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.mocked(writeTextFile).mockRejectedValueOnce(new Error('disk full'));
		startSettingsPersistence('/vault-a');

		settingsStore.updateLayout({ leftSidebarVisible: false });
		await settle();
		settingsStore.updateLayout({ rightSidebarVisible: true });
		await settle();

		expect(writeTextFile).toHaveBeenCalledTimes(2);
		expect(writtenSettings(1).layout.rightSidebarVisible).toBe(true);
		consoleErrorSpy.mockRestore();
	});

	it('restarting for another vault stops writing to the previous one', async () => {
		startSettingsPersistence('/vault-a');
		startSettingsPersistence('/vault-b');

		settingsStore.updateLayout({ leftSidebarVisible: false });
		await settle();

		expect(writeTextFile).toHaveBeenCalledTimes(1);
		expect(vi.mocked(writeTextFile).mock.calls[0][0]).toBe('/vault-b/.kokobrain/settings.json');
	});
});
