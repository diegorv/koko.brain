import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';
setupLocalStorage();

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { rebuildAllIndexes } from '#lib/app/lifecycle/watcher-handler.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { isAlreadyIndexed, clearAllIndexed } from '#lib/utils/index-dedupe.js';
import { buildIndex } from '#lib/features/backlinks/backlinks.service.js';
import { registerCollectionNoteChangeConsumer } from '#lib/features/collection/collection.service.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { registerFileIconsNoteChangeConsumer } from '#lib/features/file-icons/file-icons.service.js';
import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';

/** Paths that exist on the fake disk. A path missing here reads back as deleted. */
let disk: Record<string, string> = {};

/** The args of every `invoke` of `command`, in call order. */
function callsTo(command: string): unknown[] {
	return vi.mocked(invoke).mock.calls.filter(([c]) => c === command).map(([, args]) => args);
}

describe('rebuildAllIndexes: a batch holding notes and views', () => {
	let unregister: (() => void)[] = [];

	beforeEach(async () => {
		clearLocalStorage();
		clearAllIndexed();
		collectionStore.reset();
		fileIconsStore.reset();
		vaultStore._reset();
		vaultStore.open('/v');
		disk = {};
		vi.mocked(invoke).mockReset();
		vi.mocked(invoke).mockImplementation(async (command: string, args?: unknown) => {
			if (command === 'read_files_batch') {
				const { paths } = args as { paths: string[] };
				return paths.map((path) => ({ path, content: disk[path] ?? null, error: null }));
			}
			if (command === 'scan_vault_v2_cached') {
				return { source: 'cache', entryCount: 0, filesReread: 0, loadMs: 0 };
			}
			return undefined;
		});
		// `rebuildIndex` does nothing until a build has set the vault path, and
		// then "no scan ran" would hold even on the full-rebuild branch.
		await buildIndex('/v');
		vi.mocked(invoke).mockClear();
		unregister = [registerCollectionNoteChangeConsumer(), registerFileIconsNoteChangeConsumer()];
	});

	afterEach(() => {
		for (const u of unregister) u();
		unregister = [];
		collectionStore.reset();
		fileIconsStore.reset();
	});

	it('indexes the note for search and the view for the vault index only', async () => {
		disk = { '/v/a.md': '# A', '/v/b.view': 'label: B\n_icon: lucide:star\n' };

		await rebuildAllIndexes(['/v/a.md', '/v/b.view']);

		expect(callsTo('update_search_index_file')).toEqual([
			{ filePath: 'a.md', content: '# A', vaultPath: '/v' },
		]);
		expect(callsTo('update_semantic_file')).toEqual([
			{ filePath: 'a.md', content: '# A', vaultPath: '/v' },
		]);
		expect(callsTo('update_note_in_index')).toContainEqual({
			path: '/v/b.view',
			content: 'label: B\n_icon: lucide:star\n',
		});
		expect(callsTo('update_note_in_index')).toContainEqual({ path: '/v/a.md', content: '# A' });
		expect(callsTo('scan_vault_v2_cached')).toEqual([]);
		expect(callsTo('get_all_property_records')).toEqual([]);
		// The owner ran for the view: its signature and its row icon are current.
		expect(isAlreadyIndexed('/v/b.view', 'label: B\n_icon: lucide:star\n')).toBe(true);
		expect(fileIconsStore.getFrontmatterIcon('/v/b.view')?.iconName).toBe('star');
	});

	it('removes a deleted note from search and a deleted view from the vault index only', async () => {
		disk = { '/v/kept.md': '# kept' };

		await rebuildAllIndexes(['/v/kept.md', '/v/gone.md', '/v/gone.view']);

		expect(callsTo('remove_note_from_index')).toEqual([{ path: '/v/gone.md' }, { path: '/v/gone.view' }]);
		expect(callsTo('remove_from_search_index')).toEqual([{ filePath: 'gone.md' }]);
		expect(callsTo('remove_semantic_file')).toEqual([{ filePath: 'gone.md' }]);
		expect(callsTo('scan_vault_v2_cached')).toEqual([]);
	});

	it('moves an external view-to-note rename into search', async () => {
		disk = { '/v/Foo.md': '# Foo' };

		await rebuildAllIndexes(['/v/Foo.view', '/v/Foo.md']);

		expect(callsTo('remove_note_from_index')).toEqual([{ path: '/v/Foo.view' }]);
		expect(callsTo('remove_from_search_index')).toEqual([]);
		expect(callsTo('update_note_in_index')).toEqual([{ path: '/v/Foo.md', content: '# Foo' }]);
		expect(callsTo('update_search_index_file')).toEqual([
			{ filePath: 'Foo.md', content: '# Foo', vaultPath: '/v' },
		]);
	});

	it('moves an external note-to-view rename out of search', async () => {
		disk = { '/v/Foo.view': 'label: Foo\n' };

		await rebuildAllIndexes(['/v/Foo.md', '/v/Foo.view']);

		expect(callsTo('remove_note_from_index')).toEqual([{ path: '/v/Foo.md' }]);
		expect(callsTo('remove_from_search_index')).toEqual([{ filePath: 'Foo.md' }]);
		expect(callsTo('update_note_in_index')).toEqual([{ path: '/v/Foo.view', content: 'label: Foo\n' }]);
		expect(callsTo('update_search_index_file')).toEqual([]);
		expect(callsTo('update_semantic_file')).toEqual([]);
	});

	it('treats an upper-case view extension as a view, as the Rust scan does', async () => {
		disk = { '/v/a.md': '# A', '/v/B.VIEW': 'label: B\n' };

		await rebuildAllIndexes(['/v/a.md', '/v/B.VIEW']);

		expect(callsTo('update_note_in_index')).toContainEqual({ path: '/v/B.VIEW', content: 'label: B\n' });
		expect(callsTo('update_search_index_file')).toEqual([
			{ filePath: 'a.md', content: '# A', vaultPath: '/v' },
		]);
	});

	it('does not read other file types in the batch', async () => {
		disk = { '/v/a.md': '# A', '/v/b.view': 'label: B\n' };

		await rebuildAllIndexes(['/v/a.md', '/v/b.view', '/v/c.png']);

		expect(callsTo('read_files_batch')).toEqual([{ vaultPath: '/v', paths: ['/v/a.md', '/v/b.view'] }]);
	});

	it('keeps the full rebuild for a view-only batch', async () => {
		disk = { '/v/b.view': 'label: B\n' };

		await rebuildAllIndexes(['/v/b.view']);

		expect(callsTo('scan_vault_v2_cached')).toEqual([{ path: '/v' }]);
		expect(callsTo('read_files_batch')).toEqual([]);
	});

	it('keeps the full rebuild when the notes alone pass the threshold', async () => {
		const notes = Array.from({ length: 11 }, (_, i) => `/v/n${i}.md`);

		await rebuildAllIndexes([...notes, '/v/b.view']);

		expect(callsTo('scan_vault_v2_cached')).toEqual([{ path: '/v' }]);
		expect(callsTo('read_files_batch')).toEqual([]);
	});
});
