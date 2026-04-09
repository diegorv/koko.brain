import { describe, it, expect } from 'vitest';
import { normalizePath, resolveFilePath } from '$lib/utils/path';

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
