import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import { isListableNote } from './type-sidebar.logic';

/**
 * Whether an entry belongs to the lifecycle inbox: not organized, not
 * archived, and a listable note (`isListableNote`: not a Type Definition, not
 * a `.view`). The dock badge and the rail's Inbox lens both use it, so their
 * counts cannot drift apart.
 */
export function isInboxEntry(entry: NoteEntryV2): boolean {
	return !entry.organized && !entry.archived && isListableNote(entry);
}

/**
 * Returns the inbox count: entries that are not organized, not archived,
 * and listable notes (not a Type Definition, not a `.view`).
 */
export function getInboxCount(entries: NoteEntryV2[]): number {
	let count = 0;
	for (const e of entries) {
		if (isInboxEntry(e)) count++;
	}
	return count;
}
