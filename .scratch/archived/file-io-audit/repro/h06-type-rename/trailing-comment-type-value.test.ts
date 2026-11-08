/**
 * Repro (h06, new finding): a `_type:` line with a YAML inline comment is
 * indexed as the bare type (yaml-rust2 ends a plain scalar at a blank
 * followed by `#`), but the rename rewrite compares the raw value text,
 * so the rewrite skips the note and nothing reports it.
 *
 * The Rust rewrite (`rewrite_type_line`, src-tauri/src/vault/parsing.rs) and
 * the TS rewrite used for open tabs share this comparison. This test runs
 * the TS copy, which is a pure .logic.ts function, and asserts the CORRECT
 * behavior. It fails while the bug exists.
 */
import { describe, it, expect } from 'vitest';
import { rewriteTypeInFrontmatter } from '#lib/features/type-definitions/type-definitions.logic.js';

describe('h06 repro: _type value with a trailing YAML comment', () => {
	it('rewrites a member whose _type line ends in a comment', () => {
		const content = '---\n_type: Project # the kind of note\n---\n\nbody';

		const out = rewriteTypeInFrontmatter(content, 'Project', 'Initiative');

		expect(out).toBe('---\n_type: Initiative\n---\n\nbody');
	});
});
