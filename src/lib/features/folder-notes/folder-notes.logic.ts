import type { FileTreeNode } from '$lib/core/filesystem/fs.types';

/**
 * Finds a folder note inside a directory.
 * A folder note is a `.md` file whose name matches the folder name (e.g. `projects/projects.md`).
 * Returns the matching child's absolute path, or null if none found.
 */
export function findFolderNote(folderName: string, children: FileTreeNode[]): string | null {
	const target = `${folderName}.md`;
	const match = children.find((c) => !c.isDirectory && c.name === target);
	return match ? match.path : null;
}