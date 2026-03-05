/**
 * Shared builders for realistic vault test data.
 * Uses REAL parseWikilinks to ensure mock data matches production behavior.
 */
import { parseWikilinks } from '$lib/features/backlinks/backlinks.logic';
import type { WikiLink } from '$lib/features/backlinks/backlinks.types';

/**
 * Builds a Map<path, content> from a simple record.
 * Use with noteIndexStore.setNoteContents().
 */
export function buildNoteContents(
	notes: Record<string, string>,
): Map<string, string> {
	return new Map(Object.entries(notes));
}

/**
 * Builds a Map<path, WikiLink[]> by running REAL parseWikilinks on each note.
 * Use with noteIndexStore.setNoteIndex().
 * This ensures the index matches what the real build pipeline produces.
 */
export function buildNoteIndex(
	notes: Record<string, string>,
): Map<string, WikiLink[]> {
	const index = new Map<string, WikiLink[]>();
	for (const [path, content] of Object.entries(notes)) {
		index.set(path, parseWikilinks(content));
	}
	return index;
}

/**
 * Convenience: builds both noteContents and noteIndex from the same data.
 * Returns both maps ready to populate noteIndexStore.
 */
export function buildVaultData(notes: Record<string, string>): {
	noteContents: Map<string, string>;
	noteIndex: Map<string, WikiLink[]>;
} {
	return {
		noteContents: buildNoteContents(notes),
		noteIndex: buildNoteIndex(notes),
	};
}
