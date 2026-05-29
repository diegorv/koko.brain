import { readTextFile } from '@tauri-apps/plugin-fs';
import { parseCollectionYaml } from '$lib/features/collection/yaml-parser';

interface ParseCacheEntry {
	contentHash: string;
	/** Raw YAML content read from disk. Kept for round-trip edits via updateCollectionYaml. */
	yaml: string;
	definition: ReturnType<typeof parseCollectionYaml>;
}

const parseCache = new Map<string, ParseCacheEntry>();
const queryResultCache = new Map<string, Set<string>>();

function simpleHash(str: string): string {
	let h = 0;
	for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
	return h.toString(36);
}

/** Reads a .view file from disk, parses it, and updates the cache. */
export async function refreshViewDefinition(path: string): Promise<ReturnType<typeof parseCollectionYaml>> {
	const content = await readTextFile(path);
	const contentHash = simpleHash(content);
	const cached = parseCache.get(path);
	if (cached && cached.contentHash === contentHash) return cached.definition;
	const parsed = parseCollectionYaml(content);
	parseCache.set(path, { contentHash, yaml: content, definition: parsed });
	return parsed;
}

/** Returns cached parsed definition without disk I/O. Falls back to disk read if not cached. */
export async function getCachedViewDefinition(path: string): Promise<ReturnType<typeof parseCollectionYaml>> {
	const cached = parseCache.get(path);
	if (cached) return cached.definition;
	return refreshViewDefinition(path);
}

/**
 * Returns the raw YAML text most recently read for this view.
 * Returns undefined if the view has not been refreshed in this session.
 * Used by callers that need to perform round-trip edits via updateCollectionYaml.
 */
export function getCachedViewYaml(path: string): string | undefined {
	return parseCache.get(path)?.yaml;
}

/** Stores query result paths for a view (set by TypeSidebar counts effect). */
export function setViewQueryResult(viewPath: string, matchingPaths: Set<string>): void {
	queryResultCache.set(viewPath, matchingPaths);
}

/** Returns cached query result paths. Undefined if not yet computed. */
export function getViewQueryResult(viewPath: string): Set<string> | undefined {
	return queryResultCache.get(viewPath);
}

/** Clears a single entry (e.g. on file deletion). */
export function clearViewParseCache(path: string): void {
	parseCache.delete(path);
	queryResultCache.delete(path);
}

/** Clears all entries. */
export function clearAllViewParseCache(): void {
	parseCache.clear();
	queryResultCache.clear();
}
