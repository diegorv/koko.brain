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
	});

	describe('removeRecord', () => {
		it('removes a record by path', () => {
			collectionStore.updateRecord('/vault/a.md', {} as any);
			collectionStore.removeRecord('/vault/a.md');

			expect(collectionStore.propertyIndex.has('/vault/a.md')).toBe(false);
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
