import { describe, expectTypeOf, it } from 'vitest';
import type { NoteEntry } from '#lib/contracts/generated/NoteEntry.js';
import type { IndexStats } from '#lib/contracts/generated/IndexStats.js';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import type { SearchIndexStats } from '#lib/features/search/search.types.js';

/**
 * The TS names the app imports are the ts-rs generated types, not
 * hand-written copies. These assertions are compile-time only: `pnpm check`
 * fails when a mirror drifts from the Rust struct.
 */
describe('IPC contract types', () => {
	it('NoteEntryV2 is the generated NoteEntry', () => {
		expectTypeOf<NoteEntryV2>().toEqualTypeOf<NoteEntry>();
	});

	it('SearchIndexStats is the generated IndexStats, with a required numeric added', () => {
		expectTypeOf<SearchIndexStats>().toEqualTypeOf<IndexStats>();
		expectTypeOf<Pick<SearchIndexStats, 'added'>>().toEqualTypeOf<{ added: number }>();
	});
});
