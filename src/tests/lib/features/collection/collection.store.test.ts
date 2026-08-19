import { describe, it, expect, beforeEach } from 'vitest';
import { collectionStore } from '$lib/features/collection/collection.store.svelte';

describe('collectionStore', () => {
	beforeEach(() => {
		collectionStore.reset();
	});

	it('starts with empty index and not ready', () => {
		expect(collectionStore.propertyIndex.size).toBe(0);
		expect(collectionStore.isIndexReady).toBe(false);
	});

	describe('setPropertyIndex', () => {
		it('sets index and marks as ready', () => {
			const index = new Map([
				['/vault/a.md', { path: '/vault/a.md', properties: {} } as any],
			]);

			collectionStore.setPropertyIndex(index);

			expect(collectionStore.propertyIndex).toEqual(index);
			expect(collectionStore.isIndexReady).toBe(true);
		});
	});

	describe('updateRecord', () => {
		it('adds or updates a single record', () => {
			const record = { path: '/vault/a.md', properties: { title: 'A' } } as any;
			collectionStore.updateRecord('/vault/a.md', record);

			expect(collectionStore.propertyIndex.get('/vault/a.md')).toBe(record);
		});

		it('replaces the Map instance so reactive consumers recompute', () => {
			// The store reassigns a new Map on every mutation — that reference
			// change is what drives $state reactivity for getter consumers.
			const before = collectionStore.propertyIndex;
			collectionStore.updateRecord('/vault/a.md', { path: '/vault/a.md' } as any);
			const after = collectionStore.propertyIndex;

			expect(after).not.toBe(before);
			expect(after.has('/vault/a.md')).toBe(true);
			// Pre-mutation snapshot is untouched.
			expect(before.has('/vault/a.md')).toBe(false);
		});

		it('overwrites an existing record for the same path', () => {
			collectionStore.updateRecord('/vault/a.md', { path: '/vault/a.md', size: 1 } as any);
			collectionStore.updateRecord('/vault/a.md', { path: '/vault/a.md', size: 2 } as any);

			expect(collectionStore.propertyIndex.size).toBe(1);
			expect((collectionStore.propertyIndex.get('/vault/a.md') as any).size).toBe(2);
		});

		it('does not mark the index as ready', () => {
			collectionStore.updateRecord('/vault/a.md', {} as any);

			// Only setPropertyIndex (the full build) flips isIndexReady.
			expect(collectionStore.isIndexReady).toBe(false);
		});
	});

	describe('removeRecord', () => {
		it('removes a record by path', () => {
			collectionStore.updateRecord('/vault/a.md', {} as any);
			collectionStore.removeRecord('/vault/a.md');

			expect(collectionStore.propertyIndex.has('/vault/a.md')).toBe(false);
		});

		it('replaces the Map instance so reactive consumers recompute', () => {
			collectionStore.updateRecord('/vault/a.md', {} as any);
			const before = collectionStore.propertyIndex;

			collectionStore.removeRecord('/vault/a.md');

			expect(collectionStore.propertyIndex).not.toBe(before);
		});

		it('preserves the ready flag and other records', () => {
			collectionStore.setPropertyIndex(
				new Map([
					['/vault/a.md', {} as any],
					['/vault/b.md', {} as any],
				]),
			);

			collectionStore.removeRecord('/vault/a.md');

			expect(collectionStore.isIndexReady).toBe(true);
			expect(collectionStore.propertyIndex.has('/vault/b.md')).toBe(true);
			expect(collectionStore.propertyIndex.size).toBe(1);
		});

		it('is a no-op for an unknown path', () => {
			collectionStore.setPropertyIndex(new Map([['/vault/a.md', {} as any]]));

			collectionStore.removeRecord('/vault/missing.md');

			expect(collectionStore.propertyIndex.size).toBe(1);
		});
	});

	describe('version', () => {
		it('advances on setPropertyIndex', () => {
			const before = collectionStore.version;

			collectionStore.setPropertyIndex(new Map([['/vault/a.md', {} as any]]));

			expect(collectionStore.version).toBeGreaterThan(before);
		});

		it('advances on updateRecord', () => {
			const before = collectionStore.version;

			collectionStore.updateRecord('/vault/a.md', {} as any);

			expect(collectionStore.version).toBeGreaterThan(before);
		});

		it('advances on removeRecord', () => {
			collectionStore.updateRecord('/vault/a.md', {} as any);
			const before = collectionStore.version;

			collectionStore.removeRecord('/vault/a.md');

			expect(collectionStore.version).toBeGreaterThan(before);
		});

		it('is monotonic across reset', () => {
			// Same rationale as vaultStore.vaultIndexVersion (app-lifecycle
			// teardown): snapshot consumers cache by version, so rewinding it
			// to 0 on a vault switch would serve a stale cache as a fresh hit.
			collectionStore.updateRecord('/vault/a.md', {} as any);
			const before = collectionStore.version;

			collectionStore.reset();

			expect(collectionStore.version).toBe(before);
		});
	});

	describe('reset', () => {
		it('clears index and resets ready flag', () => {
			collectionStore.setPropertyIndex(new Map([['/a', {} as any]]));

			collectionStore.reset();

			expect(collectionStore.propertyIndex.size).toBe(0);
			expect(collectionStore.isIndexReady).toBe(false);
		});
	});
});
