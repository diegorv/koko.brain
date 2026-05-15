import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/api', () => ({
	invoke: vi.fn(),
}));

import { invoke } from '$lib/api';
import { collectionStore } from '$lib/features/collection/collection.store.svelte';
import {
	buildPropertyIndex,
	updateNoteInIndex,
	removeNoteFromIndex,
	resetCollection,
} from '$lib/features/collection/collection.service';
import type { NoteRecordV2 } from '$lib/types/vault-v2.types';

function record(path: string, props: Record<string, unknown>, mtime = 0, ctime = 0): NoteRecordV2 {
	const name = path.split('/').pop() ?? '';
	const dot = name.lastIndexOf('.');
	const basename = dot > 0 ? name.slice(0, dot) : name;
	const ext = dot > 0 ? name.slice(dot) : '';
	const folder = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
	return { path, name, basename, folder, ext, mtime, ctime, size: 0, properties: props as never };
}

beforeEach(() => {
	vi.clearAllMocks();
	collectionStore.reset();
});

describe('buildPropertyIndex', () => {
	it('populates the store from get_all_property_records', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([
			record('/vault/a.md', { title: 'A' }),
			record('/vault/b.md', { title: 'B' }),
		]);

		await buildPropertyIndex();

		expect(invoke).toHaveBeenCalledWith('get_all_property_records');
		expect(collectionStore.isIndexReady).toBe(true);
		expect(collectionStore.propertyIndex.size).toBe(2);
		expect(collectionStore.propertyIndex.get('/vault/a.md')!.properties.get('title')).toBe('A');
	});

	it('preserves mtime/ctime as milliseconds (Rust converts s -> ms server-side)', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([
			record('/vault/a.md', {}, 1700000000000, 1690000000000),
		]);

		await buildPropertyIndex();

		const r = collectionStore.propertyIndex.get('/vault/a.md')!;
		expect(r.mtime).toBe(1700000000000);
		expect(r.ctime).toBe(1690000000000);
	});

	it('handles empty IPC response', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([]);

		await buildPropertyIndex();

		expect(collectionStore.isIndexReady).toBe(true);
		expect(collectionStore.propertyIndex.size).toBe(0);
	});

	it('swallows IPC errors and leaves the store untouched', async () => {
		vi.mocked(invoke).mockRejectedValueOnce(new Error('boom'));

		await buildPropertyIndex();

		// On error, store stays in its prior (empty here) state.
		expect(collectionStore.propertyIndex.size).toBe(0);
		// isIndexReady was never flipped — buildPropertyIndex bailed before
		// the setPropertyIndex call.
		expect(collectionStore.isIndexReady).toBe(false);
	});
});

describe('updateNoteInIndex', () => {
	it('adds a new record to the index', () => {
		updateNoteInIndex('/vault/a.md', '---\ntitle: A\n---\ncontent');

		const r = collectionStore.propertyIndex.get('/vault/a.md')!;
		expect(r.path).toBe('/vault/a.md');
		expect(r.name).toBe('a.md');
		expect(r.properties.get('title')).toBe('A');
	});

	it('preserves mtime/ctime/size when updating an existing record', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([
			record('/vault/a.md', { title: 'Old' }, 1700000000000, 1690000000000),
		]);
		await buildPropertyIndex();

		updateNoteInIndex('/vault/a.md', '---\ntitle: New\n---');

		const r = collectionStore.propertyIndex.get('/vault/a.md')!;
		expect(r.properties.get('title')).toBe('New');
		expect(r.mtime).toBe(1700000000000);
		expect(r.ctime).toBe(1690000000000);
	});

	it('defaults metadata to 0 for unknown paths', () => {
		updateNoteInIndex('/vault/new.md', 'content');

		const r = collectionStore.propertyIndex.get('/vault/new.md')!;
		expect(r.mtime).toBe(0);
		expect(r.ctime).toBe(0);
		expect(r.size).toBe(0);
	});
});

describe('removeNoteFromIndex', () => {
	it('removes record from store', () => {
		updateNoteInIndex('/vault/a.md', 'content');
		expect(collectionStore.propertyIndex.has('/vault/a.md')).toBe(true);

		removeNoteFromIndex('/vault/a.md');

		expect(collectionStore.propertyIndex.has('/vault/a.md')).toBe(false);
	});

	it('is safe to call on non-existent path', () => {
		removeNoteFromIndex('/vault/nonexistent.md');
		expect(collectionStore.propertyIndex.size).toBe(0);
	});
});

describe('resetCollection', () => {
	it('clears the index and resets ready flag', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([record('/vault/a.md', {})]);
		await buildPropertyIndex();
		expect(collectionStore.isIndexReady).toBe(true);

		resetCollection();

		expect(collectionStore.propertyIndex.size).toBe(0);
		expect(collectionStore.isIndexReady).toBe(false);
	});
});
