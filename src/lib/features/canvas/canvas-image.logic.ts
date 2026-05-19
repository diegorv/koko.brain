import { convertFileSrc } from '@tauri-apps/api/core';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { fileUrlToFsPath } from '$lib/utils/sanitize-url';

/** Image extensions we recognize */
export const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'];

/** Checks if a file path is an image */
export function isImageFile(path: string): boolean {
	const lower = path.toLowerCase();
	return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Resolves an image file path to a displayable `<img src>` URL.
 *
 * - `http(s)://...` is returned untouched
 * - `file://...` is parsed, validated (rejecting SMB / UNC hosts), and routed
 *   through `convertFileSrc` so the Tauri asset-protocol handler serves it
 * - Anything else is treated as a vault-relative path: joined with the active
 *   vault root and converted to an asset URL
 *
 * Returns null when the input is empty, the `file://` URL is invalid, or no
 * vault is open (for vault-relative inputs).
 */
export function resolveImageSrc(filePath: string): string | null {
	if (!filePath) return null;

	if (/^https?:\/\//i.test(filePath)) return filePath;

	if (/^file:/i.test(filePath)) {
		const fsPath = fileUrlToFsPath(filePath);
		return fsPath ? convertFileSrc(fsPath) : null;
	}

	const vaultPath = vaultStore.path;
	if (!vaultPath) return null;
	return convertFileSrc(`${vaultPath}/${filePath}`);
}
