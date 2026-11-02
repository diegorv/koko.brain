import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';

/**
 * Returns a new entries array: `base` (sorted by path, as
 * `get_all_vault_entries_v2` returns it) without `removed` paths, with each
 * `upserted` entry replacing the one at its path or inserted at its sorted
 * position. Untouched entries keep their identity. `base` is not mutated.
 */
export function patchEntriesSnapshot(
	base: NoteEntryV2[],
	upserted: NoteEntryV2[],
	removed: Iterable<string>,
): NoteEntryV2[] {
	const dropped = new Set(removed);
	for (const entry of upserted) dropped.add(entry.path);
	const kept = base.filter((e) => !dropped.has(e.path));
	const added = [...upserted].sort(byPath);
	const out: NoteEntryV2[] = [];
	let i = 0;
	let j = 0;
	while (i < kept.length && j < added.length) {
		out.push(byPath(kept[i], added[j]) <= 0 ? kept[i++] : added[j++]);
	}
	while (i < kept.length) out.push(kept[i++]);
	while (j < added.length) out.push(added[j++]);
	return out;
}

/** Code-unit path order; matches Rust's byte order for every path outside the astral planes. */
function byPath(a: NoteEntryV2, b: NoteEntryV2): number {
	return a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
}
