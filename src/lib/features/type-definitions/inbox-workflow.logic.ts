import type { NoteEntryV2 } from '$lib/types/vault-v2.types';

/**
 * Returns the inbox count: entries that are not organized, not archived,
 * and not a Type Definition.
 */
export function getInboxCount(entries: NoteEntryV2[]): number {
	let count = 0;
	for (const e of entries) {
		if (!e.organized && !e.archived && e.isA !== 'Type') count++;
	}
	return count;
}
