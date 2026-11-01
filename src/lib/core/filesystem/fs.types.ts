import type { FileNode } from '#lib/contracts/index.js';

export type { FileReadResult } from '#lib/contracts/index.js';

/**
 * A file or folder in the vault's file tree: the `scan_vault` wire shape
 * plus `fileCount`, the recursive file count `attachFileCounts` sets on
 * directories (TS only, never sent by Rust).
 */
export type FileTreeNode = Omit<FileNode, 'children'> & {
	/** Sorted child nodes, only present for directories */
	children?: FileTreeNode[];
	/** Pre-computed recursive file count for directories (set by attachFileCounts) */
	fileCount?: number;
};

/**
 * Maps relative directory paths to ordered arrays of folder names.
 * `.` represents the vault root. Other keys are relative paths (e.g. `"Projects"`).
 * Only affects folder ordering — files keep their default sort.
 */
export type FolderOrderMap = Record<string, string[]>;
