import { describe, it, expect } from 'vitest';
import {
	sortTree,
	findNodeByPath,
	getParentPath,
	getFileName,
	getFileExtension,
	isMarkdownFile,
	isCollectionFile,
	isCanvasFile,
	isKanbanFile,
	isValidFileName,
	getLanguageForFile,
	collectAllDirPaths,
	countFiles,
	generateCopyName,
	generateUniqueName,
	getRelativePath,
	validateDragDrop,
	applyFolderOrder,
	attachFileCounts,
} from '$lib/core/filesystem/fs.logic';
import type { FileTreeNode } from '$lib/core/filesystem/fs.types';

function makeNode(name: string, isDirectory: boolean, children?: FileTreeNode[], modifiedAt?: number): FileTreeNode {
	return { name, path: `/vault/${name}`, isDirectory, children, modifiedAt };
}

describe('sortTree', () => {
	it('sorts directories before files', () => {
		const nodes: FileTreeNode[] = [
			makeNode('b.md', false),
			makeNode('a-folder', true, []),
			makeNode('a.md', false),
		];
		const sorted = sortTree(nodes, 'name');
		expect(sorted[0].name).toBe('a-folder');
		expect(sorted[1].name).toBe('a.md');
		expect(sorted[2].name).toBe('b.md');
	});

	it('sorts alphabetically by name', () => {
		const nodes: FileTreeNode[] = [
			makeNode('c.md', false),
			makeNode('a.md', false),
			makeNode('b.md', false),
		];
		const sorted = sortTree(nodes, 'name');
		expect(sorted.map(n => n.name)).toEqual(['a.md', 'b.md', 'c.md']);
	});

	it('sorts by modified date (newest first)', () => {
		const nodes: FileTreeNode[] = [
			makeNode('old.md', false, undefined, 1000),
			makeNode('new.md', false, undefined, 3000),
			makeNode('mid.md', false, undefined, 2000),
		];
		const sorted = sortTree(nodes, 'modified');
		expect(sorted.map(n => n.name)).toEqual(['new.md', 'mid.md', 'old.md']);
	});

	it('recursively sorts children', () => {
		const nodes: FileTreeNode[] = [
			makeNode('folder', true, [
				makeNode('z.md', false),
				makeNode('a.md', false),
			]),
		];
		const sorted = sortTree(nodes, 'name');
		expect(sorted[0].children![0].name).toBe('a.md');
		expect(sorted[0].children![1].name).toBe('z.md');
	});

	it('does not mutate the original array', () => {
		const nodes: FileTreeNode[] = [
			makeNode('b.md', false),
			makeNode('a.md', false),
		];
		sortTree(nodes, 'name');
		expect(nodes[0].name).toBe('b.md');
	});

	it('returns empty array for empty input', () => {
		expect(sortTree([], 'name')).toEqual([]);
		expect(sortTree([], 'modified')).toEqual([]);
	});

	it('handles mixed defined and undefined modifiedAt when sorting by modified', () => {
		const nodes: FileTreeNode[] = [
			makeNode('no-date.md', false),
			makeNode('old.md', false, undefined, 1000),
			makeNode('new.md', false, undefined, 3000),
		];
		const sorted = sortTree(nodes, 'modified');
		// new (3000) first, old (1000) second, no-date (undefined → 0) last
		expect(sorted.map(n => n.name)).toEqual(['new.md', 'old.md', 'no-date.md']);
	});
});

describe('findNodeByPath', () => {
	const tree: FileTreeNode[] = [
		{
			name: 'folder',
			path: '/vault/folder',
			isDirectory: true,
			children: [
				{ name: 'nested.md', path: '/vault/folder/nested.md', isDirectory: false },
			],
		},
		{ name: 'root.md', path: '/vault/root.md', isDirectory: false },
	];

	it('finds a root-level node', () => {
		const found = findNodeByPath(tree, '/vault/root.md');
		expect(found).not.toBeNull();
		expect(found!.name).toBe('root.md');
	});

	it('finds a nested node', () => {
		const found = findNodeByPath(tree, '/vault/folder/nested.md');
		expect(found).not.toBeNull();
		expect(found!.name).toBe('nested.md');
	});

	it('finds a directory node', () => {
		const found = findNodeByPath(tree, '/vault/folder');
		expect(found).not.toBeNull();
		expect(found!.isDirectory).toBe(true);
	});

	it('returns null for non-existent path', () => {
		expect(findNodeByPath(tree, '/vault/missing.md')).toBeNull();
	});

	it('returns null for empty tree', () => {
		expect(findNodeByPath([], '/vault/file.md')).toBeNull();
	});
});

describe('getParentPath', () => {
	it('extracts parent directory from file path', () => {
		expect(getParentPath('/vault/notes/hello.md')).toBe('/vault/notes');
	});

	it('extracts parent from directory path', () => {
		expect(getParentPath('/vault/notes/subfolder')).toBe('/vault/notes');
	});

	it('returns root for top-level item', () => {
		expect(getParentPath('/vault')).toBe('/');
	});

	it('returns root for file at root level', () => {
		expect(getParentPath('/file.md')).toBe('/');
	});

	it('returns root for path without slashes', () => {
		expect(getParentPath('file.md')).toBe('/');
	});
});

describe('getFileName', () => {
	it('extracts filename from path', () => {
		expect(getFileName('/vault/notes/hello.md')).toBe('hello.md');
	});

	it('returns the string itself if no slash', () => {
		expect(getFileName('file.md')).toBe('file.md');
	});
});

describe('getFileExtension', () => {
	it('extracts extension from filename', () => {
		expect(getFileExtension('hello.md')).toBe('.md');
	});

	it('returns empty string for no extension', () => {
		expect(getFileExtension('Makefile')).toBe('');
	});

	it('handles multiple dots', () => {
		expect(getFileExtension('file.test.ts')).toBe('.ts');
	});

	it('returns empty for dot-files', () => {
		expect(getFileExtension('.gitignore')).toBe('');
	});
});

describe('isMarkdownFile', () => {
	it('returns true for .md files', () => {
		expect(isMarkdownFile('hello.md')).toBe(true);
	});

	it('returns true for .markdown files', () => {
		expect(isMarkdownFile('hello.markdown')).toBe(true);
	});

	it('returns false for other files', () => {
		expect(isMarkdownFile('hello.txt')).toBe(false);
	});

	it('is case insensitive', () => {
		expect(isMarkdownFile('hello.MD')).toBe(true);
	});
});

describe('isCollectionFile', () => {
	it('returns true for .collection files', () => {
		expect(isCollectionFile('test.collection')).toBe(true);
	});

	it('returns false for other files', () => {
		expect(isCollectionFile('test.md')).toBe(false);
		expect(isCollectionFile('test.txt')).toBe(false);
	});

	it('is case insensitive', () => {
		expect(isCollectionFile('test.COLLECTION')).toBe(true);
	});
});

describe('isCanvasFile', () => {
	it('returns true for .canvas files', () => {
		expect(isCanvasFile('test.canvas')).toBe(true);
	});

	it('returns false for other files', () => {
		expect(isCanvasFile('test.md')).toBe(false);
		expect(isCanvasFile('test.json')).toBe(false);
	});

	it('is case insensitive', () => {
		expect(isCanvasFile('test.CANVAS')).toBe(true);
	});
});

describe('isKanbanFile', () => {
	it('returns true for .kanban files', () => {
		expect(isKanbanFile('board.kanban')).toBe(true);
	});

	it('returns false for other files', () => {
		expect(isKanbanFile('test.md')).toBe(false);
		expect(isKanbanFile('test.json')).toBe(false);
	});

	it('is case insensitive', () => {
		expect(isKanbanFile('test.KANBAN')).toBe(true);
	});
});

describe('getLanguageForFile', () => {
	it('returns LanguageDescription for .js files', () => {
		const result = getLanguageForFile('script.js');
		expect(result).not.toBeNull();
		expect(result!.name).toBe('JavaScript');
	});

	it('returns LanguageDescription for .ts files', () => {
		const result = getLanguageForFile('app.ts');
		expect(result).not.toBeNull();
		expect(result!.name).toBe('TypeScript');
	});

	it('returns LanguageDescription for .py files', () => {
		const result = getLanguageForFile('main.py');
		expect(result).not.toBeNull();
		expect(result!.name).toBe('Python');
	});

	it('returns LanguageDescription for .rs files', () => {
		const result = getLanguageForFile('lib.rs');
		expect(result).not.toBeNull();
		expect(result!.name).toBe('Rust');
	});

	it('returns null for .md files', () => {
		expect(getLanguageForFile('notes.md')).toBeNull();
	});

	it('returns null for .markdown files', () => {
		expect(getLanguageForFile('readme.markdown')).toBeNull();
	});

	it('returns null for files without extension', () => {
		expect(getLanguageForFile('Makefile')).toBeNull();
	});

	it('returns null for unknown extensions', () => {
		expect(getLanguageForFile('data.xyz')).toBeNull();
	});

	it('returns YAML LanguageDescription for .collection files', () => {
		const result = getLanguageForFile('database.collection');
		expect(result).not.toBeNull();
		expect(result!.name).toBe('YAML');
	});

	it('returns JSON LanguageDescription for .canvas files', () => {
		const result = getLanguageForFile('diagram.canvas');
		expect(result).not.toBeNull();
		expect(result!.name).toBe('JSON');
	});
});

describe('isValidFileName', () => {
	it('returns true for normal filenames', () => {
		expect(isValidFileName('hello.md')).toBe(true);
	});

	it('returns true for names with spaces', () => {
		expect(isValidFileName('my notes.md')).toBe(true);
	});

	it('returns false for empty string', () => {
		expect(isValidFileName('')).toBe(false);
	});

	it('returns false for whitespace-only', () => {
		expect(isValidFileName('   ')).toBe(false);
	});

	it('returns false for dot-files', () => {
		expect(isValidFileName('.hidden')).toBe(false);
	});

	it('returns false for names with invalid characters', () => {
		expect(isValidFileName('file<name')).toBe(false);
		expect(isValidFileName('file>name')).toBe(false);
		expect(isValidFileName('file:name')).toBe(false);
		expect(isValidFileName('file"name')).toBe(false);
		expect(isValidFileName('file|name')).toBe(false);
		expect(isValidFileName('file?name')).toBe(false);
		expect(isValidFileName('file*name')).toBe(false);
	});

	it('returns false for names with path separators', () => {
		expect(isValidFileName('path/file')).toBe(false);
		expect(isValidFileName('path\\file')).toBe(false);
	});
});

describe('countFiles', () => {
	it('returns 0 for an empty directory', () => {
		expect(countFiles(makeNode('folder', true, []))).toBe(0);
	});

	it('counts direct file children', () => {
		const folder = makeNode('folder', true, [
			makeNode('a.md', false),
			makeNode('b.md', false),
			makeNode('c.md', false),
		]);
		expect(countFiles(folder)).toBe(3);
	});

	it('counts files recursively in nested directories', () => {
		const folder = makeNode('root', true, [
			makeNode('a.md', false),
			makeNode('sub', true, [
				makeNode('b.md', false),
				makeNode('deep', true, [
					makeNode('c.md', false),
					makeNode('d.md', false),
				]),
			]),
		]);
		expect(countFiles(folder)).toBe(4);
	});

	it('returns 0 for a file node', () => {
		expect(countFiles(makeNode('file.md', false))).toBe(0);
	});

	it('does not count subdirectories as files', () => {
		const folder = makeNode('root', true, [
			makeNode('sub1', true, []),
			makeNode('sub2', true, []),
			makeNode('a.md', false),
		]);
		expect(countFiles(folder)).toBe(1);
	});

	it('returns 0 for a directory with undefined children', () => {
		const folder: FileTreeNode = { name: 'empty', path: '/vault/empty', isDirectory: true };
		expect(countFiles(folder)).toBe(0);
	});
});

describe('attachFileCounts', () => {
	it('sets fileCount on directory nodes with direct files', () => {
		const tree: FileTreeNode[] = [
			makeNode('folder', true, [
				makeNode('a.md', false),
				makeNode('b.md', false),
			]),
		];
		attachFileCounts(tree);
		expect(tree[0].fileCount).toBe(2);
	});

	it('counts files recursively through nested directories', () => {
		const tree: FileTreeNode[] = [
			makeNode('root', true, [
				makeNode('sub', true, [
					makeNode('deep.md', false),
					makeNode('deep2.md', false),
				]),
				makeNode('top.md', false),
			]),
		];
		attachFileCounts(tree);
		expect(tree[0].fileCount).toBe(3);
		expect(tree[0].children![0].fileCount).toBe(2);
	});

	it('returns total file count across all root nodes', () => {
		const tree: FileTreeNode[] = [
			makeNode('a.md', false),
			makeNode('b.md', false),
			makeNode('folder', true, [
				makeNode('c.md', false),
			]),
		];
		const total = attachFileCounts(tree);
		expect(total).toBe(3);
		expect(tree[2].fileCount).toBe(1);
	});

	it('sets fileCount to 0 for empty directories', () => {
		const tree: FileTreeNode[] = [
			makeNode('empty', true, []),
		];
		attachFileCounts(tree);
		expect(tree[0].fileCount).toBe(0);
	});

	it('does not set fileCount on file nodes', () => {
		const tree: FileTreeNode[] = [
			makeNode('file.md', false),
		];
		attachFileCounts(tree);
		expect(tree[0].fileCount).toBeUndefined();
	});

	it('returns 0 for empty tree', () => {
		expect(attachFileCounts([])).toBe(0);
	});

	it('handles null/undefined input gracefully', () => {
		expect(attachFileCounts(null as unknown as FileTreeNode[])).toBe(0);
		expect(attachFileCounts(undefined as unknown as FileTreeNode[])).toBe(0);
	});

	it('does not count subdirectories as files', () => {
		const tree: FileTreeNode[] = [
			makeNode('root', true, [
				makeNode('sub1', true, []),
				makeNode('sub2', true, [
					makeNode('a.md', false),
				]),
			]),
		];
		attachFileCounts(tree);
		expect(tree[0].fileCount).toBe(1);
		expect(tree[0].children![0].fileCount).toBe(0);
		expect(tree[0].children![1].fileCount).toBe(1);
	});

	it('mutates nodes in-place', () => {
		const tree: FileTreeNode[] = [
			makeNode('folder', true, [
				makeNode('a.md', false),
			]),
		];
		const folderRef = tree[0];
		attachFileCounts(tree);
		expect(folderRef).toBe(tree[0]);
		expect(folderRef.fileCount).toBe(1);
	});
});

describe('collectAllDirPaths', () => {
	it('collects all directory paths', () => {
		const tree: FileTreeNode[] = [
			{
				name: 'a', path: '/vault/a', isDirectory: true, children: [
					{ name: 'b', path: '/vault/a/b', isDirectory: true, children: [] },
					{ name: 'f.md', path: '/vault/a/f.md', isDirectory: false },
				],
			},
			{ name: 'c', path: '/vault/c', isDirectory: true, children: [] },
			{ name: 'd.md', path: '/vault/d.md', isDirectory: false },
		];
		const paths = collectAllDirPaths(tree);
		expect(paths).toEqual(new Set(['/vault/a', '/vault/a/b', '/vault/c']));
	});

	it('returns empty set for empty tree', () => {
		expect(collectAllDirPaths([])).toEqual(new Set());
	});

	it('returns empty set for files-only tree', () => {
		const tree: FileTreeNode[] = [
			{ name: 'a.md', path: '/vault/a.md', isDirectory: false },
		];
		expect(collectAllDirPaths(tree)).toEqual(new Set());
	});
});

describe('generateCopyName', () => {
	it('generates "file copy.md" when no conflicts', () => {
		expect(generateCopyName('note.md', false, ['note.md'])).toBe('note copy.md');
	});

	it('generates "file copy 2.md" when "file copy.md" exists', () => {
		expect(generateCopyName('note.md', false, ['note.md', 'note copy.md'])).toBe('note copy 2.md');
	});

	it('generates "file copy 3.md" when copy and copy 2 exist', () => {
		expect(generateCopyName('note.md', false, ['note.md', 'note copy.md', 'note copy 2.md'])).toBe('note copy 3.md');
	});

	it('handles files without extensions', () => {
		expect(generateCopyName('Makefile', false, ['Makefile'])).toBe('Makefile copy');
	});

	it('handles directories (no extension splitting)', () => {
		expect(generateCopyName('my-folder', true, ['my-folder'])).toBe('my-folder copy');
	});

	it('handles directory name conflicts', () => {
		expect(generateCopyName('docs', true, ['docs', 'docs copy'])).toBe('docs copy 2');
	});

	it('handles files with multiple dots', () => {
		expect(generateCopyName('my.file.test.md', false, ['my.file.test.md'])).toBe('my.file.test copy.md');
	});
});

describe('generateUniqueName', () => {
	it('returns the original name when no conflict exists', () => {
		expect(generateUniqueName('Untitled.md', false, ['note.md'])).toBe('Untitled.md');
	});

	it('generates "Untitled 1.md" when "Untitled.md" already exists', () => {
		expect(generateUniqueName('Untitled.md', false, ['Untitled.md'])).toBe('Untitled 1.md');
	});

	it('increments the number until a unique name is found', () => {
		expect(generateUniqueName('Untitled.md', false, ['Untitled.md', 'Untitled 1.md', 'Untitled 2.md'])).toBe('Untitled 3.md');
	});

	it('handles directory names (no extension)', () => {
		expect(generateUniqueName('Untitled', true, ['Untitled'])).toBe('Untitled 1');
	});

	it('increments directory names correctly', () => {
		expect(generateUniqueName('Untitled', true, ['Untitled', 'Untitled 1'])).toBe('Untitled 2');
	});

	it('handles files without extensions', () => {
		expect(generateUniqueName('Makefile', false, ['Makefile'])).toBe('Makefile 1');
	});

	it('handles files with multiple dots', () => {
		expect(generateUniqueName('my.note.md', false, ['my.note.md'])).toBe('my.note 1.md');
	});

	it('returns original name for empty siblings list', () => {
		expect(generateUniqueName('Untitled.md', false, [])).toBe('Untitled.md');
	});
});

describe('validateDragDrop', () => {
	it('returns null for a valid move', () => {
		expect(validateDragDrop('/vault/file.md', '/vault/docs')).toBeNull();
	});

	it('rejects self-drop', () => {
		expect(validateDragDrop('/vault/docs', '/vault/docs')).toBe('self-drop');
	});

	it('rejects drop into own child', () => {
		expect(validateDragDrop('/vault/docs', '/vault/docs/sub')).toBe('child-of-source');
	});

	it('rejects drop into same parent directory', () => {
		expect(validateDragDrop('/vault/file.md', '/vault')).toBe('same-parent');
	});

	it('rejects missing source path', () => {
		expect(validateDragDrop('', '/vault')).toBe('missing-paths');
	});

	it('rejects missing target path', () => {
		expect(validateDragDrop('/vault/file.md', '')).toBe('missing-paths');
	});

	it('allows moving between different directories', () => {
		expect(validateDragDrop('/vault/docs/file.md', '/vault/notes')).toBeNull();
	});

	it('allows moving deeply nested items to root', () => {
		expect(validateDragDrop('/vault/a/b/c/file.md', '/vault')).toBeNull();
	});
});

describe('getRelativePath', () => {
	it('strips vault prefix correctly', () => {
		expect(getRelativePath('/vault', '/vault/notes/hello.md')).toBe('notes/hello.md');
	});

	it('returns unchanged if path does not start with vault path', () => {
		expect(getRelativePath('/vault', '/other/hello.md')).toBe('/other/hello.md');
	});

	it('handles nested paths', () => {
		expect(getRelativePath('/Users/me/vault', '/Users/me/vault/a/b/c.md')).toBe('a/b/c.md');
	});

	it('handles file directly in vault root', () => {
		expect(getRelativePath('/vault', '/vault/file.md')).toBe('file.md');
	});
});

describe('applyFolderOrder', () => {
	const vault = '/vault';

	function makeDir(name: string, children: FileTreeNode[] = [], parentPath = vault): FileTreeNode {
		return { name, path: `${parentPath}/${name}`, isDirectory: true, children };
	}

	function makeFile(name: string, parentPath = vault): FileTreeNode {
		return { name, path: `${parentPath}/${name}`, isDirectory: false };
	}

	it('reorders root folders according to the order map', () => {
		const nodes: FileTreeNode[] = [
			makeDir('Alpha'),
			makeDir('Beta'),
			makeDir('Gamma'),
			makeFile('note.md'),
		];
		const order = { '.': ['Gamma', 'Alpha', 'Beta'] };
		const result = applyFolderOrder(nodes, order, vault, vault);
		expect(result.map((n) => n.name)).toEqual(['Gamma', 'Alpha', 'Beta', 'note.md']);
	});

	it('puts unlisted folders after listed ones in original order', () => {
		const nodes: FileTreeNode[] = [
			makeDir('Alpha'),
			makeDir('Beta'),
			makeDir('Gamma'),
			makeDir('Delta'),
		];
		const order = { '.': ['Gamma', 'Alpha'] };
		const result = applyFolderOrder(nodes, order, vault, vault);
		expect(result.map((n) => n.name)).toEqual(['Gamma', 'Alpha', 'Beta', 'Delta']);
	});

	it('does not reorder files', () => {
		const nodes: FileTreeNode[] = [
			makeDir('Folder'),
			makeFile('b.md'),
			makeFile('a.md'),
		];
		const order = { '.': ['Folder'] };
		const result = applyFolderOrder(nodes, order, vault, vault);
		expect(result.map((n) => n.name)).toEqual(['Folder', 'b.md', 'a.md']);
	});

	it('is a no-op when order map is empty', () => {
		const nodes: FileTreeNode[] = [
			makeDir('Alpha'),
			makeDir('Beta'),
			makeFile('note.md'),
		];
		const result = applyFolderOrder(nodes, {}, vault, vault);
		expect(result.map((n) => n.name)).toEqual(['Alpha', 'Beta', 'note.md']);
	});

	it('is a no-op when no key matches the current directory', () => {
		const nodes: FileTreeNode[] = [
			makeDir('Alpha'),
			makeDir('Beta'),
		];
		const order = { 'other': ['Beta', 'Alpha'] };
		const result = applyFolderOrder(nodes, order, vault, vault);
		expect(result.map((n) => n.name)).toEqual(['Alpha', 'Beta']);
	});

	it('works recursively for subfolders', () => {
		const nodes: FileTreeNode[] = [
			makeDir('Projects', [
				makeDir('active', [], `${vault}/Projects`),
				makeDir('backlog', [], `${vault}/Projects`),
				makeDir('done', [], `${vault}/Projects`),
			]),
			makeDir('Archive'),
		];
		const order = {
			'.': ['Archive', 'Projects'],
			'Projects': ['done', 'backlog', 'active'],
		};
		const result = applyFolderOrder(nodes, order, vault, vault);
		expect(result[0].name).toBe('Archive');
		expect(result[1].name).toBe('Projects');
		expect(result[1].children!.map((n) => n.name)).toEqual(['done', 'backlog', 'active']);
	});

	it('ignores order entries that reference non-existent folders', () => {
		const nodes: FileTreeNode[] = [
			makeDir('Alpha'),
			makeDir('Beta'),
		];
		const order = { '.': ['NonExistent', 'Beta', 'Alpha'] };
		const result = applyFolderOrder(nodes, order, vault, vault);
		expect(result.map((n) => n.name)).toEqual(['Beta', 'Alpha']);
	});
});
