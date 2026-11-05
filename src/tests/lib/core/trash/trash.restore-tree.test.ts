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

import { parse as parseYaml } from 'yaml';
import { invoke } from '@tauri-apps/api/core';
import { exists, readTextFile, rename, remove, writeTextFile, mkdir } from '@tauri-apps/plugin-fs';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { trashStore } from '#lib/core/trash/trash.store.svelte.js';
import type { TrashItem } from '#lib/core/trash/trash.types.js';
import { restoreItem } from '#lib/core/trash/trash.service.js';
import { areAllRecentSaves } from '#lib/core/editor/editor.hooks.js';
import { clearAllIndexed } from '#lib/utils/index-dedupe.js';
import { pinnedRailItems, viewNavigatorRows } from '#lib/features/rail-shell/lens.logic.js';
import { makeDirNode, makeFileNode } from '../../../fixtures/tauri-api.fixture';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

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

	it('a single restored .view reaches the Rust index at once, with no search rows and no watcher rebuild', async () => {
		const VIEW = '/vault/notes/Week.view';
		vi.mocked(exists).mockImplementation(async (p) => String(p) !== VIEW);
		vi.mocked(readTextFile).mockResolvedValue('_visible: false\n');
		const item = trashed('notes/Week.view');
		trashStore.setItems([item]);

		await restoreItem(VAULT, item);

		expect(invoke).toHaveBeenCalledWith('update_note_in_index', { path: VIEW, content: '_visible: false\n' });
		expect(invoke).not.toHaveBeenCalledWith('update_search_index_file', expect.anything());
		expect(invoke).not.toHaveBeenCalledWith('update_semantic_file', expect.anything());
		expect(areAllRecentSaves([VIEW])).toBe(true);
	});

	describe('a restored folder holding a .view', () => {
		const FOLDER = '/vault/notes/archive';
		const NOTE = `${FOLDER}/old.md`;
		const VIEW = `${FOLDER}/Hidden.view`;
		const VIEW_BODY = '_visible: false\n_rail: true\nviews:\n  - type: table\n    name: All\n';

		/** Restores the folder over the real tree; only `invoke` and the disk are mocked. */
		async function restoreFolder(readView: () => Promise<string> = async () => VIEW_BODY) {
			vi.mocked(exists).mockImplementation(async (p) => String(p) !== FOLDER);
			vi.mocked(readTextFile).mockImplementation(async (p) => (String(p) === VIEW ? readView() : 'body'));
			vi.mocked(invoke).mockImplementation(async (cmd) =>
				cmd === 'scan_vault'
					? [makeFileNode({ name: 'old.md', path: NOTE }), makeFileNode({ name: 'Hidden.view', path: VIEW })]
					: undefined,
			);
			const item = trashed('notes/archive', true);
			trashStore.setItems([item]);
			await restoreItem(VAULT, item);
		}

		/** What Rust's index would hold: an entry per `update_note_in_index` call, its YAML read as frontmatter. */
		function indexedEntries() {
			return vi.mocked(invoke).mock.calls
				.filter(([cmd]) => cmd === 'update_note_in_index')
				.map(([, args]) => {
					const { path, content } = args as { path: string; content: string };
					return entryV2(path, { frontmatter: path.endsWith('.view') ? parseYaml(content) : {} });
				});
		}

		it('sends the view to the Rust index and not to the search tables', async () => {
			await restoreFolder();

			expect(invoke).toHaveBeenCalledWith('update_note_in_index', { path: VIEW, content: VIEW_BODY });
			const searchKeys = vi.mocked(invoke).mock.calls
				.filter(([cmd]) => cmd === 'update_search_index_file' || cmd === 'update_semantic_file')
				.map(([, args]) => (args as { filePath: string }).filePath);
			expect(searchKeys).toEqual(['notes/archive/old.md', 'notes/archive/old.md']);
		});

		it('still sends the note to the Rust index and to both search tables', async () => {
			await restoreFolder();

			expect(invoke).toHaveBeenCalledWith('update_note_in_index', { path: NOTE, content: 'body' });
			expect(invoke).toHaveBeenCalledWith('update_search_index_file', expect.objectContaining({ filePath: 'notes/archive/old.md' }));
			expect(invoke).toHaveBeenCalledWith('update_semantic_file', expect.objectContaining({ filePath: 'notes/archive/old.md' }));
		});

		it('honors _visible: false and _rail: true once the view is back in the index', async () => {
			await restoreFolder();

			const entries = indexedEntries();
			const rows = viewNavigatorRows(fsStore.fileTree, new Map(entries.map((e) => [e.path, e])));
			expect(rows.map((row) => row.lens.target)).not.toContain(VIEW);
			expect(pinnedRailItems(entries, new Map()).map((pin) => pin.key)).toContain(`view:${VIEW}`);
		});

		it('a view that cannot be read does not stop the note from being indexed', async () => {
			await restoreFolder(async () => {
				throw new Error('gone');
			});

			expect(invoke).toHaveBeenCalledWith('update_note_in_index', { path: NOTE, content: 'body' });
			expect(invoke).not.toHaveBeenCalledWith('update_note_in_index', expect.objectContaining({ path: VIEW }));
		});
	});
});
