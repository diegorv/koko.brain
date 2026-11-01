import { describe, it, expect } from 'vitest';
import {
	getNoteName,
	resolveWikilink,
	buildResolutionCache,
	resolveWikilinkCached,
} from '#lib/core/filesystem/wikilink-resolution.logic.js';

describe('getNoteName', () => {
	it('extracts name from a simple path', () => {
		expect(getNoteName('/vault/My Note.md')).toBe('My Note');
	});

	it('extracts name from a nested path', () => {
		expect(getNoteName('/vault/folder/subfolder/Note.md')).toBe('Note');
	});

	it('handles files without extension', () => {
		expect(getNoteName('/vault/README')).toBe('README');
	});

	it('handles .markdown extension', () => {
		expect(getNoteName('/vault/Note.markdown')).toBe('Note');
	});
});

describe('resolveWikilink', () => {
	const allPaths = [
		'/vault/Note A.md',
		'/vault/folder/Note B.md',
		'/vault/Daily/2024-01-01.md',
	];

	it('resolves an exact match', () => {
		expect(resolveWikilink('Note A', allPaths)).toBe('/vault/Note A.md');
	});

	it('resolves case-insensitively', () => {
		expect(resolveWikilink('note a', allPaths)).toBe('/vault/Note A.md');
	});

	it('resolves a nested file', () => {
		expect(resolveWikilink('Note B', allPaths)).toBe('/vault/folder/Note B.md');
	});

	it('returns null for no match', () => {
		expect(resolveWikilink('Nonexistent', allPaths)).toBeNull();
	});

	it('returns null for empty target', () => {
		expect(resolveWikilink('', allPaths)).toBeNull();
	});

	it('resolves full-path wikilink targets', () => {
		expect(resolveWikilink('folder/Note B', allPaths)).toBe('/vault/folder/Note B.md');
		expect(resolveWikilink('Daily/2024-01-01', allPaths)).toBe('/vault/Daily/2024-01-01.md');
	});

	it('resolves deeply nested path targets by basename', () => {
		const paths = ['/vault/a/b/c/Deep.md'];
		expect(resolveWikilink('a/b/c/Deep', paths)).toBe('/vault/a/b/c/Deep.md');
	});
});

describe('buildResolutionCache', () => {
	it('builds a map from lowercase note name to file path', () => {
		const cache = buildResolutionCache(['/vault/Note A.md', '/vault/folder/Note B.md']);
		expect(cache.get('note a')).toBe('/vault/Note A.md');
		expect(cache.get('note b')).toBe('/vault/folder/Note B.md');
	});

	it('keeps the first path on name collisions', () => {
		const cache = buildResolutionCache(['/vault/a/Note.md', '/vault/b/Note.md']);
		expect(cache.get('note')).toBe('/vault/a/Note.md');
	});

	it('returns an empty map for empty input', () => {
		const cache = buildResolutionCache([]);
		expect(cache.size).toBe(0);
	});
});

describe('resolveWikilinkCached', () => {
	const allPaths = [
		'/vault/Note A.md',
		'/vault/folder/Note B.md',
		'/vault/Daily/2024-01-01.md',
	];
	const cache = buildResolutionCache(allPaths);

	it('resolves an exact match', () => {
		expect(resolveWikilinkCached('Note A', cache)).toBe('/vault/Note A.md');
	});

	it('resolves case-insensitively', () => {
		expect(resolveWikilinkCached('note a', cache)).toBe('/vault/Note A.md');
	});

	it('resolves a nested file', () => {
		expect(resolveWikilinkCached('Note B', cache)).toBe('/vault/folder/Note B.md');
	});

	it('returns null for no match', () => {
		expect(resolveWikilinkCached('Nonexistent', cache)).toBeNull();
	});

	it('returns null for empty target', () => {
		expect(resolveWikilinkCached('', cache)).toBeNull();
	});

	it('resolves full-path wikilink targets by basename', () => {
		expect(resolveWikilinkCached('folder/Note B', cache)).toBe('/vault/folder/Note B.md');
		expect(resolveWikilinkCached('Daily/2024-01-01', cache)).toBe('/vault/Daily/2024-01-01.md');
	});
});
