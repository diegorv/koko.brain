import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('#lib/utils/debug.js', () => ({
	debug: vi.fn(),
	error: vi.fn((_tag: string, ...args: unknown[]) => {
		console.error(...args);
	}),
	timeAsync: vi.fn((_tag: string, _label: string, fn: () => Promise<unknown>) => fn()),
	timeSync: vi.fn((_tag: string, _label: string, fn: () => unknown) => fn()),
}));

vi.mock('#lib/core/filesystem/fs.service.js', () => ({
	createFile: vi.fn(),
}));

import { createFile } from '#lib/core/filesystem/fs.service.js';
import { serializeCanvas, createEmptyCanvas } from '#lib/features/canvas/canvas.logic.js';
import { createCanvasFile } from '#lib/features/canvas/canvas.service.js';

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

	it('propagates a createFile failure to the caller', async () => {
		vi.mocked(createFile).mockRejectedValue(new Error('disk full'));

		await expect(createCanvasFile('/vault')).rejects.toThrow('disk full');
	});
});
