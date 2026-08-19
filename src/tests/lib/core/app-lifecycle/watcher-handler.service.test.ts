import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';
setupLocalStorage();

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('$lib/features/backlinks/backlinks.service', () => ({
	rebuildIndex: vi.fn(() => Promise.resolve()),
}));

// Only the BULK builders are mocked - the per-file updaters now reach the
// watcher through the note-change owner's consumer registry, and the tests
// assert their real store output instead.
vi.mock('$lib/features/collection/collection.service', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/features/collection/collection.service')>()),
	buildPropertyIndex: vi.fn(),
}));

vi.mock('$lib/features/file-icons/file-icons.service', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/features/file-icons/file-icons.service')>()),
	buildFrontmatterIconIndex: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('$lib/plugins/calendar/calendar.service', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/plugins/calendar/calendar.service')>()),
	scanFilesForCalendar: vi.fn(),
}));

vi.mock('$lib/core/editor/editor.hooks', () => ({
	areAllRecentSaves: vi.fn(() => false),
}));

vi.mock('$lib/core/markdown-editor/extensions/live-preview/widgets/queryjs-block-widget', () => ({
	invalidateQueryjsCache: vi.fn(),
}));

vi.mock('$lib/utils/debug', () => ({
	debug: vi.fn(),
	error: vi.fn(),
	logProcessMemory: vi.fn(),
	timeSync: vi.fn((_tag: string, _label: string, fn: () => unknown) => fn()),
	timeAsync: vi.fn((_tag: string, _label: string, fn: () => Promise<unknown>) => fn()),
}));

import { invoke } from '@tauri-apps/api/core';
import { error as debugError } from '$lib/utils/debug';
import { rebuildIndex } from '$lib/features/backlinks/backlinks.service';
import { buildPropertyIndex, registerCollectionNoteChangeConsumer } from '$lib/features/collection/collection.service';
import { buildFrontmatterIconIndex, registerFileIconsNoteChangeConsumer } from '$lib/features/file-icons/file-icons.service';
import { scanFilesForCalendar, registerCalendarNoteChangeConsumer, resetCalendar } from '$lib/plugins/calendar/calendar.service';
import { collectionStore } from '$lib/features/collection/collection.store.svelte';
import { fileIconsStore } from '$lib/features/file-icons/file-icons.store.svelte';
import { calendarStore } from '$lib/plugins/calendar/calendar.store.svelte';
import { clearAllIndexed, isAlreadyIndexed, markIndexed } from '$lib/utils/index-dedupe';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { areAllRecentSaves } from '$lib/core/editor/editor.hooks';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { rebuildAllIndexes } from '$lib/core/app-lifecycle/watcher-handler.service';

describe('rebuildAllIndexes', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
	});

	it('rebuilds all vault-wide indexes from disk', async () => {
		await rebuildAllIndexes();

		expect(rebuildIndex).toHaveBeenCalled();
		expect(buildPropertyIndex).toHaveBeenCalled();
		expect(buildFrontmatterIconIndex).toHaveBeenCalled();
		expect(scanFilesForCalendar).toHaveBeenCalled();
	});

	it('calls rebuildIndex before derived indexes', async () => {
		const callOrder: string[] = [];
		vi.mocked(rebuildIndex).mockImplementation(async () => { callOrder.push('rebuildIndex'); });
		vi.mocked(buildPropertyIndex).mockImplementation(async () => { callOrder.push('buildPropertyIndex'); });

		await rebuildAllIndexes();

		expect(callOrder[0]).toBe('rebuildIndex');
		expect(callOrder.indexOf('buildPropertyIndex')).toBeGreaterThan(0);
	});
});

describe('rebuildAllIndexes — self-save detection', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
	});

	it('skips rebuild when all changed file paths are recent self-saves', async () => {
		vi.mocked(areAllRecentSaves).mockReturnValue(true);

		await rebuildAllIndexes(['/vault/note.md']);

		expect(areAllRecentSaves).toHaveBeenCalledWith(['/vault/note.md']);
		expect(rebuildIndex).not.toHaveBeenCalled();
		expect(buildPropertyIndex).not.toHaveBeenCalled();
	});

	it('does not clear recent saves — lets TTL handle cleanup', async () => {
		vi.mocked(areAllRecentSaves).mockReturnValue(true);

		await rebuildAllIndexes(['/vault/note.md']);

		// areAllRecentSaves is checked but markers are NOT cleared,
		// so subsequent watcher batches can still detect the self-save
		expect(areAllRecentSaves).toHaveBeenCalled();
	});

	it('skips rebuild when all paths are directories (no file paths)', async () => {
		await rebuildAllIndexes(['/vault/_notes', '/vault/_notes/2026', '/vault/_notes/2026/02-Feb']);

		expect(areAllRecentSaves).not.toHaveBeenCalled();
		expect(rebuildIndex).not.toHaveBeenCalled();
		expect(buildPropertyIndex).not.toHaveBeenCalled();
	});

	it('skips rebuild when mixed directory + self-save file paths', async () => {
		vi.mocked(areAllRecentSaves).mockReturnValue(true);

		await rebuildAllIndexes(['/vault/_notes/2026', '/vault/note.md', '/vault/_notes']);

		// Only file paths are checked against recentSaves
		expect(areAllRecentSaves).toHaveBeenCalledWith(['/vault/note.md']);
		expect(rebuildIndex).not.toHaveBeenCalled();
	});

	it('performs full rebuild when some paths are not recent saves', async () => {
		vi.mocked(areAllRecentSaves).mockReturnValue(false);

		await rebuildAllIndexes(['/vault/note.md', '/vault/external.md']);

		expect(rebuildIndex).toHaveBeenCalled();
		expect(buildPropertyIndex).toHaveBeenCalled();
	});

	it('performs full rebuild when no paths are provided', async () => {
		await rebuildAllIndexes();

		expect(areAllRecentSaves).not.toHaveBeenCalled();
		expect(rebuildIndex).toHaveBeenCalled();
	});

	it('performs full rebuild when paths array is empty', async () => {
		await rebuildAllIndexes([]);

		expect(areAllRecentSaves).not.toHaveBeenCalled();
		expect(rebuildIndex).toHaveBeenCalled();
	});
});

describe('rebuildAllIndexes — error isolation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
	});

	it('continues remaining index builds when rebuildIndex rejects', async () => {
		vi.mocked(rebuildIndex).mockRejectedValueOnce(new Error('scan failed'));

		await rebuildAllIndexes();

		expect(debugError).toHaveBeenCalledWith('WATCHER', 'rebuildIndex failed:', expect.any(Error));
		expect(buildPropertyIndex).toHaveBeenCalled();
		expect(buildFrontmatterIconIndex).toHaveBeenCalled();
		expect(scanFilesForCalendar).toHaveBeenCalled();
	});

	it('error in one builder does not abort the rest of the rebuild', async () => {
		editorStore.addTab({ path: '/vault/note.md', name: 'note.md', content: '', savedContent: '' });
		vi.mocked(buildPropertyIndex).mockImplementation(() => { throw new Error('prop fail'); });

		await rebuildAllIndexes();

		// Index builders after the failure still run.
		expect(buildFrontmatterIconIndex).toHaveBeenCalled();
		expect(scanFilesForCalendar).toHaveBeenCalled();
	});
});

describe('rebuildAllIndexes — incremental path', () => {
	let unregister: (() => void)[] = [];

	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open('/vault');
		clearAllIndexed();
		collectionStore.reset();
		fileIconsStore.reset();
		resetCalendar();
		unregister = [
			registerCollectionNoteChangeConsumer(),
			registerFileIconsNoteChangeConsumer(),
			registerCalendarNoteChangeConsumer(),
		];
		// Default mock for invoke calls not explicitly configured by individual
		// tests (e.g. update_note_in_index, scan_vault_v2). The
		// mockResolvedValueOnce values below take precedence in call order.
		vi.mocked(invoke).mockResolvedValue(undefined);
	});

	afterEach(() => {
		for (const u of unregister) u();
		unregister = [];
		collectionStore.reset();
		fileIconsStore.reset();
		resetCalendar();
	});

	it('uses incremental update for a small number of markdown files', async () => {
		const CONTENT = '---\n_icon: lucide:star\ncreated: 2026-01-02\nstatus: done\n---\n';
		vi.mocked(invoke).mockResolvedValueOnce([
			{ path: '/vault/note.md', content: CONTENT },
		]);

		await rebuildAllIndexes(['/vault/note.md']);

		// Should NOT call full rebuild
		expect(rebuildIndex).not.toHaveBeenCalled();
		expect(buildPropertyIndex).not.toHaveBeenCalled();

		// Should pass absolute paths to read_files_batch
		expect(invoke).toHaveBeenCalledWith('read_files_batch', {
			vaultPath: '/vault',
			paths: ['/vault/note.md'],
		});
		// Every registered consumer keys on the ABSOLUTE path (matching VaultIndex).
		expect(collectionStore.propertyIndex.get('/vault/note.md')?.properties.get('status')).toBe('done');
		expect(fileIconsStore.getFrontmatterIcon('/vault/note.md')).toEqual({
			iconPack: 'lucide', iconName: 'star', color: undefined, titleColor: undefined,
		});
		expect(calendarStore.dayPaths.get('2026-01-02')).toEqual(['/vault/note.md']);
		// The watcher marks the signature so the content-effect does not re-parse.
		expect(isAlreadyIndexed('/vault/note.md', CONTENT)).toBe(true);
	});

	it('runs the consumers even when the signature was already indexed', async () => {
		// The watcher source is `consumers: 'always'` - an external edit that
		// happens to match a stale dedupe signature must still land.
		markIndexed('/vault/note.md', 'external body');
		vi.mocked(invoke).mockResolvedValueOnce([
			{ path: '/vault/note.md', content: 'external body' },
		]);

		await rebuildAllIndexes(['/vault/note.md']);

		expect(collectionStore.propertyIndex.has('/vault/note.md')).toBe(true);
	});

	it('updates FTS5 and semantic indexes for externally changed markdown files', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([
			{ path: '/vault/notes/external.md', content: '# external edit' },
		]);

		await rebuildAllIndexes(['/vault/notes/external.md']);

		// FTS + semantic take vault-relative paths, matching the convention
		// in `build_fts_index` / `build_semantic_index`.
		expect(invoke).toHaveBeenCalledWith('update_search_index_file', {
			filePath: 'notes/external.md',
			content: '# external edit',
		});
		expect(invoke).toHaveBeenCalledWith('update_semantic_file', {
			filePath: 'notes/external.md',
			content: '# external edit',
			vaultPath: '/vault',
		});
	});

	it('removes deleted markdown files from FTS5 in the incremental path', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([
			{ path: '/vault/notes/gone.md', content: null },
		]);

		await rebuildAllIndexes(['/vault/notes/gone.md']);

		expect(invoke).toHaveBeenCalledWith('remove_from_search_index', {
			filePath: 'notes/gone.md',
		});
	});

	it('skips FTS/semantic updates for paths outside the vault prefix instead of leaking absolute keys', async () => {
		// A canonicalized watcher path (e.g. /private/var/... for a /var/...
		// symlinked vault) does not share the vaultPath prefix. Deriving a
		// "relative" key from it would corrupt the vault-relative-keyed FTS
		// and semantic tables, so those updates must be skipped entirely.
		vi.mocked(invoke).mockResolvedValueOnce([
			{ path: '/private/vault-real/notes/external.md', content: '# edit' },
		]);

		await rebuildAllIndexes(['/private/vault-real/notes/external.md']);

		// Absolute-keyed consumers still run (VaultIndex uses absolute paths).
		expect(collectionStore.propertyIndex.has('/private/vault-real/notes/external.md')).toBe(true);
		// Vault-relative-keyed updates must NOT receive the absolute path.
		expect(invoke).not.toHaveBeenCalledWith('update_search_index_file', expect.anything());
		expect(invoke).not.toHaveBeenCalledWith('update_semantic_file', expect.anything());
	});

	it('skips FTS removal for deleted paths outside the vault prefix', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([
			{ path: '/private/vault-real/notes/gone.md', content: null },
		]);

		await rebuildAllIndexes(['/private/vault-real/notes/gone.md']);

		// Rust-side absolute-keyed removal still runs.
		expect(invoke).toHaveBeenCalledWith('remove_note_from_index', {
			path: '/private/vault-real/notes/gone.md',
		});
		expect(invoke).not.toHaveBeenCalledWith('remove_from_search_index', expect.anything());
	});

	it('falls back to full rebuild when incremental fails', async () => {
		vi.mocked(invoke).mockRejectedValueOnce(new Error('read failed'));

		await rebuildAllIndexes(['/vault/note.md']);

		// Incremental failed, should fall back to full rebuild
		expect(rebuildIndex).toHaveBeenCalled();
		expect(buildPropertyIndex).toHaveBeenCalled();
	});

	it('uses full rebuild for many changed files', async () => {
		const paths = Array.from({ length: 15 }, (_, i) => `/vault/note-${i}.md`);

		await rebuildAllIndexes(paths);

		expect(rebuildIndex).toHaveBeenCalled();
		expect(invoke).not.toHaveBeenCalledWith('read_files_batch', expect.anything());
	});

	it('uses full rebuild for non-markdown files', async () => {
		await rebuildAllIndexes(['/vault/image.png']);

		expect(rebuildIndex).toHaveBeenCalled();
	});

	it('handles deleted files in incremental path', async () => {
		const CONTENT = '---\n_icon: lucide:star\ncreated: 2026-01-02\n---\n';
		// Seed every consumer through the real upsert path first.
		vi.mocked(invoke).mockResolvedValueOnce([
			{ path: '/vault/deleted.md', content: CONTENT },
		]);
		await rebuildAllIndexes(['/vault/deleted.md']);
		expect(collectionStore.propertyIndex.has('/vault/deleted.md')).toBe(true);

		vi.mocked(invoke).mockResolvedValueOnce([
			{ path: '/vault/deleted.md', content: null },
		]);

		await rebuildAllIndexes(['/vault/deleted.md']);

		// Drop the dedup signature so a re-creation re-indexes.
		expect(isAlreadyIndexed('/vault/deleted.md', CONTENT)).toBe(false);
		// Every registered per-file index is evicted.
		expect(collectionStore.propertyIndex.has('/vault/deleted.md')).toBe(false);
		expect(fileIconsStore.getFrontmatterIcon('/vault/deleted.md')).toBeUndefined();
		expect(calendarStore.dayPaths.get('2026-01-02')).toBeUndefined();
		// Deletion fans out to remove_note_from_index in Rust.
		expect(invoke).toHaveBeenCalledWith('remove_note_from_index', { path: '/vault/deleted.md' });
	});
});
