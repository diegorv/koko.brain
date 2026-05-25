import { describe, it, expect, beforeEach } from 'vitest';
import { lifecycleFilterStore } from '$lib/features/properties/lifecycle-filter.store.svelte';

describe('lifecycleFilterStore', () => {
	beforeEach(() => {
		lifecycleFilterStore.reset();
	});

	it('starts with empty state', () => {
		expect(lifecycleFilterStore.archivedPaths.size).toBe(0);
		expect(lifecycleFilterStore.archivedCount).toBe(0);
	});

	describe('setArchivedPaths', () => {
		it('updates the path set and count', () => {
			const paths = new Set(['/vault/a.md', '/vault/b.md']);
			lifecycleFilterStore.setArchivedPaths(paths);

			expect(lifecycleFilterStore.archivedPaths).toBe(paths);
			expect(lifecycleFilterStore.archivedCount).toBe(2);
		});

		it('handles empty set', () => {
			lifecycleFilterStore.setArchivedPaths(new Set(['/vault/a.md']));
			lifecycleFilterStore.setArchivedPaths(new Set());

			expect(lifecycleFilterStore.archivedCount).toBe(0);
		});
	});

	describe('isArchived', () => {
		it('returns true for paths in the set', () => {
			lifecycleFilterStore.setArchivedPaths(new Set(['/vault/archived.md']));

			expect(lifecycleFilterStore.isArchived('/vault/archived.md')).toBe(true);
		});

		it('returns false for paths not in the set', () => {
			lifecycleFilterStore.setArchivedPaths(new Set(['/vault/archived.md']));

			expect(lifecycleFilterStore.isArchived('/vault/active.md')).toBe(false);
		});

		it('returns false when set is empty', () => {
			expect(lifecycleFilterStore.isArchived('/vault/anything.md')).toBe(false);
		});
	});

	describe('reset', () => {
		it('clears paths and count', () => {
			lifecycleFilterStore.setArchivedPaths(new Set(['/a.md', '/b.md', '/c.md']));

			lifecycleFilterStore.reset();

			expect(lifecycleFilterStore.archivedPaths.size).toBe(0);
			expect(lifecycleFilterStore.archivedCount).toBe(0);
			expect(lifecycleFilterStore.isArchived('/a.md')).toBe(false);
		});
	});
});
