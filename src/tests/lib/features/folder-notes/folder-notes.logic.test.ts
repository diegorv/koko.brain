import { describe, it, expect } from 'vitest';
import { findFolderNote } from '$lib/features/folder-notes/folder-notes.logic';
import type { FileTreeNode } from '$lib/core/filesystem/fs.types';

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
