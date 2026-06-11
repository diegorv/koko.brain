import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { lifecycleFilterStore } from '$lib/features/properties/lifecycle-filter.store.svelte';
import { refreshArchivedPaths } from '$lib/features/properties/lifecycle-filter.service';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

describe('refreshArchivedPaths', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		lifecycleFilterStore.reset();
	});

	it('builds the archived path set from provided entries without an IPC call', async () => {
		const entries = [
			entryV2('/vault/a.md', { archived: true }),
			entryV2('/vault/b.md'),
			entryV2('/vault/sub/c.md', { archived: true }),
		];

		await refreshArchivedPaths(entries);

		expect(invoke).not.toHaveBeenCalled();
		expect(lifecycleFilterStore.archivedPaths).toEqual(
			new Set(['/vault/a.md', '/vault/sub/c.md']),
		);
		expect(lifecycleFilterStore.archivedCount).toBe(2);
		expect(lifecycleFilterStore.isArchived('/vault/a.md')).toBe(true);
		expect(lifecycleFilterStore.isArchived('/vault/b.md')).toBe(false);
	});

	it('fetches entries via get_all_vault_entries_v2 when none are provided', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([
			entryV2('/vault/archived.md', { archived: true }),
			entryV2('/vault/active.md'),
		]);

		await refreshArchivedPaths();

		expect(invoke).toHaveBeenCalledWith('get_all_vault_entries_v2');
		expect(lifecycleFilterStore.archivedPaths).toEqual(new Set(['/vault/archived.md']));
		expect(lifecycleFilterStore.archivedCount).toBe(1);
		expect(lifecycleFilterStore.isArchived('/vault/archived.md')).toBe(true);
	});

	it('clears a previously populated set when no entries are archived', async () => {
		lifecycleFilterStore.setArchivedPaths(new Set(['/vault/old.md']));

		await refreshArchivedPaths([entryV2('/vault/a.md'), entryV2('/vault/b.md')]);

		expect(lifecycleFilterStore.archivedPaths.size).toBe(0);
		expect(lifecycleFilterStore.archivedCount).toBe(0);
		expect(lifecycleFilterStore.isArchived('/vault/old.md')).toBe(false);
	});

	it('handles an empty entries array', async () => {
		await refreshArchivedPaths([]);

		expect(lifecycleFilterStore.archivedPaths.size).toBe(0);
		expect(lifecycleFilterStore.archivedCount).toBe(0);
	});

	it('propagates IPC errors and leaves the store untouched', async () => {
		lifecycleFilterStore.setArchivedPaths(new Set(['/vault/prior.md']));
		vi.mocked(invoke).mockRejectedValueOnce(new Error('IPC failure'));

		await expect(refreshArchivedPaths()).rejects.toThrow('IPC failure');

		// No partial/corrupt update on error — prior state preserved.
		expect(lifecycleFilterStore.archivedPaths).toEqual(new Set(['/vault/prior.md']));
		expect(lifecycleFilterStore.archivedCount).toBe(1);
	});
});
