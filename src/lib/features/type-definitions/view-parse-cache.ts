import { readTextFile } from '@tauri-apps/plugin-fs';
import { parseCollectionYaml } from '$lib/features/collection/yaml-parser';

interface ParseCacheEntry {
	contentHash: string;
	/** Raw YAML content read from disk. Kept for round-trip edits via updateCollectionYaml. */
	yaml: string;
	definition: ReturnType<typeof parseCollectionYaml>;
}

const parseCache = new Map<string, ParseCacheEntry>();

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
 * Returns the content hash of the cached parse for a path, or `undefined` when the
 * path is not cached. Consumers compare it across reloads to detect that the `.view`
 * YAML changed on disk without re-reading the file.
 */
export function getViewContentHash(path: string): string | undefined {
	return parseCache.get(path)?.contentHash;
}

/** Clears a single entry (e.g. on file deletion). */
export function clearViewParseCache(path: string): void {
	parseCache.delete(path);
}

/** Clears all entries. */
export function clearAllViewParseCache(): void {
	parseCache.clear();
}
