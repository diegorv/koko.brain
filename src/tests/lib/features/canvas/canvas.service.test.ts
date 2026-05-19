import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('$lib/utils/debug', () => ({
	debug: vi.fn(),
	error: vi.fn((_tag: string, ...args: unknown[]) => {
		console.error(...args);
	}),
	timeAsync: vi.fn((_tag: string, _label: string, fn: () => Promise<unknown>) => fn()),
	timeSync: vi.fn((_tag: string, _label: string, fn: () => unknown) => fn()),
}));

vi.mock('$lib/core/filesystem/fs-rust.service', () => ({
	writeText: vi.fn(),
}));

vi.mock('$lib/core/filesystem/fs.service', () => ({
	createFile: vi.fn(),
}));

import { writeText } from '$lib/core/filesystem/fs-rust.service';
import { createFile } from '$lib/core/filesystem/fs.service';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { serializeCanvas, createEmptyCanvas } from '$lib/features/canvas/canvas.logic';
import { createCanvasFile } from '$lib/features/canvas/canvas.service';

describe('createCanvasFile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore.open('/vault');
	});

	it('creates file and writes empty canvas', async () => {
		vi.mocked(createFile).mockResolvedValue('/vault/Untitled.canvas');
		const expectedJson = serializeCanvas(createEmptyCanvas());

		const result = await createCanvasFile('/vault');

		expect(createFile).toHaveBeenCalledWith('/vault', 'Untitled.canvas');
		expect(writeText).toHaveBeenCalledWith('/vault', '/vault/Untitled.canvas', expectedJson);
		expect(result).toBe('/vault/Untitled.canvas');
		// Verify real logic output structure
		expect(JSON.parse(expectedJson)).toEqual({ nodes: [], edges: [] });
	});

	it('returns null when createFile returns null', async () => {
		vi.mocked(createFile).mockResolvedValue(null);

		const result = await createCanvasFile('/vault');

		expect(result).toBeNull();
		expect(writeText).not.toHaveBeenCalled();
	});

	it('returns null when no vault is open', async () => {
		vaultStore.close();

		const result = await createCanvasFile('/vault');

		expect(result).toBeNull();
		expect(createFile).not.toHaveBeenCalled();
		expect(writeText).not.toHaveBeenCalled();
	});

	it('returns null and logs error on failure', async () => {
		vi.mocked(createFile).mockRejectedValue(new Error('disk full'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const result = await createCanvasFile('/vault');

		expect(result).toBeNull();
		expect(consoleSpy).toHaveBeenCalledWith('Failed to create canvas file:', expect.any(Error));
		consoleSpy.mockRestore();
	});
});
