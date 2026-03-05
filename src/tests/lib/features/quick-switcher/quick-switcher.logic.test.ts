import { describe, it, expect } from 'vitest';
import {
	flattenFileTree,
	fuzzyMatch,
	filterAndRank,
	getRelativePath,
} from '$lib/features/quick-switcher/quick-switcher.logic';
import type { FileTreeNode } from '$lib/core/filesystem/fs.types';
import type { FileEntry } from '$lib/features/quick-switcher/quick-switcher.logic';

function makeFile(name: string, path: string): FileTreeNode {
	return { name, path, isDirectory: false };
}

function makeDir(name: string, path: string, children: FileTreeNode[]): FileTreeNode {
	return { name, path, isDirectory: true, children };
}

describe('flattenFileTree', () => {
	it('returns empty array for empty tree', () => {
		expect(flattenFileTree([])).toEqual([]);
	});

	it('flattens a flat list of files', () => {
		const tree: FileTreeNode[] = [
			makeFile('note.md', '/vault/note.md'),
			makeFile('todo.md', '/vault/todo.md'),
		];
		const result = flattenFileTree(tree);
		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({ name: 'note.md', nameWithoutExt: 'note', path: '/vault/note.md' });
		expect(result[1]).toEqual({ name: 'todo.md', nameWithoutExt: 'todo', path: '/vault/todo.md' });
	});

	it('flattens nested directories', () => {
		const tree: FileTreeNode[] = [
			makeDir('folder', '/vault/folder', [
				makeFile('nested.md', '/vault/folder/nested.md'),
				makeDir('sub', '/vault/folder/sub', [
					makeFile('deep.md', '/vault/folder/sub/deep.md'),
				]),
			]),
			makeFile('root.md', '/vault/root.md'),
		];
		const result = flattenFileTree(tree);
		expect(result).toHaveLength(3);
		expect(result.map((f) => f.name)).toEqual(['nested.md', 'deep.md', 'root.md']);
	});

	it('skips directories (only returns files)', () => {
		const tree: FileTreeNode[] = [
			makeDir('empty-folder', '/vault/empty-folder', []),
			makeFile('file.md', '/vault/file.md'),
		];
		const result = flattenFileTree(tree);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('file.md');
	});

	it('handles files without extensions', () => {
		const tree: FileTreeNode[] = [makeFile('Makefile', '/vault/Makefile')];
		const result = flattenFileTree(tree);
		expect(result[0].nameWithoutExt).toBe('Makefile');
	});

	it('handles files with multiple dots', () => {
		const tree: FileTreeNode[] = [makeFile('my.note.md', '/vault/my.note.md')];
		const result = flattenFileTree(tree);
		expect(result[0].nameWithoutExt).toBe('my.note');
	});
});

describe('fuzzyMatch', () => {
	it('matches empty query to everything', () => {
		const result = fuzzyMatch('', 'anything');
		expect(result.match).toBe(true);
		expect(result.score).toBe(0);
	});

	it('matches exact string', () => {
		const result = fuzzyMatch('hello', 'hello');
		expect(result.match).toBe(true);
	});

	it('matches prefix', () => {
		const result = fuzzyMatch('hel', 'hello world');
		expect(result.match).toBe(true);
	});

	it('matches characters in order (non-contiguous)', () => {
		const result = fuzzyMatch('hlo', 'hello');
		expect(result.match).toBe(true);
	});

	it('does not match when characters are out of order', () => {
		const result = fuzzyMatch('olh', 'hello');
		expect(result.match).toBe(false);
	});

	it('is case insensitive', () => {
		const result = fuzzyMatch('HELLO', 'hello');
		expect(result.match).toBe(true);
	});

	it('does not match when query has extra characters', () => {
		const result = fuzzyMatch('hellox', 'hello');
		expect(result.match).toBe(false);
	});

	it('scores exact prefix match better than scattered match', () => {
		const prefix = fuzzyMatch('not', 'notes');
		const scattered = fuzzyMatch('not', 'navigation-of-things');
		expect(prefix.score).toBeLessThan(scattered.score);
	});

	it('scores shorter targets better than longer ones', () => {
		const short = fuzzyMatch('test', 'test');
		const long = fuzzyMatch('test', 'test-very-long-name');
		expect(short.score).toBeLessThan(long.score);
	});
});

describe('filterAndRank', () => {
	const files: FileEntry[] = [
		{ name: 'alpha.md', nameWithoutExt: 'alpha', path: '/vault/alpha.md' },
		{ name: 'beta.md', nameWithoutExt: 'beta', path: '/vault/beta.md' },
		{ name: 'gamma.md', nameWithoutExt: 'gamma', path: '/vault/gamma.md' },
		{ name: 'delta.md', nameWithoutExt: 'delta', path: '/vault/delta.md' },
	];

	it('returns all files sorted alphabetically for empty query', () => {
		const result = filterAndRank('', files, []);
		expect(result.map((f) => f.nameWithoutExt)).toEqual(['alpha', 'beta', 'delta', 'gamma']);
	});

	it('puts recent files first for empty query', () => {
		const result = filterAndRank('', files, ['/vault/gamma.md', '/vault/alpha.md']);
		expect(result[0].nameWithoutExt).toBe('gamma');
		expect(result[1].nameWithoutExt).toBe('alpha');
		expect(result[2].nameWithoutExt).toBe('beta');
		expect(result[3].nameWithoutExt).toBe('delta');
	});

	it('filters by fuzzy match', () => {
		const result = filterAndRank('alp', files, []);
		expect(result).toHaveLength(1);
		expect(result[0].nameWithoutExt).toBe('alpha');
	});

	it('returns empty array when nothing matches', () => {
		const result = filterAndRank('xyz', files, []);
		expect(result).toHaveLength(0);
	});

	it('ranks exact prefix matches higher', () => {
		const testFiles: FileEntry[] = [
			{ name: 'damp.md', nameWithoutExt: 'damp', path: '/vault/damp.md' },
			{ name: 'delta.md', nameWithoutExt: 'delta', path: '/vault/delta.md' },
			{ name: 'documentation.md', nameWithoutExt: 'documentation', path: '/vault/documentation.md' },
		];
		const result = filterAndRank('de', testFiles, []);
		expect(result[0].nameWithoutExt).toBe('delta');
	});

	it('respects recent files priority with search query', () => {
		const result = filterAndRank('a', files, ['/vault/gamma.md']);
		// Both alpha and gamma match 'a'; gamma is recent
		const names = result.map((f) => f.nameWithoutExt);
		expect(names).toContain('alpha');
		expect(names).toContain('gamma');
		expect(names).toContain('delta');
	});
});

describe('getRelativePath', () => {
	it('strips vault path prefix', () => {
		expect(getRelativePath('/vault/notes/hello.md', '/vault')).toBe('notes/hello.md');
	});

	it('strips vault path with trailing content', () => {
		expect(getRelativePath('/vault/hello.md', '/vault')).toBe('hello.md');
	});

	it('returns original path if vault path does not match', () => {
		expect(getRelativePath('/other/hello.md', '/vault')).toBe('/other/hello.md');
	});

	it('handles vault path without leading slash in result', () => {
		expect(getRelativePath('/my/vault/sub/file.md', '/my/vault')).toBe('sub/file.md');
	});
});
