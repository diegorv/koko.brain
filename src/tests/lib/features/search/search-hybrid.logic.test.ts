import { describe, it, expect } from 'vitest';
import { mergeResults } from '$lib/features/search/search-hybrid.logic';
import type { FtsSearchResult, SemanticSearchResult } from '$lib/features/search/search.types';

describe('mergeResults (RRF)', () => {
	it('returns empty array when both inputs are empty', () => {
		const result = mergeResults([], []);
		expect(result).toEqual([]);
	});

	it('returns text-only results with RRF scores when no semantic results', () => {
		const textResults: FtsSearchResult[] = [
			{ path: 'a.md', title: 'A', score: -2.0, snippet: 'text A', tags: '' },
			{ path: 'b.md', title: 'B', score: -1.0, snippet: 'text B', tags: '' },
		];

		const result = mergeResults(textResults, []);

		expect(result).toHaveLength(2);
		expect(result[0].path).toBe('a.md');
		expect(result[0].source).toBe('text');
		expect(result[0].textScore).toBe(-2.0);
		expect(result[0].semanticScore).toBeUndefined();
		// RRF score = 1/(60+0) for rank 0
		expect(result[0].combinedScore).toBeCloseTo(1 / 60, 6);
		// Rank 1 should score lower
		expect(result[1].combinedScore).toBeCloseTo(1 / 61, 6);
	});

	it('returns semantic-only results with RRF scores when no text results', () => {
		const semanticResults: SemanticSearchResult[] = [
			{
				key: 'k1',
				sourcePath: 'c.md',
				content: 'semantic match',
				heading: 'Section',
				lineStart: 5,
				lineEnd: 10,
				score: 0.9,
			},
		];

		const result = mergeResults([], semanticResults);

		expect(result).toHaveLength(1);
		expect(result[0].path).toBe('c.md');
		expect(result[0].source).toBe('semantic');
		expect(result[0].semanticScore).toBe(0.9);
		expect(result[0].heading).toBe('Section');
		expect(result[0].lineStart).toBe(5);
		expect(result[0].combinedScore).toBeCloseTo(1 / 60, 6);
	});

	it('merges overlapping results and marks them as "both" with summed RRF', () => {
		const textResults: FtsSearchResult[] = [
			{ path: 'a.md', title: 'A', score: -3.0, snippet: 'matched', tags: '' },
		];
		const semanticResults: SemanticSearchResult[] = [
			{
				key: 'k1',
				sourcePath: 'a.md',
				content: 'semantic content',
				heading: 'H1',
				lineStart: 1,
				lineEnd: 4,
				score: 0.8,
			},
		];

		const result = mergeResults(textResults, semanticResults);

		expect(result).toHaveLength(1);
		expect(result[0].path).toBe('a.md');
		expect(result[0].source).toBe('both');
		expect(result[0].textScore).toBe(-3.0);
		expect(result[0].semanticScore).toBe(0.8);
		expect(result[0].heading).toBe('H1');
		// Both at rank 0: 1/(60+0) + 1/(60+0)
		expect(result[0].combinedScore).toBeCloseTo(2 / 60, 6);
	});

	it('deduplicates by path — same file from both sources produces one result', () => {
		const textResults: FtsSearchResult[] = [
			{ path: 'shared.md', title: 'Shared', score: -2.0, snippet: 'text', tags: '' },
		];
		const semanticResults: SemanticSearchResult[] = [
			{
				key: 'k1',
				sourcePath: 'shared.md',
				content: 'semantic',
				heading: null,
				lineStart: 1,
				lineEnd: 5,
				score: 0.7,
			},
		];

		const result = mergeResults(textResults, semanticResults);
		expect(result).toHaveLength(1);
	});

	it('ranks "both" results higher than single-source results', () => {
		const textResults: FtsSearchResult[] = [
			{ path: 'both.md', title: 'Both', score: -5.0, snippet: '', tags: '' },
			{ path: 'text-only.md', title: 'Text Only', score: -3.0, snippet: '', tags: '' },
		];
		const semanticResults: SemanticSearchResult[] = [
			{
				key: 'k1',
				sourcePath: 'both.md',
				content: 'content',
				heading: null,
				lineStart: 1,
				lineEnd: 5,
				score: 0.8,
			},
			{
				key: 'k2',
				sourcePath: 'sem-only.md',
				content: 'content',
				heading: null,
				lineStart: 1,
				lineEnd: 5,
				score: 0.9,
			},
		];

		const result = mergeResults(textResults, semanticResults);

		// "both.md" should be first because it has RRF from both lists
		expect(result[0].path).toBe('both.md');
		expect(result[0].source).toBe('both');
		expect(result[0].combinedScore).toBeGreaterThan(result[1].combinedScore);
	});

	it('sorts by combinedScore descending', () => {
		const textResults: FtsSearchResult[] = [
			{ path: 'low.md', title: 'Low', score: -0.5, snippet: '', tags: '' },
			{ path: 'high.md', title: 'High', score: -5.0, snippet: '', tags: '' },
		];

		const result = mergeResults(textResults, []);

		// First text result (rank 0) gets higher RRF than second (rank 1)
		expect(result[0].path).toBe('low.md');
		expect(result[0].combinedScore).toBeGreaterThan(result[1].combinedScore);
	});

	it('preserves original BM25 score in textScore field', () => {
		const textResults: FtsSearchResult[] = [
			{ path: 'a.md', title: 'A', score: -10.0, snippet: '', tags: '' },
			{ path: 'b.md', title: 'B', score: -5.0, snippet: '', tags: '' },
		];

		const result = mergeResults(textResults, []);

		expect(result[0].textScore).toBe(-10.0);
		expect(result[1].textScore).toBe(-5.0);
	});

	it('handles single text result with zero score', () => {
		const textResults: FtsSearchResult[] = [
			{ path: 'a.md', title: 'A', score: 0, snippet: '', tags: '' },
		];

		const result = mergeResults(textResults, []);
		expect(result).toHaveLength(1);
		expect(result[0].textScore).toBe(0);
		expect(result[0].combinedScore).toBeCloseTo(1 / 60, 6);
	});

	it('extracts title from semantic sourcePath when no text result exists', () => {
		const semanticResults: SemanticSearchResult[] = [
			{
				key: 'k1',
				sourcePath: 'notes/deep/my-note.md',
				content: 'content',
				heading: null,
				lineStart: 1,
				lineEnd: 5,
				score: 0.9,
			},
		];

		const result = mergeResults([], semanticResults);

		expect(result[0].title).toBe('my-note');
	});

	it('handles null heading in semantic results', () => {
		const semanticResults: SemanticSearchResult[] = [
			{
				key: 'k1',
				sourcePath: 'a.md',
				content: 'test',
				heading: null,
				lineStart: 1,
				lineEnd: 5,
				score: 0.5,
			},
		];

		const result = mergeResults([], semanticResults);

		expect(result[0].heading).toBeUndefined();
	});

	it('truncates semantic snippet to 200 chars', () => {
		const longContent = 'A'.repeat(500);
		const semanticResults: SemanticSearchResult[] = [
			{
				key: 'k1',
				sourcePath: 'a.md',
				content: longContent,
				heading: null,
				lineStart: 1,
				lineEnd: 5,
				score: 0.5,
			},
		];

		const result = mergeResults([], semanticResults);

		expect(result[0].snippet.length).toBe(200);
	});

	it('RRF scores decrease monotonically with rank', () => {
		const textResults: FtsSearchResult[] = [
			{ path: 'a.md', title: 'A', score: -5.0, snippet: '', tags: '' },
			{ path: 'b.md', title: 'B', score: -4.0, snippet: '', tags: '' },
			{ path: 'c.md', title: 'C', score: -3.0, snippet: '', tags: '' },
		];

		const result = mergeResults(textResults, []);

		expect(result[0].combinedScore).toBeGreaterThan(result[1].combinedScore);
		expect(result[1].combinedScore).toBeGreaterThan(result[2].combinedScore);
	});

	it('handles duplicate sourcePaths in semantic results — keeps best match metadata', () => {
		const semanticResults: SemanticSearchResult[] = [
			{
				key: 'k1',
				sourcePath: 'a.md',
				content: 'first chunk',
				heading: 'H1',
				lineStart: 1,
				lineEnd: 5,
				score: 0.9,
			},
			{
				key: 'k2',
				sourcePath: 'a.md',
				content: 'second chunk',
				heading: 'H2',
				lineStart: 10,
				lineEnd: 15,
				score: 0.7,
			},
		];

		const result = mergeResults([], semanticResults);

		expect(result).toHaveLength(1);
		expect(result[0].path).toBe('a.md');
		expect(result[0].combinedScore).toBeCloseTo(1 / 60 + 1 / 61, 6);
		// First (best-scoring) chunk's metadata is preserved
		expect(result[0].heading).toBe('H1');
		expect(result[0].lineStart).toBe(1);
		expect(result[0].semanticScore).toBe(0.9);
	});

	it('keeps first semantic heading when FTS entry exists and multiple chunks match', () => {
		const textResults: FtsSearchResult[] = [
			{ path: 'a.md', title: 'A', score: -2.0, snippet: 'text', tags: '' },
		];
		const semanticResults: SemanticSearchResult[] = [
			{
				key: 'k1',
				sourcePath: 'a.md',
				content: 'best chunk',
				heading: 'Introduction',
				lineStart: 1,
				lineEnd: 5,
				score: 0.9,
			},
			{
				key: 'k2',
				sourcePath: 'a.md',
				content: 'worse chunk',
				heading: 'Conclusion',
				lineStart: 50,
				lineEnd: 60,
				score: 0.5,
			},
		];

		const result = mergeResults(textResults, semanticResults);

		expect(result).toHaveLength(1);
		expect(result[0].source).toBe('both');
		// Best semantic chunk's metadata is preserved, not the last one
		expect(result[0].heading).toBe('Introduction');
		expect(result[0].lineStart).toBe(1);
		expect(result[0].semanticScore).toBe(0.9);
	});

	it('handles semantic result with empty content', () => {
		const semanticResults: SemanticSearchResult[] = [
			{
				key: 'k1',
				sourcePath: 'a.md',
				content: '',
				heading: null,
				lineStart: 1,
				lineEnd: 1,
				score: 0.5,
			},
		];

		const result = mergeResults([], semanticResults);

		expect(result).toHaveLength(1);
		expect(result[0].snippet).toBe('');
	});
});
