import type { WikiLink } from '#lib/contracts/index.js';

/** Returns the file name without its last extension (`a/b.md` -> `b`); a dotfile keeps its name. */
export function getNoteName(filePath: string): string {
	const fileName = filePath.split('/').pop() ?? filePath;
	const dotIndex = fileName.lastIndexOf('.');
	return dotIndex > 0 ? fileName.substring(0, dotIndex) : fileName;
}

/**
 * Whether a wikilink can resolve to `filePath`: false for a `.view` (any
 * casing), true for every other file. Mirrors `is_link_target` in the Rust
 * `VaultIndex`, so a click and the backlinks panel agree on `[[Projects]]`.
 */
export function isLinkTargetFile(filePath: string): boolean {
	// A case-insensitive regex: no lowercased copy of the path per resolver loop pass.
	return !VIEW_SUFFIX.test(filePath);
}

const VIEW_SUFFIX = /\.view$/i;

/**
 * The lowercase target when its last segment carries an extension (`foo.png`,
 * `b/foo.png`), else null. Only such a target takes the exact-file step, so a
 * bare `[[foo]]` never meets an extensionless file `foo` ahead of `foo.md`.
 */
function exactTarget(target: string): string | null {
	const fileName = target.split('/').pop() ?? target;
	return getNoteName(fileName) === fileName ? null : target.toLowerCase();
}

/**
 * True when `filePath` is the file `exact` names: same file name, or (for
 * `a/b.png`) ending in `/a/b.png`. Both lowercase. A `.view` never is.
 */
function isExactFile(filePathLower: string, exact: string): boolean {
	if (!isLinkTargetFile(filePathLower)) return false;
	return exact.includes('/') ? filePathLower.endsWith(`/${exact}`) : filePathLower.split('/').pop() === exact;
}

/**
 * The first of `candidates` that is the file `exact` names. A path-style
 * target first takes the file at `vaultRoot/exact`, so `[[b/foo.png]]` picks
 * `/vault/b/foo.png` over an earlier `/vault/x/b/foo.png`; without a root or
 * on a miss, the first path-suffix match. A `.view` is never a match.
 */
function findExactFile(candidates: string[], exact: string, vaultRoot: string | null | undefined): string | undefined {
	if (vaultRoot && exact.includes('/')) {
		const vaultPath = `${vaultRoot}/${exact}`.toLowerCase();
		const hit = candidates.find((filePath) => filePath.toLowerCase() === vaultPath && isLinkTargetFile(filePath));
		if (hit) return hit;
	}
	return candidates.find((filePath) => isExactFile(filePath.toLowerCase(), exact));
}

/**
 * Resolves a wikilink target to a file path; null when nothing matches. A
 * target with an extension resolves to the file it names when one exists
 * (a path-style one at its vault-relative path under `vaultRoot` first);
 * otherwise, and for every other target, by case-insensitive note name,
 * falling back to the target's basename. A `.view` in `allFilePaths` is
 * skipped (`isLinkTargetFile`).
 */
export function resolveWikilink(target: string, allFilePaths: string[], vaultRoot?: string | null): string | null {
	if (!target) return null;

	const exact = exactTarget(target);
	if (exact) {
		const hit = findExactFile(allFilePaths, exact, vaultRoot);
		if (hit) return hit;
	}

	const targetLower = target.toLowerCase();

	for (const filePath of allFilePaths) {
		if (!isLinkTargetFile(filePath)) continue;
		const noteName = getNoteName(filePath);
		if (noteName.toLowerCase() === targetLower) {
			return filePath;
		}
	}

	// If target contains a path (e.g. "folder/subfolder/note"), try matching just the basename
	const targetBasename = getNoteName(target).toLowerCase();
	if (targetBasename !== targetLower) {
		for (const filePath of allFilePaths) {
			if (!isLinkTargetFile(filePath)) continue;
			const noteName = getNoteName(filePath);
			if (noteName.toLowerCase() === targetBasename) {
				return filePath;
			}
		}
	}

	return null;
}

/**
 * Pre-computed lookup table for O(1) wikilink resolution: the map itself is
 * lowercase note name → file path, and `byFileName` serves the exact-file step
 * for a target with an extension.
 */
export type WikilinkResolutionCache = Map<string, string> & {
	/** Lowercase full file name (`foo.png`) → every path with that name, in input order. */
	readonly byFileName: Map<string, string[]>;
};

/** Builds a resolution cache from file paths. First path wins on name collisions. A `.view` enters neither map. */
export function buildResolutionCache(allFilePaths: string[]): WikilinkResolutionCache {
	const cache: WikilinkResolutionCache = Object.assign(new Map<string, string>(), {
		byFileName: new Map<string, string[]>(),
	});
	for (const filePath of allFilePaths) {
		if (!isLinkTargetFile(filePath)) continue;
		const key = getNoteName(filePath).toLowerCase();
		if (!cache.has(key)) {
			cache.set(key, filePath);
		}
		const fileName = (filePath.split('/').pop() ?? filePath).toLowerCase();
		const sameName = cache.byFileName.get(fileName);
		if (sameName) sameName.push(filePath);
		else cache.byFileName.set(fileName, [filePath]);
	}
	return cache;
}

/** O(1) wikilink resolution using a pre-built cache. Equivalent to resolveWikilink but without linear scan. */
export function resolveWikilinkCached(target: string, cache: WikilinkResolutionCache, vaultRoot?: string | null): string | null {
	if (!target) return null;

	const exact = exactTarget(target);
	if (exact) {
		const sameName = cache.byFileName.get(exact.split('/').pop() ?? exact);
		const hit = sameName && findExactFile(sameName, exact, vaultRoot);
		if (hit) return hit;
	}

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
