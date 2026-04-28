import { describe, it, expect } from 'vitest';

// Phase 6 of the perf refactor migrated outgoing-link extraction +
// unlinked-mention discovery to Rust. The TS implementations
// (`getOutgoingLinks`, `deduplicateOutgoingLinks`,
// `findOutgoingUnlinkedMentions`) were deleted; the equivalent test
// coverage lives in:
//   - src-tauri/tests/vault_index_test.rs (lookup_outgoing_links +
//     lookup_outgoing_unlinked_mentions)
//   - src-tauri/tests/vault_parsing_test.rs (strip_non_body_content +
//     find_plain_text_mention_positions)
//
// This file is kept as a placeholder so the import path remains valid
// for any future TS-only outgoing-link helpers; if nothing lands within
// a few iterations, delete it along with `outgoing-links.logic.ts`.

describe('outgoing-links.logic (post-Phase 6)', () => {
	it('module exposes no production TS helpers anymore', async () => {
		const mod = await import('$lib/features/outgoing-links/outgoing-links.logic');
		// The only exports of an empty module are TypeScript's `__esModule` flag
		// and re-exports; ensure no production helpers leaked back in.
		const productionKeys = Object.keys(mod).filter((k) => !k.startsWith('__'));
		expect(productionKeys).toEqual([]);
	});
});
