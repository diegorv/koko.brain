import { describe, it, expect } from 'vitest';
import {
	findNodeByPath,
	findFileNode,
	getParentPath,
	renamedPath,
	getFileName,
	getFileExtension,
	isMarkdownFile,
	isViewFile,
	isCanvasFile,
	isKanbanFile,
	isBinaryFile,
	isValidFileName,
	getFileNameError,
	fileOperationErrorMessage,
	PreDeleteSaveError,
	getLanguageForFile,
	collectAllDirPaths,
	collectFilePathsUnder,
	countFiles,
	generateCopyName,
	generateUniqueName,
	getRelativePath,
	validateDragDrop,
	applyFolderOrder,
	removeNodeByPath,
	resolveRescanParents,
	naturalCompare,
	compareTreeNodes,
	insertTreeNode,
	moveTreeNode,
	type TreeOrder,
} from '#lib/core/filesystem/fs.logic.js';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
import sortParity from '../../../fixtures/natural-sort-parity.fixture.json';

function makeNode(name: string, isDirectory: boolean, children?: FileTreeNode[]): FileTreeNode {
	return { name, path: `/vault/${name}`, isDirectory, children };
}

describe('findFileNode', () => {
	const tree: FileTreeNode[] = [
		{
			name: 'folder',
			path: '/vault/folder',
			isDirectory: true,
			children: [
				{ name: 'sub', path: '/vault/folder/sub', isDirectory: true, children: [
					{ name: 'deep.md', path: '/vault/folder/sub/deep.md', isDirectory: false },
				] },
				{ name: 'nested.md', path: '/vault/folder/nested.md', isDirectory: false },
			],
		},
		{ name: 'root.md', path: '/vault/root.md', isDirectory: false },
	];

	it('finds a root-level and a nested file', () => {
		expect(findFileNode(tree, '/vault', '/vault/root.md')).toBe(tree[1]);
		expect(findFileNode(tree, '/vault', '/vault/folder/sub/deep.md')!.name).toBe('deep.md');
	});

	it('returns null for a directory path', () => {
		expect(findFileNode(tree, '/vault', '/vault/folder')).toBeNull();
		expect(findFileNode(tree, '/vault', '/vault/folder/sub')).toBeNull();
	});

	it('returns null for a path the tree lacks', () => {
		expect(findFileNode(tree, '/vault', '/vault/folder/missing.md')).toBeNull();
		expect(findFileNode(tree, '/vault', '/vault/new/a.md')).toBeNull();
		expect(findFileNode(tree, '/vault', '/vault/root.md/x')).toBeNull();
	});

	it('returns null for the vault root, a path outside it and an empty tree', () => {
		expect(findFileNode(tree, '/vault', '/vault')).toBeNull();
		expect(findFileNode(tree, '/vault', '/vaultx/root.md')).toBeNull();
		expect(findFileNode(tree, '/vault', '/other/root.md')).toBeNull();
		expect(findFileNode([], '/vault', '/vault/root.md')).toBeNull();
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

describe('renamedPath', () => {
	it('puts the new name in the old path\'s folder', () => {
		expect(renamedPath('/vault/notes/Standup.md', 'Daily sync.md')).toBe('/vault/notes/Daily sync.md');
	});

	it('keeps a vault-root note at the root', () => {
		expect(renamedPath('/vault/Standup.md', 'Retro.md')).toBe('/vault/Retro.md');
	});

	it('returns the old path for the same name', () => {
		expect(renamedPath('/vault/Standup.md', 'Standup.md')).toBe('/vault/Standup.md');
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

describe('isViewFile', () => {
	it('returns true for .view files', () => {
		expect(isViewFile('test.view')).toBe(true);
	});

	it('returns false for other files', () => {
		expect(isViewFile('test.md')).toBe(false);
		expect(isViewFile('test.collection')).toBe(false);
	});

	it('is case insensitive', () => {
		expect(isViewFile('test.VIEW')).toBe(true);
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

describe('isBinaryFile', () => {
	it('returns true for image extensions', () => {
		for (const ext of ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico', 'avif', 'heic', 'tiff', 'tif']) {
			expect(isBinaryFile(`asset.${ext}`)).toBe(true);
		}
	});

	it('returns true for audio extensions', () => {
		for (const ext of ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'opus']) {
			expect(isBinaryFile(`song.${ext}`)).toBe(true);
		}
	});

	it('returns true for video extensions', () => {
		for (const ext of ['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v']) {
			expect(isBinaryFile(`clip.${ext}`)).toBe(true);
		}
	});

	it('returns true for document and archive extensions', () => {
		for (const ext of ['pdf', 'zip', 'tar', 'gz', '7z', 'rar']) {
			expect(isBinaryFile(`bundle.${ext}`)).toBe(true);
		}
	});

	it('returns false for text and markdown extensions', () => {
		expect(isBinaryFile('note.md')).toBe(false);
		expect(isBinaryFile('readme.markdown')).toBe(false);
		expect(isBinaryFile('script.js')).toBe(false);
		expect(isBinaryFile('config.json')).toBe(false);
		expect(isBinaryFile('plain.txt')).toBe(false);
		expect(isBinaryFile('board.kanban')).toBe(false);
		expect(isBinaryFile('view.collection')).toBe(false);
		expect(isBinaryFile('graph.canvas')).toBe(false);
	});

	it('is case insensitive', () => {
		expect(isBinaryFile('Photo.PNG')).toBe(true);
		expect(isBinaryFile('SONG.Mp3')).toBe(true);
		expect(isBinaryFile('Doc.PDF')).toBe(true);
	});

	it('handles full paths, not just bare names', () => {
		expect(isBinaryFile('/abs/Resources/img/9902bb9ff321.png')).toBe(true);
		expect(isBinaryFile('Resources/img/9902bb9ff321.png')).toBe(true);
	});

	it('returns false for files with no extension', () => {
		expect(isBinaryFile('Makefile')).toBe(false);
		expect(isBinaryFile('LICENSE')).toBe(false);
	});

	it('returns false for empty string', () => {
		expect(isBinaryFile('')).toBe(false);
	});

	it('returns false for unknown extensions', () => {
		expect(isBinaryFile('weird.xyz')).toBe(false);
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

	it('returns YAML LanguageDescription for .view files', () => {
		const result = getLanguageForFile('database.view');
		expect(result).not.toBeNull();
		expect(result!.name).toBe('YAML');
	});

	it('returns null for .collection files, like any unknown extension', () => {
		expect(getLanguageForFile('database.collection')).toBeNull();
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

describe('getFileNameError', () => {
	it('returns null for a valid name', () => {
		expect(getFileNameError('my notes.md')).toBeNull();
	});

	it('rejects an empty or whitespace-only name', () => {
		expect(getFileNameError('')).toBe('Name cannot be empty');
		expect(getFileNameError('   ')).toBe('Name cannot be empty');
	});

	it('rejects a leading dot', () => {
		expect(getFileNameError('.hidden')).toBe('Name cannot start with "."');
	});

	it('names the forbidden character it found', () => {
		expect(getFileNameError('a:b.md')).toBe('Name cannot contain ":"');
		expect(getFileNameError('a/b.md')).toBe('Name cannot contain "/"');
		expect(getFileNameError('what?.md')).toBe('Name cannot contain "?"');
		expect(getFileNameError('a\\b')).toBe('Name cannot contain "\\"');
	});

	it('rejects control characters without echoing them', () => {
		expect(getFileNameError('a\tb.md')).toBe('Name cannot contain control characters');
	});
});

describe('PreDeleteSaveError', () => {
	it('names the note whose save failed and keeps its path', () => {
		const err = new PreDeleteSaveError('/vault/a.md');
		expect(err).toBeInstanceOf(Error);
		expect(err.path).toBe('/vault/a.md');
		expect(err.message).toBe('Could not save "/vault/a.md" before moving it to the Trash');
	});
});

describe('fileOperationErrorMessage', () => {
	it('names the operation, the item and the Error message', () => {
		expect(fileOperationErrorMessage('rename', 'a.md', new Error('"b.md" already exists in this folder')))
			.toBe('Could not rename "a.md": "b.md" already exists in this folder');
	});

	it('uses a thrown string as the reason (Tauri plugin errors are strings)', () => {
		expect(fileOperationErrorMessage('move', 'a.md', 'Permission denied (os error 13)'))
			.toBe('Could not move "a.md": Permission denied (os error 13)');
	});

	it('puts the name where the action places {name}', () => {
		expect(fileOperationErrorMessage('move {name} to the Trash', 'a.md', 'trash is not writable'))
			.toBe('Could not move "a.md" to the Trash: trash is not writable');
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

describe('resolveRescanParents', () => {
	const tree: FileTreeNode[] = [
		{
			name: 'docs', path: '/vault/docs', isDirectory: true, children: [
				{ name: 'sub', path: '/vault/docs/sub', isDirectory: true, children: [] },
			],
		},
		{ name: 'other', path: '/vault/other', isDirectory: true, children: [] },
	];

	it('keeps a parent that is already in the tree', () => {
		expect(resolveRescanParents(['/vault/docs/sub/a.md'], '/vault', tree)).toEqual(['/vault/docs/sub']);
	});

	it('keeps the vault root for a file directly under it', () => {
		expect(resolveRescanParents(['/vault/a.md'], '/vault', tree)).toEqual(['/vault']);
	});

	it('walks a missing parent up to the nearest folder in the tree', () => {
		expect(resolveRescanParents(['/vault/docs/new-a/new-b/f.md'], '/vault', tree)).toEqual(['/vault/docs']);
	});

	it('walks up to the vault root when no ancestor is in the tree', () => {
		expect(resolveRescanParents(['/vault/fresh/deep/f.md'], '/vault', tree)).toEqual(['/vault']);
	});

	it('deduplicates parents that collapse to the same ancestor', () => {
		const paths = ['/vault/docs/x/1.md', '/vault/docs/y/2.md', '/vault/docs/x/3.md'];
		expect(resolveRescanParents(paths, '/vault', tree)).toEqual(['/vault/docs']);
	});

	it('drops a parent nested under another parent in the set', () => {
		const paths = ['/vault/docs/sub/a.md', '/vault/docs/b.md', '/vault/other/c.md'];
		expect(resolveRescanParents(paths, '/vault', tree)).toEqual(['/vault/docs', '/vault/other']);
	});

	it('collapses everything into the vault root when the root is rescanned', () => {
		const paths = ['/vault/docs/sub/a.md', '/vault/new/b.md'];
		expect(resolveRescanParents(paths, '/vault', tree)).toEqual(['/vault']);
	});

	it('skips paths outside the vault, including a sibling sharing its prefix', () => {
		expect(resolveRescanParents(['/elsewhere/a.md', '/vault2/b.md'], '/vault', tree)).toEqual([]);
	});

	it('returns an empty list for no paths', () => {
		expect(resolveRescanParents([], '/vault', tree)).toEqual([]);
	});

	it('walks up to the vault root on an empty tree', () => {
		expect(resolveRescanParents(['/vault/docs/a.md'], '/vault', [])).toEqual(['/vault']);
	});
});

describe('collectFilePathsUnder', () => {
	const tree: FileTreeNode[] = [
		{
			name: 'dir', path: '/vault/dir', isDirectory: true, children: [
				{ name: 'a.md', path: '/vault/dir/a.md', isDirectory: false },
				{
					name: 'nested', path: '/vault/dir/nested', isDirectory: true, children: [
						{ name: 'c.md', path: '/vault/dir/nested/c.md', isDirectory: false },
					],
				},
				{ name: 'b.md', path: '/vault/dir/b.md', isDirectory: false },
			],
		},
		{ name: 'empty', path: '/vault/empty', isDirectory: true, children: [] },
		{ name: 'dirty.md', path: '/vault/dirty.md', isDirectory: false },
	];

	it('collects every file under a directory, recursively', () => {
		expect(collectFilePathsUnder(tree, '/vault/dir')).toEqual([
			'/vault/dir/a.md',
			'/vault/dir/nested/c.md',
			'/vault/dir/b.md',
		]);
	});

	it('returns an empty array for a directory with no children', () => {
		expect(collectFilePathsUnder(tree, '/vault/empty')).toEqual([]);
	});

	it('returns an empty array for a path that is not in the tree', () => {
		expect(collectFilePathsUnder(tree, '/vault/missing')).toEqual([]);
	});

	it('returns an empty array when the path is a file, not a directory', () => {
		expect(collectFilePathsUnder(tree, '/vault/dirty.md')).toEqual([]);
	});

	it('returns an empty array for an empty tree', () => {
		expect(collectFilePathsUnder([], '/vault/dir')).toEqual([]);
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

	it('numbers a name that collides with a sibling only by case, keeping the requested casing', () => {
		expect(generateUniqueName('standup.md', false, ['Standup.md'])).toBe('standup 1.md');
	});

	it('skips a numbered candidate that collides only by case', () => {
		expect(generateUniqueName('standup.md', false, ['Standup.md', 'STANDUP 1.md'])).toBe('standup 2.md');
	});

	it('treats a case-only variant of the extension as taken', () => {
		expect(generateUniqueName('Standup.md', false, ['Standup.MD'])).toBe('Standup 1.md');
	});

	it('numbers a directory that collides with a sibling only by case', () => {
		expect(generateUniqueName('projects', true, ['Projects'])).toBe('projects 1');
	});

	it('keeps a name that differs from its siblings by more than case', () => {
		expect(generateUniqueName('standup.md', false, ['Standup 1.md', 'standups.md'])).toBe('standup.md');
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

	it('returns the original path for a sibling directory sharing the vault prefix', () => {
		expect(getRelativePath('/vault', '/vaulted/note.md')).toBe('/vaulted/note.md');
	});

	it('returns the path unchanged when it equals the vault path', () => {
		expect(getRelativePath('/vault', '/vault')).toBe('/vault');
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

	it('keeps the natural scan order for nodes without an override', () => {
		// scan_vault already sorts naturally; a second name sort here would
		// visibly re-sort the tree after the first render.
		const nodes: FileTreeNode[] = [
			makeDir('Day 9'),
			makeDir('Day 10'),
			makeDir('Day 11'),
			makeFile('note 1.md'),
			makeFile('Note 2.md'),
			makeFile('Note 10.md'),
		];
		const order = { '.': ['Day 11'] };
		const co = new Map([[`${vault}/Note 10.md`, 1]]);
		const result = applyFolderOrder(nodes, order, vault, vault, co);
		expect(result.map((n) => n.name)).toEqual([
			'Day 11', 'Day 9', 'Day 10', 'Note 10.md', 'note 1.md', 'Note 2.md',
		]);
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

	describe('contentOrder', () => {
		it('sorts files by _order value', () => {
			const nodes: FileTreeNode[] = [
				makeFile('c.md'),
				makeFile('a.md'),
				makeFile('b.md'),
			];
			const co = new Map([
				[`${vault}/b.md`, 1],
				[`${vault}/a.md`, 2],
				[`${vault}/c.md`, 3],
			]);
			const result = applyFolderOrder(nodes, {}, vault, vault, co);
			expect(result.map((n) => n.name)).toEqual(['b.md', 'a.md', 'c.md']);
		});

		it('files with _order come before files without', () => {
			const nodes: FileTreeNode[] = [
				makeFile('z.md'),
				makeFile('a.md'),
				makeFile('m.md'),
			];
			const co = new Map([
				[`${vault}/m.md`, 10],
			]);
			const result = applyFolderOrder(nodes, {}, vault, vault, co);
			expect(result[0].name).toBe('m.md');
		});

		it('sorts folders by _order when not in folder-order.json', () => {
			const nodes: FileTreeNode[] = [
				makeDir('Gamma'),
				makeDir('Alpha'),
				makeDir('Beta'),
			];
			const co = new Map([
				[`${vault}/Beta`, 1],
				[`${vault}/Alpha`, 2],
			]);
			const result = applyFolderOrder(nodes, {}, vault, vault, co);
			expect(result.map((n) => n.name)).toEqual(['Beta', 'Alpha', 'Gamma']);
		});

		it('folder-order.json takes priority over _order for listed folders', () => {
			const nodes: FileTreeNode[] = [
				makeDir('Alpha'),
				makeDir('Beta'),
				makeDir('Gamma'),
			];
			const order = { '.': ['Gamma', 'Alpha'] };
			const co = new Map([
				[`${vault}/Alpha`, 1],
				[`${vault}/Beta`, 2],
				[`${vault}/Gamma`, 3],
			]);
			const result = applyFolderOrder(nodes, order, vault, vault, co);
			// Gamma and Alpha in folder-order.json order; Beta sorted by _order after
			expect(result.map((n) => n.name)).toEqual(['Gamma', 'Alpha', 'Beta']);
		});

		it('applies contentOrder recursively to subfolders', () => {
			const nodes: FileTreeNode[] = [
				makeDir('Projects', [
					makeFile('z.md', `${vault}/Projects`),
					makeFile('a.md', `${vault}/Projects`),
				]),
			];
			const co = new Map([
				[`${vault}/Projects/a.md`, 1],
				[`${vault}/Projects/z.md`, 2],
			]);
			const result = applyFolderOrder(nodes, {}, vault, vault, co);
			expect(result[0].children!.map((n) => n.name)).toEqual(['a.md', 'z.md']);
		});
	});
});

describe('removeNodeByPath', () => {
	const tree = (): FileTreeNode[] => [
		{ name: 'a.md', path: '/v/a.md', isDirectory: false },
		{
			name: 'dir',
			path: '/v/dir',
			isDirectory: true,
			children: [
				{ name: 'b.md', path: '/v/dir/b.md', isDirectory: false },
				{ name: 'sub', path: '/v/dir/sub', isDirectory: true, children: [{ name: 'c.md', path: '/v/dir/sub/c.md', isDirectory: false }] },
			],
		},
	];

	it('removes a top-level file', () => {
		expect(removeNodeByPath(tree(), '/v/a.md').map((n) => n.path)).toEqual(['/v/dir']);
	});

	it('removes a nested file and keeps its siblings', () => {
		const out = removeNodeByPath(tree(), '/v/dir/sub/c.md');
		expect(out[1].children![1].children).toEqual([]);
		expect(out[1].children![0].path).toBe('/v/dir/b.md');
	});

	it('removes a folder with everything under it', () => {
		expect(removeNodeByPath(tree(), '/v/dir/sub')[1].children!.map((n) => n.path)).toEqual(['/v/dir/b.md']);
	});

	it('returns the same array when the path is not in the tree', () => {
		const input = tree();
		expect(removeNodeByPath(input, '/v/missing.md')).toBe(input);
	});

	it('does not mutate the input tree', () => {
		const input = tree();
		removeNodeByPath(input, '/v/dir/b.md');
		expect(input[1].children!.map((n) => n.path)).toEqual(['/v/dir/b.md', '/v/dir/sub']);
	});

	it('handles an empty tree', () => {
		expect(removeNodeByPath([], '/v/a.md')).toEqual([]);
	});
});

describe('naturalCompare (parity with Rust natural_cmp)', () => {
	for (const { name, expected } of sortParity.cases) {
		it(`orders every pair: ${name}`, () => {
			for (let i = 0; i < expected.length; i++) {
				for (let j = i + 1; j < expected.length; j++) {
					expect(naturalCompare(expected[i], expected[j]), `${expected[i]} < ${expected[j]}`).toBeLessThan(0);
					expect(naturalCompare(expected[j], expected[i]), `${expected[j]} > ${expected[i]}`).toBeGreaterThan(0);
				}
			}
		});

		it(`sorts the reversed list back: ${name}`, () => {
			expect([...expected].reverse().sort(naturalCompare)).toEqual(expected);
		});
	}

	it('returns 0 only for identical names', () => {
		expect(naturalCompare('a.md', 'a.md')).toBe(0);
		expect(naturalCompare('', '')).toBe(0);
		expect(naturalCompare('', 'a')).toBeLessThan(0);
	});
});

describe('compareTreeNodes', () => {
	it('puts directories before files, then natural name order', () => {
		const nodes: FileTreeNode[] = [
			{ name: 'Day 1.md', path: '/v/Day 1.md', isDirectory: false },
			{ name: 'Day 10', path: '/v/Day 10', isDirectory: true, children: [] },
			{ name: 'Day 9', path: '/v/Day 9', isDirectory: true, children: [] },
		];
		expect([...nodes].sort(compareTreeNodes).map((n) => n.name)).toEqual(['Day 9', 'Day 10', 'Day 1.md']);
	});
});

describe('insertTreeNode', () => {
	const order = (extra: Partial<TreeOrder> = {}): TreeOrder => ({ vaultPath: '/v', folderOrder: {}, ...extra });
	const file = (path: string): FileTreeNode => ({ name: path.split('/').pop()!, path, isDirectory: false });
	const dir = (path: string, children: FileTreeNode[] = []): FileTreeNode => ({ name: path.split('/').pop()!, path, isDirectory: true, children });
	const tree = (): FileTreeNode[] => [
		dir('/v/Daily', [file('/v/Daily/Note 2.md'), file('/v/Daily/Note 10.md')]),
		dir('/v/Projects'),
		file('/v/a.md'),
		file('/v/c.md'),
	];

	it('inserts a root file in natural name order', () => {
		const out = insertTreeNode(tree(), file('/v/b.md'), order(), 1);
		expect(out.map((n) => n.name)).toEqual(['Daily', 'Projects', 'a.md', 'b.md', 'c.md']);
	});

	it('inserts a nested file in natural order and keeps untouched branches', () => {
		const input = tree();
		const out = insertTreeNode(input, file('/v/Daily/Note 3.md'), order(), 1);
		expect(out[0].children!.map((n) => n.name)).toEqual(['Note 2.md', 'Note 3.md', 'Note 10.md']);
		expect(out[1]).toBe(input[1]);
		expect(input[0].children).toHaveLength(2);
	});

	it('inserts a folder before the files of its level', () => {
		const out = insertTreeNode(tree(), dir('/v/Zed'), order(), 1);
		expect(out.map((n) => n.name)).toEqual(['Daily', 'Projects', 'Zed', 'a.md', 'c.md']);
	});

	it('creates missing ancestor folders with the given time', () => {
		const out = insertTreeNode(tree(), file('/v/Archive/2026/x.md'), order(), 42);
		expect(out.map((n) => n.name)).toEqual(['Archive', 'Daily', 'Projects', 'a.md', 'c.md']);
		expect(out[0]).toMatchObject({ isDirectory: true, modifiedAt: 42, createdAt: 42 });
		expect(out[0].children![0]).toMatchObject({ path: '/v/Archive/2026', isDirectory: true });
		expect(out[0].children![0].children!.map((n) => n.path)).toEqual(['/v/Archive/2026/x.md']);
	});

	it('returns the same tree when the path is already there', () => {
		const input = tree();
		expect(insertTreeNode(input, file('/v/Daily/Note 2.md'), order(), 1)).toBe(input);
	});

	it('returns the same tree for a path outside the vault', () => {
		const input = tree();
		expect(insertTreeNode(input, file('/other/x.md'), order(), 1)).toBe(input);
	});

	it('inserts into an empty tree', () => {
		expect(insertTreeNode([], file('/v/a.md'), order(), 1).map((n) => n.path)).toEqual(['/v/a.md']);
	});

	it('applies folder-order.json to the level it inserts into', () => {
		const out = insertTreeNode(tree(), dir('/v/Archive'), order({ folderOrder: { '.': ['Projects'] } }), 1);
		expect(out.map((n) => n.name)).toEqual(['Projects', 'Archive', 'Daily', 'a.md', 'c.md']);
	});

	it('returns the same tree for a dot-prefixed name, which scan_vault hides', () => {
		const input = tree();
		expect(insertTreeNode(input, file('/v/.x.md'), order(), 1)).toBe(input);
		expect(insertTreeNode(input, file('/v/Daily/.hidden.md'), order(), 1)).toBe(input);
		expect(insertTreeNode(input, file('/v/.kokobrain/a.md'), order(), 1)).toBe(input);
		expect(insertTreeNode(input, dir('/v/.git'), order(), 1)).toBe(input);
	});

	it('puts files with _order first, the new file among the unordered ones by name', () => {
		const contentOrder = new Map([['/v/c.md', 1]]);
		const input = applyFolderOrder(tree(), {}, '/v', '/v', contentOrder);
		const out = insertTreeNode(input, file('/v/b.md'), order({ contentOrder }), 1);
		expect(out.map((n) => n.name)).toEqual(['Daily', 'Projects', 'c.md', 'a.md', 'b.md']);
	});
});

describe('moveTreeNode', () => {
	const order: TreeOrder = { vaultPath: '/v', folderOrder: {} };
	const tree = (): FileTreeNode[] => [
		{
			name: 'Inbox',
			path: '/v/Inbox',
			isDirectory: true,
			modifiedAt: 5,
			children: [
				{ name: 'sub', path: '/v/Inbox/sub', isDirectory: true, children: [{ name: 'n.md', path: '/v/Inbox/sub/n.md', isDirectory: false }] },
				{ name: 'b.md', path: '/v/Inbox/b.md', isDirectory: false },
				{ name: 'a 10.md', path: '/v/Inbox/a 10.md', isDirectory: false },
			],
		},
		{ name: 'Projects', path: '/v/Projects', isDirectory: true, children: [] },
		{ name: 'z.md', path: '/v/z.md', isDirectory: false, modifiedAt: 7, createdAt: 3 },
	];

	it('renames a file and re-sorts it among its siblings, keeping its times', () => {
		const input = tree();
		const out = moveTreeNode(input, '/v/z.md', '/v/a.md', input[2], order, 1);
		expect(out.map((n) => n.path)).toEqual(['/v/Inbox', '/v/Projects', '/v/a.md']);
		expect(out[2]).toMatchObject({ name: 'a.md', modifiedAt: 7, createdAt: 3 });
	});

	it('moves a folder with its subtree, rewriting every path', () => {
		const input = tree();
		const out = moveTreeNode(input, '/v/Inbox', '/v/Projects/Box', input[0], order, 1);
		expect(out.map((n) => n.path)).toEqual(['/v/Projects', '/v/z.md']);
		const box = out[0].children![0];
		expect(box).toMatchObject({ name: 'Box', path: '/v/Projects/Box', modifiedAt: 5 });
		expect(box.children!.map((n) => n.path)).toEqual(['/v/Projects/Box/sub', '/v/Projects/Box/a 10.md', '/v/Projects/Box/b.md']);
		expect(box.children![0].children![0].path).toBe('/v/Projects/Box/sub/n.md');
	});

	it('keeps the node already at the target and only drops the source', () => {
		const input = tree();
		const existing = { name: 'a.md', path: '/v/a.md', isDirectory: false, modifiedAt: 99 };
		const withTarget = [...input, existing];
		const out = moveTreeNode(withTarget, '/v/z.md', '/v/a.md', input[2], order, 1);
		expect(out.map((n) => n.path)).toEqual(['/v/Inbox', '/v/Projects', '/v/a.md']);
		expect(out[2]).toBe(existing);
	});

	it('only removes the source when the target is a hidden path', () => {
		const input = tree();
		const out = moveTreeNode(input, '/v/z.md', '/v/.z.md', input[2], order, 1);
		expect(out.map((n) => n.path)).toEqual(['/v/Inbox', '/v/Projects']);
	});

	it('inserts the snapshot when the source is already gone from the tree', () => {
		const input = tree();
		const snapshot = input[2];
		const out = moveTreeNode(input.slice(0, 2), '/v/z.md', '/v/Projects/z.md', snapshot, order, 1);
		expect(out[1].children!.map((n) => n.path)).toEqual(['/v/Projects/z.md']);
	});
});
