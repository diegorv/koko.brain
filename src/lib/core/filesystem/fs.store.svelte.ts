import type { FileTreeNode, FolderOrderMap } from './fs.types';

// --- Reactive state ---

/**
 * The full file tree for the current vault. Replace-only: every writer
 * assigns a new root, never mutates a node it handed over (except
 * `attachFileCounts` writing a directory's `fileCount`, which has no reader).
 * `$state.raw`: a deep proxy over a 40k-node tree made every walk (the
 * watcher, link resolution, flatten) pay a proxy trap per property read.
 */
let fileTree = $state.raw<FileTreeNode[]>([]);
/** Custom folder ordering loaded from `.kokobrain/folder-order.json` */
let folderOrder = $state<FolderOrderMap>({});
/** Content-based ordering from _order frontmatter (path -> numeric order) */
let contentOrder = $state<Map<string, number>>(new Map());
/** Number of in-flight loading operations — isLoading is true when > 0 */
let loadingCount = $state(0);
/** Path of the item currently being renamed inline (null when not renaming) */
let renamingPath = $state<string | null>(null);

/**
 * Central store for the file system / file explorer state.
 * Exposes getters for reactive reads and methods for mutations.
 */
export const fsStore = {
	get fileTree() { return fileTree; },
	get isLoading() { return loadingCount > 0; },
	get renamingPath() { return renamingPath; },
	get folderOrder() { return folderOrder; },
	get contentOrder() { return contentOrder; },

	setFileTree(tree: FileTreeNode[]) { fileTree = tree; },
	setFolderOrder(order: FolderOrderMap) { folderOrder = order; },
	setContentOrder(order: Map<string, number>) { contentOrder = order; },
	/** Increments or decrements the loading counter. isLoading is true while counter > 0. */
	startLoading() { loadingCount++; },
	stopLoading() { loadingCount = Math.max(0, loadingCount - 1); },
	setRenamingPath(path: string | null) { renamingPath = path; },

	/** Resets all state to initial values (e.g. when switching vaults) */
	reset() {
		fileTree = [];
		loadingCount = 0;
		renamingPath = null;
		folderOrder = {};
		contentOrder = new Map();
	},
};
