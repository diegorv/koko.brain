import { createFile } from '$lib/core/filesystem/fs.service';
import { serializeCanvas, createEmptyCanvas } from './canvas.logic';
import { error } from '$lib/utils/debug';

/**
 * Creates a new .canvas file with an empty canvas structure.
 * Returns the file path on success, or null on failure.
 */
export async function createCanvasFile(parentPath: string): Promise<string | null> {
	try {
		return await createFile(parentPath, 'Untitled.canvas', serializeCanvas(createEmptyCanvas()));
	} catch (err) {
		error('CANVAS', 'Failed to create canvas file:', err);
		return null;
	}
}
