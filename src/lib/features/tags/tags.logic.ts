import type { TagEntry, TagTreeNode, TagSortMode } from './tags.types';

export function buildTagTree(entries: TagEntry[]): TagTreeNode[] {
	const root: TagTreeNode[] = [];
	// Lowercased segment path -> node, so a lookup is O(1) instead of a scan of
	// the level. Root keys contain no '/', child keys always do, so the two
	// never collide (`/b` keys as '' then '/b', `b` as 'b').
	const index = new Map<string, TagTreeNode>();

	for (const entry of entries) {
		const parts = entry.name.split('/');
		let currentLevel = root;
		let pathSoFar = '';
		let key = '';

		for (let i = 0; i < parts.length; i++) {
			pathSoFar = pathSoFar ? `${pathSoFar}/${parts[i]}` : parts[i];
			const lower = parts[i].toLowerCase();
			key = i === 0 ? lower : `${key}/${lower}`;
			let node = index.get(key);

			if (!node) {
				node = {
					segment: parts[i],
					fullPath: pathSoFar,
					count: 0,
					totalCount: 0,
					filePaths: [],
					children: [],
				};
				currentLevel.push(node);
				index.set(key, node);
			}

			if (i === parts.length - 1) {
				node.count = entry.count;
				node.filePaths = entry.filePaths;
			}

			currentLevel = node.children;
		}
	}

	computeTotalCounts(root);
	return root;
}

function computeTotalCounts(nodes: TagTreeNode[]): number {
	let total = 0;
	for (const node of nodes) {
		const childTotal = computeTotalCounts(node.children);
		node.totalCount = node.count + childTotal;
		total += node.totalCount;
	}
	return total;
}

/** Shape of a built tag tree, logged to tell the cost drivers of `buildTagTree` apart. */
export interface TagTreeShape {
	/** Number of root nodes (R). */
	roots: number;
	/** Number of parent-child pairs (P), i.e. non-root nodes. */
	pairs: number;
	/** Share (0-1) of the entries' segments that contain an uppercase letter. */
	upperShare: number;
}

/** Counts roots, parent-child pairs and the uppercase segment share of a tag tree. */
export function tagTreeShape(entries: TagEntry[], tree: TagTreeNode[]): TagTreeShape {
	let nodes = 0;
	const stack = [...tree];
	while (stack.length > 0) {
		const node = stack.pop()!;
		nodes++;
		for (const child of node.children) stack.push(child);
	}

	let segments = 0;
	let upper = 0;
	for (const entry of entries) {
		for (const part of entry.name.split('/')) {
			segments++;
			if (part !== part.toLowerCase()) upper++;
		}
	}

	return {
		roots: tree.length,
		pairs: nodes - tree.length,
		upperShare: segments === 0 ? 0 : upper / segments,
	};
}

/**
 * Recursively filters a tag tree, keeping only nodes whose own count exceeds
 * minCount or that have surviving children.
 */
export function filterTagTree(nodes: TagTreeNode[], minCount: number): TagTreeNode[] {
	const result: TagTreeNode[] = [];
	for (const node of nodes) {
		const filteredChildren = filterTagTree(node.children, minCount);
		if (filteredChildren.length > 0 || node.count >= minCount) {
			const childTotal = filteredChildren.reduce((sum, c) => sum + c.totalCount, 0);
			result.push({ ...node, children: filteredChildren, totalCount: node.count + childTotal });
		}
	}
	return result;
}

export function sortTagTree(nodes: TagTreeNode[], mode: TagSortMode): TagTreeNode[] {
	const sorted = [...nodes].sort((a, b) => {
		if (mode === 'count') {
			return b.totalCount - a.totalCount || a.segment.localeCompare(b.segment);
		}
		return a.segment.localeCompare(b.segment);
	});

	for (const node of sorted) {
		node.children = sortTagTree(node.children, mode);
	}

	return sorted;
}
