/**
 * Audit repro F158: when the tree refresh inside `handleChangedPaths` throws,
 * the burst's change listeners (tab reload + index rebuild in
 * app-lifecycle) never run. Correct behavior: a tree-refresh failure must not
 * stop the paths from reaching the listeners.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn(),
}));

// Side-effect service: the real refreshTree rethrows a scan_vault failure
// (fs.service.ts loadDirectoryTree `throw err`); the mock does the same.
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
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
import { onFileChange, startWatching, stopWatching } from '#lib/core/filesystem/fs.watcher.js';

function makeDir(name: string, path: string): FileTreeNode {
	return { name, path, isDirectory: true, children: [] };
}

async function setupWatcher(): Promise<(paths: string[]) => void> {
	let captured: ((event: { payload: { paths: string[] } }) => void) | null = null;
	vi.mocked(listen).mockImplementation(async (_evt, handler) => {
		captured = handler as never;
		return vi.fn() as unknown as UnlistenFn;
	});
	vi.mocked(invoke).mockResolvedValue(undefined);
	await startWatching('/vault');
	if (!captured) throw new Error('listen handler not captured');
	return (paths) => captured!({ payload: { paths } });
}

describe('F158: a failed tree refresh drops the watcher burst', () => {
	const unhandled: unknown[] = [];
	const onUnhandled = (reason: unknown) => { unhandled.push(reason); };

	beforeEach(() => {
		vi.clearAllMocks();
		fsStore.reset();
		unhandled.length = 0;
		process.on('unhandledRejection', onUnhandled);
	});

	afterEach(async () => {
		process.off('unhandledRejection', onUnhandled);
		await stopWatching();
	});

	it('full-refresh path: listeners still receive the changed note when scan_vault fails', async () => {
		const listener = vi.fn();
		const unsubscribe = onFileChange(listener);
		const emit = await setupWatcher();
		fsStore.setFileTree(['a', 'b', 'c', 'd', 'e', 'f'].map((n) => makeDir(n, `/vault/${n}`)));
		vi.mocked(refreshTree).mockRejectedValue('Failed to read directory: Permission denied (os error 13)');

		// Six parent dirs -> full refresh path. /vault/a/open-note.md is an open, clean tab.
		emit(['/vault/a/open-note.md', '/vault/b/2.md', '/vault/c/3.md', '/vault/d/4.md', '/vault/e/5.md', '/vault/f/6.md']);
		await new Promise((r) => setTimeout(r, 0));

		expect(refreshTree).toHaveBeenCalled();
		unsubscribe();
		expect(listener).toHaveBeenCalledWith(expect.arrayContaining(['/vault/a/open-note.md']));
	});

	it('incremental path: listeners still receive the changed note when scan and fallback both fail', async () => {
		const listener = vi.fn();
		const unsubscribe = onFileChange(listener);
		const emit = await setupWatcher();
		fsStore.setFileTree([makeDir('docs', '/vault/docs')]);
		vi.mocked(invoke).mockRejectedValueOnce('Failed to read directory: Permission denied (os error 13)');
		vi.mocked(refreshTree).mockRejectedValue('Failed to read directory: Permission denied (os error 13)');

		emit(['/vault/docs/open-note.md']);
		await new Promise((r) => setTimeout(r, 0));

		expect(invoke).toHaveBeenCalledWith('scan_vault', { path: '/vault/docs', sortBy: 'name' });
		expect(refreshTree).toHaveBeenCalled();
		unsubscribe();
		expect(listener).toHaveBeenCalledWith(['/vault/docs/open-note.md']);
	});
});
