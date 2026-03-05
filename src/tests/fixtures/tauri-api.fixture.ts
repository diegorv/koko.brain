/**
 * Factory functions for Tauri API response shapes.
 * These mirror the exact structs returned by Rust commands,
 * ensuring test data matches production contracts.
 */
import type { FileTreeNode, FileReadResult } from '$lib/core/filesystem/fs.types';

/** Creates a file node matching the Rust `FileNode` struct from `scan_vault` */
export function makeFileNode(overrides: Partial<FileTreeNode> = {}): FileTreeNode {
	return {
		name: overrides.name ?? 'note.md',
		path: overrides.path ?? '/vault/note.md',
		isDirectory: overrides.isDirectory ?? false,
		...(overrides.children !== undefined && { children: overrides.children }),
		...(overrides.modifiedAt !== undefined && { modifiedAt: overrides.modifiedAt }),
		...(overrides.createdAt !== undefined && { createdAt: overrides.createdAt }),
	};
}

/** Creates a directory node with children */
export function makeDirNode(
	name: string,
	children: FileTreeNode[],
	overrides: Partial<Omit<FileTreeNode, 'isDirectory' | 'children'>> = {},
): FileTreeNode {
	return {
		name,
		path: overrides.path ?? `/vault/${name}`,
		isDirectory: true,
		children,
		...(overrides.modifiedAt !== undefined && { modifiedAt: overrides.modifiedAt }),
		...(overrides.createdAt !== undefined && { createdAt: overrides.createdAt }),
	};
}

/**
 * Creates a file read result matching the Rust `FileReadResult` struct.
 * Note: Rust uses `skip_serializing_if = "Option::is_none"` so fields
 * may be omitted in real responses. The TypeScript type uses `| null`.
 */
export function makeFileReadResult(overrides: Partial<FileReadResult> = {}): FileReadResult {
	return {
		path: overrides.path ?? '/vault/note.md',
		content: overrides.content ?? null,
		error: overrides.error ?? null,
	};
}

/** Creates a successful file read result */
export function makeSuccessResult(path: string, content: string): FileReadResult {
	return { path, content, error: null };
}

/** Creates a failed file read result */
export function makeErrorResult(path: string, error: string): FileReadResult {
	return { path, content: null, error };
}
