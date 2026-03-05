import type { FileTreeNode } from '$lib/core/filesystem/fs.types';
import { fuzzyMatch } from '$lib/utils/fuzzy-match';

export { fuzzyMatch, type FuzzyMatchResult } from '$lib/utils/fuzzy-match';

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

export function filterAndRank(
	query: string,
	files: FileEntry[],
	recentPaths: string[],
): FileEntry[] {
	if (query.length === 0) {
		const recentSet = new Set(recentPaths);
		const recent = recentPaths
			.map((p) => files.find((f) => f.path === p))
			.filter((f): f is FileEntry => f !== undefined);
		const rest = files
			.filter((f) => !recentSet.has(f.path))
			.sort((a, b) => a.nameWithoutExt.localeCompare(b.nameWithoutExt));
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

	return scored.map((entry) => entry.file);
}

export function getRelativePath(filePath: string, vaultPath: string): string {
	if (filePath.startsWith(vaultPath)) {
		const relative = filePath.substring(vaultPath.length);
		return relative.startsWith('/') ? relative.substring(1) : relative;
	}
	return filePath;
}
