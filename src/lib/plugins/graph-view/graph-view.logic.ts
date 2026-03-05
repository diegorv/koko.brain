import type { WikiLink } from '$lib/features/backlinks/backlinks.types';
import { getNoteName, buildResolutionCache, resolveWikilinkCached } from '$lib/features/backlinks/backlinks.logic';
import { extractAllTags } from '$lib/features/tags/tags.logic';
import type { GraphNode, GraphLink, GraphData, GraphFilters } from './graph-view.types';

export function getFolderFromPath(filePath: string): string {
	const lastSlash = filePath.lastIndexOf('/');
	return lastSlash > 0 ? filePath.substring(0, lastSlash) : '/';
}

export function buildGraphData(
	noteIndex: Map<string, WikiLink[]>,
	noteContents: Map<string, string>,
	allFilePaths: string[],
): GraphData {
	const nodes: GraphNode[] = [];
	const links: GraphLink[] = [];
	const linkCountMap = new Map<string, number>();
	const seenEdges = new Set<string>();
	// Track directed edges to detect bidirectional links
	const directedEdges = new Set<string>();
	const cache = buildResolutionCache(allFilePaths);

	// First pass: collect all directed edges
	for (const [sourcePath, wikilinks] of noteIndex) {
		for (const link of wikilinks) {
			const resolvedPath = resolveWikilinkCached(link.target, cache);
			if (!resolvedPath || resolvedPath === sourcePath) continue;
			directedEdges.add(`${sourcePath}->${resolvedPath}`);
		}
	}

	// Second pass: build deduplicated links with bidirectional flag
	for (const [sourcePath, wikilinks] of noteIndex) {
		for (const link of wikilinks) {
			const resolvedPath = resolveWikilinkCached(link.target, cache);
			if (!resolvedPath || resolvedPath === sourcePath) continue;

			const edgeKey = [sourcePath, resolvedPath].sort().join('->');
			if (seenEdges.has(edgeKey)) continue;
			seenEdges.add(edgeKey);

			const reverseExists = directedEdges.has(`${resolvedPath}->${sourcePath}`);
			links.push({ source: sourcePath, target: resolvedPath, bidirectional: reverseExists });
			linkCountMap.set(sourcePath, (linkCountMap.get(sourcePath) ?? 0) + 1);
			linkCountMap.set(resolvedPath, (linkCountMap.get(resolvedPath) ?? 0) + 1);
		}
	}

	// Build nodes from all file paths
	for (const filePath of allFilePaths) {
		const content = noteContents.get(filePath) ?? '';
		const tags = extractAllTags(content);

		nodes.push({
			id: filePath,
			name: getNoteName(filePath),
			folder: getFolderFromPath(filePath),
			tags,
			linkCount: linkCountMap.get(filePath) ?? 0,
		});
	}

	return { nodes, links };
}

export function filterGraphData(data: GraphData, filters: GraphFilters): GraphData {
	const { tag, folder, searchQuery, showOrphans } = filters;

	if (!tag && !folder && !searchQuery && showOrphans) return data;

	const query = searchQuery.toLowerCase();

	// Build set of connected node IDs for orphan filtering
	const connectedIds = new Set<string>();
	if (!showOrphans) {
		for (const link of data.links) {
			connectedIds.add(link.source);
			connectedIds.add(link.target);
		}
	}

	const filteredNodes = data.nodes.filter((node) => {
		if (!showOrphans && !connectedIds.has(node.id)) return false;
		if (tag && !node.tags.some((t) => t.toLowerCase() === tag.toLowerCase())) return false;
		if (folder && !node.folder.startsWith(folder)) return false;
		if (query && !node.name.toLowerCase().includes(query)) return false;
		return true;
	});

	const nodeIds = new Set(filteredNodes.map((n) => n.id));

	const filteredLinks = data.links.filter(
		(link) => nodeIds.has(link.source) && nodeIds.has(link.target),
	);

	return { nodes: filteredNodes, links: filteredLinks };
}

export function getLocalGraph(data: GraphData, centerPath: string, depth: number = 1): GraphData {
	const includedIds = new Set<string>();
	let frontier = new Set<string>([centerPath]);

	for (let d = 0; d <= depth; d++) {
		for (const id of frontier) {
			includedIds.add(id);
		}

		if (d === depth) break;

		const nextFrontier = new Set<string>();
		for (const link of data.links) {
			if (frontier.has(link.source) && !includedIds.has(link.target)) {
				nextFrontier.add(link.target);
			}
			if (frontier.has(link.target) && !includedIds.has(link.source)) {
				nextFrontier.add(link.source);
			}
		}
		frontier = nextFrontier;
	}

	const nodes = data.nodes.filter((n) => includedIds.has(n.id));
	const links = data.links.filter(
		(l) => includedIds.has(l.source) && includedIds.has(l.target),
	);

	return { nodes, links };
}

export function getNodeRadius(linkCount: number, minRadius: number = 4, maxRadius: number = 16): number {
	if (linkCount === 0) return minRadius;
	return Math.min(maxRadius, minRadius + Math.sqrt(linkCount) * 2);
}

export function getUniqueFolders(nodes: GraphNode[]): string[] {
	const folders = new Set<string>();
	for (const node of nodes) {
		folders.add(node.folder);
	}
	return Array.from(folders).sort();
}

export function getUniqueTags(nodes: GraphNode[]): string[] {
	const tags = new Set<string>();
	for (const node of nodes) {
		for (const tag of node.tags) {
			tags.add(tag);
		}
	}
	return Array.from(tags).sort();
}
