import type { WikiLink } from '#lib/contracts/index.js';

/** Returns the file name without its last extension (`a/b.md` -> `b`); a dotfile keeps its name. */
export function getNoteName(filePath: string): string {
	const fileName = filePath.split('/').pop() ?? filePath;
	const dotIndex = fileName.lastIndexOf('.');
	return dotIndex > 0 ? fileName.substring(0, dotIndex) : fileName;
}

/** Resolves a wikilink target to a file path by case-insensitive note name, falling back to the target's basename; null when nothing matches. */
export function resolveWikilink(target: string, allFilePaths: string[]): string | null {
	if (!target) return null;

	const targetLower = target.toLowerCase();

	for (const filePath of allFilePaths) {
		const noteName = getNoteName(filePath);
		if (noteName.toLowerCase() === targetLower) {
			return filePath;
		}
	}

	// If target contains a path (e.g. "folder/subfolder/note"), try matching just the basename
	const targetBasename = getNoteName(target).toLowerCase();
	if (targetBasename !== targetLower) {
		for (const filePath of allFilePaths) {
			const noteName = getNoteName(filePath);
			if (noteName.toLowerCase() === targetBasename) {
				return filePath;
			}
		}
	}

	return null;
}

/** Pre-computed lookup table for O(1) wikilink resolution (lowercase note name → file path) */
export type WikilinkResolutionCache = Map<string, string>;

/** Builds a resolution cache from file paths. First path wins on name collisions. */
export function buildResolutionCache(allFilePaths: string[]): WikilinkResolutionCache {
	const cache: WikilinkResolutionCache = new Map();
	for (const filePath of allFilePaths) {
		const key = getNoteName(filePath).toLowerCase();
		if (!cache.has(key)) {
			cache.set(key, filePath);
		}
	}
	return cache;
}

/** O(1) wikilink resolution using a pre-built cache. Equivalent to resolveWikilink but without linear scan. */
export function resolveWikilinkCached(target: string, cache: WikilinkResolutionCache): string | null {
	if (!target) return null;

	const targetLower = target.toLowerCase();
	const resolved = cache.get(targetLower);
	if (resolved) return resolved;

	// If target contains a path, try matching just the basename
	const targetBasename = getNoteName(target).toLowerCase();
	if (targetBasename !== targetLower) {
		return cache.get(targetBasename) ?? null;
	}

	return null;
}

const WIKILINK_REGEX = /\[\[([^\]]+?)\]\]/g;

/** Lists every `[[target|alias#heading]]` wikilink in `content`, in order, with its offset. */
export function parseWikilinks(content: string): WikiLink[] {
	const links: WikiLink[] = [];
	let match: RegExpExecArray | null;

	while ((match = WIKILINK_REGEX.exec(content)) !== null) {
		const raw = match[1];
		const position = match.index;

		let target: string;
		let alias: string | null = null;
		let heading: string | null = null;

		const pipeIndex = raw.indexOf('|');
		if (pipeIndex >= 0) {
			target = raw.substring(0, pipeIndex);
			alias = raw.substring(pipeIndex + 1);
		} else {
			target = raw;
		}

		const hashIndex = target.indexOf('#');
		if (hashIndex >= 0) {
			heading = target.substring(hashIndex + 1);
			target = target.substring(0, hashIndex);
		}

		links.push({ target: target.trim(), alias, heading, position });
	}

	return links;
}
