import type { NoteRecord } from '$lib/features/collection/collection.types';
import type { WikiLink } from '$lib/features/backlinks/backlinks.types';
import type { KBPage, KBLink, KBTask } from './queryjs.types';
import { KBDateTime } from './kb-datetime';
import { extractAllTags } from '$lib/features/tags/tags.logic';
import { extractTasks } from '$lib/features/tasks/tasks.logic';

/** Extracts basename (without extension) from a file path */
function getBasename(filePath: string): string {
	const parts = filePath.split('/');
	const fileName = parts[parts.length - 1] ?? filePath;
	const dotIdx = fileName.lastIndexOf('.');
	return dotIdx > 0 ? fileName.substring(0, dotIdx) : fileName;
}

/** Creates a KBLink from a file path */
export function buildKBLink(filePath: string): KBLink {
	return { path: filePath, display: getBasename(filePath) };
}

/**
 * Resolves a wikilink target name to an absolute file path (case-insensitive).
 * Returns null if no matching file is found.
 */
export function resolveWikiLinkTarget(target: string, allFilePaths: string[]): string | null {
	const targetLower = target.toLowerCase();
	for (const fp of allFilePaths) {
		if (getBasename(fp).toLowerCase() === targetLower) return fp;
	}
	// If target contains a path (e.g. "folder/note"), try matching just the basename
	const targetBasename = getBasename(target).toLowerCase();
	if (targetBasename !== targetLower) {
		for (const fp of allFilePaths) {
			if (getBasename(fp).toLowerCase() === targetBasename) return fp;
		}
	}
	return null;
}

/**
 * Pre-computes a reverse index: basename (lowercase) → set of source file paths
 * that link to that basename. Built once, then used by resolveInlinks for O(1) lookups.
 */
export function buildReverseIndex(
	noteIndex: Map<string, WikiLink[]>,
): Map<string, Set<string>> {
	const reverse = new Map<string, Set<string>>();
	for (const [sourcePath, links] of noteIndex) {
		for (const link of links) {
			const basename = getBasename(link.target).toLowerCase();
			let sources = reverse.get(basename);
			if (!sources) {
				sources = new Set();
				reverse.set(basename, sources);
			}
			sources.add(sourcePath);
		}
	}
	return reverse;
}

/**
 * Finds all files whose outgoing wikilinks target the given file.
 * Uses a pre-computed reverse index for O(1) lookup instead of scanning all entries.
 * Returns one KBLink per source file (deduped, excluding self-links).
 */
export function resolveInlinks(
	filePath: string,
	reverseIndex: Map<string, Set<string>>,
): KBLink[] {
	const targetBasename = getBasename(filePath).toLowerCase();
	const sources = reverseIndex.get(targetBasename);
	if (!sources) return [];

	const inlinks: KBLink[] = [];
	for (const sourcePath of sources) {
		if (sourcePath !== filePath) {
			inlinks.push(buildKBLink(sourcePath));
		}
	}
	return inlinks;
}

/**
 * If a value looks like an ISO date string, convert it to KBDateTime.
 * Otherwise return as-is.
 */
function maybeParseDate(value: unknown): unknown {
	if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
		const d = new Date(value);
		if (!isNaN(d.getTime())) return new KBDateTime(value);
	}
	return value;
}

/**
 * Builds a KBPage from a NoteRecord.
 * Merges file metadata, computed links, tags, and frontmatter properties.
 */
export function buildKBPage(
	record: NoteRecord,
	noteIndex: Map<string, WikiLink[]>,
	noteContents: Map<string, string>,
	allFilePaths: string[],
	reverseIndex?: Map<string, Set<string>>,
): KBPage {
	const content = noteContents.get(record.path) ?? '';
	const tags = extractAllTags(content);
	const inlinks = reverseIndex
		? resolveInlinks(record.path, reverseIndex)
		: [];
	const tasks: KBTask[] = extractTasks(content).map((t) => ({
		text: t.text,
		completed: t.checked,
		line: t.lineNumber,
		path: record.path,
	}));

	// Compute outlinks from this file's wikilinks
	const outWikiLinks = noteIndex.get(record.path) ?? [];
	const outlinks: KBLink[] = [];
	for (const wl of outWikiLinks) {
		const resolved = resolveWikiLinkTarget(wl.target, allFilePaths);
		if (resolved) {
			outlinks.push({ path: resolved, display: wl.alias ?? wl.target });
		}
	}

	const page: KBPage = {
		file: {
			path: record.path,
			name: record.name,
			basename: record.basename,
			folder: record.folder,
			link: buildKBLink(record.path),
			tags,
			inlinks,
			outlinks,
			size: record.size,
			ctime: record.ctime,
			mtime: record.mtime,
			tasks,
		},
	};

	// Spread frontmatter properties onto page root, converting date strings
	for (const [key, value] of record.properties) {
		if (key !== 'file') {
			(page as Record<string, unknown>)[key] = maybeParseDate(value);
		}
	}

	return page;
}

/**
 * Parses a kb.pages() source string into a filter function.
 * Supports #tag (with subtag hierarchy) and "folder" filters.
 * Returns null if source is empty/undefined (meaning: all pages).
 */
export function parseSource(source: string | undefined): ((page: KBPage) => boolean) | null {
	if (!source || !source.trim()) return null;

	const trimmed = source.trim();

	// Tag filter: #tag or #tag/subtag
	if (trimmed.startsWith('#')) {
		const tag = trimmed.slice(1).toLowerCase();
		return (page) =>
			page.file.tags.some(
				(t) => t.toLowerCase() === tag || t.toLowerCase().startsWith(tag + '/'),
			);
	}

	// Folder filter: "folder" or 'folder' (matching quotes required)
	const folderMatch = trimmed.match(/^"(.+)"$/) ?? trimmed.match(/^'(.+)'$/);
	if (folderMatch) {
		const folder = folderMatch[1].toLowerCase();
		return (page) => page.file.folder.toLowerCase().includes(folder);
	}

	return null;
}
