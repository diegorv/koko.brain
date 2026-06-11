import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/plugin-fs', () => ({
	readFile: vi.fn(),
}));

import { readFile } from '@tauri-apps/plugin-fs';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { isImageFile, extToMime, resolveImageSrc } from '$lib/features/canvas/canvas-image.logic';

describe('isImageFile', () => {
	it('returns true for .png', () => {
		expect(isImageFile('photo.png')).toBe(true);
	});

	it('returns true for .jpg', () => {
		expect(isImageFile('photo.jpg')).toBe(true);
	});

	it('returns true for .jpeg', () => {
		expect(isImageFile('photo.jpeg')).toBe(true);
	});

	it('returns true for .gif', () => {
		expect(isImageFile('animation.gif')).toBe(true);
	});

	it('returns true for .webp', () => {
		expect(isImageFile('image.webp')).toBe(true);
	});

	it('returns true for .svg', () => {
		expect(isImageFile('icon.svg')).toBe(true);
	});

	it('returns true for .bmp', () => {
		expect(isImageFile('old.bmp')).toBe(true);
	});

	it('is case insensitive (.PNG)', () => {
		expect(isImageFile('PHOTO.PNG')).toBe(true);
	});

	it('is case insensitive (.Jpg)', () => {
		expect(isImageFile('Photo.Jpg')).toBe(true);
	});

	it('returns false for .md', () => {
		expect(isImageFile('notes.md')).toBe(false);
	});

	it('returns false for .txt', () => {
		expect(isImageFile('file.txt')).toBe(false);
	});

	it('returns false for .canvas', () => {
		expect(isImageFile('board.canvas')).toBe(false);
	});

	it('handles paths with directories', () => {
		expect(isImageFile('assets/images/photo.png')).toBe(true);
	});
});

describe('extToMime', () => {
	it('returns image/png for png', () => {
		expect(extToMime('png')).toBe('image/png');
	});

	it('returns image/jpeg for jpg', () => {
		expect(extToMime('jpg')).toBe('image/jpeg');
	});

	it('returns image/jpeg for jpeg', () => {
		expect(extToMime('jpeg')).toBe('image/jpeg');
	});

	it('returns image/gif for gif', () => {
		expect(extToMime('gif')).toBe('image/gif');
	});

	it('returns image/webp for webp', () => {
		expect(extToMime('webp')).toBe('image/webp');
	});

	it('returns image/svg+xml for svg', () => {
		expect(extToMime('svg')).toBe('image/svg+xml');
	});

	it('returns image/bmp for bmp', () => {
		expect(extToMime('bmp')).toBe('image/bmp');
	});

	it('falls back to image/png for unknown extension', () => {
		expect(extToMime('tiff')).toBe('image/png');
	});

	it('falls back to image/png for empty string', () => {
		expect(extToMime('')).toBe('image/png');
	});
});

describe('resolveImageSrc', () => {
	/** Captures the Blob passed to URL.createObjectURL for assertions */
	const createObjectURL = vi.fn((_blob: Blob) => 'blob:mock-url');

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		// jsdom/node do not implement createObjectURL — stub the DOM API.
		(URL as unknown as { createObjectURL: typeof createObjectURL }).createObjectURL = createObjectURL;
	});

	it('returns external http URLs unchanged without touching the filesystem', async () => {
		const result = await resolveImageSrc('http://example.com/photo.png');

		expect(result).toBe('http://example.com/photo.png');
		expect(readFile).not.toHaveBeenCalled();
	});

	it('returns external https URLs unchanged', async () => {
		const result = await resolveImageSrc('https://cdn.example.com/img.jpg');

		expect(result).toBe('https://cdn.example.com/img.jpg');
		expect(readFile).not.toHaveBeenCalled();
	});

	it('reads a vault-relative file and returns a blob URL with the right MIME', async () => {
		vaultStore.open('/vault');
		vi.mocked(readFile).mockResolvedValue(new Uint8Array([1, 2, 3]));

		const result = await resolveImageSrc('assets/pic.png');

		expect(readFile).toHaveBeenCalledWith('/vault/assets/pic.png');
		expect(result).toBe('blob:mock-url');
		const blob = createObjectURL.mock.calls[0][0] as unknown as Blob;
		expect(blob.type).toBe('image/png');
		expect(blob.size).toBe(3);
	});

	it('uses the raw path when no vault is open', async () => {
		vi.mocked(readFile).mockResolvedValue(new Uint8Array([9]));

		await resolveImageSrc('assets/pic.jpg');

		expect(readFile).toHaveBeenCalledWith('assets/pic.jpg');
		const blob = createObjectURL.mock.calls[0][0] as unknown as Blob;
		expect(blob.type).toBe('image/jpeg');
	});

	it('lowercases the extension when deriving the MIME type', async () => {
		vaultStore.open('/vault');
		vi.mocked(readFile).mockResolvedValue(new Uint8Array([0]));

		await resolveImageSrc('ICON.SVG');

		const blob = createObjectURL.mock.calls[0][0] as unknown as Blob;
		expect(blob.type).toBe('image/svg+xml');
	});

	it('falls back to image/png for paths without a known extension', async () => {
		vaultStore.open('/vault');
		vi.mocked(readFile).mockResolvedValue(new Uint8Array([0]));

		await resolveImageSrc('file.tiff');

		const blob = createObjectURL.mock.calls[0][0] as unknown as Blob;
		expect(blob.type).toBe('image/png');
	});

	it('treats an empty path as a local read with the PNG fallback MIME', async () => {
		vaultStore.open('/vault');
		vi.mocked(readFile).mockResolvedValue(new Uint8Array([]));

		const result = await resolveImageSrc('');

		expect(readFile).toHaveBeenCalledWith('/vault/');
		expect(result).toBe('blob:mock-url');
		const blob = createObjectURL.mock.calls[0][0] as unknown as Blob;
		expect(blob.type).toBe('image/png');
	});

	it('propagates readFile errors without creating a blob URL', async () => {
		vaultStore.open('/vault');
		vi.mocked(readFile).mockRejectedValue(new Error('file not found'));

		await expect(resolveImageSrc('missing.png')).rejects.toThrow('file not found');
		expect(createObjectURL).not.toHaveBeenCalled();
	});
});
