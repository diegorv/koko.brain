import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';

/**
 * Whether an entry belongs to the lifecycle inbox: not organized, not
 * archived, and not a Type Definition. The dock badge and the rail's Inbox
 * lens both use it, so their counts cannot drift apart.
 */
export function isInboxEntry(entry: NoteEntryV2): boolean {
	return !entry.organized && !entry.archived && entry.isA !== 'Type';
}

/**
 * Returns the inbox count: entries that are not organized, not archived,
 * and not a Type Definition.
 */
export function getInboxCount(entries: NoteEntryV2[]): number {
	let count = 0;
	for (const e of entries) {
		if (isInboxEntry(e)) count++;
	}
	return count;
}
