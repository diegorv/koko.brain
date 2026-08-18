import type { NoteEntryV2 } from '$lib/types/vault-v2.types';

/** Builds a set of archived paths from vault entries. */
export function buildArchivedPathSet(entries: NoteEntryV2[]): Set<string> {
	const set = new Set<string>();
	for (const e of entries) {
		if (e.archived) set.add(e.path);
	}
	return set;
}
