import { buildResolutionCache, resolveWikilinkCached } from '$lib/features/backlinks/backlinks.logic';
import type { GraphNode, GraphLink, GraphData, GraphFilters } from './graph-view.types';
import type { NoteEntryV2 } from '$lib/types/vault-v2.types';

export function getFolderFromPath(filePath: string): string {
	const lastSlash = filePath.lastIndexOf('/');
	return lastSlash > 0 ? filePath.substring(0, lastSlash) : '/';
}

/**
 * Builds a graph view from a snapshot of Rust `VaultIndex` entries.
 *
 * Each entry already carries the parsed wikilinks (`outgoingLinks`), the
 * deduplicated tag list, and the title — we don't re-parse content.
 * Wikilink resolution still happens TS-side via the standard
 * `buildResolutionCache` + `resolveWikilinkCached` over `entries[*].path`,
 * so collision handling stays identical to backlinks resolution.
 */
export function buildGraphData(entries: NoteEntryV2[]): GraphData {
	const nodes: GraphNode[] = [];
	const linkCountMap = new Map<string, number>();
	const directedEdges = new Set<string>();
	const linkMap = new Map<string, GraphLink>();
	const cache = buildResolutionCache(entries.map((e) => e.path));

	// Single pass: build directed edges and deduplicated links simultaneously
	for (const entry of entries) {
		for (const link of entry.outgoingLinks) {
			const resolvedPath = resolveWikilinkCached(link.target, cache);
			if (!resolvedPath || resolvedPath === entry.path) continue;

			directedEdges.add(`${entry.path}->${resolvedPath}`);
			const canonicalKey = [entry.path, resolvedPath].sort().join('->');

			const existing = linkMap.get(canonicalKey);
			if (existing) {
				// Reverse direction encountered — mark bidirectional
				existing.bidirectional = true;
			} else {
				// First encounter — check if reverse was already seen
				const reverseExists = directedEdges.has(`${resolvedPath}->${entry.path}`);
				linkMap.set(canonicalKey, { source: entry.path, target: resolvedPath, bidirectional: reverseExists });
				linkCountMap.set(entry.path, (linkCountMap.get(entry.path) ?? 0) + 1);
				linkCountMap.set(resolvedPath, (linkCountMap.get(resolvedPath) ?? 0) + 1);
			}
		}
	}

	const links = Array.from(linkMap.values());

	// Build nodes from entries
	for (const entry of entries) {
		nodes.push({
			id: entry.path,
			name: entry.title,
			folder: getFolderFromPath(entry.path),
			tags: entry.tags,
			linkCount: linkCountMap.get(entry.path) ?? 0,
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
