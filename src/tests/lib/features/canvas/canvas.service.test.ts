import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/utils/debug', () => ({
	debug: vi.fn(),
	error: vi.fn((_tag: string, ...args: unknown[]) => {
		console.error(...args);
	}),
	timeAsync: vi.fn((_tag: string, _label: string, fn: () => Promise<unknown>) => fn()),
	timeSync: vi.fn((_tag: string, _label: string, fn: () => unknown) => fn()),
}));

vi.mock('$lib/core/filesystem/fs.service', () => ({
	createFile: vi.fn(),
}));

import { createFile } from '$lib/core/filesystem/fs.service';
import { serializeCanvas, createEmptyCanvas } from '$lib/features/canvas/canvas.logic';
import { createCanvasFile } from '$lib/features/canvas/canvas.service';

describe('createCanvasFile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('creates the file with the empty canvas JSON as initial content', async () => {
		vi.mocked(createFile).mockResolvedValue('/vault/Untitled.canvas');
		const expectedJson = serializeCanvas(createEmptyCanvas());

		const result = await createCanvasFile('/vault');

		// Content goes through createFile (one step) so the Rust create_note
		// indexes the real canvas body, not an empty file.
		expect(createFile).toHaveBeenCalledWith('/vault', 'Untitled.canvas', expectedJson);
		expect(result).toBe('/vault/Untitled.canvas');
		// Verify real logic output structure
		expect(JSON.parse(expectedJson)).toEqual({ nodes: [], edges: [] });
	});

	it('returns null when createFile returns null', async () => {
		vi.mocked(createFile).mockResolvedValue(null);

		const result = await createCanvasFile('/vault');

		expect(result).toBeNull();
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
