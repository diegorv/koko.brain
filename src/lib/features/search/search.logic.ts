import type { SearchQuery, SearchMatch, SearchContextSnippet, SearchResult } from './search.types';
import { extractFrontmatterTags } from '$lib/features/tags/tags.logic';

const TAG_OPERATOR_REGEX = /tag:(\S+)/g;
const PATH_OPERATOR_REGEX = /path:(\S+)/g;

export function parseSearchQuery(raw: string): SearchQuery {
	const tags: string[] = [];
	const paths: string[] = [];

	let text = raw;

	for (const match of raw.matchAll(TAG_OPERATOR_REGEX)) {
		tags.push(match[1]);
	}

	for (const match of raw.matchAll(PATH_OPERATOR_REGEX)) {
		paths.push(match[1]);
	}

	text = text.replace(TAG_OPERATOR_REGEX, '').replace(PATH_OPERATOR_REGEX, '').trim();

	return { text, tags, paths };
}

// Re-exported from the centralized sanitize utility for backwards compatibility.
// The implementation lives in $lib/utils/sanitize and also escapes single quotes.
export { sanitizeSnippetHtml } from '$lib/utils/sanitize';

export function searchFileContent(content: string, query: string): SearchMatch[] {
	if (!query) return [];

	const matches: SearchMatch[] = [];
	const contentLower = content.toLowerCase();
	const queryLower = query.toLowerCase();
	let searchFrom = 0;

	while (searchFrom < contentLower.length) {
		const idx = contentLower.indexOf(queryLower, searchFrom);
		if (idx === -1) break;

		const lineNumber = content.substring(0, idx).split('\n').length;
		matches.push({ position: idx, lineNumber });
		searchFrom = idx + queryLower.length;
	}

	return matches;
}

export function searchFileName(fileName: string, query: string): boolean {
	if (!query) return false;
	return fileName.toLowerCase().includes(query.toLowerCase());
}

export function getSearchContextSnippet(
	content: string,
	position: number,
	queryLength: number,
	radius: number = 60,
): SearchContextSnippet {
	const lineStart = content.lastIndexOf('\n', position - 1) + 1;
	const lineEnd = content.indexOf('\n', position);
	const actualEnd = lineEnd === -1 ? content.length : lineEnd;
	const line = content.substring(lineStart, actualEnd);

	const matchStartInLine = position - lineStart;
	const matchEndInLine = matchStartInLine + queryLength;

	let snippetStart = Math.max(0, matchStartInLine - radius);
	let snippetEnd = Math.min(line.length, matchEndInLine + radius);

	// Snap to word boundaries
	if (snippetStart > 0) {
		const spaceAfter = line.indexOf(' ', snippetStart);
		if (spaceAfter >= 0 && spaceAfter < matchStartInLine) {
			snippetStart = spaceAfter + 1;
		}
	}
	if (snippetEnd < line.length) {
		const spaceBefore = line.lastIndexOf(' ', snippetEnd);
		if (spaceBefore > matchEndInLine) {
			snippetEnd = spaceBefore;
		}
	}

	const prefix = snippetStart > 0 ? '...' : '';
	const suffix = snippetEnd < line.length ? '...' : '';
	const snippetText = line.substring(snippetStart, snippetEnd).trim();
	const text = prefix + snippetText + suffix;

	// Calculate match position in the snippet text
	const trimmedBefore = line.substring(snippetStart, matchStartInLine);
	const leadingSpaces = line.substring(snippetStart).length - line.substring(snippetStart).trimStart().length;
	const matchStart = prefix.length + trimmedBefore.length - leadingSpaces;
	const matchEnd = Math.min(matchStart + queryLength, text.length);

	return { text, matchStart, matchEnd };
}

export function matchesTagFilter(content: string, tag: string): boolean {
	const tagLower = tag.toLowerCase().replace(/^#/, '');

	// Check frontmatter tags (with prefix matching for nested tags)
	const fmTags = extractFrontmatterTags(content);
	if (fmTags.some((t) => {
		const tLower = t.toLowerCase();
		return tLower === tagLower || tLower.startsWith(tagLower + '/');
	})) {
		return true;
	}

	// Strip frontmatter, fenced code blocks, and inline code before searching for inline tags
	let text = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
	text = text.replace(/```[\s\S]*?```/g, '');
	text = text.replace(/`[^`]+`/g, '');

	const textLower = text.toLowerCase();
	const searchTag = `#${tagLower}`;

	let searchFrom = 0;
	while (searchFrom < textLower.length) {
		const idx = textLower.indexOf(searchTag, searchFrom);
		if (idx === -1) return false;

		const charBefore = idx > 0 ? text[idx - 1] : ' ';
		const afterIdx = idx + searchTag.length;
		const charAfter = afterIdx < text.length ? text[afterIdx] : ' ';

		if (
			(/\s/.test(charBefore) || idx === 0) &&
			(/[\s\p{P}]/u.test(charAfter) || afterIdx >= text.length)
		) {
			return true;
		}

		searchFrom = afterIdx;
	}

	return false;
}

export function matchesPathFilter(filePath: string, pathFilter: string): boolean {
	return filePath.toLowerCase().includes(pathFilter.toLowerCase());
}

export function getRelativePath(filePath: string, vaultPath: string): string {
	if (filePath.startsWith(vaultPath)) {
		const relative = filePath.substring(vaultPath.length);
		return relative.startsWith('/') ? relative.substring(1) : relative;
	}
	return filePath;
}

export function getFileName(filePath: string): string {
	const name = filePath.split('/').pop() ?? filePath;
	const dotIndex = name.lastIndexOf('.');
	return dotIndex > 0 ? name.substring(0, dotIndex) : name;
}

export function performSearchOverFiles(
	noteContents: Map<string, string>,
	query: SearchQuery,
	vaultPath: string,
	maxResults: number = 100,
): SearchResult[] {
	const results: SearchResult[] = [];

	for (const [filePath, content] of noteContents) {
		// Apply path filter
		if (query.paths.length > 0) {
			const relativePath = getRelativePath(filePath, vaultPath);
			const pathMatches = query.paths.some((p) => matchesPathFilter(relativePath, p));
			if (!pathMatches) continue;
		}

		// Apply tag filter
		if (query.tags.length > 0) {
			const tagMatches = query.tags.every((tag) => matchesTagFilter(content, tag));
			if (!tagMatches) continue;
		}

		// Search content
		const fileName = getFileName(filePath);
		const contentMatches = query.text ? searchFileContent(content, query.text) : [];
		const nameMatches = query.text ? searchFileName(fileName, query.text) : false;

		// If there's text query, require a match in content or filename
		if (query.text && contentMatches.length === 0 && !nameMatches) continue;

		// If no text query but has filters, include the file with no specific match
		if (!query.text && query.tags.length === 0 && query.paths.length === 0) continue;

		const snippets: SearchContextSnippet[] = contentMatches
			.slice(0, 3)
			.map((m) => getSearchContextSnippet(content, m.position, query.text.length));

		results.push({
			filePath,
			fileName,
			matches: contentMatches,
			snippets,
		});

		if (results.length >= maxResults) break;
	}

	// Sort: files with more matches first, then alphabetically
	results.sort((a, b) => {
		if (b.matches.length !== a.matches.length) return b.matches.length - a.matches.length;
		return a.fileName.localeCompare(b.fileName);
	});

	return results;
}
