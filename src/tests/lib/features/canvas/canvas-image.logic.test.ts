// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	convertFileSrc: (path: string, protocol: string = 'asset') =>
		`${protocol}://localhost/${encodeURIComponent(path)}`,
}));

// Mock localStorage - vaultStore.open persists to it on module load (jsdom in
// this project doesn't ship a localStorage shim by default).
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: vi.fn((key: string) => store[key] ?? null),
		setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
		removeItem: vi.fn((key: string) => { delete store[key]; }),
		clear: vi.fn(() => { store = {}; }),
	};
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

import { isImageFile, resolveImageSrc } from '$lib/features/canvas/canvas-image.logic';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';

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

describe('resolveImageSrc', () => {
	beforeEach(() => {
		vaultStore.close();
	});

	afterEach(() => {
		vaultStore.close();
	});

	it('returns null for empty input', () => {
		expect(resolveImageSrc('')).toBeNull();
	});

	it('returns http URLs unchanged', () => {
		expect(resolveImageSrc('http://example.com/x.png')).toBe('http://example.com/x.png');
	});

	it('returns https URLs unchanged', () => {
		expect(resolveImageSrc('https://example.com/x.png')).toBe('https://example.com/x.png');
	});

	it('routes file:// URLs through convertFileSrc with the decoded path', () => {
		const result = resolveImageSrc(
			'file:///Users/me/Desktop/Screenshots/CleanShot%202026-05-19%20at%2013.41.27.png',
		);
		expect(result).toBe(
			`asset://localhost/${encodeURIComponent(
				'/Users/me/Desktop/Screenshots/CleanShot 2026-05-19 at 13.41.27.png',
			)}`,
		);
	});

	it('normalizes Windows drive paths from file:// URLs', () => {
		const result = resolveImageSrc('file:///C:/Users/me/photo.png');
		expect(result).toBe(`asset://localhost/${encodeURIComponent('C:/Users/me/photo.png')}`);
	});

	it('returns null for SMB/UNC file:// URLs (non-local host)', () => {
		expect(resolveImageSrc('file://server/share/x.png')).toBeNull();
	});

	it('accepts localhost as a file:// host', () => {
		const result = resolveImageSrc('file://localhost/Users/me/photo.png');
		expect(result).toBe(`asset://localhost/${encodeURIComponent('/Users/me/photo.png')}`);
	});

	it('returns null when a vault-relative path is given but no vault is open', () => {
		expect(resolveImageSrc('assets/photo.png')).toBeNull();
	});

	it('joins vault-relative paths with the active vault root', () => {
		vaultStore.open('/Users/me/kokobrain-vault');
		const result = resolveImageSrc('assets/photo.png');
		expect(result).toBe(
			`asset://localhost/${encodeURIComponent('/Users/me/kokobrain-vault/assets/photo.png')}`,
		);
	});

	it('is case-insensitive on the file: prefix', () => {
		const result = resolveImageSrc('FILE:///Users/me/photo.png');
		expect(result).toBe(`asset://localhost/${encodeURIComponent('/Users/me/photo.png')}`);
	});

	it('returns null for malformed file:// URLs', () => {
		// Not a valid URL - `new URL` throws.
		expect(resolveImageSrc('file://[invalid')).toBeNull();
	});
});
