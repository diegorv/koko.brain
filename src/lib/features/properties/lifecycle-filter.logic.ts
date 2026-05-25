import type { NoteEntryV2 } from '$lib/types/vault-v2.types';

/** Filters entries to exclude archived notes. */
export function excludeArchived(entries: NoteEntryV2[]): NoteEntryV2[] {
	return entries.filter((e) => !e.archived);
}

/** Returns only archived entries. */
export function onlyArchived(entries: NoteEntryV2[]): NoteEntryV2[] {
	return entries.filter((e) => e.archived);
}

/** Builds a set of archived paths from vault entries. */
export function buildArchivedPathSet(entries: NoteEntryV2[]): Set<string> {
	const set = new Set<string>();
	for (const e of entries) {
		if (e.archived) set.add(e.path);
	}
	return set;
}

/** Returns the count of archived entries. */
export function countArchived(entries: NoteEntryV2[]): number {
	let count = 0;
	for (const e of entries) {
		if (e.archived) count++;
	}
	return count;
}
