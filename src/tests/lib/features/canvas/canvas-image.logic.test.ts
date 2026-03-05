import { describe, it, expect } from 'vitest';
import { isImageFile, extToMime } from '$lib/features/canvas/canvas-image.logic';

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
