import { describe, it, expect } from 'vitest';
import { findFolderNote, buildContentOrderMap } from '$lib/features/folder-notes/folder-notes.logic';
import type { FileTreeNode } from '$lib/core/filesystem/fs.types';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

function makeFile(name: string, path: string): FileTreeNode {
	return { name, path, isDirectory: false };
}

function makeDir(name: string, path: string, children: FileTreeNode[] = []): FileTreeNode {
	return { name, path, isDirectory: true, children };
}

describe('findFolderNote', () => {
	it('returns the path when a matching .md file exists', () => {
		const children = [
			makeFile('projects.md', '/vault/projects/projects.md'),
			makeFile('other.md', '/vault/projects/other.md'),
		];
		expect(findFolderNote('projects', children)).toBe('/vault/projects/projects.md');
	});

	it('returns null when no matching file exists', () => {
		const children = [
			makeFile('readme.md', '/vault/projects/readme.md'),
			makeFile('notes.md', '/vault/projects/notes.md'),
		];
		expect(findFolderNote('projects', children)).toBeNull();
	});

	it('returns null for empty children array', () => {
		expect(findFolderNote('projects', [])).toBeNull();
	});

	it('ignores directories with the same name', () => {
		const children = [
			makeDir('projects.md', '/vault/projects/projects.md'),
		];
		expect(findFolderNote('projects', children)).toBeNull();
	});

	it('matches only exact folder name + .md extension', () => {
		const children = [
			makeFile('projects.markdown', '/vault/projects/projects.markdown'),
			makeFile('projects.txt', '/vault/projects/projects.txt'),
			makeFile('projects-notes.md', '/vault/projects/projects-notes.md'),
		];
		expect(findFolderNote('projects', children)).toBeNull();
	});

	it('handles folder names with spaces', () => {
		const children = [
			makeFile('My Projects.md', '/vault/My Projects/My Projects.md'),
		];
		expect(findFolderNote('My Projects', children)).toBe('/vault/My Projects/My Projects.md');
	});

	it('returns the first match when there are multiple (edge case)', () => {
		const children = [
			makeFile('docs.md', '/vault/docs/docs.md'),
		];
		expect(findFolderNote('docs', children)).toBe('/vault/docs/docs.md');
	});

	it('handles empty folder name', () => {
		const children = [
			makeFile('.md', '/vault/folder/.md'),
			makeFile('note.md', '/vault/folder/note.md'),
		];
		expect(findFolderNote('', children)).toBe('/vault/folder/.md');
	});

	it('returns null when children have no .md files', () => {
		const children = [
			makeDir('subfolder', '/vault/folder/subfolder'),
			makeFile('readme.txt', '/vault/folder/readme.txt'),
		];
		expect(findFolderNote('folder', children)).toBeNull();
	});
});

describe('buildContentOrderMap', () => {
	it('extracts _order from frontmatter', () => {
		const entries = [
			entryV2('/vault/a.md', { frontmatter: { _order: 10 } }),
			entryV2('/vault/b.md', { frontmatter: { _order: 5 } }),
		];
		const map = buildContentOrderMap(entries);
		expect(map.get('/vault/a.md')).toBe(10);
		expect(map.get('/vault/b.md')).toBe(5);
	});

	it('skips entries without _order', () => {
		const entries = [
			entryV2('/vault/a.md', { frontmatter: { title: 'A' } }),
			entryV2('/vault/b.md', { frontmatter: { _order: 3 } }),
		];
		const map = buildContentOrderMap(entries);
		expect(map.has('/vault/a.md')).toBe(false);
		expect(map.get('/vault/b.md')).toBe(3);
	});

	it('handles string _order values', () => {
		const entries = [
			entryV2('/vault/a.md', { frontmatter: { _order: '7' } }),
		];
		const map = buildContentOrderMap(entries);
		expect(map.get('/vault/a.md')).toBe(7);
	});

	it('skips non-numeric _order values', () => {
		const entries = [
			entryV2('/vault/a.md', { frontmatter: { _order: 'abc' } }),
			entryV2('/vault/b.md', { frontmatter: { _order: NaN } }),
		];
		const map = buildContentOrderMap(entries);
		expect(map.size).toBe(0);
	});

	it('indexes folder notes under both file and directory paths', () => {
		const entries = [
			entryV2('/vault/Projects/Projects.md', { frontmatter: { _order: 1 } }),
		];
		const map = buildContentOrderMap(entries);
		expect(map.get('/vault/Projects/Projects.md')).toBe(1);
		expect(map.get('/vault/Projects')).toBe(1);
	});

	it('returns empty map for entries without _order', () => {
		const entries = [
			entryV2('/vault/a.md', { frontmatter: {} }),
			entryV2('/vault/b.md', { frontmatter: { title: 'B' } }),
		];
		const map = buildContentOrderMap(entries);
		expect(map.size).toBe(0);
	});
});
