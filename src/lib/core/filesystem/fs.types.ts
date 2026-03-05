/** Represents a single entry (file or folder) in the vault's file tree */
export interface FileTreeNode {
	/** Display name (e.g. "note.md") */
	name: string;
	/** Absolute path on disk */
	path: string;
	/** Whether this node is a directory */
	isDirectory: boolean;
	/** Sorted child nodes — only present for directories */
	children?: FileTreeNode[];
	/** Last-modified timestamp in ms — used for "date modified" sorting */
	modifiedAt?: number;
	/** Creation timestamp in ms — used by calendar to group files by date */
	createdAt?: number;
	/** Pre-computed recursive file count for directories (set by attachFileCounts) */
	fileCount?: number;
}

/** Available file tree sort strategies */
export type SortOption = 'name' | 'modified';

/**
 * Maps relative directory paths to ordered arrays of folder names.
 * `.` represents the vault root. Other keys are relative paths (e.g. `"Projects"`).
 * Only affects folder ordering — files keep their default sort.
 */
export type FolderOrderMap = Record<string, string[]>;

/** Result of reading a single file in a batch operation */
export interface FileReadResult {
	/** Absolute path of the file that was read */
	path: string;
	/** File content (null if the read failed) */
	content: string | null;
	/** Error message (null if the read succeeded) */
	error: string | null;
}

/** A single search match from the Rust search_vault command */
export interface VaultSearchMatch {
	/** Absolute path of the matching file */
	filePath: string;
	/** Display name of the file (without extension) */
	fileName: string;
	/** 1-based line number of the match */
	lineNumber: number;
	/** Full content of the line containing the match */
	lineContent: string;
	/** Start index of the match within the line */
	matchStart: number;
	/** End index of the match within the line */
	matchEnd: number;
}
