import { createFile } from '$lib/core/filesystem/fs.service';
import { writeText } from '$lib/core/filesystem/fs-rust.service';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { serializeCanvas, createEmptyCanvas } from './canvas.logic';
import { error } from '$lib/utils/debug';

/**
 * Creates a new .canvas file with an empty canvas structure.
 * Returns the file path on success, or null on failure.
 */
export async function createCanvasFile(parentPath: string): Promise<string | null> {
	try {
		const vaultPath = vaultStore.path;
		if (!vaultPath) return null;
		const filePath = await createFile(parentPath, 'Untitled.canvas');
		if (!filePath) return null;
		// Write a valid empty canvas JSON (createFile writes empty string by default)
		await writeText(vaultPath, filePath, serializeCanvas(createEmptyCanvas()));
		return filePath;
	} catch (err) {
		error('CANVAS', 'Failed to create canvas file:', err);
		return null;
	}
}
