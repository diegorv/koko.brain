import { describe, it, expect, beforeEach } from 'vitest';
import { trashStore } from '$lib/core/trash/trash.store.svelte';
import type { TrashItem } from '$lib/core/trash/trash.types';

function makeItem(id: string, fileName = 'file.md'): TrashItem {
	return {
		id,
		originalPath: `notes/${fileName}`,
		fileName,
		isDirectory: false,
		trashedAt: Number(id),
	};
}

describe('trashStore', () => {
	beforeEach(() => {
		trashStore.clear();
	});

	it('starts empty', () => {
		expect(trashStore.items).toEqual([]);
		expect(trashStore.count).toBe(0);
		expect(trashStore.isEmpty).toBe(true);
		expect(trashStore.loading).toBe(false);
	});

	describe('setItems', () => {
		it('replaces the entire items list', () => {
			const items = [makeItem('1'), makeItem('2')];
			trashStore.setItems(items);
			expect(trashStore.items).toEqual(items);
			expect(trashStore.count).toBe(2);
			expect(trashStore.isEmpty).toBe(false);
		});
	});

	describe('setLoading', () => {
		it('updates the loading flag', () => {
			trashStore.setLoading(true);
			expect(trashStore.loading).toBe(true);
			trashStore.setLoading(false);
			expect(trashStore.loading).toBe(false);
		});
	});

	describe('addItem', () => {
		it('prepends an item to the list', () => {
			trashStore.setItems([makeItem('1')]);
			trashStore.addItem(makeItem('2'));
			expect(trashStore.items[0].id).toBe('2');
			expect(trashStore.items[1].id).toBe('1');
			expect(trashStore.count).toBe(2);
		});

		it('works on an empty list', () => {
			trashStore.addItem(makeItem('1'));
			expect(trashStore.count).toBe(1);
			expect(trashStore.items[0].id).toBe('1');
		});
	});

	describe('removeItem', () => {
		it('removes an item by ID', () => {
			trashStore.setItems([makeItem('1'), makeItem('2'), makeItem('3')]);
			trashStore.removeItem('2');
			expect(trashStore.count).toBe(2);
			expect(trashStore.items.map(i => i.id)).toEqual(['1', '3']);
		});

		it('no-ops when ID not found', () => {
			trashStore.setItems([makeItem('1')]);
			trashStore.removeItem('nonexistent');
			expect(trashStore.count).toBe(1);
		});
	});

	describe('clear', () => {
		it('removes all items and resets loading', () => {
			trashStore.setItems([makeItem('1'), makeItem('2')]);
			trashStore.setLoading(true);
			trashStore.clear();
			expect(trashStore.items).toEqual([]);
			expect(trashStore.count).toBe(0);
			expect(trashStore.isEmpty).toBe(true);
			expect(trashStore.loading).toBe(false);
		});
	});

	describe('computed getters', () => {
		it('count reflects current item count', () => {
			expect(trashStore.count).toBe(0);
			trashStore.addItem(makeItem('1'));
			expect(trashStore.count).toBe(1);
			trashStore.addItem(makeItem('2'));
			expect(trashStore.count).toBe(2);
			trashStore.removeItem('1');
			expect(trashStore.count).toBe(1);
		});

		it('isEmpty reflects whether items exist', () => {
			expect(trashStore.isEmpty).toBe(true);
			trashStore.addItem(makeItem('1'));
			expect(trashStore.isEmpty).toBe(false);
			trashStore.removeItem('1');
			expect(trashStore.isEmpty).toBe(true);
		});
	});
});
