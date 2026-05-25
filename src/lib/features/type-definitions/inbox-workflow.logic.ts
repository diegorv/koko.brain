import type { NoteEntryV2 } from '$lib/types/vault-v2.types';

/**
 * Returns whether the inbox filter should be active based on the
 * explicitOrganization setting.
 */
export function isInboxEnabled(explicitOrganization: boolean): boolean {
	return explicitOrganization;
}

/**
 * Returns entries that belong in the inbox:
 * not organized, not archived, not a Type Definition.
 */
export function getInboxEntries(entries: NoteEntryV2[]): NoteEntryV2[] {
	return entries.filter((e) => !e.organized && !e.archived && e.isA !== 'Type');
}

/**
 * Returns the inbox count.
 */
export function getInboxCount(entries: NoteEntryV2[]): number {
	let count = 0;
	for (const e of entries) {
		if (!e.organized && !e.archived && e.isA !== 'Type') count++;
	}
	return count;
}

/**
 * Determines if a newly created note should start unorganized.
 * When explicitOrganization is enabled, new notes start unorganized.
 * When disabled, new notes are treated as organized by default (no inbox concept).
 */
export function shouldNewNoteBeUnorganized(explicitOrganization: boolean): boolean {
	return explicitOrganization;
}
