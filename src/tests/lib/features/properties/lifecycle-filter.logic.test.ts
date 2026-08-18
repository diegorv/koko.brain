import { describe, it, expect } from 'vitest';
import { buildArchivedPathSet } from '$lib/features/properties/lifecycle-filter.logic';
import type { NoteEntryV2 } from '$lib/types/vault-v2.types';

function entry(path: string, archived: boolean): NoteEntryV2 {
	return {
		path,
		title: path.split('/').pop()?.replace('.md', '') ?? path,
		frontmatter: {},
		outgoingLinks: [],
		tags: [],
		modifiedAt: 0,
		createdAt: 0,
		size: 0,
		wordCount: 0,
		snippet: '',
		tasks: [],
		isA: null,
		organized: false,
		archived,
		favorite: false,
		belongsTo: [],
		relatedTo: [],
		hasMany: [],
		relationships: {},
	};
}

describe('buildArchivedPathSet', () => {
	it('builds set of archived paths', () => {
		const entries = [entry('/a.md', false), entry('/b.md', true), entry('/c.md', true)];
		const set = buildArchivedPathSet(entries);
		expect(set.has('/b.md')).toBe(true);
		expect(set.has('/c.md')).toBe(true);
		expect(set.has('/a.md')).toBe(false);
	});

	it('returns empty set when no archived', () => {
		const entries = [entry('/a.md', false)];
		expect(buildArchivedPathSet(entries).size).toBe(0);
	});
});
