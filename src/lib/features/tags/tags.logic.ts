import type { TagEntry, TagTreeNode, TagSortMode } from './tags.types';

export function buildTagTree(entries: TagEntry[]): TagTreeNode[] {
	const root: TagTreeNode[] = [];

	for (const entry of entries) {
		const parts = entry.name.split('/');
		let currentLevel = root;
		let pathSoFar = '';

		for (let i = 0; i < parts.length; i++) {
			pathSoFar = pathSoFar ? `${pathSoFar}/${parts[i]}` : parts[i];
			let node = currentLevel.find((n) => n.segment.toLowerCase() === parts[i].toLowerCase());

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
