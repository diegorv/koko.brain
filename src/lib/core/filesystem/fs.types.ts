import type { FileNode } from '#lib/contracts/index.js';

export type { FileReadResult } from '#lib/contracts/index.js';

/** A file or folder in the vault's file tree: the `scan_vault` wire shape. */
export type FileTreeNode = Omit<FileNode, 'children'> & {
	/** Sorted child nodes, only present for directories */
	children?: FileTreeNode[];
};

/**
 * Maps relative directory paths to ordered arrays of folder names.
 * `.` represents the vault root. Other keys are relative paths (e.g. `"Projects"`).
 * Only affects folder ordering — files keep their default sort.
 */
export type FolderOrderMap = Record<string, string[]>;
