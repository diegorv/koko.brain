import { LanguageDescription } from '@codemirror/language';
import { languages } from '@codemirror/language-data';

import { basename, relativePath } from '#lib/utils/path.js';

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

/**
 * The file node at `path`, found by walking the path's segments down from
 * the root (O(depth x siblings), not a whole-tree scan). Null when the path is
 * outside the vault, missing from the tree, or names a directory.
 */
export function findFileNode(tree: FileTreeNode[], vaultPath: string, path: string): FileTreeNode | null {
	if (!path.startsWith(vaultPath + '/')) return null;
	const segments = path.substring(vaultPath.length + 1).split('/');
	let level: FileTreeNode[] | undefined = tree;
	let current = vaultPath;
	for (let i = 0; i < segments.length; i++) {
		current = `${current}/${segments[i]}`;
		const node: FileTreeNode | undefined = level?.find((n) => n.path === current);
		if (!node) return null;
		if (i === segments.length - 1) return node.isDirectory ? null : node;
		if (!node.isDirectory) return null;
		level = node.children;
	}
	return null;
}

/** Returns the parent directory path (e.g. "/vault/docs/note.md" → "/vault/docs") */
export function getParentPath(filePath: string): string {
	const lastSlash = filePath.lastIndexOf('/');
	if (lastSlash <= 0) return '/';
	return filePath.substring(0, lastSlash);
}

/** The path `renameItem` renames `oldPath` to: `newName` in `oldPath`'s folder (e.g. "/vault/a.md", "b.md" → "/vault/b.md") */
export function renamedPath(oldPath: string, newName: string): string {
	return `${getParentPath(oldPath)}/${newName}`;
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

/** Checks whether the file name has a .view extension */
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
 * Maps custom extensions (.view → YAML, .canvas → JSON) to their underlying languages.
 */
export function getLanguageForFile(fileName: string): LanguageDescription | null {
	if (isMarkdownFile(fileName)) return null;
	if (isViewFile(fileName)) return LanguageDescription.matchFilename(languages, 'file.yaml') ?? null;
	if (isCanvasFile(fileName)) return LanguageDescription.matchFilename(languages, 'file.json') ?? null;
	if (isKanbanFile(fileName)) return null; // Kanban files are markdown-based
	return LanguageDescription.matchFilename(languages, fileName) ?? null;
}

/**
 * Returns a user-facing message naming the rule a file name breaks, or null
 * when the name is valid. Rejects empty names, dot-prefixed names (hidden on
 * disk and skipped by the watcher), and OS-forbidden characters.
 */
export function getFileNameError(name: string): string | null {
	if (!name || name.trim().length === 0) return 'Name cannot be empty';
	if (name.startsWith('.')) return 'Name cannot start with "."';
	if (/[\x00-\x1F]/.test(name)) return 'Name cannot contain control characters';
	const forbidden = name.match(/[<>:"/\\|?*]/);
	if (forbidden) return `Name cannot contain "${forbidden[0]}"`;
	return null;
}

/**
 * Builds the user-facing text for a failed file operation:
 * `Could not <verb> "<name>": <reason>`. A verb holding `{name}` places the
 * quoted name there instead (`move {name} to the Trash`). `err` may be an
 * `Error` or the plain string a Tauri plugin rejects with.
 */
export function fileOperationErrorMessage(verb: string, name: string, err: unknown): string {
	const reason = err instanceof Error ? err.message : String(err);
	const action = verb.includes('{name}') ? verb.replace('{name}', `"${name}"`) : `${verb} "${name}"`;
	return `Could not ${action}: ${reason}`;
}

/**
 * Thrown by `applyPathChange` on a delete when saving a dirty tab at or under the deleted path
 * failed: nothing was closed or moved. `saveFileByPath` already toasted
 * "Failed to save file.", so callers do not toast this error again.
 */
export class PreDeleteSaveError extends Error {
	/** Absolute path of the tab whose save failed. */
	readonly path: string;

	constructor(path: string) {
		super(`Could not save "${path}" before moving it to the Trash`);
		this.name = 'PreDeleteSaveError';
		this.path = path;
	}
}

/**
 * Thrown by `renameItem` and `moveItem` when the target folder already holds
 * the name. Its message is shown to the user.
 */
export class TargetExistsError extends Error {
	constructor(name: string) {
		super(`"${name}" already exists in this folder`);
		this.name = 'TargetExistsError';
	}
}

/** Validates a file name — rejects empty names, dot-prefixed names, and OS-forbidden characters */
export function isValidFileName(name: string): boolean {
	return getFileNameError(name) === null;
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
 * Names compare case-insensitively: on a case-insensitive volume (macOS APFS
 * by default) `standup.md` and `Standup.md` are the same file, and Rust
 * `create_note` refuses the write. The result keeps the requested casing.
 */
export function generateUniqueName(
	name: string,
	isDirectory: boolean,
	existingSiblingNames: string[],
): string {
	const siblings = new Set(existingSiblingNames.map((n) => n.toLowerCase()));
	if (!siblings.has(name.toLowerCase())) return name;

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
		if (!siblings.has(candidate.toLowerCase())) return candidate;
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
 * Picks the directories to rescan for a batch of changed paths.
 *
 * Each changed path maps to its parent directory. A parent that is not in
 * `tree` yet (a folder created outside the app) is walked up to the nearest
 * ancestor that is, or to the vault root: patching a subtree under a node
 * the tree lacks is a silent no-op, so the new folder would never appear.
 * Because `scan_vault` is recursive, a parent nested under another parent
 * in the result is dropped. Parents outside the vault are skipped.
 */
export function resolveRescanParents(changedPaths: string[], vaultPath: string, tree: FileTreeNode[]): string[] {
	const inVault = (p: string) => p === vaultPath || p.startsWith(vaultPath + '/');
	const dirsInTree = collectAllDirPaths(tree);
	const parents = new Set<string>();
	for (const changedPath of changedPaths) {
		let parent = getParentPath(changedPath);
		if (!inVault(parent)) continue;
		while (parent !== vaultPath && !dirsInTree.has(parent)) {
			parent = getParentPath(parent);
		}
		parents.add(parent);
	}
	if (parents.has(vaultPath)) return [vaultPath];
	const list = [...parents];
	return list.filter((p) => !list.some((q) => p.startsWith(q + '/')));
}

/**
 * Returns the tree without the node at `path` (and, for a folder, everything
 * under it). Untouched branches keep their identity; the input is not mutated.
 * Returns `nodes` itself when no node has that path.
 */
export function removeNodeByPath(nodes: FileTreeNode[], path: string): FileTreeNode[] {
	let changed = false;
	const out: FileTreeNode[] = [];
	for (const node of nodes) {
		if (node.path === path) {
			changed = true;
			continue;
		}
		if (node.children && path.startsWith(node.path + '/')) {
			const children = removeNodeByPath(node.children, path);
			if (children !== node.children) {
				changed = true;
				out.push({ ...node, children });
				continue;
			}
		}
		out.push(node);
	}
	return changed ? out : nodes;
}

/**
 * Collects the absolute path of every FILE stored under `dirPath`, recursively.
 *
 * The path-change owner uses this to snapshot a folder's children BEFORE the
 * disk operation, because the per-file indexes are keyed by exact path and
 * the tree drops the old paths right after the rename. Returns an empty
 * array when `dirPath` is not in the tree, is a file, or holds no files.
 *
 * @param nodes Tree to search, normally `fsStore.fileTree`.
 * @param dirPath Absolute path of the directory whose files are wanted.
 */
export function collectFilePathsUnder(nodes: FileTreeNode[], dirPath: string): string[] {
	const dir = findNodeByPath(nodes, dirPath);
	if (!dir?.isDirectory || !dir.children) return [];
	const paths: string[] = [];
	const walk = (children: FileTreeNode[]) => {
		for (const child of children) {
			if (child.isDirectory) {
				if (child.children) walk(child.children);
			} else {
				paths.push(child.path);
			}
		}
	};
	walk(dir.children);
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
	return orderLevel(nodes, orderMap, vaultPath, currentPath, contentOrder).map((node) =>
		node.isDirectory && node.children
			? { ...node, children: applyFolderOrder(node.children, orderMap, vaultPath, node.path, contentOrder) }
			: node
	);
}

/**
 * The one-level step of `applyFolderOrder`: reorders the folders and files of
 * one directory (folders first) without descending into the folders.
 */
function orderLevel(
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

	return [...reorderedFolders, ...reorderedFiles];
}

/** Whether a single code point is an ASCII digit (`char::is_ascii_digit`). */
function isAsciiDigit(c: string): boolean {
	return c >= '0' && c <= '9';
}

/** Compares two code-point arrays the way Rust compares `str` (by code point, not UTF-16 unit). */
function compareCodePoints(a: string[], b: string[]): number {
	const n = Math.min(a.length, b.length);
	for (let i = 0; i < n; i++) {
		const d = a[i].codePointAt(0)! - b[i].codePointAt(0)!;
		if (d !== 0) return d < 0 ? -1 : 1;
	}
	return a.length === b.length ? 0 : a.length < b.length ? -1 : 1;
}

/**
 * Case-insensitive natural name order, a port of the Rust `natural_cmp`
 * (`src-tauri/src/commands/vault.rs`) that orders `scan_vault` output: runs
 * of ASCII digits compare by value, other characters by code point of the
 * lowercased name, ties fall back to the lowercase then the raw compare.
 * Pinned to the Rust side by `natural-sort-parity.fixture.json`.
 */
export function naturalCompare(a: string, b: string): number {
	const la = Array.from(a.toLowerCase());
	const lb = Array.from(b.toLowerCase());
	let i = 0;
	let j = 0;
	while (i < la.length && j < lb.length) {
		if (isAsciiDigit(la[i]) && isAsciiDigit(lb[j])) {
			const si = i;
			const sj = j;
			while (i < la.length && isAsciiDigit(la[i])) i++;
			while (j < lb.length && isAsciiDigit(lb[j])) j++;
			// Compared as text after trimming zeros, like the Rust side: a
			// longer run is the bigger number, with no overflow.
			const ta = la.slice(si, i).join('').replace(/^0+/, '');
			const tb = lb.slice(sj, j).join('').replace(/^0+/, '');
			if (ta.length !== tb.length) return ta.length < tb.length ? -1 : 1;
			if (ta !== tb) return ta < tb ? -1 : 1;
			continue;
		}
		const d = la[i].codePointAt(0)! - lb[j].codePointAt(0)!;
		if (d !== 0) return d < 0 ? -1 : 1;
		i++;
		j++;
	}
	if (i < la.length) return 1;
	if (j < lb.length) return -1;
	return compareCodePoints(la, lb) || compareCodePoints(Array.from(a), Array.from(b));
}

/** The `scan_vault` name sort for one level: directories first, then `naturalCompare`. */
export function compareTreeNodes(a: FileTreeNode, b: FileTreeNode): number {
	if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
	return naturalCompare(a.name, b.name);
}

/** The ordering inputs a full tree load applies, needed to place a node the way it would. */
export interface TreeOrder {
	/** Absolute vault root; tree paths start with it plus `/`. */
	vaultPath: string;
	/** `folder-order.json` entries. */
	folderOrder: FolderOrderMap;
	/** `_order` frontmatter values by path, or undefined when there are none. */
	contentOrder?: Map<string, number>;
}

/**
 * Orders one level the way `scan_vault` + `applyFolderOrder` would: a name
 * sort first, because `applyFolderOrder` keeps the incoming order for nodes
 * it has no rule for.
 */
function sortLevel(nodes: FileTreeNode[], order: TreeOrder, dirPath: string): FileTreeNode[] {
	return orderLevel([...nodes].sort(compareTreeNodes), order.folderOrder, order.vaultPath, dirPath, order.contentOrder);
}

/**
 * Returns the tree with `node` added under its parent directory, at the
 * position the next full load would give it. Missing ancestor folders are
 * created (empty but for the path, times set to `now`). Only the levels on the
 * path are re-sorted; other branches keep their identity and the input is not
 * mutated. Returns `tree` itself when the path is already in the tree, lies
 * outside the vault, crosses a file, or has a dot-prefixed segment (hidden
 * from `scan_vault` and dropped by the Rust watcher, so it would never leave).
 */
export function insertTreeNode(tree: FileTreeNode[], node: FileTreeNode, order: TreeOrder, now: number): FileTreeNode[] {
	const { vaultPath } = order;
	if (!node.path.startsWith(vaultPath + '/')) return tree;
	const segments = node.path.substring(vaultPath.length + 1).split('/');
	if (segments.some((s) => s.startsWith('.'))) return tree;

	const insertAt = (level: FileTreeNode[], dirPath: string, depth: number): FileTreeNode[] => {
		const childPath = `${dirPath}/${segments[depth]}`;
		const existing = level.find((n) => n.path === childPath);
		if (depth === segments.length - 1) {
			return existing ? level : sortLevel([...level, node], order, dirPath);
		}
		if (existing) {
			if (!existing.isDirectory) return level;
			const children = insertAt(existing.children ?? [], childPath, depth + 1);
			if (children === existing.children) return level;
			return level.map((n) => (n === existing ? { ...existing, children } : n));
		}
		const dir: FileTreeNode = {
			name: segments[depth],
			path: childPath,
			isDirectory: true,
			children: insertAt([], childPath, depth + 1),
			modifiedAt: now,
			createdAt: now,
		};
		return sortLevel([...level, dir], order, dirPath);
	};

	return insertAt(tree, vaultPath, 0);
}

/** `node` with its path moved from `from` to `to` (and every path under it), each level re-sorted for its new place. */
function rebaseNode(node: FileTreeNode, from: string, to: string, order: TreeOrder): FileTreeNode {
	const path = to + node.path.substring(from.length);
	if (!node.isDirectory || !node.children) return { ...node, name: getFileName(path), path };
	const children = sortLevel(node.children.map((c) => rebaseNode(c, from, to, order)), order, path);
	return { ...node, name: getFileName(path), path, children };
}

/**
 * Returns the tree after a rename or move: the node at `from` is removed and
 * `snapshot` (the node as it was at `from`, timestamps kept) is inserted at
 * `to` with every path under it rewritten. A node already at `to` wins (a
 * watcher rescan got there first), so only the removal applies; the same
 * holds for a hidden `to` (see `insertTreeNode`). Missing ancestors of `to`
 * are created with time `now`.
 */
export function moveTreeNode(
	tree: FileTreeNode[],
	from: string,
	to: string,
	snapshot: FileTreeNode,
	order: TreeOrder,
	now: number,
): FileTreeNode[] {
	const without = removeNodeByPath(tree, from);
	return insertTreeNode(without, rebaseNode(snapshot, from, to, order), order, now);
}
