import { describe, it, expect } from 'vitest';
import { resolveDestination } from '#lib/features/auto-move/auto-move.logic.js';
import { buildNoteRecord } from '#lib/features/collection/collection.logic.js';

/**
 * A `{status}` value read from frontmatter is written into the destination
 * unchecked. With status '../../Other' the resolved destination keeps the '..'
 * segments, so the later mkdir and rename (auto-move.service.ts:173-188) leave
 * the vault. A destination must never contain a parent-directory segment.
 */
describe('resolveDestination with a frontmatter value containing ..', () => {
	const vaultPath = '/Users/me/vault';

	it('does not return a destination with a parent-directory segment', () => {
		const record = buildNoteRecord(
			'/Users/me/vault/Inbox/x.md',
			'---\nstatus: ../../Other\n---\nbody',
		);

		const dest = resolveDestination('Tasks/{status}', record, vaultPath);

		expect(dest.split('/')).not.toContain('..');
	});
});
