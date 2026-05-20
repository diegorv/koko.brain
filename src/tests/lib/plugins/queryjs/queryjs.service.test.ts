import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('$lib/core/filesystem/fs-rust.service', () => ({
	readText: vi.fn(),
}));

import { readText } from '$lib/core/filesystem/fs-rust.service';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { loadExternalScript } from '$lib/plugins/queryjs/queryjs.service';

const mockReadText = vi.mocked(readText);

describe('queryjs.service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
	});

	describe('loadExternalScript', () => {
		it('returns file contents on success', async () => {
			vaultStore.open('/vault');
			mockReadText.mockResolvedValue('const x = 42;');

			const result = await loadExternalScript('/vault/scripts/test.js');

			expect(result).toBe('const x = 42;');
			expect(mockReadText).toHaveBeenCalledWith('/vault', '/vault/scripts/test.js');
		});

		it('propagates error when file does not exist', async () => {
			vaultStore.open('/vault');
			mockReadText.mockRejectedValue(new Error('File not found'));

			await expect(loadExternalScript('/vault/missing.js')).rejects.toThrow('File not found');
		});

		it('handles empty file', async () => {
			vaultStore.open('/vault');
			mockReadText.mockResolvedValue('');

			const result = await loadExternalScript('/vault/scripts/empty.js');

			expect(result).toBe('');
		});

		it('throws when no vault is open', async () => {
			await expect(loadExternalScript('/vault/scripts/test.js')).rejects.toThrow(
				/no vault is open/,
			);
			expect(mockReadText).not.toHaveBeenCalled();
		});
	});
});
