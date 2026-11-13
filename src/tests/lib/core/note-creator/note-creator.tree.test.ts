import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('#lib/utils/debug.js', () => ({
	debug: vi.fn(),
	error: vi.fn(),
	timeAsync: vi.fn((_tag: string, _label: string, fn: () => Promise<unknown>) => fn()),
	timeSync: vi.fn((_tag: string, _label: string, fn: () => unknown) => fn()),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
	exists: vi.fn(),
	readTextFile: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('#lib/core/editor/editor.service.js', () => ({
	openFileInEditor: vi.fn(),
}));

vi.mock('#lib/core/editor/editor.hooks.js', () => ({
	markRecentSave: vi.fn(),
	notifyNoteCreated: vi.fn(),
}));

import { exists } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { clearAllIndexed } from '#lib/utils/index-dedupe.js';
import { openOrCreateNote } from '#lib/core/note-creator/note-creator.service.js';
import { makeDirNode, makeFileNode } from '../../../fixtures/tauri-api.fixture';

/** The file tree's paths, depth first. */
function treePaths(): string[] {
	const out: string[] = [];
	const walk = (nodes: typeof fsStore.fileTree) => {
		for (const n of nodes) {
			out.push(n.path);
			if (n.children) walk(n.children);
		}
	};
	walk(fsStore.fileTree);
	return out;
}

describe('openOrCreateNote file tree update', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		clearAllIndexed();
		clearLocalStorage();
		fsStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(invoke).mockResolvedValue(undefined);
	});

	it('inserts the created note in sorted position with no scan_vault invoke', async () => {
		fsStore.setFileTree([
			makeDirNode('Weekly', [
				makeFileNode({ name: '2026-W9.md', path: '/vault/Weekly/2026-W9.md' }),
				makeFileNode({ name: '2026-W45.md', path: '/vault/Weekly/2026-W45.md' }),
			]),
			makeFileNode({ name: 'inbox.md', path: '/vault/inbox.md' }),
		]);

		await openOrCreateNote({ filePath: '/vault/Weekly/2026-W10.md', title: '2026-W10' });

		expect(invoke).not.toHaveBeenCalledWith('scan_vault', expect.anything());
		expect(treePaths()).toEqual([
			'/vault/Weekly',
			'/vault/Weekly/2026-W9.md',
			'/vault/Weekly/2026-W10.md',
			'/vault/Weekly/2026-W45.md',
			'/vault/inbox.md',
		]);
		expect(openFileInEditor).toHaveBeenCalledWith('/vault/Weekly/2026-W10.md');
	});

	it('creates the missing parent folders in the tree', async () => {
		fsStore.setFileTree([makeFileNode({ name: 'inbox.md', path: '/vault/inbox.md' })]);

		await openOrCreateNote({ filePath: '/vault/Daily/2026/11-02.md', title: '11-02' });

		expect(treePaths()).toEqual([
			'/vault/Daily',
			'/vault/Daily/2026',
			'/vault/Daily/2026/11-02.md',
			'/vault/inbox.md',
		]);
	});

	it('leaves the tree alone when the note already exists', async () => {
		const tree = [makeFileNode({ name: 'inbox.md', path: '/vault/inbox.md' })];
		fsStore.setFileTree(tree);
		vi.mocked(exists).mockResolvedValue(true);

		await openOrCreateNote({ filePath: '/vault/inbox.md', title: 'inbox' });

		expect(fsStore.fileTree).toBe(tree);
	});

	it('leaves the tree alone when create_note fails', async () => {
		const tree = [makeFileNode({ name: 'inbox.md', path: '/vault/inbox.md' })];
		fsStore.setFileTree(tree);
		vi.mocked(invoke).mockImplementation(async (cmd) => {
			if (cmd === 'create_note') throw new Error('disk full');
			return undefined;
		});

		await expect(openOrCreateNote({ filePath: '/vault/new.md', title: 'new' })).rejects.toThrow('disk full');

		expect(fsStore.fileTree).toBe(tree);
	});
});
