import { describe, it, expect, vi, beforeEach } from 'vitest';
import { noteIndexStore } from '$lib/features/backlinks/note-index.store.svelte';
import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
import { collectionStore } from '$lib/features/collection/collection.store.svelte';
import {
	buildPropertyIndex,
	updateNoteInIndex,
	removeNoteFromIndex,
	resetCollection,
} from '$lib/features/collection/collection.service';

beforeEach(() => {
	vi.clearAllMocks();
	noteIndexStore.reset();
	fsStore.reset();
	collectionStore.reset();
});

describe('buildPropertyIndex', () => {
	it('builds index from all note contents', () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/a.md', '---\ntitle: A\n---\ncontent a'],
			['/vault/b.md', '---\ntitle: B\n---\ncontent b'],
		]));

		buildPropertyIndex();

		expect(collectionStore.isIndexReady).toBe(true);
		expect(collectionStore.propertyIndex.size).toBe(2);

		const recordA = collectionStore.propertyIndex.get('/vault/a.md')!;
		expect(recordA.path).toBe('/vault/a.md');
		expect(recordA.name).toBe('a.md');
		expect(recordA.properties.get('title')).toBe('A');

		const recordB = collectionStore.propertyIndex.get('/vault/b.md')!;
		expect(recordB.path).toBe('/vault/b.md');
		expect(recordB.properties.get('title')).toBe('B');
	});

	it('passes file metadata from fileTree to records', () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/a.md', 'content a'],
		]));
		fsStore.setFileTree([
			{
				name: 'a.md',
				path: '/vault/a.md',
				isDirectory: false,
				modifiedAt: 1700000000000,
				createdAt: 1690000000000,
			},
		]);

		buildPropertyIndex();

		const record = collectionStore.propertyIndex.get('/vault/a.md')!;
		expect(record.mtime).toBe(1700000000000);
		expect(record.ctime).toBe(1690000000000);
	});

	it('traverses nested fileTree directories for metadata', () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/notes/deep.md', 'content'],
		]));
		fsStore.setFileTree([
			{
				name: 'notes',
				path: '/vault/notes',
				isDirectory: true,
				children: [
					{
						name: 'deep.md',
						path: '/vault/notes/deep.md',
						isDirectory: false,
						modifiedAt: 1700000000000,
						createdAt: 1690000000000,
					},
				],
			},
		]);

		buildPropertyIndex();

		const record = collectionStore.propertyIndex.get('/vault/notes/deep.md')!;
		expect(record.mtime).toBe(1700000000000);
		expect(record.ctime).toBe(1690000000000);
	});

	it('defaults metadata to 0 when file is not in tree', () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/orphan.md', 'content'],
		]));

		buildPropertyIndex();

		const record = collectionStore.propertyIndex.get('/vault/orphan.md')!;
		expect(record.mtime).toBe(0);
		expect(record.ctime).toBe(0);
	});

	it('creates empty index when no notes exist', () => {
		buildPropertyIndex();

		expect(collectionStore.isIndexReady).toBe(true);
		expect(collectionStore.propertyIndex.size).toBe(0);
	});
});

describe('updateNoteInIndex', () => {
	it('adds a new record to the index', () => {
		updateNoteInIndex('/vault/a.md', '---\ntitle: A\n---\ncontent');

		const record = collectionStore.propertyIndex.get('/vault/a.md')!;
		expect(record.path).toBe('/vault/a.md');
		expect(record.name).toBe('a.md');
		expect(record.properties.get('title')).toBe('A');
	});

	it('updates an existing record preserving metadata', () => {
		// First build the index with metadata
		noteIndexStore.setNoteContents(new Map([
			['/vault/a.md', '---\ntitle: Old\n---'],
		]));
		fsStore.setFileTree([
			{
				name: 'a.md',
				path: '/vault/a.md',
				isDirectory: false,
				modifiedAt: 1700000000000,
				createdAt: 1690000000000,
			},
		]);
		buildPropertyIndex();

		// Now update content — metadata should be preserved from existing record
		updateNoteInIndex('/vault/a.md', '---\ntitle: New\n---');

		const record = collectionStore.propertyIndex.get('/vault/a.md')!;
		expect(record.properties.get('title')).toBe('New');
		expect(record.mtime).toBe(1700000000000);
		expect(record.ctime).toBe(1690000000000);
	});

	it('defaults metadata to 0 for new notes not in index', () => {
		updateNoteInIndex('/vault/new.md', 'content');

		const record = collectionStore.propertyIndex.get('/vault/new.md')!;
		expect(record.mtime).toBe(0);
		expect(record.ctime).toBe(0);
		expect(record.size).toBe(0);
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
	it('clears the index and resets ready flag', () => {
		buildPropertyIndex();
		expect(collectionStore.isIndexReady).toBe(true);

		resetCollection();

		expect(collectionStore.propertyIndex.size).toBe(0);
		expect(collectionStore.isIndexReady).toBe(false);
	});
});
