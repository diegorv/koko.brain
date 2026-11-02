import { describe, it, expect } from 'vitest';
import { patchEntriesSnapshot } from '#lib/core/vault/vault-entries.logic.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

const paths = (entries: { path: string }[]) => entries.map((e) => e.path);

describe('patchEntriesSnapshot', () => {
	it('replaces an upserted entry in place and keeps path order', () => {
		const base = [entryV2('/v/a.md'), entryV2('/v/b.md'), entryV2('/v/c.md')];
		const changed = entryV2('/v/b.md', { favorite: true });

		const next = patchEntriesSnapshot(base, [changed], []);

		expect(paths(next)).toEqual(['/v/a.md', '/v/b.md', '/v/c.md']);
		expect(next[1]).toBe(changed);
		expect(next[0]).toBe(base[0]);
	});

	it('inserts new entries at their sorted position and drops removed paths', () => {
		const base = [entryV2('/v/a.md'), entryV2('/v/c.md'), entryV2('/v/e.md')];

		const next = patchEntriesSnapshot(
			base,
			[entryV2('/v/f.md'), entryV2('/v/b.md')],
			['/v/c.md', '/v/missing.md'],
		);

		expect(paths(next)).toEqual(['/v/a.md', '/v/b.md', '/v/e.md', '/v/f.md']);
	});

	it('handles an empty base and an empty delta without mutating the input', () => {
		expect(paths(patchEntriesSnapshot([], [entryV2('/v/a.md')], []))).toEqual(['/v/a.md']);

		const base = [entryV2('/v/a.md')];
		const next = patchEntriesSnapshot(base, [], []);
		expect(next).toEqual(base);
		expect(next).not.toBe(base);
	});
});
