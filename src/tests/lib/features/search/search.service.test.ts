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

const mockDebug = vi.fn();
vi.mock('$lib/utils/debug', () => ({
	debug: (...args: unknown[]) => mockDebug(...args),
	error: vi.fn(),
}));

// Mock editor hooks
const mockAddAfterSaveObserver = vi.fn();
vi.mock('$lib/core/editor/editor.hooks', () => ({
	addAfterSaveObserver: (...args: any[]) => mockAddAfterSaveObserver(...args),
}));

import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { searchStore } from '$lib/features/search/search.store.svelte';
import {
	performSearch,
	resetSearch,
	buildSearchIndex,
	initSemanticSearch,
	buildSemanticIndex,
	registerSearchIndexHook,
	startSemanticProgressListener,
	stopSemanticProgressListener,
} from '$lib/features/search/search.service';
import type { SemanticProgress } from '$lib/features/search/search.types';
import type { NoteEntryV2 } from '$lib/types/vault-v2.types';
import type { FileReadResult } from '$lib/core/filesystem/fs.types';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

/**
 * Builds an `invoke` implementation that responds to `search_fts`,
 * `get_all_vault_entries_v2`, and `read_files_batch` calls. Phase 11.5h —
 * the operator-only and FTS-fallback paths now load content via these
 * IPCs rather than reading a TS-side noteIndexStore mirror.
 */
function mockSearchIPCs(opts: {
	ftsResult?: FtsResult[] | Error;
	entries?: NoteEntryV2[];
	contents?: Record<string, string>;
}): void {
	const fts = opts.ftsResult;
	const entries = opts.entries ?? [];
	const contents = opts.contents ?? {};
	mockInvoke.mockImplementation(async (cmd: string, _args: unknown) => {
		if (cmd === 'search_fts') {
			if (fts instanceof Error) throw fts;
			return fts ?? [];
		}
		if (cmd === 'get_all_vault_entries_v2') return entries;
		if (cmd === 'read_files_batch') {
			const out: FileReadResult[] = entries.map((e) => ({
				path: e.path,
				content: contents[e.path] ?? null,
				error: null,
			}));
			return out;
		}
		return undefined;
	});
}

type FtsResult = { path: string; title: string; score: number; snippet: string; tags: string };

describe('performSearch', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		searchStore.reset();
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
		mockSearchIPCs({
			ftsResult: new Error('No DB'),
			entries: [entryV2('/vault/match.md'), entryV2('/vault/no-match.md')],
			contents: {
				'/vault/match.md': 'This file contains hello',
				'/vault/no-match.md': 'Nothing here',
			},
		});
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
		mockSearchIPCs({
			ftsResult: new Error('No DB'),
			entries: [entryV2('/vault/match.md')],
			contents: { '/vault/match.md': 'hello world' },
		});
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
		// FTS returns both; tag map narrows to /vault/a.md only.
		mockSearchIPCs({
			ftsResult: ftsResults,
			entries: [
				entryV2('/vault/a.md', { tags: ['javascript'] }),
				entryV2('/vault/b.md'),
			],
		});
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
		mockSearchIPCs({
			entries: [entryV2('/vault/a.md'), entryV2('/vault/b.md')],
			contents: {
				'/vault/a.md': '---\ntags: [review]\n---\nSome content',
				'/vault/b.md': 'No tags here',
			},
		});
		searchStore.setQuery('tag:review');
		searchStore.setMode('text');

		await performSearch();

		// FTS should NOT be called for operator-only queries — only the
		// content-loading IPCs (`get_all_vault_entries_v2` + `read_files_batch`).
		expect(mockInvoke).not.toHaveBeenCalledWith('search_fts', expect.anything());
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

describe('semantic progress listener (throttle)', () => {
	let capturedHandler: ((event: { payload: SemanticProgress }) => void) | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		searchStore.reset();
		stopSemanticProgressListener(); // ensure a clean start between tests
		capturedHandler = null;
		mockListen.mockImplementation((_event, handler) => {
			capturedHandler = handler as (e: { payload: SemanticProgress }) => void;
			return Promise.resolve(vi.fn());
		});
	});

	it('propagates the first event immediately (phase transition from null)', async () => {
		vi.useFakeTimers();
		try {
			await startSemanticProgressListener();
			expect(capturedHandler).not.toBeNull();

			const first: SemanticProgress = {
				phase: 'embedding',
				current: 4,
				total: 1000,
				message: 'Embedding chunks... 4/1000',
			};
			capturedHandler!({ payload: first });

			// Immediate propagation — no timer advance required
			expect(searchStore.semanticProgress).toEqual(first);
		} finally {
			vi.useRealTimers();
		}
	});

	it('coalesces rapid same-phase events into a trailing 500ms update', async () => {
		vi.useFakeTimers();
		try {
			await startSemanticProgressListener();

			// Prime lastPropagatedProgress so the next event is a same-phase update
			capturedHandler!({
				payload: { phase: 'embedding', current: 4, total: 1000, message: '4/1000' },
			});

			// Simulate a burst of 10 same-phase events within the throttle window.
			for (let i = 1; i <= 10; i++) {
				capturedHandler!({
					payload: {
						phase: 'embedding',
						current: 4 + i * 4,
						total: 1000,
						message: `${4 + i * 4}/1000`,
					},
				});
			}

			// Store still holds the first payload — throttle has not fired yet
			expect(searchStore.semanticProgress?.current).toBe(4);

			// Advance past the throttle window
			vi.advanceTimersByTime(500);

			// Store now holds the LAST coalesced payload (not an intermediate one)
			expect(searchStore.semanticProgress?.current).toBe(44);
			expect(searchStore.semanticProgress?.message).toBe('44/1000');
		} finally {
			vi.useRealTimers();
		}
	});

	it('bypasses the throttle when the phase changes', async () => {
		vi.useFakeTimers();
		try {
			await startSemanticProgressListener();

			// First event (downloading) — propagates immediately
			capturedHandler!({
				payload: { phase: 'downloading', current: 50, total: 100, message: '50%' },
			});
			expect(searchStore.semanticProgress?.phase).toBe('downloading');

			// Second event in the same phase — starts throttle, does NOT propagate
			capturedHandler!({
				payload: { phase: 'downloading', current: 80, total: 100, message: '80%' },
			});
			expect(searchStore.semanticProgress?.current).toBe(50);

			// Phase change event arrives BEFORE the throttle fires — must propagate now
			capturedHandler!({
				payload: { phase: 'embedding', current: 4, total: 1000, message: '4/1000' },
			});
			expect(searchStore.semanticProgress?.phase).toBe('embedding');
			expect(searchStore.semanticProgress?.current).toBe(4);

			// The in-flight throttle timer must be cleared so no stale flush leaks
			vi.advanceTimersByTime(1000);
			expect(searchStore.semanticProgress?.phase).toBe('embedding');
			expect(searchStore.semanticProgress?.current).toBe(4);
		} finally {
			vi.useRealTimers();
		}
	});

	it('logs only phase transitions, not every batch', async () => {
		vi.useFakeTimers();
		try {
			await startSemanticProgressListener();
			mockDebug.mockClear();

			// 10 same-phase embedding events — must produce ZERO 'Semantic progress phase' logs
			for (let i = 0; i < 10; i++) {
				capturedHandler!({
					payload: {
						phase: 'embedding',
						current: (i + 1) * 4,
						total: 1000,
						message: `${(i + 1) * 4}/1000`,
					},
				});
			}

			// Phase transition to 'chunking' — MUST log
			capturedHandler!({
				payload: { phase: 'chunking', current: 0, total: 1000, message: 'Chunking...' },
			});

			const phaseLogs = mockDebug.mock.calls.filter(
				(call) => call[0] === 'SEARCH' && call[1] === 'Semantic progress phase:'
			);
			// Exactly 2 phase logs: initial 'embedding' entry + transition to 'chunking'
			expect(phaseLogs).toHaveLength(2);
			expect(phaseLogs[0]?.[2]).toBe('embedding');
			expect(phaseLogs[1]?.[2]).toBe('chunking');

			// State also reflects the last phase (sanity check — not the sole assertion)
			expect(searchStore.semanticProgress?.phase).toBe('chunking');
		} finally {
			vi.useRealTimers();
		}
	});

	it('stopSemanticProgressListener clears pending work and resets the store', async () => {
		vi.useFakeTimers();
		try {
			await startSemanticProgressListener();

			capturedHandler!({
				payload: { phase: 'embedding', current: 4, total: 1000, message: '4/1000' },
			});
			capturedHandler!({
				payload: { phase: 'embedding', current: 8, total: 1000, message: '8/1000' },
			});

			stopSemanticProgressListener();

			// Store is cleared
			expect(searchStore.semanticProgress).toBeNull();

			// Pending timer must not fire after stop
			vi.advanceTimersByTime(1000);
			expect(searchStore.semanticProgress).toBeNull();
		} finally {
			vi.useRealTimers();
		}
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
