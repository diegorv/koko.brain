import type { WikiLink, BacklinkEntry, ContextSnippet } from './backlinks.types';

const WIKILINK_REGEX = /\[\[([^\]]+?)\]\]/g;

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

export function getNoteName(filePath: string): string {
	const fileName = filePath.split('/').pop() ?? filePath;
	const dotIndex = fileName.lastIndexOf('.');
	return dotIndex > 0 ? fileName.substring(0, dotIndex) : fileName;
}

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

export function getContextSnippet(content: string, position: number, radius: number = 80): ContextSnippet {
	const lineStart = content.lastIndexOf('\n', position - 1) + 1;
	const lineEnd = content.indexOf('\n', position);
	const actualEnd = lineEnd === -1 ? content.length : lineEnd;

	const line = content.substring(lineStart, actualEnd);
	const linkStartInLine = position - lineStart;

	const closingBrackets = line.indexOf(']]', linkStartInLine);
	const linkEndInLine = closingBrackets >= 0 ? closingBrackets + 2 : line.length;

	let snippetStart = Math.max(0, linkStartInLine - radius);
	let snippetEnd = Math.min(line.length, linkEndInLine + radius);

	if (snippetStart > 0) {
		const spaceAfter = line.indexOf(' ', snippetStart);
		if (spaceAfter >= 0 && spaceAfter < linkStartInLine) {
			snippetStart = spaceAfter + 1;
		}
	}

	if (snippetEnd < line.length) {
		const spaceBefore = line.lastIndexOf(' ', snippetEnd);
		if (spaceBefore > linkEndInLine) {
			snippetEnd = spaceBefore;
		}
	}

	const text = (snippetStart > 0 ? '...' : '') +
		line.substring(snippetStart, snippetEnd).trim() +
		(snippetEnd < line.length ? '...' : '');

	const prefix = snippetStart > 0 ? '...' : '';
	const trimmedBeforeLink = line.substring(snippetStart, linkStartInLine);

	return {
		text,
		linkStart: prefix.length + trimmedBeforeLink.trimStart().length,
		linkEnd: prefix.length + trimmedBeforeLink.trimStart().length + (linkEndInLine - linkStartInLine),
	};
}

export function findLinkedMentions(
	currentPath: string,
	noteIndex: Map<string, WikiLink[]>,
	noteContents: Map<string, string>,
	allFilePaths: string[],
	prebuiltCache?: WikilinkResolutionCache,
): BacklinkEntry[] {
	const entries: BacklinkEntry[] = [];
	const cache = prebuiltCache ?? buildResolutionCache(allFilePaths);

	for (const [sourcePath, links] of noteIndex) {
		if (sourcePath === currentPath) continue;

		const matchingLinks = links.filter((link) => {
			const resolved = resolveWikilinkCached(link.target, cache);
			return resolved === currentPath;
		});

		if (matchingLinks.length > 0) {
			const content = noteContents.get(sourcePath) ?? '';
			const snippets: ContextSnippet[] = matchingLinks.map((link) =>
				getContextSnippet(content, link.position),
			);

			entries.push({
				sourcePath,
				sourceName: getNoteName(sourcePath),
				snippets,
			});
		}
	}

	return entries.sort((a, b) => a.sourceName.localeCompare(b.sourceName));
}

/** Strips frontmatter and fenced code blocks, replacing them with whitespace of the same length to preserve positions */
export function stripNonBodyContent(content: string): string {
	return content
		.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, (m) => ' '.repeat(m.length))
		.replace(/```[\s\S]*?```/g, (m) => ' '.repeat(m.length));
}

/**
 * Finds all positions where searchTerm appears as plain text in content.
 * Checks word boundaries and excludes matches inside wikilinks.
 * @param content Original content (used for boundary and wikilink context checks)
 * @param strippedLower Lowercase version of stripped content (from stripNonBodyContent) for searching
 * @param searchTerm The term to search for (case-insensitive matching)
 */
export function findPlainTextMentionPositions(
	content: string,
	strippedLower: string,
	searchTerm: string,
): number[] {
	const termLower = searchTerm.toLowerCase();
	const positions: number[] = [];
	let searchFrom = 0;

	while (searchFrom < strippedLower.length) {
		const idx = strippedLower.indexOf(termLower, searchFrom);
		if (idx === -1) break;

		const before = idx > 0 ? content[idx - 1] : ' ';
		const after = idx + searchTerm.length < content.length ? content[idx + searchTerm.length] : ' ';
		const isWordBoundary = /[\s\p{P}]/u.test(before) && /[\s\p{P}]/u.test(after);

		if (isWordBoundary) {
			const lineStart = content.lastIndexOf('\n', idx - 1) + 1;
			const lineContent = content.substring(lineStart);
			const posInLine = idx - lineStart;

			const bracketBefore = lineContent.lastIndexOf('[[', posInLine);
			const bracketAfter = lineContent.indexOf(']]', posInLine);
			const isInsideWikilink = bracketBefore >= 0 && bracketAfter >= 0 &&
				lineContent.indexOf(']]', bracketBefore) >= posInLine;

			if (!isInsideWikilink) {
				positions.push(idx);
			}
		}

		searchFrom = idx + searchTerm.length;
	}

	return positions;
}

export function findUnlinkedMentions(
	currentPath: string,
	noteName: string,
	noteContents: Map<string, string>,
	noteIndex: Map<string, WikiLink[]>,
): BacklinkEntry[] {
	if (!noteName) return [];

	const entries: BacklinkEntry[] = [];
	const searchTerm = noteName.toLowerCase();

	for (const [sourcePath, content] of noteContents) {
		if (sourcePath === currentPath) continue;

		const linkedTargets = (noteIndex.get(sourcePath) ?? []).map((l) => l.target.toLowerCase());
		if (linkedTargets.some((t) => t === searchTerm || getNoteName(t).toLowerCase() === searchTerm)) continue;

		const stripped = stripNonBodyContent(content);
		const strippedLower = stripped.toLowerCase();
		const positions = findPlainTextMentionPositions(content, strippedLower, noteName);
		const snippets: ContextSnippet[] = positions.map((pos) => getContextSnippet(content, pos));

		if (snippets.length > 0) {
			entries.push({
				sourcePath,
				sourceName: getNoteName(sourcePath),
				snippets,
			});
		}
	}

	return entries.sort((a, b) => a.sourceName.localeCompare(b.sourceName));
}
