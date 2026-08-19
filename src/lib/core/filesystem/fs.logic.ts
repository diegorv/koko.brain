import { LanguageDescription } from '@codemirror/language';
import { languages } from '@codemirror/language-data';

import { basename, relativePath } from '$lib/utils/path';

import type { FileTreeNode, FolderOrderMap } from './fs.types';

/** Recursively searches the tree for a node matching the given path */
export function findNodeByPath(nodes: FileTreeNode[], path: string): FileTreeNode | null {
	for (const node of nodes) {
		if (node.path === path) return node;
		if (node.isDirectory && node.children) {
			const found = findNodeByPath(node.children, path);
			if (found) return found;
		}
	}
	return null;
}

/** Returns the parent directory path (e.g. "/vault/docs/note.md" → "/vault/docs") */
export function getParentPath(filePath: string): string {
	const lastSlash = filePath.lastIndexOf('/');
	if (lastSlash <= 0) return '/';
	return filePath.substring(0, lastSlash);
}

/** Extracts the file name from a full path (e.g. "/vault/note.md" → "note.md") */
export function getFileName(filePath: string): string {
	return basename(filePath);
}

/** Returns the file extension including the dot (e.g. "note.md" → ".md") */
export function getFileExtension(fileName: string): string {
	const dotIndex = fileName.lastIndexOf('.');
	return dotIndex > 0 ? fileName.substring(dotIndex) : '';
}

/** Checks whether the file name has a markdown extension (.md or .markdown) */
export function isMarkdownFile(fileName: string): boolean {
	const ext = getFileExtension(fileName).toLowerCase();
	return ext === '.md' || ext === '.markdown';
}

/** Checks whether the file name has a .collection extension */
export function isCollectionFile(fileName: string): boolean {
	return getFileExtension(fileName).toLowerCase() === '.collection';
}

/** Checks whether the file name has a .view extension (.collection alias for sidebar views) */
export function isViewFile(fileName: string): boolean {
	return getFileExtension(fileName).toLowerCase() === '.view';
}

/** Checks whether the file name has a .canvas extension */
export function isCanvasFile(fileName: string): boolean {
	return getFileExtension(fileName).toLowerCase() === '.canvas';
}

/** Checks whether the file name has a .kanban extension */
export function isKanbanFile(fileName: string): boolean {
	return getFileExtension(fileName).toLowerCase() === '.kanban';
}

/**
 * File extensions that hold binary or non-textual content. Reading these via
 * `readTextFile` produces UTF-8 garbage that can crash the editor renderer
 * (large images decoded as text, then iterated by every live-preview plugin
 * over malformed surrogate pairs). Used to gate `openFileInEditor` and
 * wikilink navigation against accidentally opening a binary path as a tab.
 *
 * Kept here next to `isMarkdownFile`/`isCanvasFile` so any new file-type
 * predicate lives in the same module.
 */
const BINARY_FILE_EXTENSIONS: ReadonlySet<string> = new Set([
	// Images
	'.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico', '.avif', '.heic', '.tiff', '.tif',
	// Audio
	'.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.opus',
	// Video
	'.mp4', '.webm', '.mov', '.mkv', '.avi', '.m4v',
	// Documents / archives — anything we should never load as raw text in the editor
	'.pdf', '.zip', '.tar', '.gz', '.7z', '.rar',
]);

/**
 * Checks whether the file's extension marks it as binary content that must
 * never be opened in the markdown text editor. See `BINARY_FILE_EXTENSIONS`
 * for the exact list. Case-insensitive.
 */
export function isBinaryFile(fileName: string): boolean {
	return BINARY_FILE_EXTENSIONS.has(getFileExtension(fileName).toLowerCase());
}

/**
 * Returns the CodeMirror LanguageDescription for the given file, or null if
 * the file is markdown or the extension is unrecognized.
 * Maps custom extensions (.collection → YAML, .canvas → JSON) to their underlying languages.
 */
export function getLanguageForFile(fileName: string): LanguageDescription | null {
	if (isMarkdownFile(fileName)) return null;
	if (isCollectionFile(fileName) || isViewFile(fileName)) return LanguageDescription.matchFilename(languages, 'file.yaml') ?? null;
	if (isCanvasFile(fileName)) return LanguageDescription.matchFilename(languages, 'file.json') ?? null;
	if (isKanbanFile(fileName)) return null; // Kanban files are markdown-based
	return LanguageDescription.matchFilename(languages, fileName) ?? null;
}

/** Validates a file name — rejects empty names, dot-prefixed names, and OS-forbidden characters */
export function isValidFileName(name: string): boolean {
	if (!name || name.trim().length === 0) return false;
	if (name.startsWith('.')) return false;
	return !/[<>:"/\\|?*\x00-\x1F]/.test(name);
}

/** Recursively counts all files (non-directories) inside a tree node */
export function countFiles(node: FileTreeNode): number {
	if (!node.isDirectory || !node.children) return 0;
	let count = 0;
	for (const child of node.children) {
		if (child.isDirectory) {
			count += countFiles(child);
		} else {
			count += 1;
		}
	}
	return count;
}

/**
 * Recursively annotates each directory node with its pre-computed file count.
 * Mutates nodes in-place (safe because callers pass freshly built trees).
 * Returns the total file count for the given node list.
 */
export function attachFileCounts(nodes: FileTreeNode[]): number {
	if (!nodes) return 0;
	let total = 0;
	for (const node of nodes) {
		if (node.isDirectory && node.children) {
			node.fileCount = attachFileCounts(node.children);
			total += node.fileCount;
		} else if (!node.isDirectory) {
			total += 1;
		}
	}
	return total;
}

/**
 * Generates a unique copy name like "file copy.md", "file copy 2.md", etc.
 * For directories, no extension splitting is done.
 */
export function generateCopyName(
	name: string,
	isDirectory: boolean,
	existingSiblingNames: string[],
): string {
	const siblings = new Set(existingSiblingNames);
	let baseName: string;
	let ext: string;

	if (isDirectory) {
		baseName = name;
		ext = '';
	} else {
		const dotIndex = name.lastIndexOf('.');
		if (dotIndex > 0) {
			baseName = name.substring(0, dotIndex);
			ext = name.substring(dotIndex);
		} else {
			baseName = name;
			ext = '';
		}
	}

	const candidate = `${baseName} copy${ext}`;
	if (!siblings.has(candidate)) return candidate;

	for (let i = 2; ; i++) {
		const numbered = `${baseName} copy ${i}${ext}`;
		if (!siblings.has(numbered)) return numbered;
	}
}

/**
 * Generates a unique file/folder name by appending an incrementing number.
 * E.g. "Untitled.md" → "Untitled 1.md" → "Untitled 2.md" for files,
 * or "Untitled" → "Untitled 1" → "Untitled 2" for directories.
 */
export function generateUniqueName(
	name: string,
	isDirectory: boolean,
	existingSiblingNames: string[],
): string {
	const siblings = new Set(existingSiblingNames);
	if (!siblings.has(name)) return name;

	let baseName: string;
	let ext: string;

	if (isDirectory) {
		baseName = name;
		ext = '';
	} else {
		const dotIndex = name.lastIndexOf('.');
		if (dotIndex > 0) {
			baseName = name.substring(0, dotIndex);
			ext = name.substring(dotIndex);
		} else {
			baseName = name;
			ext = '';
		}
	}

	for (let i = 1; ; i++) {
		const candidate = `${baseName} ${i}${ext}`;
		if (!siblings.has(candidate)) return candidate;
	}
}

/** Strips the vault root prefix from an absolute path to produce a vault-relative path */
export function getRelativePath(vaultPath: string, filePath: string): string {
	return relativePath(vaultPath, filePath);
}

/**
 * Validates whether a drag-and-drop move operation is allowed.
 * Returns null if valid, or an error reason string if invalid.
 */
export function validateDragDrop(
	sourcePath: string,
	targetDirPath: string,
): string | null {
	if (!sourcePath || !targetDirPath) return 'missing-paths';
	if (sourcePath === targetDirPath) return 'self-drop';
	if (targetDirPath.startsWith(sourcePath + '/')) return 'child-of-source';
	const sourceParent = getParentPath(sourcePath);
	if (sourceParent === targetDirPath) return 'same-parent';
	return null;
}

/** Recursively collects the paths of every directory in the tree into a flat Set */
export function collectAllDirPaths(nodes: FileTreeNode[]): Set<string> {
	const paths = new Set<string>();
	for (const node of nodes) {
		if (node.isDirectory) {
			paths.add(node.path);
			if (node.children) {
				for (const p of collectAllDirPaths(node.children)) {
					paths.add(p);
				}
			}
		}
	}
	return paths;
}

/**
 * Recursively reorders directory nodes according to folder-order.json
 * and _order frontmatter values.
 *
 * Priority for folders:
 *   1. folder-order.json (explicit list wins outright)
 *   2. _order from folder note frontmatter (numeric sort)
 *   3. Original name order from scan_vault
 *
 * Priority for files:
 *   1. _order from frontmatter (numeric sort, lower first)
 *   2. Original sort order
 *
 * Files with _order come before files without _order.
 */
export function applyFolderOrder(
	nodes: FileTreeNode[],
	orderMap: FolderOrderMap,
	vaultPath: string,
	currentPath: string,
	contentOrder?: Map<string, number>,
): FileTreeNode[] {
	const relativeKey = currentPath === vaultPath
		? '.'
		: currentPath.startsWith(vaultPath + '/')
			? currentPath.substring(vaultPath.length + 1)
			: currentPath;

	const folders = nodes.filter((n) => n.isDirectory);
	const files = nodes.filter((n) => !n.isDirectory);

	let reorderedFolders: FileTreeNode[];

	const order = orderMap[relativeKey];
	if (order) {
		const foldersByName = new Map(folders.map((f) => [f.name, f]));
		const ordered: FileTreeNode[] = [];
		for (const name of order) {
			const folder = foldersByName.get(name);
			if (folder) {
				ordered.push(folder);
				foldersByName.delete(name);
			}
		}
		const remaining = folders.filter((f) => foldersByName.has(f.name));
		// Sort remaining folders by _order if available
		if (contentOrder) {
			remaining.sort((a, b) => {
				const oa = contentOrder.get(a.path);
				const ob = contentOrder.get(b.path);
				if (oa !== undefined && ob !== undefined) return oa - ob;
				if (oa !== undefined) return -1;
				if (ob !== undefined) return 1;
				return 0;
			});
		}
		reorderedFolders = [...ordered, ...remaining];
	} else if (contentOrder) {
		reorderedFolders = [...folders].sort((a, b) => {
			const oa = contentOrder.get(a.path);
			const ob = contentOrder.get(b.path);
			if (oa !== undefined && ob !== undefined) return oa - ob;
			if (oa !== undefined) return -1;
			if (ob !== undefined) return 1;
			return 0;
		});
	} else {
		reorderedFolders = folders;
	}

	// Sort files by _order if available
	let reorderedFiles: FileTreeNode[];
	if (contentOrder) {
		reorderedFiles = [...files].sort((a, b) => {
			const oa = contentOrder.get(a.path);
			const ob = contentOrder.get(b.path);
			if (oa !== undefined && ob !== undefined) return oa - ob;
			if (oa !== undefined) return -1;
			if (ob !== undefined) return 1;
			return 0;
		});
	} else {
		reorderedFiles = files;
	}

	const result = reorderedFolders.map((folder) =>
		folder.children
			? { ...folder, children: applyFolderOrder(folder.children, orderMap, vaultPath, folder.path, contentOrder) }
			: folder
	);

	return [...result, ...reorderedFiles];
}
