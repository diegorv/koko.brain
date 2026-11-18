import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
import { fuzzyMatch } from '#lib/utils/fuzzy-match.js';
import { relativePath } from '#lib/utils/path.js';

export interface FileEntry {
	name: string;
	nameWithoutExt: string;
	path: string;
}

export function flattenFileTree(nodes: FileTreeNode[]): FileEntry[] {
	const result: FileEntry[] = [];

	for (const node of nodes) {
		if (node.isDirectory) {
			if (node.children) {
				result.push(...flattenFileTree(node.children));
			}
		} else {
			const ext = node.name.lastIndexOf('.');
			const nameWithoutExt = ext > 0 ? node.name.substring(0, ext) : node.name;
			result.push({ name: node.name, nameWithoutExt, path: node.path });
		}
	}

	return result;
}

/** Maximum number of results rendered by the quick switcher. Caps DOM work for large vaults. */
export const MAX_RESULTS = 100;

/**
 * The folder holding a file, relative to the vault.
 * @param vaultPath - absolute vault path
 * @param path - absolute file path
 * @returns `Projects/Ideas` for `<vault>/Projects/Ideas/A.md`, `''` at the vault root
 */
export function entryFolder(vaultPath: string, path: string): string {
	const rel = relativePath(vaultPath, path);
	const slash = rel.lastIndexOf('/');
	return slash >= 0 ? rel.substring(0, slash) : '';
}

/**
 * The quick switcher's empty-query groups.
 * @param files - every file the switcher offers
 * @param recentPaths - recently opened paths, newest first; paths not in `files` are skipped
 * @returns `recent` in `recentPaths` order, and `rest`, the other files sorted by name and
 * capped so both together stay within `MAX_RESULTS`
 */
export function splitRecentFiles(
	files: FileEntry[],
	recentPaths: string[],
): { recent: FileEntry[]; rest: FileEntry[] } {
	const recentSet = new Set(recentPaths);
	const recent = recentPaths
		.map((p) => files.find((f) => f.path === p))
		.filter((f): f is FileEntry => f !== undefined);
	const remaining = Math.max(0, MAX_RESULTS - recent.length);
	const rest = files
		.filter((f) => !recentSet.has(f.path))
		.sort((a, b) => a.nameWithoutExt.localeCompare(b.nameWithoutExt))
		.slice(0, remaining);
	return { recent, rest };
}

export function filterAndRank(
	query: string,
	files: FileEntry[],
	recentPaths: string[],
): FileEntry[] {
	if (query.length === 0) {
		const { recent, rest } = splitRecentFiles(files, recentPaths);
		return [...recent, ...rest];
	}

	const recentIndexMap = new Map(recentPaths.map((p, i) => [p, i]));

	const scored = files
		.map((file) => {
			const result = fuzzyMatch(query, file.nameWithoutExt);
			return { file, ...result };
		})
		.filter((entry) => entry.match);

	scored.sort((a, b) => {
		const aRecent = recentIndexMap.get(a.file.path);
		const bRecent = recentIndexMap.get(b.file.path);
		const aIsRecent = aRecent !== undefined;
		const bIsRecent = bRecent !== undefined;

		// Both recent: sort by recency
		if (aIsRecent && bIsRecent) return aRecent - bRecent;
		// One recent: recent first (only if scores are close)
		if (aIsRecent && !bIsRecent && a.score <= b.score + 5) return -1;
		if (!aIsRecent && bIsRecent && b.score <= a.score + 5) return 1;

		// Sort by score
		if (a.score !== b.score) return a.score - b.score;

		return a.file.nameWithoutExt.localeCompare(b.file.nameWithoutExt);
	});

	return scored.slice(0, MAX_RESULTS).map((entry) => entry.file);
}
