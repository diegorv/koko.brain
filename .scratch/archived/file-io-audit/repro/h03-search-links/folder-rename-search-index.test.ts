/**
 * Repro (h03: rename-move-delete-3).
 *
 * Renaming a folder runs `applyPathChange`, which removes the FTS5 / semantic
 * rows of every child under the OLD paths (`forgetNote`), but nothing re-adds
 * the children under the NEW paths. The watcher cannot stand in: notify reports
 * a directory rename as the directory path only, and the watcher handler drops
 * dotless directory paths. So the moved notes stay out of text search until
 * the next vault open or a save of each note.
 *
 * Only `@tauri-apps/*` is mocked; the IPC layer, the stores and the path-change
 * service are real. The test asserts the CORRECT behavior and fails while the
 * bug exists.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../fixtures/localStorage.fixture';

setupLocalStorage();

const ipc = vi.hoisted(() => ({
	calls: [] as Array<[string, unknown]>,
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(async (cmd: string, args?: unknown) => {
		ipc.calls.push([cmd, args]);
		if (cmd === 'scan_vault') return [];
		if (cmd === 'get_backlinks_v2') return [];
		return null;
	}),
}));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(async () => () => {}) }));
vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(async () => ''),
	writeTextFile: vi.fn(async () => {}),
	readDir: vi.fn(async () => []),
	exists: vi.fn(async () => true),
	mkdir: vi.fn(async () => {}),
	remove: vi.fn(async () => {}),
	rename: vi.fn(async () => {}),
	copyFile: vi.fn(async () => {}),
}));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn(async () => true) }));
vi.mock('@tauri-apps/plugin-opener', () => ({ revealItemInDir: vi.fn() }));

import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { applyPathChange } from '#lib/core/filesystem/path-change.service.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';

describe('h03 repro: folder rename leaves moved notes out of the search index', () => {
	beforeEach(() => {
		clearLocalStorage();
		ipc.calls.length = 0;
		editorStore.reset();
		fsStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
		fsStore.setFileTree([
			{
				name: 'Projects',
				path: '/vault/Projects',
				isDirectory: true,
				children: [
					{ name: 'a.md', path: '/vault/Projects/a.md', isDirectory: false },
					{ name: 'b.md', path: '/vault/Projects/b.md', isDirectory: false },
				],
			},
		] as never);
	});

	it('re-adds the moved notes to the FTS index under their new paths', async () => {
		await applyPathChange({
			from: '/vault/Projects',
			to: '/vault/Archive/Projects',
			isDirectory: true,
			diskOp: async () => {},
		});
		// Let the fire-and-forget forgetNote() IPCs settle.
		await new Promise((r) => setTimeout(r, 0));

		// The old rows are removed (current behavior, proves the delete leg runs).
		expect(ipc.calls).toContainEqual([
			'remove_from_search_index',
			{ filePath: 'Projects/a.md' },
		]);
		// Correct behavior: the moved notes are searchable under the new paths
		// without waiting for a vault open or a save. Fails: nothing re-adds them.
		const reindexed = ipc.calls
			.filter(([cmd]) => cmd === 'update_search_index_file')
			.map(([, args]) => (args as { filePath: string }).filePath);
		expect(reindexed).toEqual(expect.arrayContaining([
			'Archive/Projects/a.md',
			'Archive/Projects/b.md',
		]));
	});
});
