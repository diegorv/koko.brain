import { isViewFile } from '#lib/core/filesystem/fs.logic.js';
import { buildResolutionCache, resolveWikilinkCached } from '#lib/core/filesystem/wikilink-resolution.logic.js';
import { mixColors } from '#lib/utils/color.js';
import type { GraphNode, GraphLink, GraphData, GraphFilters } from './graph-view.types';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';

export function getFolderFromPath(filePath: string): string {
	const lastSlash = filePath.lastIndexOf('/');
	return lastSlash > 0 ? filePath.substring(0, lastSlash) : '/';
}

/**
 * Builds a graph view from a snapshot of Rust `VaultIndex` entries. A `.view`
 * is not a note: it gets no node, and a link naming it resolves to nothing.
 *
 * Each entry already carries the parsed wikilinks (`outgoingLinks`), the
 * deduplicated tag list, and the title — we don't re-parse content.
 * Wikilink resolution still happens TS-side via the standard
 * `buildResolutionCache` + `resolveWikilinkCached` over the notes' paths, so
 * collision handling follows backlinks resolution among notes. `vaultRoot`
 * lets a path-style target resolve to its vault-relative file first.
 */
export function buildGraphData(allEntries: NoteEntryV2[], vaultRoot?: string | null): GraphData {
	const entries = allEntries.filter((e) => !isViewFile(e.path));
	const nodes: GraphNode[] = [];
	const linkCountMap = new Map<string, number>();
	const directedEdges = new Set<string>();
	const linkMap = new Map<string, GraphLink>();
	const cache = buildResolutionCache(entries.map((e) => e.path));

	// Single pass: build directed edges and deduplicated links simultaneously
	for (const entry of entries) {
		for (const link of entry.outgoingLinks) {
			const resolvedPath = resolveWikilinkCached(link.target, cache, vaultRoot);
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

/** The four theme tokens the graph palette is derived from, as CSS color strings. */
export interface GraphThemeTokens {
	/** The editor pane background (`--editor-bg`). */
	editorBg: string;
	/** The main text color (`--foreground`). */
	foreground: string;
	/** The secondary text color (`--muted-foreground`). */
	mutedForeground: string;
	/** The accent color (`--primary`). */
	primary: string;
}

/** Colors the graph canvas paints with. */
export interface GraphPalette {
	/** The canvas container background. */
	background: string;
	/** A node fill. */
	node: string;
	/** The fill of the node the graph is centered on. */
	nodeActive: string;
	/** A node fill while another node is hovered and this one is not connected to it. */
	nodeDimmed: string;
	/** An edge stroke and arrowhead. */
	edge: string;
	/** An edge touching the hovered node. */
	edgeHighlight: string;
	/** A node label. */
	label: string;
	/** A node label while dimmed. */
	labelDimmed: string;
}

/** The fixed dark palette the graph paints with when a theme token is missing or unreadable. */
export const FALLBACK_GRAPH_PALETTE: GraphPalette = {
	background: '#1a1a1e',
	node: '#8b8b8b',
	nodeActive: '#c084fc',
	nodeDimmed: 'rgba(139, 139, 139, 0.2)',
	edge: 'rgba(160, 160, 180, 0.6)',
	edgeHighlight: 'rgba(192, 132, 252, 0.5)',
	label: '#a1a1aa',
	labelDimmed: 'rgba(161, 161, 170, 0.3)',
};

/**
 * Derives the graph palette from the active theme's tokens: the editor
 * background, muted nodes, a primary active node, and dimmed colors and edges
 * mixed toward the background in OKLab. Returns `FALLBACK_GRAPH_PALETTE` when
 * any token is empty or unparseable.
 */
export function graphPalette(tokens: GraphThemeTokens): GraphPalette {
	const { editorBg, foreground, mutedForeground, primary } = tokens;
	if (!editorBg || !foreground || !mutedForeground || !primary) return FALLBACK_GRAPH_PALETTE;
	const label = mixColors(foreground, mutedForeground, 0.5);
	const nodeDimmed = mixColors(mutedForeground, editorBg, 0.8);
	const edge = mixColors(mutedForeground, editorBg, 0.4);
	const edgeHighlight = mixColors(primary, editorBg, 0.5);
	const labelDimmed = label && mixColors(label, editorBg, 0.7);
	if (!label || !nodeDimmed || !edge || !edgeHighlight || !labelDimmed) return FALLBACK_GRAPH_PALETTE;
	return {
		background: editorBg,
		node: mutedForeground,
		nodeActive: primary,
		nodeDimmed,
		edge,
		edgeHighlight,
		label,
		labelDimmed,
	};
}
