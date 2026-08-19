import { describe, it, expect } from 'vitest';
import { basename, normalizePath, relativePath, resolveFilePath, stem, vaultRelativeKey } from '$lib/utils/path';

describe('normalizePath', () => {
	it('resolves . segments', () => {
		expect(normalizePath('/vault/./notes/./hello')).toBe('/vault/notes/hello');
	});

	it('resolves .. segments', () => {
		expect(normalizePath('/vault/notes/../hello')).toBe('/vault/hello');
	});

	it('collapses multiple slashes', () => {
		expect(normalizePath('/vault//notes///hello')).toBe('/vault/notes/hello');
	});

	it('resolves .. past root to root', () => {
		expect(normalizePath('/vault/../../..')).toBe('/');
	});

	it('handles simple absolute path', () => {
		expect(normalizePath('/vault/notes/hello')).toBe('/vault/notes/hello');
	});
});

describe('resolveFilePath', () => {
	it('joins vault path and relative file path', () => {
		expect(resolveFilePath('/Users/me/vault', 'notes/hello.md')).toBe(
			'/Users/me/vault/notes/hello.md',
		);
	});

	it('adds .md extension when no extension present', () => {
		expect(resolveFilePath('/vault', 'notes/hello')).toBe('/vault/notes/hello.md');
	});

	it('preserves existing extension', () => {
		expect(resolveFilePath('/vault', 'notes/hello.md')).toBe('/vault/notes/hello.md');
	});

	it('preserves non-md extensions', () => {
		expect(resolveFilePath('/vault', 'notes/data.canvas')).toBe('/vault/notes/data.canvas');
	});

	it('handles trailing slash on vault path', () => {
		expect(resolveFilePath('/vault/', 'notes/hello')).toBe('/vault/notes/hello.md');
	});

	it('handles leading slash on file path', () => {
		expect(resolveFilePath('/vault', '/notes/hello')).toBe('/vault/notes/hello.md');
	});

	it('handles both trailing and leading slashes', () => {
		expect(resolveFilePath('/vault/', '/notes/hello.md')).toBe('/vault/notes/hello.md');
	});

	it('handles file in vault root', () => {
		expect(resolveFilePath('/vault', 'hello')).toBe('/vault/hello.md');
	});

	it('handles file with dot in directory name', () => {
		expect(resolveFilePath('/vault', 'notes.archive/hello')).toBe(
			'/vault/notes.archive/hello.md',
		);
	});

	it('throws on path traversal with ..', () => {
		expect(() => resolveFilePath('/vault', '../../../etc/passwd')).toThrow(
			'Path traversal detected',
		);
	});

	it('throws on path traversal with nested ..', () => {
		expect(() => resolveFilePath('/vault', 'notes/../../..')).toThrow(
			'Path traversal detected',
		);
	});

	it('throws on path traversal that escapes by one level', () => {
		expect(() => resolveFilePath('/vault', '../secret.md')).toThrow(
			'Path traversal detected',
		);
	});

	it('allows .. that stays within vault', () => {
		expect(resolveFilePath('/vault', 'notes/../hello')).toBe('/vault/hello.md');
	});

	it('allows .. in subdirectory that stays within vault', () => {
		expect(resolveFilePath('/vault', 'a/b/../c/note.md')).toBe('/vault/a/c/note.md');
	});

	it('throws on folderPath with traversal (meta-bind scenario)', () => {
		expect(() => resolveFilePath('/vault', '../../../etc/malicious')).toThrow(
			'Path traversal detected',
		);
	});

	it('handles folderPath + fileName combination safely', () => {
		expect(resolveFilePath('/vault', 'subfolder/note')).toBe('/vault/subfolder/note.md');
	});
});

describe('basename', () => {
	it('extracts the last segment with its extension', () => {
		expect(basename('/vault/notes/hello.md')).toBe('hello.md');
	});

	it('returns the input when there is no separator', () => {
		expect(basename('file.md')).toBe('file.md');
	});

	it('returns an empty string for a trailing slash', () => {
		expect(basename('/')).toBe('');
	});

	it('returns an empty string for an empty path', () => {
		expect(basename('')).toBe('');
	});
});

describe('stem', () => {
	it('drops the extension', () => {
		expect(stem('/vault/My Note.md')).toBe('My Note');
	});

	it('drops a multi-character extension', () => {
		expect(stem('/vault/Note.markdown')).toBe('Note');
	});

	it('keeps a name that has no extension', () => {
		expect(stem('/vault/README')).toBe('README');
	});

	it('keeps a dotfile name intact', () => {
		expect(stem('/vault/.gitignore')).toBe('.gitignore');
	});

	it('returns an empty string for a trailing slash', () => {
		expect(stem('/vault/folder/')).toBe('');
	});
});

describe('relativePath', () => {
	it('strips the vault prefix from a nested file', () => {
		expect(relativePath('/vault', '/vault/notes/hello.md')).toBe('notes/hello.md');
	});

	it('strips the vault prefix from a file in the vault root', () => {
		expect(relativePath('/vault', '/vault/file.md')).toBe('file.md');
	});

	it('handles a multi-segment vault path', () => {
		expect(relativePath('/my/vault', '/my/vault/sub/file.md')).toBe('sub/file.md');
	});

	it('returns the original path when it is outside the vault', () => {
		expect(relativePath('/vault', '/other/file.md')).toBe('/other/file.md');
	});

	it('returns the original path for a sibling directory sharing the vault prefix', () => {
		expect(relativePath('/vault', '/vaulted/note.md')).toBe('/vaulted/note.md');
	});

	it('returns the path unchanged when it equals the vault path', () => {
		expect(relativePath('/vault', '/vault')).toBe('/vault');
	});
});

describe('vaultRelativeKey', () => {
	it('strips the vault prefix from a nested file', () => {
		expect(vaultRelativeKey('/vault', '/vault/notes/a.md')).toBe('notes/a.md');
	});

	it('strips the vault prefix from a file in the vault root', () => {
		expect(vaultRelativeKey('/vault', '/vault/a.md')).toBe('a.md');
	});

	it('returns null for a path outside the vault', () => {
		expect(vaultRelativeKey('/vault', '/other/a.md')).toBeNull();
	});

	it('returns null for a sibling directory sharing the vault prefix', () => {
		// Falling back to the absolute path here would corrupt the
		// vault-relative-keyed FTS5 and semantic tables.
		expect(vaultRelativeKey('/vault', '/vaulted/a.md')).toBeNull();
	});

	it('returns null for the vault path itself', () => {
		expect(vaultRelativeKey('/vault', '/vault')).toBeNull();
	});
});
