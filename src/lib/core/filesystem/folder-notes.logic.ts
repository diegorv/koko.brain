import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';

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
	for (const entry of entries) addContentOrder(map, entry);
	return map;
}

/**
 * Returns a copy of `current` with the order of every `touchedPaths` note
 * recomputed: its keys (the note, and its directory for a folder note) are
 * dropped, then re-added from `upserted`. Equal to `buildContentOrderMap`
 * over the patched entries when `current` was built from the unpatched ones.
 */
export function patchContentOrderMap(
	current: Map<string, number>,
	touchedPaths: Iterable<string>,
	upserted: NoteEntryV2[],
): Map<string, number> {
	const map = new Map(current);
	for (const path of touchedPaths) {
		map.delete(path);
		const dir = folderNoteDir(path);
		if (dir !== null) map.delete(dir);
	}
	for (const entry of upserted) addContentOrder(map, entry);
	return map;
}

/** Adds `entry`'s `_order` (when numeric) under its path, and its directory for a folder note. */
function addContentOrder(map: Map<string, number>, entry: NoteEntryV2): void {
	const raw = entry.frontmatter['_order'];
	// A number, or a quoted one (`"2"`), as in a type's note list. Number() reads '', '  ' and false as 0 and true as 1, which would pin the note.
	const parsed = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
	if (!Number.isFinite(parsed)) return;

	map.set(entry.path, parsed);
	const dir = folderNoteDir(entry.path);
	if (dir !== null) map.set(dir, parsed);
}

/** The directory a folder note (X/X.md) stands for, or null for any other path. */
function folderNoteDir(path: string): string | null {
	const parts = path.split('/');
	const fileName = parts[parts.length - 1];
	const parentName = parts[parts.length - 2];
	if (parentName && fileName === `${parentName}.md`) return parts.slice(0, -1).join('/');
	return null;
}