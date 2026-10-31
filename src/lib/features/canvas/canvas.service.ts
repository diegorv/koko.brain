import { createFile } from '#lib/core/filesystem/fs.service.js';
import { serializeCanvas, createEmptyCanvas } from './canvas.logic';

/**
 * Creates a new .canvas file with an empty canvas structure.
 * Returns the file path; a failure propagates from `createFile`.
 */
export async function createCanvasFile(parentPath: string): Promise<string> {
	return createFile(parentPath, 'Untitled.canvas', serializeCanvas(createEmptyCanvas()));
}
