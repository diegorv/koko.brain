import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import type { PropertyIndexRecord } from '#lib/features/collection/collection.types.js';
import { buildNoteRecord } from '#lib/features/collection/collection.logic.js';
import { entryV2 } from './vault-entries.fixture';

/**
 * One vault for the `.view` row-set tests: `Recent.view` has no filters,
 * `limit: 3`, no `sort` and no `_sort`. The files a view never lists (an
 * archived note, a note under `_system/`, a type definition and the two
 * `.view` files) are the newest and come first in the property index, ahead
 * of five plain notes with distinct modification times and no `date`. The
 * index `mtime` (ms) and the entries' `modifiedAt` (s) are the same instants.
 */
export const RECENT_VAULT = '/vault';
export const RECENT_VIEW = `${RECENT_VAULT}/Recent.view`;
export const RECENT_OTHER_VIEW = `${RECENT_VAULT}/Other.view`;
export const RECENT_VIEW_YAML = 'views:\n  - type: table\n    name: Recent\n    limit: 3\n';

/** The three newest plain notes, newest first: the view's row set. */
export const RECENT_NEWEST_THREE = [`${RECENT_VAULT}/n5.md`, `${RECENT_VAULT}/n4.md`, `${RECENT_VAULT}/n3.md`];

/** Seconds since the epoch of the fixture's n-th minute. */
const at = (n: number) => 1_700_000_000 + n * 60;

const FILES: [path: string, content: string, modified: number, entry: Partial<NoteEntryV2>][] = [
	[`${RECENT_VAULT}/old.md`, '---\n_archived: true\n---\n', at(20), { archived: true }],
	[`${RECENT_VAULT}/_system/templates/t.md`, '# t\n', at(19), {}],
	[`${RECENT_VAULT}/types/Project.md`, '---\n_type: Type\n---\n', at(18), { isA: 'Type' }],
	[RECENT_OTHER_VIEW, '---\n_sort: title\n---\n', at(17), { frontmatter: { _sort: 'title' } }],
	[RECENT_VIEW, `---\n${RECENT_VIEW_YAML}---\n`, at(16), {}],
	[`${RECENT_VAULT}/n1.md`, '# n1\n', at(1), {}],
	[`${RECENT_VAULT}/n2.md`, '# n2\n', at(2), {}],
	[`${RECENT_VAULT}/n3.md`, '# n3\n', at(3), {}],
	[`${RECENT_VAULT}/n4.md`, '# n4\n', at(4), {}],
	[`${RECENT_VAULT}/n5.md`, '# n5\n', at(5), {}],
];

/** The fixture's property index, in the order above. */
export function recentIndex(): Map<string, PropertyIndexRecord> {
	return new Map(FILES.map(([p, c, s]) => [p, buildNoteRecord(p, c, s * 1000, s * 1000)]));
}

/** The fixture's vault entries. */
export function recentEntries(): NoteEntryV2[] {
	return FILES.map(([p, , s, e]) => entryV2(p, { modifiedAt: s, createdAt: s, ...e }));
}
