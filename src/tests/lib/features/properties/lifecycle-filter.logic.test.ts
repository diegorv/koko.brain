import { describe, it, expect } from 'vitest';
import {
	excludeArchived,
	onlyArchived,
	buildArchivedPathSet,
	countArchived,
} from '$lib/features/properties/lifecycle-filter.logic';
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
		relationships: {},
	};
}

describe('excludeArchived', () => {
	it('removes archived entries', () => {
		const entries = [entry('/a.md', false), entry('/b.md', true), entry('/c.md', false)];
		const result = excludeArchived(entries);
		expect(result.map((e) => e.path)).toEqual(['/a.md', '/c.md']);
	});

	it('returns all when none archived', () => {
		const entries = [entry('/a.md', false), entry('/b.md', false)];
		expect(excludeArchived(entries)).toHaveLength(2);
	});

	it('returns empty when all archived', () => {
		const entries = [entry('/a.md', true), entry('/b.md', true)];
		expect(excludeArchived(entries)).toHaveLength(0);
	});
});

describe('onlyArchived', () => {
	it('returns only archived entries', () => {
		const entries = [entry('/a.md', false), entry('/b.md', true), entry('/c.md', true)];
		const result = onlyArchived(entries);
		expect(result.map((e) => e.path)).toEqual(['/b.md', '/c.md']);
	});
});

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

describe('countArchived', () => {
	it('counts archived entries', () => {
		const entries = [entry('/a.md', false), entry('/b.md', true), entry('/c.md', true)];
		expect(countArchived(entries)).toBe(2);
	});

	it('returns 0 when none archived', () => {
		expect(countArchived([entry('/a.md', false)])).toBe(0);
	});
});
