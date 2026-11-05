import { readTextFile } from '@tauri-apps/plugin-fs';
import { parseCollectionYaml } from '#lib/features/collection/yaml-parser.js';

interface ParseCacheEntry {
	contentHash: string;
	/** Raw YAML content read from disk. Kept for round-trip edits via updateCollectionYaml. */
	yaml: string;
	definition: ReturnType<typeof parseCollectionYaml>;
}

const parseCache = new Map<string, ParseCacheEntry>();

/**
 * Bumped by every clear function. A read that was in flight when a clear ran
 * (a debounced recount racing a rename or delete) must not re-insert the old
 * content, so `refreshViewDefinition` skips its insert when the epoch moved.
 * Global rather than per path: a skipped insert only costs a later re-read.
 */
let cacheEpoch = 0;

/**
 * Every `refreshViewDefinition` call takes the next number before its read.
 * Two reads of one path can resolve out of order (a debounced recount racing
 * `updateViewToolbarKey`'s refresh), and no clear runs between them, so the epoch
 * misses it.
 */
let readSeq = 0;

/**
 * Per path, the number of the newest read that stored or confirmed the cache
 * entry. A read with a lower number resolved late and must not overwrite it.
 * Compared per path so concurrent reads of different paths never block each other.
 */
const lastReadSeq = new Map<string, number>();

function simpleHash(str: string): string {
	let h = 0;
	for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
	return h.toString(36);
}

/** Reads a .view file from disk, parses it, and updates the cache. */
export async function refreshViewDefinition(path: string): Promise<ReturnType<typeof parseCollectionYaml>> {
	const epoch = cacheEpoch;
	const seq = ++readSeq;
	const content = await readTextFile(path);
	if (epoch !== cacheEpoch || (lastReadSeq.get(path) ?? 0) > seq) return parseCollectionYaml(content);
	lastReadSeq.set(path, seq);
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
	cacheEpoch++;
	parseCache.delete(path);
	lastReadSeq.delete(path);
}

/**
 * Clears `path` and every entry under `path + '/'`, so one call covers a
 * renamed, moved or deleted folder and all the `.view` files inside it.
 */
export function clearViewParseCacheUnder(path: string): void {
	cacheEpoch++;
	const prefix = `${path}/`;
	for (const key of [...parseCache.keys()]) {
		if (key === path || key.startsWith(prefix)) parseCache.delete(key);
	}
	for (const key of [...lastReadSeq.keys()]) {
		if (key === path || key.startsWith(prefix)) lastReadSeq.delete(key);
	}
}

/** Clears all entries. */
export function clearAllViewParseCache(): void {
	cacheEpoch++;
	parseCache.clear();
	lastReadSeq.clear();
}
