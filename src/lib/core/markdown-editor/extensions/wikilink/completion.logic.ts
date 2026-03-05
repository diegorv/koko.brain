import type { FileEntry } from '$lib/features/quick-switcher/quick-switcher.logic';
import { fuzzyMatch } from '$lib/features/quick-switcher/quick-switcher.logic';
import { HEADING_RE, BLOCK_ID_RE } from './navigation.logic';
import { parseFrontmatterProperties } from '$lib/features/properties/properties.logic';

/** Completion mode: what kind of suggestions to show */
export type WikilinkMode = 'file' | 'heading' | 'blockId';

export interface WikilinkMatch {
	from: number;
	to: number;
	query: string;
	/** The type of completion to provide */
	mode: WikilinkMode;
	/** The note name before `#` (only for heading/blockId modes) */
	target?: string;
}

/**
 * Detects whether the cursor is inside a `[[...]]` wikilink and determines
 * the completion mode (file, heading, or blockId).
 *
 * - `[[query` → file mode
 * - `[[Note#query` → heading mode
 * - `[[Note#^query` → blockId mode
 */
export function detectWikilinkContext(docText: string, pos: number): WikilinkMatch | null {
	const lineStart = docText.lastIndexOf('\n', pos - 1) + 1;
	const textBeforeCursor = docText.substring(lineStart, pos);

	const bracketIdx = textBeforeCursor.lastIndexOf('[[');
	if (bracketIdx === -1) return null;

	const afterBracket = textBeforeCursor.substring(bracketIdx + 2);
	if (afterBracket.includes(']]')) return null;

	// Check for pipe — if there's a `|` we're in the display text area, no completion
	if (afterBracket.includes('|')) return null;

	const hashIdx = afterBracket.indexOf('#');
	if (hashIdx >= 0) {
		const target = afterBracket.substring(0, hashIdx);
		const afterHash = afterBracket.substring(hashIdx + 1);

		if (afterHash.startsWith('^')) {
			// [[Target#^query → blockId mode
			const query = afterHash.substring(1);
			return {
				from: lineStart + bracketIdx + 2 + hashIdx + 2,
				to: pos,
				query,
				mode: 'blockId',
				target,
			};
		}

		// [[Target#query → heading mode
		return {
			from: lineStart + bracketIdx + 2 + hashIdx + 1,
			to: pos,
			query: afterHash,
			mode: 'heading',
			target,
		};
	}

	return {
		from: lineStart + bracketIdx + 2,
		to: pos,
		query: afterBracket,
		mode: 'file',
	};
}

/** Matches files by fuzzy-matching the query against file names */
export function matchFilesForWikilink(query: string, files: FileEntry[]): FileEntry[] {
	if (query.length === 0) {
		return [...files].sort((a, b) => a.name.localeCompare(b.name));
	}

	const scored = files
		.map((file) => ({ file, ...fuzzyMatch(query, file.name) }))
		.filter((entry) => entry.match);

	scored.sort((a, b) => {
		if (a.score !== b.score) return a.score - b.score;
		return a.file.name.localeCompare(b.file.name);
	});

	return scored.map((entry) => entry.file);
}

/** Extracts all ATX heading texts from markdown content */
export function extractHeadingsFromContent(content: string): string[] {
	const headings: string[] = [];
	for (const line of content.split('\n')) {
		const match = HEADING_RE.exec(line);
		if (match) {
			headings.push(match[1].trim());
		}
	}
	return headings;
}

/** Extracts all block ID markers (`^block-id`) from markdown content */
export function extractBlockIdsFromContent(content: string): string[] {
	const blockIds: string[] = [];
	for (const line of content.split('\n')) {
		const match = BLOCK_ID_RE.exec(line);
		if (match) {
			blockIds.push(match[1]);
		}
	}
	return blockIds;
}

/** Extracts the `aliases` property from YAML frontmatter as a string array */
export function extractAliasesFromContent(content: string): string[] {
	const properties = parseFrontmatterProperties(content);
	const aliasesProp = properties.find((p) => p.key === 'aliases');
	if (!aliasesProp) return [];

	if (Array.isArray(aliasesProp.value)) {
		return aliasesProp.value.map(String);
	}
	if (typeof aliasesProp.value === 'string' && aliasesProp.value.length > 0) {
		return [aliasesProp.value];
	}
	return [];
}
