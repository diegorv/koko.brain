import type { FileTreeNode, FolderOrderMap, SortOption } from './fs.types';

// --- Reactive state ---

/** The full file tree for the current vault */
let fileTree = $state<FileTreeNode[]>([]);
/** Path of the file currently selected in the explorer / editor */
let selectedFilePath = $state<string | null>(null);
/** Custom folder ordering loaded from `.kokobrain/folder-order.json` */
let folderOrder = $state<FolderOrderMap>({});
/** Number of in-flight loading operations — isLoading is true when > 0 */
let loadingCount = $state(0);
/** Set of directory paths that are visually expanded in the tree — must be replaced (not mutated) to trigger reactivity */
let expandedDirs = $state<Set<string>>(new Set());
/** Current sort strategy for the file tree */
let sortBy = $state<SortOption>('name');
/** Path of the item currently being renamed inline (null when not renaming) */
let renamingPath = $state<string | null>(null);
/** Path of a newly created item pending rename — opened in editor after rename completes */
let pendingCreationPath = $state<string | null>(null);

/**
 * Central store for the file system / file explorer state.
 * Exposes getters for reactive reads and methods for mutations.
 */
export const fsStore = {
	get fileTree() { return fileTree; },
	get selectedFilePath() { return selectedFilePath; },
	get isLoading() { return loadingCount > 0; },
	get expandedDirs() { return expandedDirs; },
	get sortBy() { return sortBy; },
	get renamingPath() { return renamingPath; },
	get pendingCreationPath() { return pendingCreationPath; },
	get folderOrder() { return folderOrder; },

	setFileTree(tree: FileTreeNode[]) { fileTree = tree; },
	setFolderOrder(order: FolderOrderMap) { folderOrder = order; },
	setSelectedFilePath(path: string | null) { selectedFilePath = path; },
	/** Increments or decrements the loading counter. isLoading is true while counter > 0. */
	startLoading() { loadingCount++; },
	stopLoading() { loadingCount = Math.max(0, loadingCount - 1); },
	setSortBy(option: SortOption) { sortBy = option; },
	setRenamingPath(path: string | null) { renamingPath = path; },
	setPendingCreationPath(path: string | null) { pendingCreationPath = path; },

	/** Expands or collapses a directory in the tree */
	toggleDir(path: string) {
		const next = new Set(expandedDirs);
		if (next.has(path)) {
			next.delete(path);
		} else {
			next.add(path);
		}
		expandedDirs = next;
	},

	/** Ensures a directory is expanded (no-op if already open) */
	expandDir(path: string) {
		if (!expandedDirs.has(path)) {
			const next = new Set(expandedDirs);
			next.add(path);
			expandedDirs = next;
		}
	},

	/** Collapses every directory in the tree */
	collapseAll() {
		expandedDirs = new Set();
	},

	/** Resets all state to initial values (e.g. when switching vaults) */
	reset() {
		fileTree = [];
		selectedFilePath = null;
		loadingCount = 0;
		expandedDirs = new Set();
		renamingPath = null;
		pendingCreationPath = null;
		folderOrder = {};
		sortBy = 'name';
	},
};
