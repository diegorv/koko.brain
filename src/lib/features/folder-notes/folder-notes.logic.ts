import type { FileTreeNode } from '$lib/core/filesystem/fs.types';
import type { NoteEntryV2 } from '$lib/types/vault-v2.types';

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

/**
 * Builds a path -> numeric order map from vault entries' _order frontmatter.
 * For folder notes (X/X.md), the order is indexed under the directory path too.
 */
export function buildContentOrderMap(entries: NoteEntryV2[]): Map<string, number> {
	const map = new Map<string, number>();
	for (const entry of entries) {
		const raw = entry.frontmatter['_order'];
		if (raw === undefined || raw === null) continue;
		const parsed = typeof raw === 'number' ? raw : Number(raw);
		if (!Number.isFinite(parsed)) continue;

		map.set(entry.path, parsed);

		// Folder notes: X/X.md -> index under directory X/ too
		const parts = entry.path.split('/');
		const fileName = parts[parts.length - 1];
		const parentDir = parts.slice(0, -1).join('/');
		const parentName = parts[parts.length - 2];
		if (parentName && fileName === `${parentName}.md`) {
			map.set(parentDir, parsed);
		}
	}
	return map;
}