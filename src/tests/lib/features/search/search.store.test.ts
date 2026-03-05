import { describe, it, expect, beforeEach } from 'vitest';
import { searchStore } from '$lib/features/search/search.store.svelte';

describe('searchStore', () => {
	beforeEach(() => {
		searchStore.reset();
	});

	it('starts with default state', () => {
		expect(searchStore.query).toBe('');
		expect(searchStore.results).toEqual([]);
		expect(searchStore.isSearching).toBe(false);
		expect(searchStore.isOpen).toBe(false);
	});

	it('setQuery updates query', () => {
		searchStore.setQuery('test');
		expect(searchStore.query).toBe('test');
	});

	it('setResults updates results', () => {
		const results = [{ path: '/a.md', matches: [] }] as any;
		searchStore.setResults(results);
		expect(searchStore.results).toBe(results);
	});

	it('setSearching updates searching state', () => {
		searchStore.setSearching(true);
		expect(searchStore.isSearching).toBe(true);
	});

	it('setOpen updates open state', () => {
		searchStore.setOpen(true);
		expect(searchStore.isOpen).toBe(true);
	});

	it('toggle flips isOpen', () => {
		searchStore.toggle();
		expect(searchStore.isOpen).toBe(true);
		searchStore.toggle();
		expect(searchStore.isOpen).toBe(false);
	});

	it('reset clears all state', () => {
		searchStore.setQuery('test');
		searchStore.setResults([{}] as any);
		searchStore.setSearching(true);
		searchStore.setOpen(true);

		searchStore.reset();

		expect(searchStore.query).toBe('');
		expect(searchStore.results).toEqual([]);
		expect(searchStore.isSearching).toBe(false);
		expect(searchStore.isOpen).toBe(false);
	});

	// --- Advanced search state ---

	it('starts with default advanced state', () => {
		expect(searchStore.mode).toBe('text');
		expect(searchStore.fuzzyEnabled).toBe(true);
		expect(searchStore.ftsResults).toEqual([]);
		expect(searchStore.semanticResults).toEqual([]);
		expect(searchStore.hybridResults).toEqual([]);
		expect(searchStore.indexStats).toBeNull();
		expect(searchStore.isIndexing).toBe(false);
		expect(searchStore.semanticStats).toBeNull();
		expect(searchStore.isSemanticIndexing).toBe(false);
		expect(searchStore.semanticProgress).toBeNull();
		expect(searchStore.modelAvailable).toBe(false);
	});

	it('setMode updates mode', () => {
		searchStore.setMode('semantic');
		expect(searchStore.mode).toBe('semantic');
		searchStore.setMode('hybrid');
		expect(searchStore.mode).toBe('hybrid');
		searchStore.setMode('text');
		expect(searchStore.mode).toBe('text');
	});

	it('setFuzzyEnabled updates fuzzy state', () => {
		searchStore.setFuzzyEnabled(false);
		expect(searchStore.fuzzyEnabled).toBe(false);
		searchStore.setFuzzyEnabled(true);
		expect(searchStore.fuzzyEnabled).toBe(true);
	});

	it('setFtsResults updates FTS results', () => {
		const results = [
			{ path: 'a.md', title: 'A', score: -1.5, snippet: 'test', tags: '' },
		];
		searchStore.setFtsResults(results);
		expect(searchStore.ftsResults).toEqual(results);
	});

	it('setSemanticResults updates semantic results', () => {
		const results = [
			{
				key: 'k1',
				sourcePath: 'a.md',
				content: 'test',
				heading: null,
				lineStart: 1,
				lineEnd: 5,
				score: 0.85,
			},
		];
		searchStore.setSemanticResults(results);
		expect(searchStore.semanticResults).toEqual(results);
	});

	it('setHybridResults updates hybrid results', () => {
		const results = [
			{
				path: 'a.md',
				title: 'A',
				combinedScore: 0.7,
				snippet: 'test',
				source: 'both' as const,
			},
		];
		searchStore.setHybridResults(results);
		expect(searchStore.hybridResults).toEqual(results);
	});

	it('setIndexStats updates index stats', () => {
		const stats = { totalDocuments: 42 };
		searchStore.setIndexStats(stats);
		expect(searchStore.indexStats).toEqual(stats);
	});

	it('setIsIndexing updates indexing flag', () => {
		searchStore.setIsIndexing(true);
		expect(searchStore.isIndexing).toBe(true);
		searchStore.setIsIndexing(false);
		expect(searchStore.isIndexing).toBe(false);
	});

	it('setSemanticStats updates semantic stats', () => {
		const stats = { totalChunks: 100, totalSources: 10, modelLoaded: true };
		searchStore.setSemanticStats(stats);
		expect(searchStore.semanticStats).toEqual(stats);
	});

	it('setIsSemanticIndexing updates semantic indexing flag', () => {
		searchStore.setIsSemanticIndexing(true);
		expect(searchStore.isSemanticIndexing).toBe(true);
	});

	it('setSemanticProgress updates progress', () => {
		const progress = { phase: 'embedding' as const, current: 5, total: 20, message: '5/20' };
		searchStore.setSemanticProgress(progress);
		expect(searchStore.semanticProgress).toEqual(progress);
	});

	it('setModelAvailable updates model availability', () => {
		searchStore.setModelAvailable(true);
		expect(searchStore.modelAvailable).toBe(true);
	});

	it('reset clears advanced state', () => {
		searchStore.setMode('hybrid');
		searchStore.setFuzzyEnabled(false);
		searchStore.setFtsResults([{ path: 'a.md', title: 'A', score: -1, snippet: '', tags: '' }]);
		searchStore.setSemanticResults([
			{ key: 'k', sourcePath: 'a.md', content: '', heading: null, lineStart: 1, lineEnd: 2, score: 0.5 },
		]);
		searchStore.setHybridResults([
			{ path: 'a.md', title: 'A', combinedScore: 0.5, snippet: '', source: 'text' },
		]);
		searchStore.setIndexStats({ totalDocuments: 10 });
		searchStore.setIsIndexing(true);
		searchStore.setSemanticStats({ totalChunks: 50, totalSources: 5, modelLoaded: true });
		searchStore.setIsSemanticIndexing(true);
		searchStore.setSemanticProgress({ phase: 'chunking', current: 1, total: 5, message: '' });
		searchStore.setModelAvailable(true);

		searchStore.reset();

		expect(searchStore.mode).toBe('text');
		expect(searchStore.fuzzyEnabled).toBe(true);
		expect(searchStore.ftsResults).toEqual([]);
		expect(searchStore.semanticResults).toEqual([]);
		expect(searchStore.hybridResults).toEqual([]);
		expect(searchStore.indexStats).toBeNull();
		expect(searchStore.isIndexing).toBe(false);
		expect(searchStore.semanticStats).toBeNull();
		expect(searchStore.isSemanticIndexing).toBe(false);
		expect(searchStore.semanticProgress).toBeNull();
		expect(searchStore.modelAvailable).toBe(false);
	});
});
