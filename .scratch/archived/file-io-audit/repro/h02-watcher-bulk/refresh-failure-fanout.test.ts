import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Repro for external-change-3: when the tree refresh rejects (an unreadable
// subfolder makes scan_vault fail), handleChangedPaths never reaches
// notifyListeners, so the burst's paths never reach the tab reloader or the
// index rebuild. Correct behavior: listeners still hear about the burst.

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn(),
}));

vi.mock('#lib/core/filesystem/fs.service.js', () => ({
	refreshTree: vi.fn(),
}));

vi.mock('#lib/utils/debug.js', () => ({
	debug: vi.fn(),
	error: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { refreshTree } from '#lib/core/filesystem/fs.service.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { onFileChange, startWatching, stopWatching } from '#lib/core/filesystem/fs.watcher.js';

describe('watcher burst fan-out survives a failed tree refresh', () => {
	let emit: (paths: string[]) => void;

	beforeEach(async () => {
		vi.clearAllMocks();
		fsStore.setFileTree([]);
		let captured: ((event: { payload: { paths: string[] } }) => void) | null = null;
		vi.mocked(listen).mockImplementation(async (_evt, handler) => {
			captured = handler as never;
			return vi.fn() as unknown as UnlistenFn;
		});
		// A root-level note change rescans the vault root. The incremental
		// subtree scan fails (unreadable subfolder), so the fallback
		// refreshTree() is the call that rejects.
		vi.mocked(invoke).mockImplementation(async (cmd: string) => {
			if (cmd === 'scan_vault') throw new Error('Failed to read directory: permission denied');
			return undefined;
		});
		vi.mocked(refreshTree).mockRejectedValue(new Error('Failed to read directory: permission denied'));
		await startWatching('/vault');
		if (!captured) throw new Error('listen handler not captured');
		emit = (paths: string[]) => captured!({ payload: { paths } });
	});

	afterEach(async () => {
		await stopWatching();
	});

	it('notifies change listeners even when the refresh rejects', async () => {
		const listener = vi.fn();
		const unsubscribe = onFileChange(listener);

		emit(['/vault/root.md']);
		// handleChangedPaths is fire-and-forget; let its microtasks settle.
		await new Promise((r) => setTimeout(r, 20));

		// Expected to FAIL on main: refreshTree rejects inside handleChangedPaths,
		// so notifyListeners(changedPaths) never runs and the rejection is unhandled.
		expect(listener).toHaveBeenCalledWith(['/vault/root.md']);
		unsubscribe();
	});
});
