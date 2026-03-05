import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
}));

import { readTextFile } from '@tauri-apps/plugin-fs';
import { loadExternalScript } from '$lib/plugins/queryjs/queryjs.service';

const mockReadTextFile = vi.mocked(readTextFile);

describe('queryjs.service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('loadExternalScript', () => {
		it('returns file contents on success', async () => {
			mockReadTextFile.mockResolvedValue('const x = 42;');

			const result = await loadExternalScript('/vault/scripts/test.js');

			expect(result).toBe('const x = 42;');
			expect(mockReadTextFile).toHaveBeenCalledWith('/vault/scripts/test.js');
		});

		it('propagates error when file does not exist', async () => {
			mockReadTextFile.mockRejectedValue(new Error('File not found'));

			await expect(loadExternalScript('/vault/missing.js')).rejects.toThrow('File not found');
		});

		it('handles empty file', async () => {
			mockReadTextFile.mockResolvedValue('');

			const result = await loadExternalScript('/vault/scripts/empty.js');

			expect(result).toBe('');
		});
	});
});
