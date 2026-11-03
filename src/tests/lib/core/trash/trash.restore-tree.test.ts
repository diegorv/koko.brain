import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	mkdir: vi.fn(),
	remove: vi.fn(),
	rename: vi.fn(),
	exists: vi.fn(),
}));

vi.mock('#lib/utils/debug.js', () => ({
	debug: vi.fn(),
	error: vi.fn(),
	timeAsync: vi.fn((_tag: string, _label: string, fn: () => Promise<unknown>) => fn()),
	timeSync: vi.fn((_tag: string, _label: string, fn: () => unknown) => fn()),
}));

import { invoke } from '@tauri-apps/api/core';
import { exists, readTextFile, rename, remove, writeTextFile, mkdir } from '@tauri-apps/plugin-fs';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { trashStore } from '#lib/core/trash/trash.store.svelte.js';
import type { TrashItem } from '#lib/core/trash/trash.types.js';
import { restoreItem } from '#lib/core/trash/trash.service.js';
import { clearAllIndexed } from '#lib/utils/index-dedupe.js';
import { makeDirNode, makeFileNode } from '../../../fixtures/tauri-api.fixture';

const VAULT = '/vault';

/** A Trash entry for `originalPath`. */
function trashed(originalPath: string, isDirectory = false): TrashItem {
	return { id: '1000', originalPath, fileName: originalPath.split('/').pop()!, isDirectory, trashedAt: 1000 };
}

describe('restoreItem file tree update', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		clearAllIndexed();
		fsStore.reset();
		trashStore.clear();
		vaultStore._reset();
		vaultStore.open(VAULT);
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(rename).mockResolvedValue(undefined);
		vi.mocked(remove).mockResolvedValue(undefined);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
		vi.mocked(mkdir).mockResolvedValue(undefined);
		vi.mocked(readTextFile).mockResolvedValue('body');
		vi.mocked(invoke).mockResolvedValue(undefined);
		fsStore.setFileTree([
			makeDirNode('notes', [
				makeFileNode({ name: 'a.md', path: '/vault/notes/a.md' }),
				makeFileNode({ name: 'c.md', path: '/vault/notes/c.md' }),
			]),
		]);
	});

	it('inserts a restored note in sorted position with no scan_vault invoke', async () => {
		vi.mocked(exists).mockImplementation(async (p) => String(p) !== '/vault/notes/b.md');
		const item = trashed('notes/b.md');
		trashStore.setItems([item]);

		await restoreItem(VAULT, item);

		expect(invoke).not.toHaveBeenCalledWith('scan_vault', expect.anything());
		expect(fsStore.fileTree[0].children!.map((n) => n.path)).toEqual([
			'/vault/notes/a.md',
			'/vault/notes/b.md',
			'/vault/notes/c.md',
		]);
	});

	it('inserts a restored folder with the subtree of a scan of that folder alone', async () => {
		vi.mocked(exists).mockImplementation(async (p) => String(p) !== '/vault/notes/archive');
		const scanned = [makeFileNode({ name: 'old.md', path: '/vault/notes/archive/old.md' })];
		vi.mocked(invoke).mockImplementation(async (cmd, args) =>
			cmd === 'scan_vault' && (args as { path: string }).path === '/vault/notes/archive' ? scanned : undefined,
		);
		const item = trashed('notes/archive', true);
		trashStore.setItems([item]);

		await restoreItem(VAULT, item);

		const scans = vi.mocked(invoke).mock.calls.filter(([cmd]) => cmd === 'scan_vault');
		expect(scans).toEqual([['scan_vault', { path: '/vault/notes/archive', sortBy: 'name' }]]);
		const notes = fsStore.fileTree[0].children!;
		expect(notes.map((n) => n.path)).toEqual(['/vault/notes/archive', '/vault/notes/a.md', '/vault/notes/c.md']);
		expect(notes[0].children).toEqual(scanned);
		// The folder's notes are indexed from the inserted subtree.
		expect(invoke).toHaveBeenCalledWith('update_note_in_index', { path: '/vault/notes/archive/old.md', content: 'body' });
	});
});
