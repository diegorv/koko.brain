import { readFile } from '@tauri-apps/plugin-fs';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';

/** Image extensions we recognize */
export const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'];

/** Checks if a file path is an image */
export function isImageFile(path: string): boolean {
	const lower = path.toLowerCase();
	return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/** Maps a file extension to a MIME type */
export function extToMime(ext: string): string {
	const map: Record<string, string> = {
		png: 'image/png',
		jpg: 'image/jpeg',
		jpeg: 'image/jpeg',
		gif: 'image/gif',
		webp: 'image/webp',
		svg: 'image/svg+xml',
		bmp: 'image/bmp',
	};
	return map[ext] ?? 'image/png';
}

/** Resolves an image file path to a displayable src URL */
export async function resolveImageSrc(filePath: string): Promise<string> {
	// External URL — use directly
	if (/^https?:\/\//.test(filePath)) return filePath;

	// Local vault file — read binary and create blob URL
	const vaultPath = vaultStore.path;
	const fullPath = vaultPath ? `${vaultPath}/${filePath}` : filePath;
	const bytes = await readFile(fullPath);
	const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
	const mime = extToMime(ext);
	const blob = new Blob([bytes], { type: mime });
	return URL.createObjectURL(blob);
}
