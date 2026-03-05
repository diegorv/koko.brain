import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// Mock Tauri invoke
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
	invoke: (...args: any[]) => mockInvoke(...args),
}));

// Mock Tauri event listener
const mockListen = vi.fn<(event: string, handler: (...args: unknown[]) => void) => Promise<() => void>>(() => Promise.resolve(vi.fn()));
vi.mock('@tauri-apps/api/event', () => ({
	listen: (event: string, handler: (...args: unknown[]) => void) => mockListen(event, handler),
}));

vi.mock('$lib/utils/debug', () => ({
	debug: vi.fn(),
	error: vi.fn(),
}));

// Mock editor hooks
const mockAddAfterSaveObserver = vi.fn();
vi.mock('$lib/core/editor/editor.hooks', () => ({
	addAfterSaveObserver: (...args: any[]) => mockAddAfterSaveObserver(...args),
}));

import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { searchStore } from '$lib/features/search/search.store.svelte';
import { noteIndexStore } from '$lib/features/backlinks/note-index.store.svelte';
import {
	performSearch,
	resetSearch,
	buildSearchIndex,
	initSemanticSearch,
	buildSemanticIndex,
	registerSearchIndexHook,
} from '$lib/features/search/search.service';

describe('performSearch', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		searchStore.reset();
		noteIndexStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
	});

	it('clears results for empty query', async () => {
		searchStore.setQuery('');

		await performSearch();

		expect(searchStore.ftsResults).toEqual([]);
		expect(searchStore.semanticResults).toEqual([]);
		expect(searchStore.hybridResults).toEqual([]);
		expect(searchStore.results).toEqual([]);
	});

	it('clears results for whitespace-only query', async () => {
		searchStore.setQuery('   ');

		await performSearch();

		expect(searchStore.ftsResults).toEqual([]);
	});

	it('calls search_fts in text mode', async () => {
		const ftsResults = [
			{ path: 'a.md', title: 'A', score: -1.5, snippet: '<mark>hello</mark>', tags: '' },
		];
		mockInvoke.mockResolvedValueOnce(ftsResults);
		searchStore.setQuery('hello');
		searchStore.setMode('text');

		await performSearch();

		expect(mockInvoke).toHaveBeenCalledWith('search_fts', {
			query: 'hello',
			maxResults: 50,
			fuzzy: true,
		});
		expect(searchStore.ftsResults).toEqual(ftsResults);
		expect(searchStore.isSearching).toBe(false);
	});

	it('falls back to in-memory search when FTS5 fails', async () => {
		mockInvoke.mockRejectedValueOnce(new Error('No DB'));
		noteIndexStore.setNoteContents(
			new Map([
				['/vault/match.md', 'This file contains hello'],
				['/vault/no-match.md', 'Nothing here'],
			]),
		);
		searchStore.setQuery('hello');
		searchStore.setMode('text');

		await performSearch();

		expect(searchStore.results).toHaveLength(1);
		expect(searchStore.results[0].filePath).toBe('/vault/match.md');
	});

	it('clears stale ftsResults when FTS5 fails and falls back', async () => {
		// Pre-populate stale FTS results from a previous successful search
		searchStore.setFtsResults([
			{ path: 'stale.md', title: 'Stale', score: -1, snippet: '', tags: '' },
		]);
		mockInvoke.mockRejectedValueOnce(new Error('No DB'));
		noteIndexStore.setNoteContents(
			new Map([['/vault/match.md', 'hello world']]),
		);
		searchStore.setQuery('hello');
		searchStore.setMode('text');

		await performSearch();

		expect(searchStore.ftsResults).toEqual([]);
		expect(searchStore.results).toHaveLength(1);
	});

	it('calls search_semantic in semantic mode', async () => {
		const semanticResults = [
			{
				key: 'k1',
				sourcePath: 'a.md',
				content: 'related content',
				heading: null,
				lineStart: 1,
				lineEnd: 5,
				score: 0.85,
			},
		];
		mockInvoke.mockResolvedValueOnce(semanticResults);
		searchStore.setQuery('concept');
		searchStore.setMode('semantic');

		await performSearch();

		expect(mockInvoke).toHaveBeenCalledWith('search_semantic', {
			query: 'concept',
			maxResults: 20,
			minScore: 0.3,
		});
		expect(searchStore.semanticResults).toEqual(semanticResults);
	});

	it('strips operator prefixes from semantic query', async () => {
		const semanticResults = [
			{
				key: 'k1',
				sourcePath: 'a.md',
				content: 'related content',
				heading: null,
				lineStart: 1,
				lineEnd: 5,
				score: 0.85,
			},
		];
		mockInvoke.mockResolvedValueOnce(semanticResults);
		searchStore.setQuery('tag:javascript hooks');
		searchStore.setMode('semantic');

		await performSearch();

		// Semantic search should receive only the text part, not operator prefixes
		expect(mockInvoke).toHaveBeenCalledWith('search_semantic', {
			query: 'hooks',
			maxResults: 20,
			minScore: 0.3,
		});
		expect(searchStore.semanticResults).toEqual(semanticResults);
	});

	it('uses full query for semantic when no operators present', async () => {
		const semanticResults = [
			{
				key: 'k1',
				sourcePath: 'a.md',
				content: 'related content',
				heading: null,
				lineStart: 1,
				lineEnd: 5,
				score: 0.85,
			},
		];
		mockInvoke.mockResolvedValueOnce(semanticResults);
		searchStore.setQuery('concept');
		searchStore.setMode('semantic');

		await performSearch();

		expect(mockInvoke).toHaveBeenCalledWith('search_semantic', {
			query: 'concept',
			maxResults: 20,
			minScore: 0.3,
		});
	});

	it('clears semantic results when semantic search fails', async () => {
		mockInvoke.mockRejectedValueOnce(new Error('No model'));
		searchStore.setQuery('concept');
		searchStore.setMode('semantic');

		await performSearch();

		expect(searchStore.semanticResults).toEqual([]);
	});

	it('merges FTS and semantic in hybrid mode', async () => {
		const ftsResults = [
			{ path: 'a.md', title: 'A', score: -3.0, snippet: 'text', tags: '' },
		];
		const semanticResults = [
			{
				key: 'k1',
				sourcePath: 'a.md',
				content: 'semantic',
				heading: null,
				lineStart: 1,
				lineEnd: 5,
				score: 0.8,
			},
		];
		mockInvoke
			.mockResolvedValueOnce(ftsResults) // search_fts
			.mockResolvedValueOnce(semanticResults); // search_semantic
		searchStore.setQuery('test');
		searchStore.setMode('hybrid');

		await performSearch();

		expect(searchStore.hybridResults).toHaveLength(1);
		expect(searchStore.hybridResults[0].source).toBe('both');
	});

	it('sets isSearching to false after completion', async () => {
		mockInvoke.mockResolvedValueOnce([]);
		searchStore.setQuery('test');

		await performSearch();

		expect(searchStore.isSearching).toBe(false);
	});

	it('strips tag: operator from FTS query and filters results post-hoc', async () => {
		const ftsResults = [
			{ path: 'a.md', title: 'A', score: -2.0, snippet: '<mark>fix</mark>', tags: '' },
			{ path: 'b.md', title: 'B', score: -1.0, snippet: '<mark>fix</mark>', tags: '' },
		];
		mockInvoke.mockResolvedValueOnce(ftsResults);
		noteIndexStore.setNoteContents(
			new Map([
				['/vault/a.md', '---\ntags: [javascript]\n---\nfix this bug'],
				['/vault/b.md', 'fix another bug without tags'],
			]),
		);
		searchStore.setQuery('tag:javascript fix');
		searchStore.setMode('text');

		await performSearch();

		// FTS should be called with just "fix", not "tag:javascript fix"
		expect(mockInvoke).toHaveBeenCalledWith('search_fts', {
			query: 'fix',
			maxResults: 50,
			fuzzy: true,
		});
		// Only a.md has the tag, so b.md should be filtered out
		expect(searchStore.ftsResults).toHaveLength(1);
		expect(searchStore.ftsResults[0].path).toBe('a.md');
	});

	it('uses in-memory search for operator-only queries', async () => {
		noteIndexStore.setNoteContents(
			new Map([
				['/vault/a.md', '---\ntags: [review]\n---\nSome content'],
				['/vault/b.md', 'No tags here'],
			]),
		);
		searchStore.setQuery('tag:review');
		searchStore.setMode('text');

		await performSearch();

		// FTS should NOT be called for operator-only queries
		expect(mockInvoke).not.toHaveBeenCalled();
		expect(searchStore.results).toHaveLength(1);
		expect(searchStore.results[0].filePath).toBe('/vault/a.md');
	});

	it('strips path: operator from FTS query and filters results', async () => {
		const ftsResults = [
			{ path: 'daily/2024.md', title: '2024', score: -2.0, snippet: '<mark>test</mark>', tags: '' },
			{ path: 'notes/test.md', title: 'Test', score: -1.0, snippet: '<mark>test</mark>', tags: '' },
		];
		mockInvoke.mockResolvedValueOnce(ftsResults);
		searchStore.setQuery('path:daily/ test');
		searchStore.setMode('text');

		await performSearch();

		expect(mockInvoke).toHaveBeenCalledWith('search_fts', {
			query: 'test',
			maxResults: 50,
			fuzzy: true,
		});
		expect(searchStore.ftsResults).toHaveLength(1);
		expect(searchStore.ftsResults[0].path).toBe('daily/2024.md');
	});

	it('passes fuzzy flag from store', async () => {
		mockInvoke.mockResolvedValueOnce([]);
		searchStore.setQuery('test');
		searchStore.setFuzzyEnabled(false);

		await performSearch();

		expect(mockInvoke).toHaveBeenCalledWith('search_fts', {
			query: 'test',
			maxResults: 50,
			fuzzy: false,
		});
	});
});

describe('buildSearchIndex', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		searchStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
	});

	it('calls build_search_index and updates store', async () => {
		const stats = { totalDocuments: 42 };
		mockInvoke.mockResolvedValueOnce(stats);

		await buildSearchIndex();

		expect(mockInvoke).toHaveBeenCalledWith('build_search_index', { vaultPath: '/vault' });
		expect(searchStore.indexStats).toEqual(stats);
		expect(searchStore.isIndexing).toBe(false);
	});

	it('sets isIndexing during build', async () => {
		let resolveInvoke: (v: any) => void;
		mockInvoke.mockReturnValueOnce(
			new Promise((res) => {
				resolveInvoke = res;
			}),
		);

		const promise = buildSearchIndex();
		expect(searchStore.isIndexing).toBe(true);

		resolveInvoke!({ totalDocuments: 0 });
		await promise;
		expect(searchStore.isIndexing).toBe(false);
	});

	it('handles error and clears indexing flag', async () => {
		mockInvoke.mockRejectedValueOnce(new Error('DB error'));

		await buildSearchIndex();

		expect(searchStore.isIndexing).toBe(false);
	});
});

describe('initSemanticSearch', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		searchStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
	});

	it('sets modelAvailable when model exists', async () => {
		mockInvoke
			.mockResolvedValueOnce(true) // is_semantic_model_available
			.mockResolvedValueOnce(true) // init_semantic_search
			.mockResolvedValueOnce({ totalChunks: 50, totalSources: 5, modelLoaded: true }); // get_semantic_stats

		await initSemanticSearch();

		expect(searchStore.modelAvailable).toBe(true);
		expect(searchStore.semanticStats).toEqual({
			totalChunks: 50,
			totalSources: 5,
			modelLoaded: true,
		});
	});

	it('sets modelAvailable to false when model not found', async () => {
		mockInvoke.mockResolvedValueOnce(false); // is_semantic_model_available

		await initSemanticSearch();

		expect(searchStore.modelAvailable).toBe(false);
		expect(searchStore.semanticStats).toBeNull();
	});

	it('handles errors gracefully', async () => {
		mockInvoke.mockRejectedValueOnce(new Error('fail'));

		await initSemanticSearch();

		expect(searchStore.modelAvailable).toBe(false);
	});
});

describe('buildSemanticIndex', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		searchStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
	});

	it('calls build_semantic_index and updates store', async () => {
		const stats = { totalChunks: 100, totalSources: 10, modelLoaded: true };
		mockInvoke.mockResolvedValueOnce(stats);

		await buildSemanticIndex();

		expect(mockInvoke).toHaveBeenCalledWith('build_semantic_index', { vaultPath: '/vault' });
		expect(searchStore.semanticStats).toEqual(stats);
		expect(searchStore.isSemanticIndexing).toBe(false);
		expect(searchStore.semanticProgress).toBeNull();
	});

	it('clears indexing flag on error', async () => {
		mockInvoke.mockRejectedValueOnce(new Error('fail'));

		await buildSemanticIndex();

		expect(searchStore.isSemanticIndexing).toBe(false);
	});
});

describe('registerSearchIndexHook', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open('/vault');
	});

	it('registers an AfterSaveObserver and returns unsubscribe function', () => {
		mockAddAfterSaveObserver.mockReturnValue(() => {});

		const unsub = registerSearchIndexHook();

		expect(mockAddAfterSaveObserver).toHaveBeenCalledOnce();
		expect(typeof mockAddAfterSaveObserver.mock.calls[0][0]).toBe('function');
		expect(typeof unsub).toBe('function');
	});

	it('callback invokes update_search_index_file for .md files', () => {
		let callback: (path: string, content: string) => void;
		mockAddAfterSaveObserver.mockImplementation((cb: any) => {
			callback = cb;
			return () => {};
		});
		mockInvoke.mockResolvedValue(undefined);

		registerSearchIndexHook();
		callback!('/vault/notes/test.md', '# Hello');

		expect(mockInvoke).toHaveBeenCalledWith('update_search_index_file', {
			filePath: 'notes/test.md',
			content: '# Hello',
		});
		// Also updates semantic index
		expect(mockInvoke).toHaveBeenCalledWith('update_semantic_file', {
			filePath: 'notes/test.md',
			content: '# Hello',
			vaultPath: '/vault',
		});
		expect(vaultStore.path).toBe('/vault');
	});

	it('callback ignores non-markdown files', () => {
		let callback: (path: string, content: string) => void;
		mockAddAfterSaveObserver.mockImplementation((cb: any) => {
			callback = cb;
			return () => {};
		});

		registerSearchIndexHook();
		callback!('/vault/image.png', 'binary');

		expect(mockInvoke).not.toHaveBeenCalled();
		expect(vaultStore.path).toBe('/vault');
	});
});

describe('resetSearch', () => {
	it('clears all search state', () => {
		searchStore.setQuery('test');
		searchStore.setResults([{
			filePath: '/vault/a.md',
			fileName: 'a',
			matches: [],
			snippets: [],
		}]);
		searchStore.setFtsResults([{ path: 'a.md', title: 'A', score: -1, snippet: '', tags: '' }]);

		resetSearch();

		expect(searchStore.query).toBe('');
		expect(searchStore.results).toEqual([]);
		expect(searchStore.ftsResults).toEqual([]);
		expect(searchStore.isSearching).toBe(false);
	});
});
